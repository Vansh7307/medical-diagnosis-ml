import os
from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager

db = SQLAlchemy()
jwt = JWTManager()


def create_app(config_name=None):
    """Application factory."""
    app = Flask(__name__)

    # Load configuration
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')

    from app.config import config_map
    app.config.from_object(config_map[config_name])

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    CORS(app, origins=app.config.get('CORS_ORIGINS', '*').split(','))

    # Initialize middleware (rate limiting + security headers + audit logging)
    from app.middleware import init_rate_limiter, RequestLogger
    if not app.config.get('TESTING'):
        init_rate_limiter(app)
        RequestLogger(app)

    # Ensure directories exist
    os.makedirs(app.config.get('ML_MODELS_DIR', 'ml/models'), exist_ok=True)
    os.makedirs(os.path.join(app.config.get('BASE_DIR', '.'), 'instance'), exist_ok=True)

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.patients import patients_bp
    from app.routes.diagnosis import diagnosis_bp
    from app.routes.analytics import analytics_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(patients_bp, url_prefix='/api/patients')
    app.register_blueprint(diagnosis_bp, url_prefix='/api/diagnosis')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')

    # Create database tables
    with app.app_context():
        from app.models import user, patient, diagnosis  # noqa: F401
        db.create_all()

    # Error handlers
    @app.errorhandler(400)
    def bad_request(e):
        return {'error': 'Bad Request', 'message': str(e)}, 400

    @app.errorhandler(401)
    def unauthorized(e):
        return {'error': 'Unauthorized', 'message': str(e)}, 401

    @app.errorhandler(404)
    def not_found(e):
        return {'error': 'Not Found', 'message': str(e)}, 404

    @app.errorhandler(429)
    def rate_limited(e):
        return {'error': 'Too Many Requests', 'message': 'Rate limit exceeded. Please try again later.'}, 429

    @app.errorhandler(500)
    def internal_error(e):
        return {'error': 'Internal Server Error', 'message': str(e)}, 500

    # Health check
    @app.route('/api/health')
    def health_check():
        return {
            'status': 'healthy',
            'service': 'Medical Diagnosis ML API',
            'version': app.config.get('API_VERSION', '1.0.0')
        }

    # OpenAPI specification endpoint
    @app.route('/api/docs')
    def api_docs():
        from app.routes.openapi import get_openapi_spec
        return get_openapi_spec(app)

    return app
