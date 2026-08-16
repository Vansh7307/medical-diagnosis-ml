"""
Diagnosis prediction routes.
Handles ML model predictions for heart, diabetes, cancer, multi-diagnosis,
and SHAP-based model explainability.
Includes input validation, rate limiting, and structured audit logging.
"""
import csv
import io
import json
import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError as MarshmallowValidationError

from app import db
from app.models.diagnosis import Diagnosis
from app.models.patient import Patient
from app.ml.trainer import ModelTrainer
from app.ml.pipelines import MODEL_INFO
from app.mlops.logger import MLLogger
from app.mlops.monitoring import ModelMonitor
from app.middleware import rate_limit
from app.utils.decorators import role_required
from app.validation import (
    HeartDiseaseFeaturesSchema,
    DiabetesFeaturesSchema,
    CancerFeaturesSchema,
    DiagnosisInputSchema,
    MultiDiagnosisSchema,
    PaginationSchema,
    CompleteBBCSchema,
    ComprehensiveMetabolicPanelSchema,
    LipidCardiovascularPanelSchema,
    EndocrinePanelSchema,
    OncologyBiomarkersSchema,
    ECGAnalysisSchema,
    GenomicVariantSchema,
    MicrobioAnalysisSchema,
)
from app.clinical_safety import clinical_metadata, differential_summary, validate_clinical_safety
from app.utils.ttl_cache import TTLCache

diagnosis_bp = Blueprint('diagnosis', __name__)

# Cache trained models
_model_cache = {}
ml_logger = MLLogger()
prediction_cache = TTLCache(ttl_seconds=60, max_items=256)

# Validation schemas
HEART_SCHEMA = HeartDiseaseFeaturesSchema()
DIABETES_SCHEMA = DiabetesFeaturesSchema()
CANCER_SCHEMA = CancerFeaturesSchema()
DIAGNOSIS_INPUT_SCHEMA = DiagnosisInputSchema()
MULTI_DIAGNOSIS_SCHEMA = MultiDiagnosisSchema()
PAGINATION_SCHEMA = PaginationSchema()

# Comprehensive diagnostic schemas
CBC_SCHEMA = CompleteBBCSchema()
CMP_SCHEMA = ComprehensiveMetabolicPanelSchema()
LIPID_SCHEMA = LipidCardiovascularPanelSchema()
ENDOCRINE_SCHEMA = EndocrinePanelSchema()
ONCOLOGY_SCHEMA = OncologyBiomarkersSchema()
ECG_SCHEMA = ECGAnalysisSchema()
GENOMIC_SCHEMA = GenomicVariantSchema()
MICROBIO_SCHEMA = MicrobioAnalysisSchema()



def _get_trainer(diagnosis_type):
    """Get or create a cached trainer instance."""
    if diagnosis_type not in _model_cache:
        trainer = ModelTrainer(diagnosis_type)
        trainer._load_model()
        _model_cache[diagnosis_type] = trainer
    return _model_cache[diagnosis_type]


def _validate_patient(patient_id):
    """Look up a patient by either the internal numeric id or the
    human-readable patient code (e.g. 'PAT-AFD9477D'), whichever was given."""
    if not patient_id:
        return None
    patient_id = str(patient_id).strip()
    if patient_id.isdigit():
        patient = Patient.query.get(int(patient_id))
        if patient:
            return patient
    # Fall back to (or primarily use) the human-readable patient code
    return Patient.query.filter_by(patient_id=patient_id).first()


def _validate_features(diagnosis_type, features):
    """Validate features using the appropriate schema."""
    schemas = {
        'heart': HEART_SCHEMA,
        'diabetes': DIABETES_SCHEMA,
        'cancer': CANCER_SCHEMA,
    }
    validate_clinical_safety(diagnosis_type, features)
    schema = schemas.get(diagnosis_type)
    if schema:
        # Use the schema to validate (load normalizes + validates)
        schema.load(features)
    return True


def _parse_lab_csv(file_storage):
    """Read one structured lab row and match it to a supported ML model.

    The endpoint intentionally accepts a single data row. Batch scoring needs
    explicit consent, result ownership, and an audit model; silently scoring a
    whole upload would be inappropriate for this clinical workflow.
    """
    raw = file_storage.stream.read(512 * 1024 + 1)
    if len(raw) > 512 * 1024:
        raise ValueError('CSV must be 512KB or smaller')
    try:
        text = raw.decode('utf-8-sig')
    except UnicodeDecodeError as exc:
        raise ValueError('CSV must be UTF-8 encoded') from exc

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise ValueError('CSV must include a header row')
    rows = list(reader)
    if len(rows) != 1:
        raise ValueError('CSV must contain exactly one lab-result row')

    row = {str(key).strip(): (value or '').strip() for key, value in rows[0].items() if key}
    for diagnosis_type, details in MODEL_INFO.items():
        required_features = details['features']
        if not set(required_features).issubset(row):
            continue
        features = {}
        for name in required_features:
            try:
                number = float(row[name])
            except ValueError as exc:
                raise ValueError(f'"{name}" must contain a numeric value') from exc
            features[name] = int(number) if number.is_integer() else number
        _validate_features(diagnosis_type, features)
        return diagnosis_type, features

    supported = ', '.join(MODEL_INFO)
    raise ValueError(
        f'CSV headers do not match a supported model ({supported}). '
        'Use the exact feature names exported by the diagnostic form.'
    )


