"""
Tests for authentication endpoints.
"""
import pytest


class TestRegister:
    """Test user registration."""

    def test_register_success(self, client):
        res = client.post('/api/auth/register', json={
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'password123',
            'full_name': 'New User'
        })
        assert res.status_code == 201
        data = res.get_json()
        assert data['message'] == 'User registered successfully'
        assert data['user']['username'] == 'newuser'
        assert data['user']['email'] == 'new@example.com'

    def test_register_missing_fields(self, client):
        res = client.post('/api/auth/register', json={
            'username': 'test'
        })
        assert res.status_code == 422  # marshmallow validation error

    def test_register_short_password(self, client):
        res = client.post('/api/auth/register', json={
            'username': 'test',
            'email': 'test@test.com',
            'password': 'abc'
        })
        assert res.status_code == 422  # marshmallow validation error

    def test_register_duplicate_username(self, client):
        payload = {
            'username': 'duplicate',
            'email': 'dup1@test.com',
            'password': 'password123'
        }
        client.post('/api/auth/register', json=payload)
        payload['email'] = 'dup2@test.com'
        res = client.post('/api/auth/register', json=payload)
        assert res.status_code == 409

    def test_register_duplicate_email(self, client):
        payload = {
            'username': 'user1',
            'email': 'same@test.com',
            'password': 'password123'
        }
        client.post('/api/auth/register', json=payload)
        payload['username'] = 'user2'
        res = client.post('/api/auth/register', json=payload)
        assert res.status_code == 409


class TestLogin:
    """Test user login."""

    def test_login_success(self, client):
        client.post('/api/auth/register', json={
            'username': 'loginuser',
            'email': 'login@test.com',
            'password': 'password123'
        })
        res = client.post('/api/auth/login', json={
            'username': 'loginuser',
            'password': 'password123'
        })
        assert res.status_code == 200
        data = res.get_json()
        assert 'access_token' in data
        assert data['user']['username'] == 'loginuser'

    def test_login_wrong_password(self, client):
        client.post('/api/auth/register', json={
            'username': 'wrongpw',
            'email': 'wrongpw@test.com',
            'password': 'password123'
        })
        res = client.post('/api/auth/login', json={
            'username': 'wrongpw',
            'password': 'wrongpassword'
        })
        assert res.status_code == 401

    def test_login_nonexistent_user(self, client):
        res = client.post('/api/auth/login', json={
            'username': 'nonexistent',
            'password': 'password123'
        })
        assert res.status_code == 401

    def test_login_missing_fields(self, client):
        res = client.post('/api/auth/login', json={
            'username': 'test'
        })
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
