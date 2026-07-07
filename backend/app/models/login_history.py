from datetime import datetime, timezone
from app import db


class LoginHistory(db.Model):
    """Audit trail of login attempts, surfaced to admins in the admin portal."""
    __tablename__ = 'login_history'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    username = db.Column(db.String(80), nullable=False)
    success = db.Column(db.Boolean, default=False)
    reason = db.Column(db.String(120), nullable=True)  # e.g. 'invalid_password', 'unverified_email'
    ip_address = db.Column(db.String(64), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.username,
            'success': self.success,
            'reason': self.reason,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