def _run_prediction(diagnosis_type, features, patient_id=None, save_to_db=True):
    """Run a single prediction and optionally save result.

    Args:
        save_to_db: Set to False when called from multi-diagnosis
                    to avoid duplicate records (the multi endpoint
                    creates a single summary record instead).
    """
    cache_input = {'diagnosis_type': diagnosis_type, 'features': features}
    cached = prediction_cache.get(cache_input) if not patient_id else None
    if cached:
        cached['cache_hit'] = True
        return cached

    trainer = _get_trainer(diagnosis_type)
    result = trainer.predict(features)
    result['differential_summary'] = differential_summary(diagnosis_type, result)
    result['clinical_metadata'] = clinical_metadata(result)
    result['cache_hit'] = False

    # Log prediction
    ml_logger.log_prediction(
        diagnosis_type=diagnosis_type,
        input_features=features,
        prediction=result,
        model_version=result.get('model_version', 'unknown')
    )

    # Monitor for drift
    monitor = ModelMonitor(diagnosis_type)
    monitor.record_prediction(features, result)

    # Save to database if patient_id provided and save_to_db is True
    if patient_id and save_to_db:
        user_id = get_jwt_identity()
        diagnosis = Diagnosis(
            patient_id=patient_id,
            created_by=int(user_id) if user_id else None,
            diagnosis_type=diagnosis_type,
            prediction=result['prediction_label'],
            confidence=result['confidence'],
            risk_score=result['risk_score'],
            input_features=json.dumps(features),
            model_name=MODEL_INFO[diagnosis_type]['name'],
            model_version=result.get('model_version', 'unknown'),
            status='completed',
        )
        db.session.add(diagnosis)
        db.session.commit()
        result['diagnosis_id'] = diagnosis.id

    if not patient_id:
        prediction_cache.set(cache_input, result)

    return result


def _generate_lab_summary(panel_type, features):
    """Generate clinical summary for laboratory panel."""
    summary = {
        'panel_type': panel_type,
        'risk_score': 0,
        'risk_level': 'low',
        'flagged_values': [],
        'clinical_notes': [],
    }
    
    # Analyze for out-of-range values
    if panel_type == 'cbc':
        if features.get('wbc', 0) > 20 or features.get('wbc', 0) < 4:
            summary['flagged_values'].append('WBC out of range')
            summary['risk_score'] += 10
    elif panel_type == 'cmp':
        if features.get('glucose', 0) > 200:
            summary['flagged_values'].append('Hyperglycemia')
            summary['risk_score'] += 15
        if features.get('creatinine', 0) > 1.2:
            summary['flagged_values'].append('Elevated creatinine')
            summary['risk_score'] += 10
    elif panel_type == 'lipid':
        if features.get('ldl', 0) > 160:
            summary['flagged_values'].append('High LDL')
            summary['risk_score'] += 20
    elif panel_type == 'endocrine':
        if features.get('tsh', 0) > 5:
            summary['flagged_values'].append('Elevated TSH')
            summary['risk_score'] += 15
    elif panel_type == 'oncology':
        if features.get('psa', 0) > 10:
            summary['flagged_values'].append('Elevated PSA')
            summary['risk_score'] += 25
    
    if summary['risk_score'] >= 25:
        summary['risk_level'] = 'high'
    elif summary['risk_score'] >= 15:
        summary['risk_level'] = 'moderate'
    
    summary['confidence'] = 0.92
    return summary


def _analyze_ecg(features):
    """Analyze ECG signal and detect abnormalities."""
    summary = {
        'interpretation': 'Normal sinus rhythm',
        'confidence': 0.92,
        'arrhythmia_risk': 0,
        'abnormalities': [],
    }
    
    heart_rate = features.get('heart_rate', 60)
    qtc = features.get('qt_interval', 400) / (features.get('heart_rate', 60) ** 0.5)
    
    if heart_rate > 100 or heart_rate < 60:
        summary['abnormalities'].append('Abnormal heart rate')
        summary['arrhythmia_risk'] += 15
    
    if qtc > 450:
        summary['abnormalities'].append('QTc prolongation')
        summary['arrhythmia_risk'] += 25
        summary['interpretation'] = 'QTc prolongation detected'
    
    if features.get('rhythm_regularity') == 'irregular':
        summary['abnormalities'].append('Irregular rhythm')
        summary['arrhythmia_risk'] += 30
        summary['interpretation'] = 'Irregular rhythm detected'
    
    if summary['arrhythmia_risk'] > 40:
        summary['interpretation'] = 'High-risk arrhythmia pattern'
    elif summary['arrhythmia_risk'] > 20:
        summary['interpretation'] = 'Possible arrhythmia - clinical review recommended'
    
    summary['confidence'] = 0.88 if summary['abnormalities'] else 0.95
    return summary


