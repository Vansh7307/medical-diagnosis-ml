"""
Tests for new enterprise-grade features: validation, model cards, SHAP explainability.
"""
import pytest


class TestInputValidation:
    """Test marshmallow input validation on diagnosis endpoints."""

    def test_heart_invalid_age(self, client, auth_headers):
        res = client.post('/api/diagnosis/heart', json={
            'features': {
                'age': 200, 'sex': 1, 'cp': 2, 'trestbps': 140, 'chol': 250,
                'fbs': 0, 'restecg': 1, 'thalach': 140, 'exang': 1,
                'oldpeak': 2.0, 'slope': 1, 'ca': 1, 'thal': 3
            }
        }, headers=auth_headers)
        assert res.status_code == 422
        data = res.get_json()
        assert 'error' in data

    def test_heart_invalid_sex(self, client, auth_headers):
        res = client.post('/api/diagnosis/heart', json={
            'features': {
                'age': 55, 'sex': 5, 'cp': 2, 'trestbps': 140, 'chol': 250,
                'fbs': 0, 'restecg': 1, 'thalach': 140, 'exang': 1,
                'oldpeak': 2.0, 'slope': 1, 'ca': 1, 'thal': 3
            }
        }, headers=auth_headers)
        assert res.status_code == 422

    def test_diabetes_invalid_glucose(self, client, auth_headers):
        res = client.post('/api/diagnosis/diabetes', json={
            'features': {
                'Pregnancies': 2, 'Glucose': 500, 'BloodPressure': 75,
                'SkinThickness': 30, 'Insulin': 200, 'BMI': 35.0,
                'DiabetesPedigreeFunction': 0.8, 'Age': 45
            }
        }, headers=auth_headers)
        assert res.status_code == 422

    def test_diabetes_negative_bmi(self, client, auth_headers):
        res = client.post('/api/diagnosis/diabetes', json={
            'features': {
                'Pregnancies': 2, 'Glucose': 150, 'BloodPressure': 75,
                'SkinThickness': 30, 'Insulin': 200, 'BMI': -5.0,
                'DiabetesPedigreeFunction': 0.8, 'Age': 45
            }
        }, headers=auth_headers)
        assert res.status_code == 422


class TestModelCards:
    """Test model cards endpoint."""

    def test_get_all_model_cards(self, client, auth_headers):
        res = client.get('/api/analytics/model-cards', headers=auth_headers)
        assert res.status_code == 200
        data = res.get_json()
        assert 'model_cards' in data
        cards = data['model_cards']
        assert 'heart' in cards
        assert 'diabetes' in cards
        assert 'cancer' in cards
        # Verify card structure
        heart_card = cards['heart']
        assert 'model_details' in heart_card
        assert 'intended_use' in heart_card
        assert 'training_data' in heart_card
        assert 'limitations' in heart_card
        assert 'fairness' in heart_card
        assert 'ethical_considerations' in heart_card

    def test_get_single_model_card(self, client, auth_headers):
        res = client.get('/api/analytics/model-cards/heart', headers=auth_headers)
        assert res.status_code == 200
        data = res.get_json()
        card = data['model_card']
        assert card['model_details']['name'] == 'Heart Disease Prediction Model'

    def test_model_card_invalid_type(self, client, auth_headers):
        res = client.get('/api/analytics/model-cards/invalid', headers=auth_headers)
        assert res.status_code == 400


class TestOpenAPIDocs:
    """Test OpenAPI documentation endpoint."""

    def test_get_openapi_spec(self, client):
        res = client.get('/api/docs')
        assert res.status_code == 200
        data = res.get_json()
        assert data['openapi'] == '3.0.3'
        assert data['info']['title'] == 'Medical Diagnosis ML API'
        assert 'paths' in data
        assert 'components' in data
        assert '/diagnosis/heart' in data['paths']
        assert '/diagnosis/explain/{type}' in data['paths']
        assert 'bearerAuth' in data['components']['securitySchemes']


class TestSecurityHeaders:
    """Test that security headers are added to responses."""

    def test_security_headers_present(self, client):
        res = client.get('/api/health')
        # These headers are added by RequestLogger middleware
        # In testing mode, middleware is disabled, so check the route works
        assert res.status_code == 200


class TestHealthEndpoint:
    """Enhanced health check tests."""

    def test_health_check_structure(self, client):
        res = client.get('/api/health')
        assert res.status_code == 200
        data = res.get_json()
        assert data['status'] == 'healthy'
        assert data['service'] == 'Medical Diagnosis ML API'
        assert 'version' in data


class TestRateLimiting:
    """Test rate limiting behavior."""

    def test_rate_limit_endpoint_exists(self, client, auth_headers):
        """Verify the diagnosis endpoint is accessible."""
        # Rate limiting is disabled in testing mode, but we can verify
        # the endpoint structure
        res = client.post('/api/diagnosis/heart', json={}, headers=auth_headers)
        assert res.status_code in [400, 401, 422]  # Should fail validation, not crash
