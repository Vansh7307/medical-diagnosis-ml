"""
Pytest configuration and shared fixtures.
"""
import os
import sys
import pytest

# Ensure the backend root is on the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app, db as _db


@pytest.fixture(scope='session')
def app():
    """Create application for testing."""
    app = create_app('testing')
    return app


@pytest.fixture(scope='function')
def db(app):
    """Create database for testing."""
    with app.app_context():
        _db.create_all()
        yield _db
        _db.session.rollback()
        _db.drop_all()


@pytest.fixture(scope='function')
def client(app, db):
    """Create test client."""
    return app.test_client()


def _solve_captcha(client):
    """Fetch a CAPTCHA challenge and solve it (used to drive the auth endpoints in tests)."""
    res = client.get('/api/auth/captcha')
    data = res.get_json()
    question = data['question']  # e.g. "7 + 3 = ?"
    a, op, b, _eq, _q = question.split()
    a, b = int(a), int(b)
    answer = {'+': a + b, '-': a - b, '*': a * b}[op]
    return data['captcha_token'], answer


@pytest.fixture(scope='function')
def auth_headers(client):
    """Create authenticated headers with a doctor user (for patient CRUD access)."""
    from app import db as _test_db
    from app.models.user import User

    # Register (requires CAPTCHA)
    token, answer = _solve_captcha(client)
    client.post('/api/auth/register', json={
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'testpass123',
        'full_name': 'Test User',
        'captcha_token': token,
        'captcha_answer': answer,
    })

    # Elevate role to doctor and mark email verified (bypassing the OTP email step in tests)
    with client.application.app_context():
        user = User.query.filter_by(username='testuser').first()
        if user:
            user.role = 'doctor'
            user.is_email_verified = True
            _test_db.session.commit()

    # Login (requires CAPTCHA)
    token, answer = _solve_captcha(client)
    res = client.post('/api/auth/login', json={
        'username': 'testuser',
        'password': 'testpass123',
        'captcha_token': token,
        'captcha_answer': answer,
    })
    token = res.get_json()['access_token']
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture(scope='function')
def sample_patient(client, auth_headers):
    """Create a sample patient and return its data."""
    res = client.post('/api/patients', json={
        'first_name': 'John',
        'last_name': 'Doe',
        'gender': 'Male',
        'email': 'john.doe@example.com',
        'phone': '555-1234',
        'blood_type': 'O+',
        'date_of_birth': '1985-06-15',
    }, headers=auth_headers)
    return res.get_json()['patient']


@pytest.fixture
def heart_features():
    """Sample heart disease features."""
    return {
        'age': 55, 'sex': 1, 'cp': 2, 'trestbps': 140, 'chol': 250,
        'fbs': 0, 'restecg': 1, 'thalach': 140, 'exang': 1,
        'oldpeak': 2.0, 'slope': 1, 'ca': 1, 'thal': 3
    }


@pytest.fixture
def diabetes_features():
    """Sample diabetes features."""
    return {
        'Pregnancies': 2, 'Glucose': 150, 'BloodPressure': 75,
        'SkinThickness': 30, 'Insulin': 200, 'BMI': 35.0,
        'DiabetesPedigreeFunction': 0.8, 'Age': 45
    }


@pytest.fixture
def cancer_features():
    """Sample breast cancer features."""
    return {
        'mean radius': 14.5, 'mean texture': 19.2, 'mean perimeter': 95.0,
        'mean area': 650.0, 'mean smoothness': 0.1, 'mean compactness': 0.12,
        'mean concavity': 0.1, 'mean concave points': 0.06, 'mean symmetry': 0.19,
        'mean fractal dimension': 0.06, 'radius error': 0.4, 'texture error': 1.2,
        'perimeter error': 3.0, 'area error': 40.0, 'smoothness error': 0.007,
        'compactness error': 0.025, 'concavity error': 0.03,
        'concave points error': 0.012, 'symmetry error': 0.02,
        'fractal dimension error': 0.004, 'worst radius': 16.0,
        'worst texture': 22.0, 'worst perimeter': 108.0, 'worst area': 800.0,
        'worst smoothness': 0.13, 'worst compactness': 0.22,
        'worst concavity': 0.2, 'worst concave points': 0.1,
        'worst symmetry': 0.25, 'worst fractal dimension': 0.07
    }