def _analyze_genomic(features):
    """Analyze genomic variants and polygenic risk scores."""
    summary = {
        'risk_profile': 'Standard genetic risk profile',
        'confidence': 0.92,
        'overall_prs': 50,
        'risk_categories': {},
        'pathogenic_variants': [],
    }
    
    cv_prs = features.get('cardiovascular_prs', 50)
    onc_prs = features.get('oncological_prs', 50)
    neuro_prs = features.get('neurological_prs', 50)
    pathogenic_count = features.get('pathogenic_variant_count', 0)
    
    summary['risk_categories'] = {
        'cardiovascular': 'high' if cv_prs > 75 else 'moderate' if cv_prs > 50 else 'low',
        'oncological': 'high' if onc_prs > 75 else 'moderate' if onc_prs > 50 else 'low',
        'neurological': 'high' if neuro_prs > 75 else 'moderate' if neuro_prs > 50 else 'low',
    }
    
    summary['overall_prs'] = (cv_prs + onc_prs + neuro_prs) / 3
    
    if pathogenic_count > 5:
        summary['pathogenic_variants'].append(f'{pathogenic_count} pathogenic variants detected')
        summary['risk_profile'] = 'High-risk genetic profile'
    elif pathogenic_count > 2:
        summary['risk_profile'] = 'Moderate genetic risk profile'
    
    if features.get('consanguinity_flag'):
        summary['pathogenic_variants'].append('Consanguinity flag: autosomal recessive risk')
    
    summary['confidence'] = 0.90 if pathogenic_count > 0 else 0.88
    return summary


def _analyze_microbiology(features):
    """Analyze microbiological culture results and pathogen characteristics."""
    summary = {
        'organism_type': features.get('organism_type', 'Unknown'),
        'confidence': 0.85,
        'virulence_risk': 0,
        'antibiotic_profile': [],
        'clinical_action': 'Standard precautions',
    }
    
    virulence = features.get('virulence_score', 0)
    growth_time = features.get('culture_growth_time', 24)
    
    if virulence > 70:
        summary['virulence_risk'] = 30
        summary['clinical_action'] = 'Aggressive antimicrobial therapy recommended'
    elif virulence > 50:
        summary['virulence_risk'] = 15
        summary['clinical_action'] = 'Standard antimicrobial therapy with close monitoring'
    
    if growth_time < 8:
        summary['virulence_risk'] += 10
        summary['antibiotic_profile'].append('Rapid growth - consider aggressive therapy')
    
    if features.get('organism_type') == 'bacteria':
        if features.get('gram_stain_positive'):
            summary['antibiotic_profile'].append('Gram-positive: consider beta-lactams, glycopeptides')
        else:
            summary['antibiotic_profile'].append('Gram-negative: consider fluoroquinolones, carbapenems')
    
    if not features.get('aerobic_growth'):
        summary['antibiotic_profile'].append('Anaerobic organism: requires anaerobic coverage')
    
    summary['confidence'] = 0.88 if features.get('antibiotic_sensitivity_count', 0) > 0 else 0.75
    return summary


@diagnosis_bp.route('/symptoms', methods=['POST'])
@role_required('doctor', 'clinician', 'admin')
@rate_limit('diagnosis_symptoms')
def analyze_symptoms():
    """Return a symptom-led differential for clinical triage support."""
    data = request.get_json(silent=True) or {}
    symptoms = [str(item).lower() for item in data.get('symptoms', [])]
    complaint = str(data.get('chief_complaint', '')).lower()
    severity = max(0, min(10, int(data.get('severity', 0) or 0)))
    duration = max(0, int(data.get('duration_days', 0) or 0))
    if not symptoms and not complaint:
        return jsonify({'error': 'Provide a chief_complaint or at least one symptom'}), 400

    candidates = [
        ('Acute coronary syndrome', ('chest pain', 'shortness of breath'), 0.31),
        ('Respiratory infection', ('fever', 'cough'), 0.29),
        ('Migraine or primary headache', ('headache', 'nausea'), 0.23),
        ('Gastrointestinal condition', ('abdominal pain', 'nausea'), 0.20),
    ]
    clinical_text = ' '.join(symptoms + [complaint])
    ranked = []
    for name, terms, base in candidates:
        matches = sum(term in clinical_text for term in terms)
        score = min(0.95, base + matches * 0.18 + (0.05 if severity >= 7 else 0) + (0.03 if duration > 7 else 0))
        ranked.append({'condition': name, 'confidence': round(score * 100, 1), 'matched_signals': matches})
    ranked.sort(key=lambda item: item['confidence'], reverse=True)
    return jsonify({'differential': ranked, 'triage': 'urgent review' if severity >= 8 else 'clinical review',
                    'disclaimer': 'Decision support only; a qualified clinician must interpret this result.'}), 200


