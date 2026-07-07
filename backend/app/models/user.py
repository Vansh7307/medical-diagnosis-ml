import random
from datetime import datetime, timezone, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from app import db

OTP_EXPIRY_MINUTES = 10


class User(db.Model):
    """User model for authentication."""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(150), nullable=True)
    role = db.Column(db.String(20), default='patient')  # patient, clinician, doctor, admin
    is_active = db.Column(db.Boolean, default=True)

    # Email verification / OTP
    is_email_verified = db.Column(db.Boolean, default=False)
    otp_code = db.Column(db.String(6), nullable=True)
    otp_expires_at = db.Column(db.DateTime, nullable=True)

    # Password reset OTP (kept separate from the registration OTP above)
    reset_otp_code = db.Column(db.String(6), nullable=True)
    reset_otp_expires_at = db.Column(db.DateTime, nullable=True)

    # Login auditing (surfaced in the admin portal)
    last_login_at = db.Column(db.DateTime, nullable=True)
    login_count = db.Column(db.Integer, default=0)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    diagnoses = db.relationship('Diagnosis', backref='created_by_user', lazy='dynamic')
    login_events = db.relationship('LoginHistory', backref='user', lazy='dynamic',
                                    cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def generate_otp(self):
        """Generate a fresh 6-digit OTP for email verification, valid for 10 minutes."""
        self.otp_code = f'{random.randint(0, 999999):06d}'
        self.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)
        return self.otp_code

    def verify_otp(self, code):
        """Check a submitted OTP against the stored one. Clears it on success."""
        if not self.otp_code or not self.otp_expires_at:
            return False
        expires_at = self.otp_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            return False
        if code != self.otp_code:
            return False
        self.otp_code = None
        self.otp_expires_at = None
        self.is_email_verified = True
        return True

    def record_login(self):
        self.last_login_at = datetime.now(timezone.utc)
        self.login_count = (self.login_count or 0) + 1

    def generate_reset_otp(self):
        """Generate a fresh 6-digit OTP for password reset, valid for 10 minutes."""
        self.reset_otp_code = f'{random.randint(0, 999999):06d}'
        self.reset_otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)
        return self.reset_otp_code

    def verify_reset_otp(self, code):
        """Check a submitted password-reset OTP. Does NOT clear it -- caller clears
        it explicitly after actually changing the password, so a failed reset attempt
        doesn't burn a still-valid code."""
        if not self.reset_otp_code or not self.reset_otp_expires_at:
            return False
        expires_at = self.reset_otp_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            return False
        return code == self.reset_otp_code

    def clear_reset_otp(self):
        self.reset_otp_code = None
        self.reset_otp_expires_at = None

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'role': self.role,
            'is_active': self.is_active,
            'is_email_verified': self.is_email_verified,
            'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None,
            'login_count': self.login_count or 0,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
