"""
Analytics and reporting routes.
Provides dashboard stats, model performance, and drift detection results.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from sqlalchemy import func, desc

from app import db
from app.models.diagnosis import Diagnosis
from app.models.patient import Patient
from app.ml.trainer import ModelTrainer
from app.routes.diagnosis import _get_trainer
from app.ml.evaluator import ModelEvaluator
from app.ml.pipelines import MODEL_INFO
from app.data.dataset_loader import load_heart_disease, load_diabetes, load_breast_cancer
from app.data.preprocessor import MedicalDataPreprocessor
from app.mlops.monitoring import ModelMonitor
from app.mlops.versioning import ModelVersionManager

analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard_stats():
    """Get dashboard overview statistics.

    Staff (doctor/clinician/admin) see clinic-wide stats. A patient-role
    login instead sees only their own linked record and diagnoses -- they
    should never see other patients' data on their dashboard.
    """
    claims = get_jwt()
    if claims.get('role') == 'patient':
        return _patient_dashboard_stats()

    total_patients = Patient.query.count()
    total_diagnoses = Diagnosis.query.count()
    
    # Diagnosis counts by type
    type_counts = db.session.query(
        Diagnosis.diagnosis_type,
        func.count(Diagnosis.id)
    ).group_by(Diagnosis.diagnosis_type).all()
    diagnosis_by_type = {t: c for t, c in type_counts}
    
    # Prediction distribution
    prediction_counts = db.session.query(
        Diagnosis.diagnosis_type,
        Diagnosis.prediction,
        func.count(Diagnosis.id)
    ).group_by(Diagnosis.diagnosis_type, Diagnosis.prediction).all()
    
    predictions = {}
    for dtype, pred, count in prediction_counts:
        if dtype not in predictions:
            predictions[dtype] = {}
        predictions[dtype][pred] = count
    
    # Recent diagnoses
    recent = Diagnosis.query.order_by(
        desc(Diagnosis.created_at)
    ).limit(10).all()
    
    # Average confidence by type
    avg_confidence = db.session.query(
        Diagnosis.diagnosis_type,
        func.avg(Diagnosis.confidence)
    ).group_by(Diagnosis.diagnosis_type).all()
    confidence_by_type = {t: round(float(c), 4) for t, c in avg_confidence}
    
    # Model info
    models_status = {}
    for dtype in ['heart', 'diabetes', 'cancer']:
        try:
            trainer = _get_trainer(dtype)
            models_status[dtype] = {
                'name': MODEL_INFO[dtype]['name'],
                'trained': True,
                'version': trainer.model_version,
                'metrics': trainer.metrics,
            }
        except FileNotFoundError:
            models_status[dtype] = {
                'name': MODEL_INFO[dtype]['name'],
                'trained': False,
                'version': None,
                'metrics': None,
            }
    
    return jsonify({
        'role_view': 'staff',
        'total_patients': total_patients,
        'total_diagnoses': total_diagnoses,
        'diagnosis_by_type': diagnosis_by_type,
        'predictions': predictions,
        'confidence_by_type': confidence_by_type,
        'recent_diagnoses': [d.to_dict() for d in recent],
        'models': models_status,
    }), 200


def _patient_dashboard_stats():
    """Scoped dashboard for a patient-role login: only their own data."""
    user_id = int(get_jwt_identity())
    patient = Patient.query.filter_by(user_id=user_id).first()

    models_status = {}
    for dtype in ['heart', 'diabetes', 'cancer']:
        try:
            trainer = _get_trainer(dtype)
            models_status[dtype] = {'name': MODEL_INFO[dtype]['name'], 'trained': True}
        except FileNotFoundError:
            models_status[dtype] = {'name': MODEL_INFO[dtype]['name'], 'trained': False}

    if not patient:
        return jsonify({
            'role_view': 'patient',
            'linked': False,
            'message': 'No patient record is linked to your account yet.',
            'total_diagnoses': 0,
            'diagnosis_by_type': {},
            'recent_diagnoses': [],
            'models': models_status,
        }), 200

    diagnoses = Diagnosis.query.filter_by(patient_id=patient.id)
    total_diagnoses = diagnoses.count()

    type_counts = db.session.query(
        Diagnosis.diagnosis_type,
        func.count(Diagnosis.id)
    ).filter(Diagnosis.patient_id == patient.id).group_by(Diagnosis.diagnosis_type).all()
    diagnosis_by_type = {t: c for t, c in type_counts}

    recent = diagnoses.order_by(desc(Diagnosis.created_at)).limit(10).all()

    return jsonify({
        'role_view': 'patient',
        'linked': True,
        'patient': patient.to_dict(),
        'total_diagnoses': total_diagnoses,
        'diagnosis_by_type': diagnosis_by_type,
        'recent_diagnoses': [d.to_dict() for d in recent],
        'models': models_status,
    }), 200


@analytics_bp.route('/models', methods=['GET'])
@jwt_required()
def model_details():
    """Get detailed model versions and metrics."""
    version_mgr = ModelVersionManager()
    model_details = {}
    
    for dtype in ['heart', 'diabetes', 'cancer']:
        try:
            trainer = _get_trainer(dtype)
            
            # Get version history
            versions = version_mgr.get_versions(dtype)
            
            model_details[dtype] = {
                'name': MODEL_INFO[dtype]['name'],
                'description': MODEL_INFO[dtype]['description'],
                'current_version': trainer.model_version,
                'current_metrics': trainer.metrics,
                'feature_importance': trainer.feature_importance,
                'versions': versions,
                'trained': True,
            }
        except FileNotFoundError:
            model_details[dtype] = {
                'name': MODEL_INFO[dtype]['name'],
                'description': MODEL_INFO[dtype]['description'],
                'trained': False,
                'versions': [],
            }
    
    return jsonify({'models': model_details}), 200


@analytics_bp.route('/evaluation/<diagnosis_type>', methods=['GET'])
@jwt_required()
def model_evaluation(diagnosis_type):
    """Get full evaluation report for a specific model.
    Uses the model's saved preprocessor (fit on training data only) to avoid data leakage.
    """
    if diagnosis_type not in MODEL_INFO:
        return jsonify({'error': f'Unknown diagnosis type: {diagnosis_type}'}), 400

    try:
        trainer = _get_trainer(diagnosis_type)
    except FileNotFoundError:
        return jsonify({'error': f'No trained model found for {diagnosis_type}'}), 404

    # Load test data for evaluation
    loaders = {
        'heart': load_heart_disease,
        'diabetes': load_diabetes,
        'cancer': load_breast_cancer,
    }

    df = loaders[diagnosis_type]()

    # IMPORTANT: Use the model's saved preprocessor (fit on training data only)
    # to prevent data leakage from test set statistics into normalization
    preprocessor = trainer.preprocessor
    target_col = 'Outcome' if diagnosis_type == 'diabetes' else 'target'
    X_all = df.drop(columns=[target_col]).values
    y_all = df[target_col].values

    # Replicate the same train/test split used during training (80/20)
    split = int(len(X_all) * 0.8)
    X_test = preprocessor.scaler.transform(X_all[split:]) if hasattr(preprocessor, 'scaler') else X_all[split:]
    y_test = y_all[split:]

    evaluator = ModelEvaluator(
        diagnosis_type, trainer.pipeline, X_test, y_test, preprocessor
    )

    report = evaluator.full_evaluation_report(df.iloc[split:])

    return jsonify(report), 200


@analytics_bp.route('/drift', methods=['GET'])
@jwt_required()
def drift_detection():
    """Get model drift detection results for all models."""
    results = {}
    
    for dtype in ['heart', 'diabetes', 'cancer']:
        monitor = ModelMonitor(dtype)
        drift_report = monitor.get_drift_report()
        results[dtype] = drift_report
    
    return jsonify({'drift_reports': results}), 200


@analytics_bp.route('/model-cards', methods=['GET'])
@jwt_required()
def model_cards():
    """Get FDA-compliant model cards for all models."""
    from app.ml.model_cards import get_all_model_cards
    return jsonify({'model_cards': get_all_model_cards()}), 200


@analytics_bp.route('/model-cards/<diagnosis_type>', methods=['GET'])
@jwt_required()
def model_card_detail(diagnosis_type):
    """Get model card for a specific diagnosis type."""
    if diagnosis_type not in MODEL_INFO:
        return jsonify({'error': f'Unknown diagnosis type: {diagnosis_type}'}), 400

    from app.ml.model_cards import get_model_card
    card = get_model_card(diagnosis_type)
    return jsonify({'model_card': card}), 200