@diagnosis_bp.route('/radiology', methods=['POST'])
@role_required('doctor', 'clinician', 'admin')
@rate_limit('diagnosis_radiology')
def analyze_radiology():
    """Produce a deterministic scan-overlay simulation for the selected modality."""
    modality = request.form.get('modality', 'xray').lower()
    analysis_type = request.form.get('analysis_type', 'lesion').lower()
    uploaded = request.files.get('image') or request.files.get('dicom')
    return jsonify({'modality': modality, 'analysis_type': analysis_type,
                    'upload_received': bool(uploaded and uploaded.filename),
                    'anomalies': [{'label': f'{analysis_type.title()} candidate', 'confidence': 0.74,
                                   'bounding_box': {'x': 34, 'y': 26, 'width': 28, 'height': 22}}],
                    'disclaimer': 'Overlay is a visualization aid and is not a radiology interpretation.'}), 200


@diagnosis_bp.route('/heart', methods=['POST'])
@role_required('doctor', 'clinician', 'admin')
@rate_limit('diagnosis_heart')
def predict_heart():
    """Run heart disease prediction with input validation."""
    data = request.get_json()

    if not data or 'features' not in data:
        return jsonify({'error': 'features object is required'}), 400

    # Validate features
    try:
        _validate_features('heart', data['features'])
    except MarshmallowValidationError as e:
        return jsonify({'error': 'Invalid features', 'details': e.messages}), 422

    patient_id = data.get('patient_id')
    if patient_id:
        patient = _validate_patient(patient_id)
        if not patient:
            return jsonify({'error': f'Patient with id {patient_id} not found'}), 404
        patient_id = patient.id  # resolve code (e.g. PAT-AFD9477D) to internal numeric id

    try:
        result = _run_prediction('heart', data['features'], patient_id)
        return jsonify({
            'diagnosis_type': 'heart',
            'model': MODEL_INFO['heart']['name'],
            'result': result,
        }), 200
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'Prediction failed. Please try again or contact support.'}), 500


@diagnosis_bp.route('/diabetes', methods=['POST'])
@role_required('doctor', 'clinician', 'admin')
@rate_limit('diagnosis_diabetes')
def predict_diabetes():
    """Run diabetes risk prediction with input validation."""
    data = request.get_json()

    if not data or 'features' not in data:
        return jsonify({'error': 'features object is required'}), 400

    # Validate features
    try:
        _validate_features('diabetes', data['features'])
    except MarshmallowValidationError as e:
        return jsonify({'error': 'Invalid features', 'details': e.messages}), 422

    patient_id = data.get('patient_id')
    if patient_id:
        patient = _validate_patient(patient_id)
        if not patient:
            return jsonify({'error': f'Patient with id {patient_id} not found'}), 404
        patient_id = patient.id  # resolve code (e.g. PAT-AFD9477D) to internal numeric id

    try:
        result = _run_prediction('diabetes', data['features'], patient_id)
        return jsonify({
            'diagnosis_type': 'diabetes',
            'model': MODEL_INFO['diabetes']['name'],
            'result': result,
        }), 200
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'Prediction failed. Please try again or contact support.'}), 500


@diagnosis_bp.route('/cancer', methods=['POST'])
@role_required('doctor', 'clinician', 'admin')
@rate_limit('diagnosis_cancer')
def predict_cancer():
    """Run breast cancer prediction with input validation."""
    data = request.get_json()

    if not data or 'features' not in data:
        return jsonify({'error': 'features object is required'}), 400

    # Validate features
    try:
        _validate_features('cancer', data['features'])
    except MarshmallowValidationError as e:
        return jsonify({'error': 'Invalid features', 'details': e.messages}), 422

    patient_id = data.get('patient_id')
    if patient_id:
        patient = _validate_patient(patient_id)
        if not patient:
            return jsonify({'error': f'Patient with id {patient_id} not found'}), 404
        patient_id = patient.id  # resolve code (e.g. PAT-AFD9477D) to internal numeric id

    try:
        result = _run_prediction('cancer', data['features'], patient_id)
        return jsonify({
            'diagnosis_type': 'cancer',
            'model': MODEL_INFO['cancer']['name'],
            'result': result,
        }), 200
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'Prediction failed. Please try again or contact support.'}), 500


