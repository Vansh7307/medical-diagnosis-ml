"""
Patient CRUD routes.
Handles patient record management with role-based access control.
"""
import uuid
import functools
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from app import db
from app.models.patient import Patient
from app.models.user import User

patients_bp = Blueprint('patients', __name__)


def role_required(*roles):
    """
    Decorator that checks if the current user has one of the required roles.
    Prevents unauthorized access to patient records (HIPAA minimum necessary).
    """
    def decorator(f):
        @functools.wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            claims = get_jwt()
            user_role = claims.get('role', 'patient')
            if user_role not in roles:
                return jsonify({
                    'error': 'Forbidden',
                    'message': f'Access requires one of these roles: {", ".join(roles)}'
                }), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator


@patients_bp.route('/me', methods=['GET'])
@jwt_required()
def get_my_patient_record():
    """Self-service: return the Patient record linked to the current login,
    if any. Available to any logged-in user (not just staff) so a patient
    can see their own patient code and details."""
    user_id = int(get_jwt_identity())
    patient = Patient.query.filter_by(user_id=user_id).first()

    if not patient:
        return jsonify({
            'linked': False,
            'message': 'No patient record is linked to your account yet. '
                       'Ask the clinic to link your record, or make sure you '
                       'registered with the same email on file with them.',
        }), 404

    return jsonify({'linked': True, 'patient': patient.to_dict()}), 200


@patients_bp.route('', methods=['GET'])
@role_required('doctor', 'admin', 'clinician')
def list_patients():
    """List all patients with optional search and pagination.
    Requires: doctor, admin, or clinician role.
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '', type=str)

    query = Patient.query

    if search:
        search_filter = f'%{search}%'
        query = query.filter(
            db.or_(
                Patient.first_name.ilike(search_filter),
                Patient.last_name.ilike(search_filter),
                Patient.patient_id.ilike(search_filter),
                Patient.email.ilike(search_filter),
            )
        )

    query = query.order_by(Patient.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'patients': [p.to_dict() for p in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
        'per_page': per_page,
    }), 200


@patients_bp.route('', methods=['POST'])
@role_required('doctor', 'admin', 'clinician')
def create_patient():
    """Create a new patient record.
    Requires: doctor, admin, or clinician role.
    """
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No input data provided'}), 400

    first_name = data.get('first_name')
    last_name = data.get('last_name')

    if not all([first_name, last_name]):
        return jsonify({'error': 'first_name and last_name are required'}), 400

    # Generate unique patient ID
    patient_id = data.get('patient_id') or f"PAT-{uuid.uuid4().hex[:8].upper()}"

    # Check uniqueness
    if Patient.query.filter_by(patient_id=patient_id).first():
        return jsonify({'error': f'Patient ID {patient_id} already exists'}), 409

    # Parse date of birth
    dob = None
    if data.get('date_of_birth'):
        try:
            dob = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    patient = Patient(
        patient_id=patient_id,
        first_name=first_name,
        last_name=last_name,
        date_of_birth=dob,
        gender=data.get('gender'),
        email=data.get('email'),
        phone=data.get('phone'),
        address=data.get('address'),
        blood_type=data.get('blood_type'),
        medical_history=data.get('medical_history'),
        allergies=data.get('allergies'),
        emergency_contact_name=data.get('emergency_contact_name'),
        emergency_contact_phone=data.get('emergency_contact_phone'),
    )

    # If a patient login account with this same email already exists and
    # isn't linked to a record yet, connect it now so that user immediately
    # sees this record as theirs.
    if patient.email:
        matching_user = User.query.filter(
            db.func.lower(User.email) == patient.email.lower(),
            User.role == 'patient',
        ).first()
        if matching_user and not Patient.query.filter_by(user_id=matching_user.id).first():
            patient.user_id = matching_user.id

    db.session.add(patient)
    db.session.commit()

    return jsonify({
        'message': 'Patient created successfully',
        'patient': patient.to_dict()
    }), 201


@patients_bp.route('/<int:patient_id>', methods=['GET'])
@role_required('doctor', 'admin', 'clinician')
def get_patient(patient_id):
    """Get a single patient by ID.
    Requires: doctor, admin, or clinician role.
    """
    patient = Patient.query.get(patient_id)

    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    return jsonify({'patient': patient.to_dict()}), 200


@patients_bp.route('/<int:patient_id>', methods=['PUT'])
@role_required('doctor', 'admin', 'clinician')
def update_patient(patient_id):
    """Update a patient record.
    Requires: doctor, admin, or clinician role.
    """
    patient = Patient.query.get(patient_id)

    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    data = request.get_json()

    # Update fields
    updatable_fields = [
        'first_name', 'last_name', 'gender', 'email', 'phone',
        'address', 'blood_type', 'medical_history', 'allergies',
        'emergency_contact_name', 'emergency_contact_phone'
    ]

    for field in updatable_fields:
        if field in data:
            setattr(patient, field, data[field])

    if 'date_of_birth' in data and data['date_of_birth']:
        try:
            patient.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    db.session.commit()

    return jsonify({
        'message': 'Patient updated successfully',
        'patient': patient.to_dict()
    }), 200


@patients_bp.route('/<int:patient_id>', methods=['DELETE'])
@role_required('admin')
def delete_patient(patient_id):
    """Delete a patient record.
    Requires: admin role only (destructive operation).
    """
    patient = Patient.query.get(patient_id)

    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    db.session.delete(patient)
    db.session.commit()

    return jsonify({'message': 'Patient deleted successfully'}), 200