"""
Tests for diagnosis prediction endpoints.
"""
import pytest
from io import BytesIO


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


class TestLabCsvDiagnosis:
    def test_diabetes_csv_prediction(self, client, auth_headers, diabetes_features):
        headers = ','.join(diabetes_features)
        values = ','.join(str(value) for value in diabetes_features.values())
        res = client.post(
            '/api/diagnosis/analyze-labs',
            data={'file': (BytesIO(f'{headers}\n{values}\n'.encode()), 'labs.csv')},
            headers=auth_headers,
            content_type='multipart/form-data',
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data['diagnosis_type'] == 'diabetes'
        assert 0 <= data['result']['confidence'] <= 1


class TestDedicatedModuleEndpoints:
    """The dashboard modules have dedicated, non-generic API contracts."""

    def test_symptom_and_radiology_modules(self, client, auth_headers):
        symptoms = client.post('/api/diagnosis/symptoms', json={
            'chief_complaint': 'chest pain', 'symptoms': ['Chest Pain'],
            'duration_days': 1, 'severity': 6,
        }, headers=auth_headers)
        radiology = client.post('/api/diagnosis/radiology', data={
            'modality': 'cxr', 'analysis_type': 'lesion',
        }, headers=auth_headers)
        assert symptoms.status_code == 200
        assert symptoms.get_json()['differential']
        assert radiology.status_code == 200
        assert radiology.get_json()['anomalies']

    def test_labs_cardiology_genomics_and_telemetry(self, client, auth_headers):
        labs = client.post('/api/diagnosis/labs', json={
            'panel_type': 'cbc', 'features': {
                'wbc': 7.5, 'rbc': 4.8, 'hemoglobin': 14.2, 'platelets': 250,
            },
        }, headers=auth_headers)
        cardiology = client.post('/api/diagnosis/cardiology', json={
            'heart_rate': 72, 'pr_interval': 160, 'qrs_duration': 100,
            'qt_interval': 400, 'st_segment': 0, 't_wave_amp': 5, 'rhythm': 'regular',
        }, headers=auth_headers)
        genomics = client.post('/api/diagnosis/genomics', json={'features': {
            'snp_count': 1000, 'cardiovascular_prs': 50, 'oncological_prs': 50,
            'neurological_prs': 50, 'consanguinity_flag': False, 'pathogenic_variant_count': 0,
        }}, headers=auth_headers)
        telemetry = client.get('/api/telemetry/stats', headers=auth_headers)
        assert labs.status_code == cardiology.status_code == genomics.status_code == telemetry.status_code == 200

    def test_workbench_validation_errors_are_structured(self, client, auth_headers):
        invalid_lab = client.post('/api/diagnosis/labs', json={'panel_type': 'cbc', 'features': {'wbc': 99}}, headers=auth_headers)
        invalid_marker = client.post('/api/diagnosis/oncology', json={'marker_type': 'psa', 'value': -1}, headers=auth_headers)
        malformed_pathology = client.post('/api/diagnosis/pathology', json={'specimen_type': 'bad'}, headers=auth_headers)
        assert invalid_lab.status_code == invalid_marker.status_code == malformed_pathology.status_code == 422
        assert all('error' in response.get_json() for response in (invalid_lab, invalid_marker, malformed_pathology))

    def test_remaining_workbench_endpoints(self, client, auth_headers):
        pathology = client.post('/api/diagnosis/pathology', json={
            'specimen_type': 'culture', 'culture_organism': 'bacteria', 'gram_stain': '+',
        }, headers=auth_headers)
        oncology = client.post('/api/diagnosis/oncology', json={'marker_type': 'psa', 'value': 3.5}, headers=auth_headers)
        neurology = client.post('/api/diagnosis/neurology', json={'assessment_type': 'mmse', 'mmse_score': 28}, headers=auth_headers)
        assert pathology.status_code == oncology.status_code == neurology.status_code == 200
