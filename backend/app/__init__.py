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

    from app.utils.email import init_mail
    init_mail(app)

    from app.routes.auth import auth_bp
    from app.routes.patients import patients_bp
    from app.routes.diagnosis import diagnosis_bp
    from app.routes.analytics import analytics_bp
    from app.routes.admin import admin_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(patients_bp, url_prefix='/api/patients')
    app.register_blueprint(diagnosis_bp, url_prefix='/api/diagnosis')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    from app.routes.openapi import get_openapi_spec

    @app.route('/api/openapi.json')
    @app.route('/api/docs')
    def openapi_spec():
        return jsonify(get_openapi_spec(app))

    @app.route('/api/health')
    def health_check():
        # Deliberately does NOT touch the database. Render's app server and
        # Neon's database compute have separate sleep timers with very
        # different costs: Render sleeping means a slow ~30-60s wake-up (and
        # can serve a large holding page while doing so, which is what broke
        # the external keep-alive ping earlier). Neon sleeping just means a
        # ~1-2s reconnect on the next real query -- cheap, and self-limiting
        # since it only happens when there's real traffic. So: ping this
        # frequently (under Render's ~15 min sleep threshold) to keep the APP
        # warm, and let the database sleep/wake on its own -- don't burn
        # Neon's limited monthly compute-hour budget keeping it warm 24/7
        # for no reason.
        return {
            'status': 'healthy',
            'service': app.config.get('API_TITLE'),
            'version': app.config.get('API_VERSION'),
        }, 200

    # Make sure every model is imported before create_all() so its table gets created.
    from app.models.user import User
    from app.models.patient import Patient
    from app.models.diagnosis import Diagnosis
    from app.models.login_history import LoginHistory

    with app.app_context():
        db.create_all()
        _run_lightweight_migrations()

    _register_cli_commands(app)

    return app


def _run_lightweight_migrations():
    """db.create_all() only creates missing TABLES, never adds columns to
    tables that already exist. Since this project doesn't run `flask db
    upgrade` on deploy, we check for a few specific columns we've added
    after the initial schema and ALTER TABLE them in if missing. Safe to
    run on every startup -- each check is a no-op once the column exists."""
    from sqlalchemy import inspect, text

    inspector = inspect(db.engine)
    try:
        patient_columns = {col['name'] for col in inspector.get_columns('patients')}
    except Exception:
        return  # table doesn't exist yet (fresh DB) -- create_all() already handled it

    if 'user_id' not in patient_columns:
        with db.engine.connect() as conn:
            conn.execute(text(
                'ALTER TABLE patients ADD COLUMN user_id INTEGER REFERENCES users(id)'
            ))
            conn.execute(text(
                'CREATE UNIQUE INDEX IF NOT EXISTS ix_patients_user_id ON patients(user_id)'
            ))
            conn.commit()


def _register_cli_commands(app):
    import click

    @app.cli.command('create-admin')
    @click.option('--username', prompt=True)
    @click.option('--email', prompt=True)
    @click.option('--password', prompt=True, hide_input=True, confirmation_prompt=True)
    def create_admin(username, email, password):
        """One-time CLI command to create (or promote) the first admin account.

        Usage:
            flask create-admin
        """
        from app.models.user import User

        with app.app_context():
            user = User.query.filter(
                db.or_(User.username == username, User.email == email)
            ).first()

            if user:
                user.role = 'admin'
                user.is_active = True
                user.is_email_verified = True
                if password:
                    user.set_password(password)
                db.session.commit()
                click.echo(f'Existing user "{user.username}" promoted to admin.')
                return

            user = User(
                username=username,
                email=email,
                full_name='Administrator',
                role='admin',
                is_active=True,
                is_email_verified=True,  # skip OTP for the bootstrap admin
            )
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
            click.echo(f'Admin user "{username}" created successfully.')