@diagnosis_bp.route('/multi', methods=['POST'])
@role_required('doctor', 'clinician', 'admin')
@rate_limit('diagnosis_multi')
def predict_multi():
    """Run all models on a single patient with respective features."""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'Input data is required'}), 400

    # Validate multi-diagnosis input
    try:
        MULTI_DIAGNOSIS_SCHEMA.load(data)
    except MarshmallowValidationError as e:
        return jsonify({'error': 'Validation failed', 'details': e.messages}), 422

    patient_id = data.get('patient_id')
    if patient_id:
        patient = _validate_patient(patient_id)
        if not patient:
            return jsonify({'error': f'Patient with id {patient_id} not found'}), 404
        patient_id = patient.id  # resolve code (e.g. PAT-AFD9477D) to internal numeric id

    results = {}
    errors = {}

    for dtype in ['heart', 'diabetes', 'cancer']:
        features = data.get(f'{dtype}_features')
        if features:
            try:
                results[dtype] = _run_prediction(dtype, features, patient_id, save_to_db=False)
            except Exception as e:
                errors[dtype] = str(e)

    if not results:
        return jsonify({
            'error': 'No predictions could be made. Provide heart_features, diabetes_features, and/or cancer_features.'
        }), 400

    # Save multi-diagnosis record
    if patient_id and results:
        user_id = get_jwt_identity()
        multi_diagnosis = Diagnosis(
            patient_id=patient_id,
            created_by=int(user_id) if user_id else None,
            diagnosis_type='multi',
            prediction=', '.join(r['prediction_label'] for r in results.values()),
            confidence=sum(r['confidence'] for r in results.values()) / len(results),
            risk_score=max(r['risk_score'] for r in results.values()),
            input_features=json.dumps(data),
            multi_results=json.dumps(results),
            model_name='Multi-Diagnosis Engine',
            status='completed',
        )
        db.session.add(multi_diagnosis)
        db.session.commit()

    return jsonify({
        'diagnosis_type': 'multi',
        'results': results,
        'errors': errors if errors else None,
    }), 200


@diagnosis_bp.route('/explain/<string:diagnosis_type>', methods=['POST'])
@role_required('doctor', 'clinician', 'admin')
@rate_limit('diagnosis_explain')
def explain_prediction(diagnosis_type):
    """
    Get SHAP-based explanation for a prediction.
    Returns feature importance showing which clinical features drove the diagnosis.
    Critical for FDA AI/ML compliance and clinical decision transparency.
    """
    if diagnosis_type not in ['heart', 'diabetes', 'cancer']:
        return jsonify({'error': 'Invalid diagnosis type. Use: heart, diabetes, or cancer'}), 400

    data = request.get_json()
    if not data or 'features' not in data:
        return jsonify({'error': 'features object is required'}), 400

    # Validate features
    try:
        _validate_features(diagnosis_type, data['features'])
    except MarshmallowValidationError as e:
        return jsonify({'error': 'Invalid features', 'details': e.messages}), 422

    try:
        from app.ml.explainability import create_explainer
        explainer = create_explainer(diagnosis_type)
        explainer.load_model()

        if not explainer.create_explainer():
            return jsonify({
                'available': False,
                'error': 'SHAP explainer could not be initialized. Ensure shap is installed and model is trained.'
            }), 500

        explanation = explainer.explain_prediction(data['features'])
        return jsonify({
            'diagnosis_type': diagnosis_type,
            'explanation': explanation,
        }), 200
    except ImportError:
        return jsonify({
            'available': False,
            'message': 'SHAP library not installed. Install with: pip install shap matplotlib'
        }), 200
    except Exception as e:
        return jsonify({'error': f'Explanation failed: {str(e)}'}), 500


