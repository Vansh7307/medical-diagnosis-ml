"""
Tests for authentication endpoints (register -> OTP verify -> login),
now guarded by CAPTCHA and email verification.
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
    """Test user registration."""

    def test_register_success(self, client):
        res = _register(client)
        assert res.status_code == 201
        data = res.get_json()
        assert data['otp_required'] is True
        assert data['username'] == 'newuser'

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


class TestOtpVerification:
    """Test the email OTP verification step."""

    def test_verify_otp_success(self, client):
        from app.models.user import User

        _register(client, username='otpuser', email='otp@test.com')
        with client.application.app_context():
            user = User.query.filter_by(username='otpuser').first()
            code = user.otp_code

        res = client.post('/api/auth/verify-otp', json={'username': 'otpuser', 'otp_code': code})
        assert res.status_code == 200
        data = res.get_json()
        assert 'access_token' in data
        assert data['user']['is_email_verified'] is True

    def test_verify_otp_wrong_code(self, client):
        _register(client, username='otpwrong', email='otpwrong@test.com')
        res = client.post('/api/auth/verify-otp', json={'username': 'otpwrong', 'otp_code': '000000'})
        assert res.status_code == 400

    def test_login_blocked_until_verified(self, client):
        _register(client, username='unverified', email='unverified@test.com')
        res = _login(client, 'unverified', 'password123')
        assert res.status_code == 403
        assert res.get_json()['otp_required'] is True

    def test_resend_otp_does_not_leak_existence(self, client):
        res = client.post('/api/auth/resend-otp', json={'username': 'nobody-here'})
        assert res.status_code == 200


class TestLogin:
    """Test user login (post email verification)."""

    def _register_and_verify(self, client, username, email, password='password123'):
        from app import db as _db
        from app.models.user import User
        _register(client, username=username, email=email, password=password)
        with client.application.app_context():
            user = User.query.filter_by(username=username).first()
            user.is_email_verified = True
            _db.session.commit()

    def test_login_success(self, client):
        self._register_and_verify(client, 'loginuser', 'login@test.com')
        res = _login(client, 'loginuser', 'password123')
        assert res.status_code == 200
        data = res.get_json()
        assert 'access_token' in data
        assert data['user']['username'] == 'loginuser'

    def test_login_wrong_password(self, client):
        self._register_and_verify(client, 'wrongpw', 'wrongpw@test.com')
        res = _login(client, 'wrongpw', 'wrongpassword')
        assert res.status_code == 401

    def test_login_nonexistent_user(self, client):
        res = _login(client, 'nonexistent', 'password123')
        assert res.status_code == 401

    def test_login_missing_fields(self, client):
        res = client.post('/api/auth/login', json={'username': 'test'})
        assert res.status_code == 422  # marshmallow validation error


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
