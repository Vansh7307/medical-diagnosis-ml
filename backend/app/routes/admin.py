"""
Admin portal routes.
Lets admins see every registered/logged-in user and their details,
promote/demote roles, activate/deactivate accounts, and review login history.
Every route requires role == 'admin'.
"""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from marshmallow import Schema, fields, validate, ValidationError as MarshmallowValidationError

from app import db
from app.models.user import User
from app.models.patient import Patient
from app.models.login_history import LoginHistory
from app.utils.decorators import role_required

admin_bp = Blueprint('admin', __name__)

VALID_ROLES = ['patient', 'clinician', 'doctor', 'admin']


class RoleUpdateSchema(Schema):
    role = fields.String(required=True, validate=validate.OneOf(VALID_ROLES))


class StatusUpdateSchema(Schema):
    is_active = fields.Boolean(required=True)


ROLE_SCHEMA = RoleUpdateSchema()
STATUS_SCHEMA = StatusUpdateSchema()


@admin_bp.route('/bootstrap-admin', methods=['POST'])
def bootstrap_admin():
    """One-time endpoint to promote user to admin. Disabled once an admin exists."""
    if User.query.filter_by(role='admin').first():
        return jsonify({'error': 'An admin already exists. Use the admin portal to manage roles.'}), 403
    data = request.get_json() or {}
    secret = data.get('secret')
    if secret != 'bootstrap-meddiagnose-2024':
        return jsonify({'error': 'Invalid secret'}), 403
    username = data.get('username')
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    user.role = 'admin'
    db.session.commit()
    return jsonify({'message': f'{username} is now admin'}), 200


@admin_bp.route('/link-patient', methods=['POST'])
@role_required('admin')
def link_patient():
    """Manually connect an existing login account to an existing patient
    record. Needed for accounts/records created before auto-linking existed
    -- new registrations link automatically, but old ones don't retroactively.

    Body: { "username": "...", "patient_code": "PAT-AFD9477D" }
    """
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    patient_code = data.get('patient_code', '').strip()

    if not username or not patient_code:
        return jsonify({'error': 'username and patient_code are both required'}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': f'No user found with username "{username}"'}), 404

    patient = Patient.query.filter_by(patient_id=patient_code).first()
    if not patient:
        return jsonify({'error': f'No patient found with code "{patient_code}"'}), 404

    if patient.user_id and patient.user_id != user.id:
        return jsonify({'error': f'That patient record is already linked to a different account (user id {patient.user_id})'}), 409

    existing_link = Patient.query.filter_by(user_id=user.id).first()
    if existing_link and existing_link.id != patient.id:
        return jsonify({'error': f'That user is already linked to a different patient record ({existing_link.patient_id})'}), 409

    patient.user_id = user.id
    db.session.commit()

    return jsonify({
        'message': f'Linked {username} to patient {patient_code}',
        'patient': patient.to_dict(),
    }), 200


@admin_bp.route('/link-patient', methods=['DELETE'])
@role_required('admin')
def unlink_patient():
    """Remove the link between a patient record and a login account
    (e.g. it was linked to the wrong person by mistake)."""
    data = request.get_json() or {}
    patient_code = data.get('patient_code', '').strip()

    patient = Patient.query.filter_by(patient_id=patient_code).first()
    if not patient:
        return jsonify({'error': f'No patient found with code "{patient_code}"'}), 404

    patient.user_id = None
    db.session.commit()

    return jsonify({'message': f'Unlinked patient {patient_code}'}), 200


@admin_bp.route('/users', methods=['GET'])
@role_required('admin')
def list_users():
    """List every registered user, with login/verification details, paginated + searchable."""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    search = request.args.get('search', '', type=str)
    role_filter = request.args.get('role', '', type=str)

    query = User.query

    if search:
        term = f'%{search}%'
        query = query.filter(
            db.or_(
                User.username.ilike(term),
                User.email.ilike(term),
                User.full_name.ilike(term),
            )
        )

    if role_filter:
        query = query.filter(User.role == role_filter)

    query = query.order_by(User.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'users': [u.to_dict() for u in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
        'per_page': per_page,
    }), 200


@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@role_required('admin')
def get_user(user_id):
    """Full detail on a single user, including their recent login history."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    history = (LoginHistory.query
               .filter_by(user_id=user_id)
               .order_by(LoginHistory.created_at.desc())
               .limit(50)
               .all())

    return jsonify({
        'user': user.to_dict(),
        'login_history': [h.to_dict() for h in history],
    }), 200


@admin_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@role_required('admin')
def update_user_role(user_id):
    """Promote/demote a user's role (patient, clinician, doctor, admin)."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}
    try:
        validated = ROLE_SCHEMA.load(data)
    except MarshmallowValidationError as e:
        return jsonify({'error': 'Validation failed', 'details': e.messages}), 422

    user.role = validated['role']
    user.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({'message': 'Role updated successfully', 'user': user.to_dict()}), 200


@admin_bp.route('/users/<int:user_id>/status', methods=['PUT'])
@role_required('admin')
def update_user_status(user_id):
    """Activate or deactivate a user account."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}
    try:
        validated = STATUS_SCHEMA.load(data)
    except MarshmallowValidationError as e:
        return jsonify({'error': 'Validation failed', 'details': e.messages}), 422

    user.is_active = validated['is_active']
    user.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({'message': 'Status updated successfully', 'user': user.to_dict()}), 200


@admin_bp.route('/login-history', methods=['GET'])
@role_required('admin')
def login_history():
    """Every login attempt (success and failure) across all users."""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 25, type=int), 100)

    query = LoginHistory.query.order_by(LoginHistory.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'events': [h.to_dict() for h in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    }), 200


@admin_bp.route('/stats', methods=['GET'])
@role_required('admin')
def stats():
    """Summary counts for the admin dashboard."""
    total_users = User.query.count()
    verified_users = User.query.filter_by(is_email_verified=True).count()
    active_users = User.query.filter_by(is_active=True).count()

    by_role = {}
    for role in VALID_ROLES:
        by_role[role] = User.query.filter_by(role=role).count()

    recent_logins = LoginHistory.query.filter_by(success=True).count()
    failed_logins = LoginHistory.query.filter_by(success=False).count()

    return jsonify({
        'total_users': total_users,
        'verified_users': verified_users,
        'unverified_users': total_users - verified_users,
        'active_users': active_users,
        'inactive_users': total_users - active_users,
        'by_role': by_role,
        'successful_logins': recent_logins,
        'failed_logins': failed_logins,
    }), 200