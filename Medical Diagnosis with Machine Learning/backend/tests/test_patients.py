"""
Tests for patient CRUD endpoints.
"""
import pytest


class TestPatientCRUD:
    """Test patient management endpoints."""

    def test_create_patient(self, client, auth_headers):
        res = client.post('/api/patients', json={
            'first_name': 'Jane',
            'last_name': 'Smith',
            'gender': 'Female',
            'email': 'jane@test.com',
            'blood_type': 'A+',
            'date_of_birth': '1990-03-20',
        }, headers=auth_headers)
        assert res.status_code == 201
        data = res.get_json()
        assert data['patient']['first_name'] == 'Jane'
        assert data['patient']['patient_id'].startswith('PAT-')

    def test_create_patient_missing_name(self, client, auth_headers):
        res = client.post('/api/patients', json={
            'gender': 'Male'
        }, headers=auth_headers)
        assert res.status_code == 400

    def test_list_patients(self, client, auth_headers, sample_patient):
        res = client.get('/api/patients', headers=auth_headers)
        assert res.status_code == 200
        data = res.get_json()
        assert data['total'] >= 1
        assert len(data['patients']) >= 1

    def test_list_patients_search(self, client, auth_headers, sample_patient):
        res = client.get('/api/patients?search=John', headers=auth_headers)
        assert res.status_code == 200
        data = res.get_json()
        assert data['total'] >= 1

    def test_get_patient(self, client, auth_headers, sample_patient):
        patient_id = sample_patient['id']
        res = client.get(f'/api/patients/{patient_id}', headers=auth_headers)
        assert res.status_code == 200
        data = res.get_json()
        assert data['patient']['first_name'] == 'John'

    def test_get_patient_not_found(self, client, auth_headers):
        res = client.get('/api/patients/99999', headers=auth_headers)
        assert res.status_code == 404

    def test_update_patient(self, client, auth_headers, sample_patient):
        patient_id = sample_patient['id']
        res = client.put(f'/api/patients/{patient_id}', json={
            'first_name': 'UpdatedJohn',
            'blood_type': 'B+'
        }, headers=auth_headers)
        assert res.status_code == 200
        data = res.get_json()
        assert data['patient']['first_name'] == 'UpdatedJohn'
        assert data['patient']['blood_type'] == 'B+'

    def test_delete_patient(self, client, auth_headers, sample_patient):
        """Delete requires admin role — doctor should get 403."""
        patient_id = sample_patient['id']
        res = client.delete(f'/api/patients/{patient_id}', headers=auth_headers)
        assert res.status_code == 403  # Doctor role cannot delete patients (admin only)

    def test_delete_patient_as_admin(self, client, db, auth_headers, sample_patient):
        """Admin can delete patients."""
        from app.models.user import User
        # Elevate to admin
        with client.application.app_context():
            user = User.query.filter_by(username='testuser').first()
            if user:
                user.role = 'admin'
                db.session.commit()

        # Re-login to get admin token
        res = client.post('/api/auth/login', json={
            'username': 'testuser',
            'password': 'testpass123'
        })
        admin_token = res.get_json()['access_token']
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        patient_id = sample_patient['id']
        res = client.delete(f'/api/patients/{patient_id}', headers=admin_headers)
        assert res.status_code == 200
        # Verify deleted
        res2 = client.get(f'/api/patients/{patient_id}', headers=admin_headers)
        assert res2.status_code == 404

    def test_patients_unauthorized(self, client):
        res = client.get('/api/patients')
        assert res.status_code == 401

    def test_create_patient_invalid_date(self, client, auth_headers):
        res = client.post('/api/patients', json={
            'first_name': 'Bad',
            'last_name': 'Date',
            'date_of_birth': 'not-a-date'
        }, headers=auth_headers)
        assert res.status_code == 400