@diagnosis_bp.route('/labs', methods=['POST'])
@diagnosis_bp.route('/analyze/laboratory', methods=['POST'])
@jwt_required()
@rate_limit('diagnosis_laboratory')
def analyze_laboratory():
    """Comprehensive laboratory analysis endpoint supporting CBC, CMP, Lipid, Endocrine, and Oncology panels."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400
    
    panel_type = data.get('panel_type', '').lower()
    features = data.get('features') or {key: value for key, value in data.items() if key not in {'panel_type', 'patient_id'}}
    # The interactive intake grid captures the high-value markers.  Fill the
    # remaining validated panel fields with explicitly normal reference values
    # so the simulation can still give immediate slider feedback.
    reference_values = {
        'cbc': {'hematocrit': 42, 'neutrophils': 60, 'lymphocytes': 30},
        'cmp': {'calcium': 9.4, 'potassium': 4.1, 'co2': 25, 'chloride': 102,
                'bilirubin': 0.7, 'ast': 22, 'alt': 24, 'alp': 80},
        'lipid': {'apob': 90, 'hs_crp': 1.2, 'troponin_i': 0.01, 'troponin_t': 0.01, 'nt_probnp': 80},
        'endocrine': {'free_t3': 3.1, 'fasting_insulin': 8, 'cortisol': 12,
                      'testosterone': 500, 'estrogen': 80, 'vitamin_d': 35},
    }
    features = {**reference_values.get(panel_type, {}), **features}
    
    schemas = {
        'cbc': CBC_SCHEMA,
        'cmp': CMP_SCHEMA,
        'lipid': LIPID_SCHEMA,
        'endocrine': ENDOCRINE_SCHEMA,
        'oncology': ONCOLOGY_SCHEMA,
    }
    
    if panel_type not in schemas:
        return jsonify({'error': f'Invalid panel_type. Use: {", ".join(schemas.keys())}'}), 400
    
    try:
        validated_features = schemas[panel_type].load(features)
    except MarshmallowValidationError as e:
        return jsonify({'error': 'Invalid laboratory panel data', 'details': e.messages}), 422
    
    # Generate clinical summary and risk flags
    summary = _generate_lab_summary(panel_type, validated_features)
    
    patient_id = data.get('patient_id')
    patient = _validate_patient(patient_id) if patient_id else None
    
    diagnosis = None
    if patient:
        diagnosis = Diagnosis(patient_id=patient.id, diagnosis_type=f'lab_{panel_type}',
                              input_features=json.dumps(validated_features), prediction='Laboratory panel analysis completed',
                              confidence=0.95, risk_score=summary.get('risk_score', 0), status='completed')
        db.session.add(diagnosis)
        db.session.commit()
    ml_logger.log_prediction('laboratory', validated_features, summary, 'rule-based-v1')
    
    return jsonify({
        'diagnosis_type': f'lab_{panel_type}',
        'panel_type': panel_type,
        'features': validated_features,
        'summary': summary,
        'audit_id': diagnosis.id if diagnosis else None,
    }), 200


@diagnosis_bp.route('/cardiology', methods=['POST'])
@diagnosis_bp.route('/analyze/cardiology', methods=['POST'])
@jwt_required()
@rate_limit('diagnosis_cardiology')
def analyze_cardiology():
    """ECG/EKG signal analysis and arrhythmia detection."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'features object required'}), 400
    raw_features = data.get('features', data)
    raw_features = {**raw_features, 't_wave_amplitude': raw_features.get('t_wave_amplitude', raw_features.get('t_wave_amp')),
                    'rhythm_regularity': raw_features.get('rhythm_regularity', raw_features.get('rhythm'))}
    raw_features.pop('t_wave_amp', None)
    raw_features.pop('rhythm', None)
    raw_features.pop('patient_id', None)
    
    try:
        validated_features = ECG_SCHEMA.load(raw_features)
    except MarshmallowValidationError as e:
        return jsonify({'error': 'Invalid ECG parameters', 'details': e.messages}), 422
    
    ecg_summary = _analyze_ecg(validated_features)
    
    patient_id = data.get('patient_id')
    patient = _validate_patient(patient_id) if patient_id else None
    
    diagnosis = None
    if patient:
        diagnosis = Diagnosis(patient_id=patient.id, diagnosis_type='ecg_analysis', input_features=json.dumps(validated_features),
                              prediction=ecg_summary.get('interpretation', 'Normal sinus rhythm'),
                              confidence=ecg_summary.get('confidence', 0.88), risk_score=ecg_summary.get('arrhythmia_risk', 0), status='completed')
        db.session.add(diagnosis)
        db.session.commit()
    ml_logger.log_prediction('cardiology', validated_features, ecg_summary, 'rule-based-v1')
    
    return jsonify({
        'diagnosis_type': 'ecg_analysis',
        'features': validated_features,
        'summary': ecg_summary,
        'audit_id': diagnosis.id if diagnosis else None,
    }), 200


@diagnosis_bp.route('/genomics', methods=['POST'])
@diagnosis_bp.route('/analyze/genomic', methods=['POST'])
@jwt_required()
@rate_limit('diagnosis_genomic')
def analyze_genomic():
    """Genomic variant and polygenic risk score analysis."""
    data = request.get_json()
    if not data or 'features' not in data:
        return jsonify({'error': 'features object required'}), 400
    
    try:
        validated_features = GENOMIC_SCHEMA.load(data['features'])
    except MarshmallowValidationError as e:
        return jsonify({'error': 'Invalid genomic parameters', 'details': e.messages}), 422
    
    genomic_summary = _analyze_genomic(validated_features)
    
    patient_id = data.get('patient_id')
    patient = _validate_patient(patient_id) if patient_id else None
    
    diagnosis = None
    if patient:
        diagnosis = Diagnosis(patient_id=patient.id, diagnosis_type='genomic_analysis', input_features=json.dumps(validated_features),
                              prediction=genomic_summary.get('risk_profile', 'Standard genetic risk profile'),
                              confidence=genomic_summary.get('confidence', 0.92), risk_score=genomic_summary.get('overall_prs', 50), status='completed')
        db.session.add(diagnosis)
        db.session.commit()
    ml_logger.log_prediction('genomic', validated_features, genomic_summary, 'rule-based-v1')
    
    return jsonify({
        'diagnosis_type': 'genomic_analysis',
        'features': validated_features,
        'summary': genomic_summary,
        'audit_id': diagnosis.id if diagnosis else None,
    }), 200


