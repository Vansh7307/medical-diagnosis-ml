"""
Diagnosis prediction routes.
Handles ML model predictions for heart, diabetes, cancer, multi-diagnosis,
and SHAP-based model explainability.
Includes input validation, rate limiting, and structured audit logging.
"""
import json
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
from app.validation import (
    HeartDiseaseFeaturesSchema,
    DiabetesFeaturesSchema,
    CancerFeaturesSchema,
    DiagnosisInputSchema,
    MultiDiagnosisSchema,
    PaginationSchema,
)

diagnosis_bp = Blueprint('diagnosis', __name__)

# Cache trained models
_model_cache = {}
ml_logger = MLLogger()

# Validation schemas
HEART_SCHEMA = HeartDiseaseFeaturesSchema()
DIABETES_SCHEMA = DiabetesFeaturesSchema()
CANCER_SCHEMA = CancerFeaturesSchema()
DIAGNOSIS_INPUT_SCHEMA = DiagnosisInputSchema()
MULTI_DIAGNOSIS_SCHEMA = MultiDiagnosisSchema()
PAGINATION_SCHEMA = PaginationSchema()


def _get_trainer(diagnosis_type):
    """Get or create a cached trainer instance."""
    if diagnosis_type not in _model_cache:
        trainer = ModelTrainer(diagnosis_type)
        trainer._load_model()
        _model_cache[diagnosis_type] = trainer
    return _model_cache[diagnosis_type]


def _validate_patient(patient_id):
    """Validate that a patient exists."""
    if patient_id:
        patient = Patient.query.get(patient_id)
        if not patient:
            return None
        return patient
    return None


def _validate_features(diagnosis_type, features):
    """Validate features using the appropriate schema."""
    schemas = {
        'heart': HEART_SCHEMA,
        'diabetes': DIABETES_SCHEMA,
        'cancer': CANCER_SCHEMA,
    }
    schema = schemas.get(diagnosis_type)
    if schema:
        # Use the schema to validate (load normalizes + validates)
        schema.load(features)
    return True


def _run_prediction(diagnosis_type, features, patient_id=None, save_to_db=True):
    """Run a single prediction and optionally save result.

    Args:
        save_to_db: Set to False when called from multi-diagnosis
                    to avoid duplicate records (the multi endpoint
                    creates a single summary record instead).
    """
    trainer = _get_trainer(diagnosis_type)
    result = trainer.predict(features)

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

    return result


@diagnosis_bp.route('/heart', methods=['POST'])
@jwt_required()
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
    if patient_id and not _validate_patient(patient_id):
        return jsonify({'error': f'Patient with id {patient_id} not found'}), 404

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
@jwt_required()
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
    if patient_id and not _validate_patient(patient_id):
        return jsonify({'error': f'Patient with id {patient_id} not found'}), 404

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
@jwt_required()
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
    if patient_id and not _validate_patient(patient_id):
        return jsonify({'error': f'Patient with id {patient_id} not found'}), 404

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
@jwt_required()
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
    if patient_id and not _validate_patient(patient_id):
        return jsonify({'error': f'Patient with id {patient_id} not found'}), 404

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
@jwt_required()
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