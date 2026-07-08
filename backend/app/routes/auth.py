"""
Authentication routes.
Handles user registration (with CAPTCHA + email OTP verification) and JWT login.
Uses marshmallow validation schemas for strict input validation.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from marshmallow import ValidationError as MarshmallowValidationError

from app import db
from app.models.user import User
from app.models.login_history import LoginHistory
from app.validation import (
    UserRegistrationSchema, UserLoginSchema, OTPVerifySchema, OTPResendSchema,
    ForgotPasswordSchema, ResetPasswordSchema,
)
from app.utils.captcha import generate_captcha, verify_captcha
from app.utils.email import send_otp_email, send_password_reset_email

auth_bp = Blueprint('auth', __name__)

REGISTRATION_SCHEMA = UserRegistrationSchema()
LOGIN_SCHEMA = UserLoginSchema()
OTP_VERIFY_SCHEMA = OTPVerifySchema()
OTP_RESEND_SCHEMA = OTPResendSchema()
FORGOT_PASSWORD_SCHEMA = ForgotPasswordSchema()
RESET_PASSWORD_SCHEMA = ResetPasswordSchema()


def _log_login_attempt(username, success, reason=None, user_id=None):
    entry = LoginHistory(
        user_id=user_id,
        username=username,
        success=success,
        reason=reason,
        ip_address=request.headers.get('X-Forwarded-For', request.remote_addr),
        user_agent=request.headers.get('User-Agent', '')[:255],
    )
    db.session.add(entry)
    db.session.commit()


@auth_bp.route('/captcha', methods=['GET'])
def captcha():
    """Return a fresh CAPTCHA challenge for the login/register form."""
    return jsonify(generate_captcha()), 200


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user. Requires CAPTCHA; account starts unverified until OTP is confirmed."""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No input data provided'}), 400

    try:
        validated = REGISTRATION_SCHEMA.load(data)
    except MarshmallowValidationError as e:
        return jsonify({'error': 'Validation failed', 'details': e.messages}), 422

    ok, captcha_error = verify_captcha(validated['captcha_token'], validated['captcha_answer'])
    if not ok:
        return jsonify({'error': captcha_error}), 400

    username = validated['username']
    email = validated['email']
    password = validated['password']
    full_name = validated.get('full_name', '')
    role = validated.get('role', 'patient')

    # SECURITY: Never allow self-registration as admin/doctor.
    # These roles must be assigned by an existing admin via the admin portal.
    if role in ('admin', 'doctor'):
        return jsonify({'error': 'Cannot self-register with elevated role'}), 403

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    user = User(
        username=username,
        email=email,
        full_name=full_name,
        role=role,
        is_email_verified=False,
    )
    user.set_password(password)
    otp_code = user.generate_otp()

    db.session.add(user)
    db.session.commit()

    mail_result = send_otp_email(user, otp_code)

    response = {
        'message': 'Registered successfully. Check your email for a 6-digit verification code.',
        'username': user.username,
        'otp_required': True,
    }
    # Local/dev convenience: if mail isn't configured yet, surface the OTP so
    # the flow can still be tested end-to-end (never done when mail IS configured).
    if not mail_result.get('sent'):
        response['dev_note'] = 'Email not configured yet -- OTP was logged on the server console.'

    return jsonify(response), 201


