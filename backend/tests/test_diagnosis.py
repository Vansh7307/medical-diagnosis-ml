"""
Tests for diagnosis prediction endpoints.
"""
import pytest


class TestHeartDiagnosis:
    """Test heart disease prediction."""

    def test_heart_prediction(self, client, auth_headers, heart_features):
        res = client.post('/api/diagnosis/heart', json={
            'features': heart_features
        }, headers=auth_headers)
        assert res.status_code == 200
        data = res.get_json()
        assert data['diagnosis_type'] == 'heart'
        result = data['result']
        assert 'prediction' in result
        assert 'confidence' in result
        assert 'risk_score' in result
        assert 0 <= result['confidence'] <= 1
        assert 0 <= result['risk_score'] <= 100

    def test_heart_prediction_missing_features(self, client, auth_headers):
        res = client.post('/api/diagnosis/heart', json={
            'features': {'age': 55}
        }, headers=auth_headers)
        assert res.status_code == 422  # Validation error, not server error

    def test_heart_prediction_no_body(self, client, auth_headers):
        res = client.post('/api/diagnosis/heart', json={}, headers=auth_headers)
        assert res.status_code == 400


class TestDiabetesDiagnosis:
    """Test diabetes prediction."""

    def test_diabetes_prediction(self, client, auth_headers, diabetes_features):
        res = client.post('/api/diagnosis/diabetes', json={
            'features': diabetes_features
        }, headers=auth_headers)
        assert res.status_code == 200
        data = res.get_json()
        assert data['diagnosis_type'] == 'diabetes'
        result = data['result']
        assert 'prediction_label' in result
        assert result['prediction_label'] in ['Low Diabetes Risk', 'High Diabetes Risk']


class TestCancerDiagnosis:
    """Test breast cancer prediction."""

    def test_cancer_prediction(self, client, auth_headers, cancer_features):
        res = client.post('/api/diagnosis/cancer', json={
            'features': cancer_features
        }, headers=auth_headers)
        assert res.status_code == 200
        data = res.get_json()
        assert data['diagnosis_type'] == 'cancer'
        result = data['result']
        assert result['prediction_label'] in ['Malignant', 'Benign']


class TestMultiDiagnosis:
    """Test multi-model diagnosis."""

    def test_multi_prediction(self, client, auth_headers, heart_features, diabetes_features):
        res = client.post('/api/diagnosis/multi', json={
            'heart_features': heart_features,
            'diabetes_features': diabetes_features,
        }, headers=auth_headers)
        assert res.status_code == 200
        data = res.get_json()
        assert data['diagnosis_type'] == 'multi'
        assert 'heart' in data['results']
        assert 'diabetes' in data['results']

    def test_multi_prediction_no_features(self, client, auth_headers):
        res = client.post('/api/diagnosis/multi', json={}, headers=auth_headers)
        assert res.status_code == 400


class TestDiagnosisHistory:
    """Test diagnosis history."""

    def test_diagnosis_history(self, client, auth_headers, sample_patient, heart_features):
        patient_id = sample_patient['id']
        # Make a prediction for this patient
        client.post('/api/diagnosis/heart', json={
            'features': heart_features,
            'patient_id': patient_id
        }, headers=auth_headers)

        res = client.get(f'/api/diagnosis/history/{patient_id}', headers=auth_headers)
        assert res.status_code == 200
        data = res.get_json()
        assert data['total'] >= 1

    def test_diagnosis_history_nonexistent_patient(self, client, auth_headers):
        res = client.get('/api/diagnosis/history/99999', headers=auth_headers)
        assert res.status_code == 404


class TestModelInfo:
    """Test model information endpoint."""

    def test_get_models(self, client, auth_headers):
        res = client.get('/api/diagnosis/models', headers=auth_headers)
        assert res.status_code == 200
        data = res.get_json()
        models = data['models']
        assert 'heart' in models
        assert 'diabetes' in models
        assert 'cancer' in models
