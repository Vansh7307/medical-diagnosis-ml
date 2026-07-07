"""
Tests for the admin portal: user listing, role/status management, login history.
"""
from tests.conftest import _solve_captcha


class TestAdminAccess:
    def test_non_admin_forbidden(self, client, auth_headers):
        """auth_headers fixture creates a 'doctor', not an admin -- should be blocked."""
        res = client.get('/api/admin/users', headers=auth_headers)
        assert res.status_code == 403

    def test_unauthenticated_blocked(self, client):
        res = client.get('/api/admin/users')
        assert res.status_code == 401


class TestAdminUserManagement:
    def _make_admin_headers(self, client, db):
        from app.models.user import User

        token, answer = _solve_captcha(client)
        client.post('/api/auth/register', json={
            'username': 'adminuser', 'email': 'admin@test.com', 'password': 'adminpass123',
            'captcha_token': token, 'captcha_answer': answer,
        })
        with client.application.app_context():
            user = User.query.filter_by(username='adminuser').first()
            user.role = 'admin'
            user.is_email_verified = True
            db.session.commit()

        token, answer = _solve_captcha(client)
        res = client.post('/api/auth/login', json={
            'username': 'adminuser', 'password': 'adminpass123',
            'captcha_token': token, 'captcha_answer': answer,
        })
        access_token = res.get_json()['access_token']
        return {'Authorization': f'Bearer {access_token}'}

    def test_list_users_and_promote_role(self, client, db):
        admin_headers = self._make_admin_headers(client, db)

        # Register a second, ordinary user to manage.
        token, answer = _solve_captcha(client)
        client.post('/api/auth/register', json={
            'username': 'plainuser', 'email': 'plain@test.com', 'password': 'password123',
            'captcha_token': token, 'captcha_answer': answer,
        })

        res = client.get('/api/admin/users', headers=admin_headers)
        assert res.status_code == 200
        usernames = [u['username'] for u in res.get_json()['users']]
        assert 'plainuser' in usernames
        assert 'adminuser' in usernames

        target = next(u for u in res.get_json()['users'] if u['username'] == 'plainuser')
        res = client.put(f'/api/admin/users/{target["id"]}/role', json={'role': 'doctor'},
                          headers=admin_headers)
        assert res.status_code == 200
        assert res.get_json()['user']['role'] == 'doctor'

    def test_deactivate_user(self, client, db):
        admin_headers = self._make_admin_headers(client, db)

        token, answer = _solve_captcha(client)
        client.post('/api/auth/register', json={
            'username': 'todeactivate', 'email': 'deact@test.com', 'password': 'password123',
            'captcha_token': token, 'captcha_answer': answer,
        })
        res = client.get('/api/admin/users?search=todeactivate', headers=admin_headers)
        target = res.get_json()['users'][0]

        res = client.put(f'/api/admin/users/{target["id"]}/status', json={'is_active': False},
                          headers=admin_headers)
        assert res.status_code == 200
        assert res.get_json()['user']['is_active'] is False

    def test_stats_endpoint(self, client, db):
        admin_headers = self._make_admin_headers(client, db)
        res = client.get('/api/admin/stats', headers=admin_headers)
        assert res.status_code == 200
        data = res.get_json()
        assert 'total_users' in data
        assert 'by_role' in data
