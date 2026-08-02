"""
Tests for the forgot-password / reset-password OTP flow.
"""
from tests.conftest import _solve_captcha


def _register_and_verify(client, username, email, password='password123'):
    from app import db as _db
    from app.models.user import User

    token, _ = _solve_captcha(client)
    client.post('/api/auth/register', json={
        'username': username, 'email': email, 'password': password,
        'recaptcha_token': token,
    })
    with client.application.app_context():
        user = User.query.filter_by(username=username).first()
        user.is_email_verified = True
        _db.session.commit()


class TestForgotPassword:
    def test_forgot_password_unknown_email_does_not_leak(self, client):
        token, _ = _solve_captcha(client)
        res = client.post('/api/auth/forgot-password', json={
            'email': 'nobody@example.com', 'recaptcha_token': token,
        })
        assert res.status_code == 200
        assert 'reset code has been sent' in res.get_json()['message']

    def test_forgot_password_invalid_recaptcha(self, client):
        _register_and_verify(client, 'resetuser1', 'reset1@test.com')
        res = client.post('/api/auth/forgot-password', json={
            'email': 'reset1@test.com', 'recaptcha_token': 'garbage-token',
        })
        assert res.status_code == 400

    def test_forgot_password_known_email_generates_otp(self, client):
        from app.models.user import User

        _register_and_verify(client, 'resetuser2', 'reset2@test.com')
        token, _ = _solve_captcha(client)
        res = client.post('/api/auth/forgot-password', json={
            'email': 'reset2@test.com', 'recaptcha_token': token,
        })
        assert res.status_code == 200

        with client.application.app_context():
            user = User.query.filter_by(username='resetuser2').first()
            assert user.reset_otp_code is not None


class TestResetPassword:
    def _get_reset_code(self, client, email):
        from app.models.user import User
        token, _ = _solve_captcha(client)
        client.post('/api/auth/forgot-password', json={
            'email': email, 'recaptcha_token': token,
        })
        with client.application.app_context():
            user = User.query.filter_by(email=email).first()
            return user.reset_otp_code

    def test_reset_password_success_and_login_with_new_password(self, client):
        _register_and_verify(client, 'resetuser3', 'reset3@test.com', password='oldpass123')
        code = self._get_reset_code(client, 'reset3@test.com')

        res = client.post('/api/auth/reset-password', json={
            'email': 'reset3@test.com', 'otp_code': code, 'new_password': 'newpass456',
        })
        assert res.status_code == 200

        token, _ = _solve_captcha(client)
        res = client.post('/api/auth/login', json={
            'username': 'resetuser3', 'password': 'newpass456',
            'recaptcha_token': token,
        })
        assert res.status_code == 200

    def test_reset_password_wrong_code(self, client):
        _register_and_verify(client, 'resetuser4', 'reset4@test.com')
        self._get_reset_code(client, 'reset4@test.com')

        res = client.post('/api/auth/reset-password', json={
            'email': 'reset4@test.com', 'otp_code': '000000', 'new_password': 'newpass456',
        })
        assert res.status_code == 400

    def test_reset_password_old_password_no_longer_works(self, client):
        _register_and_verify(client, 'resetuser5', 'reset5@test.com', password='oldpass123')
        code = self._get_reset_code(client, 'reset5@test.com')
        client.post('/api/auth/reset-password', json={
            'email': 'reset5@test.com', 'otp_code': code, 'new_password': 'newpass456',
        })

        token, _ = _solve_captcha(client)
        res = client.post('/api/auth/login', json={
            'username': 'resetuser5', 'password': 'oldpass123',
            'recaptcha_token': token,
        })
        assert res.status_code == 401