@diagnosis_bp.route('/analyze/microbiology', methods=['POST'])
@jwt_required()
@rate_limit('diagnosis_microbiology')
def analyze_microbiology():
    """Clinical microbiology and pathogen identification with antibiotic sensitivity."""
    data = request.get_json()
    if not data or 'features' not in data:
        return jsonify({'error': 'features object required'}), 400
    
    try:
        validated_features = MICROBIO_SCHEMA.load(data['features'])
    except MarshmallowValidationError as e:
        return jsonify({'error': 'Invalid microbiology parameters', 'details': e.messages}), 422
    
    microbio_summary = _analyze_microbiology(validated_features)
    
    patient_id = data.get('patient_id')
    patient = _validate_patient(patient_id) if patient_id else None
    
    diagnosis = None
    if patient:
        diagnosis = Diagnosis(patient_id=patient.id, diagnosis_type='microbiology_analysis',
                              input_features=json.dumps(validated_features),
                              prediction=microbio_summary.get('organism_type', 'Unknown pathogen'),
                              confidence=microbio_summary.get('confidence', 0.85),
                              risk_score=microbio_summary.get('virulence_risk', 0), status='completed')
        db.session.add(diagnosis)
        db.session.commit()
    ml_logger.log_prediction('microbiology', validated_features, microbio_summary, 'rule-based-v1')
    
    return jsonify({
        'diagnosis_type': 'microbiology_analysis',
        'features': validated_features,
        'summary': microbio_summary,
        'audit_id': diagnosis.id if diagnosis else None,
    }), 200


@diagnosis_bp.route('/pathology', methods=['POST'])
@role_required('doctor', 'clinician', 'admin')
@rate_limit('diagnosis_pathology')
def analyze_pathology():
    """Summarize a pathology/culture workbench submission."""
    data = request.get_json(silent=True) or {}
    specimen = str(data.get('specimen_type', '')).strip().lower()
    organism = str(data.get('culture_organism', '')).strip().lower()
    gram_stain = data.get('gram_stain', '')
    if specimen not in {'biopsy', 'culture', 'blood', 'urine', 'sputum', 'csf'}:
        return jsonify({'error': 'A supported specimen_type is required'}), 422
    if organism not in {'bacteria', 'virus', 'fungus', 'parasite', 'unknown'}:
        return jsonify({'error': 'A supported culture_organism is required'}), 422
    if gram_stain not in {'+', '-', ''}:
        return jsonify({'error': 'gram_stain must be +, -, or blank'}), 422
    return jsonify({'specimen_type': specimen, 'organism_type': organism, 'gram_stain': gram_stain,
                    'sensitivity': {'penicillin': 'intermediate', 'vancomycin': 'sensitive'},
                    'disclaimer': 'Culture simulations require laboratory confirmation.'}), 200


@diagnosis_bp.route('/oncology', methods=['POST'])
@role_required('doctor', 'clinician', 'admin')
@rate_limit('diagnosis_oncology')
def analyze_oncology_marker():
    """Evaluate one tumor-marker trend point without making a cancer diagnosis."""
    data = request.get_json(silent=True) or {}
    marker = str(data.get('marker_type', '')).lower()
    try:
        value = float(data.get('value'))
    except (TypeError, ValueError):
        return jsonify({'error': 'value must be numeric'}), 422
    thresholds = {'psa': 4, 'cea': 5, 'ca125': 35, 'ca199': 37, 'afp': 10}
    if marker not in thresholds or value < 0:
        return jsonify({'error': 'Provide a supported marker_type and non-negative value'}), 422
    return jsonify({'marker_type': marker, 'value': value, 'reference_upper_limit': thresholds[marker],
                    'classification': 'elevated' if value > thresholds[marker] else 'within reference range',
                    'disclaimer': 'A tumor marker alone cannot diagnose or stage cancer.'}), 200


@diagnosis_bp.route('/neurology', methods=['POST'])
@role_required('doctor', 'clinician', 'admin')
@rate_limit('diagnosis_neurology')
def analyze_neurology():
    """Assess a bounded cognitive-screening score for dashboard decision support."""
    data = request.get_json(silent=True) or {}
    assessment_type = str(data.get('assessment_type', '')).lower()
    try:
        score = float(data.get('mmse_score'))
    except (TypeError, ValueError):
        return jsonify({'error': 'mmse_score must be numeric'}), 422
    if assessment_type not in {'mmse', 'moca', 'eeg'} or not 0 <= score <= 30:
        return jsonify({'error': 'assessment_type must be mmse, moca, or eeg and score must be 0-30'}), 422
    classification = 'screen negative' if score >= 24 else 'screen positive — clinical follow-up recommended'
    return jsonify({'assessment_type': assessment_type, 'score': score, 'classification': classification,
                    'disclaimer': 'Screening results are not a neurological diagnosis.'}), 200


@diagnosis_bp.route('/my-history', methods=['GET'])
@jwt_required()
def my_diagnosis_history():
    """Self-service: diagnosis history for whichever Patient record is
    linked to the current login. No patient ID needed -- this is how a
    patient user sees their own reports."""
    user_id = int(get_jwt_identity())
    patient = Patient.query.filter_by(user_id=user_id).first()

    if not patient:
        return jsonify({
            'linked': False,
            'message': 'No patient record is linked to your account yet.',
        }), 404

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    pagination = Diagnosis.query.filter_by(
        patient_id=patient.id
    ).order_by(Diagnosis.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'linked': True,
        'patient': patient.to_dict(),
        'diagnoses': [d.to_dict() for d in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    }), 200


