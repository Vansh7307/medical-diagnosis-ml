"""Clinical report export endpoints."""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.models.patient import Patient
from app.models.diagnosis import Diagnosis

reports_bp = Blueprint('reports', __name__)


@reports_bp.route('/generate/<string:patient_id>', methods=['GET'])
@jwt_required()
def generate_report(patient_id):
    """Return a compact, printable clinical-summary payload for one patient."""
    patient = Patient.query.filter_by(patient_id=patient_id).first()
    if patient is None and patient_id.isdigit():
        patient = Patient.query.get(int(patient_id))
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    diagnoses = Diagnosis.query.filter_by(patient_id=patient.id).order_by(Diagnosis.created_at.desc()).limit(20).all()
    return jsonify({
        'report_type': 'clinical_summary',
        'patient': patient.to_dict(),
        'diagnoses': [item.to_dict() for item in diagnoses],
        'recommendation': 'Review this decision-support summary with the treating clinician before acting.',
        'printable': True,
    }), 200