@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    """Confirm the emailed OTP and activate the account. Logs the user in on success."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No input data provided'}), 400

    try:
        validated = OTP_VERIFY_SCHEMA.load(data)
    except MarshmallowValidationError as e:
        return jsonify({'error': 'Validation failed', 'details': e.messages}), 422

    user = User.query.filter_by(username=validated['username']).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if user.is_email_verified:
        return jsonify({'error': 'Email already verified'}), 400

    if not user.verify_otp(validated['otp_code']):
        return jsonify({'error': 'Invalid or expired verification code'}), 400

    user.record_login()
    db.session.commit()
    _log_login_attempt(user.username, success=True, reason='otp_verified', user_id=user.id)

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={'username': user.username, 'role': user.role},
    )

    return jsonify({
        'message': 'Email verified successfully',
        'access_token': access_token,
        'user': user.to_dict(),
    }), 200


@auth_bp.route('/resend-otp', methods=['POST'])
def resend_otp():
    """Issue a new OTP code (invalidates the previous one)."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No input data provided'}), 400

    try:
        validated = OTP_RESEND_SCHEMA.load(data)
    except MarshmallowValidationError as e:
        return jsonify({'error': 'Validation failed', 'details': e.messages}), 422

    user = User.query.filter_by(username=validated['username']).first()
    # Don't reveal whether a username exists.
    if not user or user.is_email_verified:
        return jsonify({'message': 'If the account exists and is unverified, a new code has been sent.'}), 200

    otp_code = user.generate_otp()
    db.session.commit()
    send_otp_email(user, otp_code)

    return jsonify({'message': 'If the account exists and is unverified, a new code has been sent.'}), 200


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Start a password reset: emails a 6-digit OTP if the account exists.
    Requires CAPTCHA. Never reveals whether the email is registered."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No input data provided'}), 400

    try:
        validated = FORGOT_PASSWORD_SCHEMA.load(data)
    except MarshmallowValidationError as e:
        return jsonify({'error': 'Validation failed', 'details': e.messages}), 422

    ok, captcha_error = verify_captcha(validated['captcha_token'], validated['captcha_answer'])
    if not ok:
        return jsonify({'error': captcha_error}), 400

    generic_response = {
        'message': 'If an account with that email exists, a password reset code has been sent.'
    }

    user = User.query.filter_by(email=validated['email']).first()
    if not user or not user.is_active:
        return jsonify(generic_response), 200

    otp_code = user.generate_reset_otp()
    db.session.commit()
    send_password_reset_email(user, otp_code)

    return jsonify(generic_response), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Complete a password reset using the emailed OTP."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No input data provided'}), 400

    try:
        validated = RESET_PASSWORD_SCHEMA.load(data)
    except MarshmallowValidationError as e:
        return jsonify({'error': 'Validation failed', 'details': e.messages}), 422

    user = User.query.filter_by(email=validated['email']).first()
    if not user or not user.verify_reset_otp(validated['otp_code']):
        return jsonify({'error': 'Invalid or expired reset code'}), 400

    user.set_password(validated['new_password'])
    user.clear_reset_otp()
    db.session.commit()

    return jsonify({'message': 'Password reset successfully. You can now log in.'}), 200

@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token. Requires CAPTCHA + a verified email."""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No input data provided'}), 400

    try:
        validated = LOGIN_SCHEMA.load(data)
    except MarshmallowValidationError as e:
        return jsonify({'error': 'Validation failed', 'details': e.messages}), 422

    ok, captcha_error = verify_captcha(validated['captcha_token'], validated['captcha_answer'])
    if not ok:
        return jsonify({'error': captcha_error}), 400

    username = validated['username']
    password = validated['password']

    user = User.query.filter_by(username=username).first()

    if not user or not user.check_password(password):
        _log_login_attempt(username, success=False, reason='invalid_credentials',
                            user_id=user.id if user else None)
        return jsonify({'error': 'Invalid username or password'}), 401

    if not user.is_active:
        _log_login_attempt(username, success=False, reason='account_deactivated', user_id=user.id)
        return jsonify({'error': 'Account is deactivated'}), 403

    if not user.is_email_verified:
        _log_login_attempt(username, success=False, reason='email_not_verified', user_id=user.id)
        return jsonify({
            'error': 'Email not verified. Please verify your email before logging in.',
            'otp_required': True,
            'username': user.username,
        }), 403

    user.record_login()
    db.session.commit()
    _log_login_attempt(username, success=True, user_id=user.id)

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