@diagnosis_bp.route('/history/<int:patient_id>', methods=['GET'])
@jwt_required()
def diagnosis_history(patient_id):
    """Get diagnosis history for a patient."""
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    pagination = Diagnosis.query.filter_by(
        patient_id=patient_id
    ).order_by(Diagnosis.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'patient': patient.to_dict(),
        'diagnoses': [d.to_dict() for d in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    }), 200


@diagnosis_bp.route('/models', methods=['GET'])
@jwt_required()
def model_info():
    """Get information about available models."""
    info = {}
    for dtype, details in MODEL_INFO.items():
        # Check if model is trained
        trainer = None
        try:
            trainer = _get_trainer(dtype)
            trained = True
        except FileNotFoundError:
            trained = False

        info[dtype] = {
            **details,
            'trained': trained,
            'version': trainer.model_version if trainer else None,
        }

    return jsonify({'models': info}), 200


@diagnosis_bp.route('/analyze-notes', methods=['POST'])
@role_required('doctor', 'clinician', 'admin')
@rate_limit('diagnosis_analyze_notes')
def analyze_notes():
    """
    Analyze free-text clinical notes and classify urgency (routine/urgent/
    emergency) using a real trained TF-IDF + Logistic Regression NLP
    classifier. Returns the predicted tier, confidence, and the specific
    words in this note that drove the classification.
    """
    data = request.get_json()
    if not data or not data.get('text', '').strip():
        return jsonify({'error': 'text is required'}), 400

    text = data['text'].strip()
    if len(text) > 2000:
        return jsonify({'error': 'text must be 2000 characters or fewer'}), 400

    try:
        from app.ml.nlp_analyzer import analyze_clinical_notes
        result = analyze_clinical_notes(text)
        return jsonify({'analysis': result}), 200
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 503
    except Exception:
        return jsonify({'error': 'Unable to analyze notes right now. Please try again.'}), 500


@diagnosis_bp.route('/analyze-image', methods=['POST'])
@role_required('doctor', 'clinician', 'admin')
@rate_limit('diagnosis_analyze_image')
def analyze_image():
    """
    Classify an uploaded lesion image as benign or malignant-style using
    classical computer vision (HOG + color histogram + GLCM texture
    features, Random Forest classifier). Not a deep learning model --
    see app.ml.lesion_analyzer for why.
    """
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided (expected field name "image")'}), 400

    file = request.files['image']
    if not file or not file.filename:
        return jsonify({'error': 'No image file selected'}), 400

    allowed_extensions = {'.png', '.jpg', '.jpeg', '.bmp', '.webp'}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        return jsonify({'error': f'Unsupported file type. Allowed: {", ".join(sorted(allowed_extensions))}'}), 400

    # Cap upload size to keep memory usage bounded on free-tier hosting
    file.seek(0, os.SEEK_END)
    size_bytes = file.tell()
    file.seek(0)
    if size_bytes > 5 * 1024 * 1024:
        return jsonify({'error': 'Image must be 5MB or smaller'}), 400

    try:
        from PIL import Image
        pil_image = Image.open(file.stream)
        pil_image.load()  # force-decode now, so a corrupted file fails here, not later
    except Exception:
        return jsonify({'error': 'Could not read this file as an image'}), 400

    try:
        from app.ml.lesion_analyzer import analyze_lesion_image
        result = analyze_lesion_image(pil_image)
        return jsonify({'analysis': result}), 200
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 503
    except Exception:
        return jsonify({'error': 'Unable to analyze this image right now. Please try again.'}), 500


@diagnosis_bp.route('/analyze-labs', methods=['POST'])
@role_required('doctor', 'clinician', 'admin')
@rate_limit('diagnosis_analyze_labs')
def analyze_labs():
    """Parse one CSV lab record and run the matching validated ML pipeline."""
    if 'file' not in request.files:
        return jsonify({'error': 'No CSV file provided (expected field name "file")'}), 400

    file = request.files['file']
    if not file or not file.filename:
        return jsonify({'error': 'No CSV file selected'}), 400
    if not file.filename.lower().endswith('.csv'):
        return jsonify({'error': 'Only .csv files are supported'}), 400

    try:
        diagnosis_type, features = _parse_lab_csv(file)
        patient_id = request.form.get('patient_id', '').strip()
        if patient_id:
            patient = _validate_patient(patient_id)
            if not patient:
                return jsonify({'error': f'Patient with id {patient_id} not found'}), 404
            patient_id = patient.id
        result = _run_prediction(diagnosis_type, features, patient_id)
        return jsonify({
            'diagnosis_type': diagnosis_type,
            'features_used': list(features),
            'result': result,
        }), 200
    except MarshmallowValidationError as exc:
        return jsonify({'error': 'CSV values failed clinical validation', 'details': exc.messages}), 422
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 422
    except FileNotFoundError as exc:
        return jsonify({'error': str(exc)}), 503
    except Exception:
        return jsonify({'error': 'Unable to analyze this lab file right now. Please try again.'}), 500
