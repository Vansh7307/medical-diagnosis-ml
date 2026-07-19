"""
Tests for authentication endpoints.

Email verification is now DISABLED for regular registration/login: an account
is verified and logged in immediately on register. The /verify-otp and
/resend-otp endpoints still exist (used for the admin portal, which does
still enforce verification), so we test them against a manually-unverified
account rather than through the normal registration flow, since that flow
no longer produces one.
"""
import pytest
from tests.conftest import _solve_captcha


def _register(client, **overrides):
    token, answer = _solve_captcha(client)
    payload = {
        'username': 'newuser',
        'email': 'new@example.com',
        'password': 'password123',
        'full_name': 'New User',
        'captcha_token': token,
        'captcha_answer': answer,
    }
    payload.update(overrides)
    return client.post('/api/auth/register', json=payload)


def _login(client, username, password):
    token, answer = _solve_captcha(client)
    return client.post('/api/auth/login', json={
        'username': username,
        'password': password,
        'captcha_token': token,
        'captcha_answer': answer,
    })


class TestCaptcha:
    def test_captcha_returns_question_and_token(self, client):
        res = client.get('/api/auth/captcha')
        assert res.status_code == 200
        data = res.get_json()
        assert 'question' in data
        assert 'captcha_token' in data


class TestRegister:
    """Test user registration. Email verification is disabled: registering
    logs the user in immediately with an access token."""

    def test_register_success(self, client):
        res = _register(client)
        assert res.status_code == 201
        data = res.get_json()
        assert 'access_token' in data
        assert data['user']['username'] == 'newuser'
        assert data['user']['is_email_verified'] is True

    def test_register_wrong_captcha_answer(self, client):
        token, answer = _solve_captcha(client)
        res = client.post('/api/auth/register', json={
            'username': 'newuser2',
            'email': 'new2@example.com',
            'password': 'password123',
            'captcha_token': token,
            'captcha_answer': answer + 1,  # deliberately wrong
        })
        assert res.status_code == 400

    def test_register_missing_fields(self, client):
        res = client.post('/api/auth/register', json={'username': 'test'})
        assert res.status_code == 422  # marshmallow validation error

    def test_register_short_password(self, client):
        token, answer = _solve_captcha(client)
        res = client.post('/api/auth/register', json={
            'username': 'test', 'email': 'test@test.com', 'password': 'abc',
            'captcha_token': token, 'captcha_answer': answer,
        })
        assert res.status_code == 422

    def test_register_duplicate_username(self, client):
        _register(client, username='duplicate', email='dup1@test.com')
        res = _register(client, username='duplicate', email='dup2@test.com')
        assert res.status_code == 409

    def test_register_duplicate_email(self, client):
        _register(client, username='user1', email='same@test.com')
        res = _register(client, username='user2', email='same@test.com')
        assert res.status_code == 409

    def test_cannot_self_register_as_admin_or_doctor(self, client):
        token, answer = _solve_captcha(client)
        res = client.post('/api/auth/register', json={
            'username': 'sneaky', 'email': 'sneaky@test.com', 'password': 'password123',
            'role': 'admin', 'captcha_token': token, 'captcha_answer': answer,
        })
        assert res.status_code == 403


class TestOtpVerification:
    """The OTP endpoints still exist (used by the admin portal's verification
    requirement) but registration no longer produces an unverified account.
    These tests exercise the endpoints directly against a manually-unverified
    user to make sure that code path still works."""

    def _make_unverified_user(self, client, username, email):
        from app import db as _db
        from app.models.user import User

        _register(client, username=username, email=email)
        with client.application.app_context():
            user = User.query.filter_by(username=username).first()
            user.is_email_verified = False
            otp_code = user.generate_otp()
            _db.session.commit()
            return otp_code

    def test_verify_otp_success(self, client):
        code = self._make_unverified_user(client, 'otpuser', 'otp@test.com')
        res = client.post('/api/auth/verify-otp', json={'username': 'otpuser', 'otp_code': code})
        assert res.status_code == 200
        data = res.get_json()
        assert 'access_token' in data
        assert data['user']['is_email_verified'] is True

    def test_verify_otp_wrong_code(self, client):
        self._make_unverified_user(client, 'otpwrong', 'otpwrong@test.com')
        res = client.post('/api/auth/verify-otp', json={'username': 'otpwrong', 'otp_code': '000000'})
        assert res.status_code == 400

    def test_verify_otp_already_verified(self, client):
        _register(client, username='alreadyverified', email='already@test.com')
        res = client.post('/api/auth/verify-otp', json={'username': 'alreadyverified', 'otp_code': '000000'})
        assert res.status_code == 400

    def test_resend_otp_does_not_leak_existence(self, client):
        res = client.post('/api/auth/resend-otp', json={'username': 'nobody-here'})
        assert res.status_code == 200


class TestLogin:
    """Test user login. Registration auto-verifies now, so a freshly
    registered account can log in immediately -- no verification step needed."""

    def test_register_then_login_immediately(self, client):
        _register(client, username='loginuser', email='login@test.com')
        res = _login(client, 'loginuser', 'password123')
        assert res.status_code == 200
        data = res.get_json()
        assert 'access_token' in data
        assert data['user']['username'] == 'loginuser'

    def test_login_wrong_password(self, client):
        _register(client, username='wrongpw', email='wrongpw@test.com')
        res = _login(client, 'wrongpw', 'wrongpassword')
        assert res.status_code == 401

    def test_login_nonexistent_user(self, client):
        res = _login(client, 'nonexistent', 'password123')
        assert res.status_code == 401

    def test_login_missing_fields(self, client):
        res = client.post('/api/auth/login', json={'username': 'test'})
        assert res.status_code == 422  # marshmallow validation error

    def test_login_deactivated_account(self, client):
        from app import db as _db
        from app.models.user import User

        _register(client, username='deactivated', email='deactivated@test.com')
        with client.application.app_context():
            user = User.query.filter_by(username='deactivated').first()
            user.is_active = False
            _db.session.commit()

        res = _login(client, 'deactivated', 'password123')
        assert res.status_code == 403

    def test_login_wrong_portal_role_mismatch(self, client):
        """A patient-role account trying to log in via the 'doctor' portal tab should be rejected."""
        _register(client, username='patientuser', email='patientuser@test.com')
        token, answer = _solve_captcha(client)
        res = client.post('/api/auth/login', json={
            'username': 'patientuser',
            'password': 'password123',
            'captcha_token': token,
            'captcha_answer': answer,
            'portal': 'doctor',
        })
        assert res.status_code == 403

    def test_login_correct_portal_succeeds(self, client):
        _register(client, username='patientuser2', email='patientuser2@test.com')
        token, answer = _solve_captcha(client)
        res = client.post('/api/auth/login', json={
            'username': 'patientuser2',
            'password': 'password123',
            'captcha_token': token,
            'captcha_answer': answer,
            'portal': 'patient',
        })
        assert res.status_code == 200


class TestProfile:
    """Test profile endpoints."""

    def test_get_profile(self, client, auth_headers):
        res = client.get('/api/auth/profile', headers=auth_headers)
        assert res.status_code == 200
        data = res.get_json()
        assert data['user']['username'] == 'testuser'

    def test_get_profile_unauthorized(self, client):
        res = client.get('/api/auth/profile')
        assert res.status_code == 401

    def test_update_profile(self, client, auth_headers):
        res = client.put('/api/auth/profile', json={
            'full_name': 'Updated Name'
        }, headers=auth_headers)
        assert res.status_code == 200
        data = res.get_json()
        assert data['user']['full_name'] == 'Updated Name'