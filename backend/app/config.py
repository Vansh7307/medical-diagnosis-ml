import os
from datetime import timedelta


class BaseConfig:
    """Base configuration."""
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    
    # Flask
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        f'sqlite:///{os.path.join(BASE_DIR, "instance", "medical_diagnosis.db")}'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # ML Models
    ML_MODELS_DIR = os.path.join(BASE_DIR, 'ml', 'models')
    DATASETS_DIR = os.path.join(BASE_DIR, 'data', 'datasets')
    
    # MLOps
    MODEL_VERSION_DIR = os.path.join(BASE_DIR, 'ml', 'models', 'versions')
    DRIFT_THRESHOLD = 0.15
    ACCURACY_ALERT_THRESHOLD = 0.85
    
    # CORS
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:5173')

    # Rate Limiting
    RATE_LIMIT_WINDOW = 60  # seconds
    RATE_LIMIT_MAX = 100    # requests per window
    RATE_LIMIT_ENDPOINTS = {
        'diagnosis_heart': 30,
        'diagnosis_diabetes': 30,
        'diagnosis_cancer': 30,
        'diagnosis_multi': 10,
        'auth_register': 5,
        'auth_login': 20,
    }

    # API Docs
    API_VERSION = '1.0.0'
    API_TITLE = 'Medical Diagnosis ML API'

    # Email / OTP verification
    # Leave MAIL_USERNAME/MAIL_PASSWORD unset for local dev -- OTPs are logged
    # to the console instead of emailed (see app/utils/email.py).
    MAIL_SERVER = os.environ.get('MAIL_SERVER', '')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', os.environ.get('MAIL_USERNAME', ''))
    OTP_EXPIRY_MINUTES = 10


class DevelopmentConfig(BaseConfig):
    """Development configuration."""
    DEBUG = True
    TESTING = False


class ProductionConfig(BaseConfig):
    """Production configuration.
    CRITICAL: Secrets MUST be provided via environment variables.
    Hardcoded defaults are a severe security vulnerability.
    """
    DEBUG = False
    TESTING = False

    def __init__(self):
        if not os.environ.get('SECRET_KEY'):
            raise RuntimeError(
                'SECRET_KEY environment variable is REQUIRED in production. '
                'Generate one with: python -c "import secrets; print(secrets.token_hex(32))"'
            )
        if not os.environ.get('JWT_SECRET_KEY'):
            raise RuntimeError(
                'JWT_SECRET_KEY environment variable is REQUIRED in production. '
                'Generate one with: python -c "import secrets; print(secrets.token_hex(32))"'
            )
        self.SECRET_KEY = os.environ['SECRET_KEY']
        self.JWT_SECRET_KEY = os.environ['JWT_SECRET_KEY']


class TestingConfig(BaseConfig):
    """Testing configuration."""
    DEBUG = True
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'


config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
}
