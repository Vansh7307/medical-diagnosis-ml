"""
Authentication routes.
Handles user registration and JWT login.
Uses marshmallow validation schemas for strict input validation.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from marshmallow import ValidationError as MarshmallowValidationError

from app import db
from app.models.user import User
from app.validation import UserRegistrationSchema, UserLoginSchema

auth_bp = Blueprint('auth', __name__)

REGISTRATION_SCHEMA = UserRegistrationSchema()
LOGIN_SCHEMA = UserLoginSchema()


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user with strict schema validation."""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No input data provided'}), 400

    # Validate with marshmallow schema (prevents role escalation)
    try:
        validated = REGISTRATION_SCHEMA.load(data)
    except MarshmallowValidationError as e:
        return jsonify({'error': 'Validation failed', 'details': e.messages}), 422

    username = validated['username']
    email = validated['email']
    password = validated['password']
    full_name = validated.get('full_name', '')
    role = validated.get('role', 'patient')

    # SECURITY: Never allow self-registration as admin/doctor
    # These roles must be assigned by existing admins
    if role in ('admin', 'doctor'):
        return jsonify({'error': 'Cannot self-register with elevated role'}), 403

    # Check if user exists
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    # Create user
    user = User(
        username=username,
        email=email,
        full_name=full_name,
        role=role
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    return jsonify({
        'message': 'User registered successfully',
        'user': user.to_dict()
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token."""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No input data provided'}), 400

    # Validate with schema
    try:
        validated = LOGIN_SCHEMA.load(data)
    except MarshmallowValidationError as e:
        return jsonify({'error': 'Validation failed', 'details': e.messages}), 422

    username = validated['username']
    password = validated['password']

    user = User.query.filter_by(username=username).first()

    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid username or password'}), 401

    if not user.is_active:
        return jsonify({'error': 'Account is deactivated'}), 403

    # Create JWT token
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            'username': user.username,
            'role': user.role,
        }
    )

    return jsonify({
        'access_token': access_token,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get current user profile."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict()}), 200


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update current user profile."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    if 'full_name' in data:
        user.full_name = data['full_name']
    if 'email' in data:
        existing = User.query.filter(User.email == data['email'], User.id != user_id).first()
        if existing:
            return jsonify({'error': 'Email already in use'}), 409
        user.email = data['email']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Profile updated successfully',
        'user': user.to_dict()
    }), 200
