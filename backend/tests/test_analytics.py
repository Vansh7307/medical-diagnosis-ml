"""
Tests for analytics and health check endpoints.
"""
import pytest


class TestHealthCheck:
    """Test health check endpoint."""

    def test_health(self, client):
        res = client.get('/api/health')
        assert res.status_code == 200
        data = res.get_json()
        assert data['status'] == 'healthy'
        assert data['service'] == 'Medical Diagnosis ML API'
        assert data['version'] == '1.0.0'


class TestAnalytics:
    """Test analytics endpoints."""

    def test_dashboard(self, client, auth_headers):
        res = client.get('/api/analytics/dashboard', headers=auth_headers)
        assert res.status_code == 200
        data = res.get_json()
        assert 'total_patients' in data
        assert 'total_diagnoses' in data
        assert 'diagnosis_by_type' in data
        assert 'models' in data
        assert isinstance(data['total_patients'], int)
        assert isinstance(data['total_diagnoses'], int)

    def test_model_details(self, client, auth_headers):
        res = client.get('/api/analytics/models', headers=auth_headers)
        assert res.status_code == 200
        data = res.get_json()
        assert 'models' in data
        models = data['models']
        for dtype in ['heart', 'diabetes', 'cancer']:
            assert dtype in models

    def test_drift_detection(self, client, auth_headers):
        res = client.get('/api/analytics/drift', headers=auth_headers)
        assert res.status_code == 200
        data = res.get_json()
        assert 'drift_reports' in data

    def test_dashboard_unauthorized(self, client):
        res = client.get('/api/analytics/dashboard')
        assert res.status_code == 401
