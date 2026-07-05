import os
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS

from app.config import config_map

db = SQLAlchemy()
jwt = JWTManager()


def create_app(config_name=None):
    app = Flask(__name__)

    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'production')

    config_class = config_map.get(config_name, config_map['production'])
    app.config.from_object(config_class())

    # Ensure instance folder exists (for SQLite)
    os.makedirs(os.path.join(app.root_path, 'instance'), exist_ok=True)

    db.init_app(app)
    jwt.init_app(app)

    cors_origins = app.config.get('CORS_ORIGINS', '')
    origins = [o.strip() for o in cors_origins.split(',') if o.strip()]
    CORS(app, origins=origins, supports_credentials=True)

    from app.routes.auth import auth_bp
    from app.routes.patients import patients_bp
    from app.routes.diagnosis import diagnosis_bp
    from app.routes.analytics import analytics_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(patients_bp, url_prefix='/api/patients')
    app.register_blueprint(diagnosis_bp, url_prefix='/api/diagnosis')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')

    from app.routes.openapi import get_openapi_spec

    @app.route('/api/openapi.json')
    def openapi_spec():
        return jsonify(get_openapi_spec(app))

    @app.route('/api/health')
    def health_check():
        return {'status': 'healthy', 'service': app.config.get('API_TITLE'), 'version': app.config.get('API_VERSION')}, 200

    with app.app_context():
        db.create_all()

    return app