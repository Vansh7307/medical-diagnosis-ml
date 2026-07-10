"""
Email sending for OTP verification.

Uses Flask-Mail. If MAIL_SERVER / MAIL_USERNAME / MAIL_PASSWORD are not
configured (e.g. local dev, or before you've plugged in real SMTP creds),
emails are NOT sent -- instead the OTP is logged to the console/app logger
so registration + verification still works end-to-end for local testing.

To go live: set these environment variables (e.g. in .env):
    MAIL_SERVER=smtp.gmail.com
    MAIL_PORT=587
    MAIL_USE_TLS=true
    MAIL_USERNAME=your-address@gmail.com
    MAIL_PASSWORD=your-app-password       # Gmail requires an "app password"
    MAIL_DEFAULT_SENDER=your-address@gmail.com
"""
import logging
from flask import current_app

logger = logging.getLogger('app.email')

try:
    from flask_mail import Mail, Message
    _FLASK_MAIL_AVAILABLE = True
except ImportError:  # flask-mail not installed yet
    _FLASK_MAIL_AVAILABLE = False

mail = Mail() if _FLASK_MAIL_AVAILABLE else None


def init_mail(app):
    if _FLASK_MAIL_AVAILABLE:
        mail.init_app(app)


def _mail_is_configured():
    return bool(
        _FLASK_MAIL_AVAILABLE
        and current_app.config.get('MAIL_SERVER')
        and current_app.config.get('MAIL_USERNAME')
        and current_app.config.get('MAIL_PASSWORD')
    )


def _otp_email_html(user, otp_code):
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0f172a, #1e40af); padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 20px;">MedDiagnose AI</h1>
        <p style="color: #cbd5e1; margin: 4px 0 0; font-size: 13px;">Medical Diagnosis with Machine Learning</p>
      </div>
      <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
        <p style="color: #334155; font-size: 15px;">Hi {user.full_name or user.username},</p>
        <p style="color: #334155; font-size: 15px;">
          Use the verification code below to confirm your email address and activate your account.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; font-size: 32px; letter-spacing: 8px; font-weight: bold;
                       color: #1e40af; background: #eff6ff; padding: 12px 24px; border-radius: 8px;">
            {otp_code}
          </span>
        </div>
        <p style="color: #64748b; font-size: 13px;">
          This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    </div>
    """


def _password_reset_email_html(user, otp_code):
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0f172a, #1e40af); padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 20px;">MedDiagnose AI</h1>
        <p style="color: #cbd5e1; margin: 4px 0 0; font-size: 13px;">Medical Diagnosis with Machine Learning</p>
      </div>
      <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
        <p style="color: #334155; font-size: 15px;">Hi {user.full_name or user.username},</p>
        <p style="color: #334155; font-size: 15px;">
          We received a request to reset your password. Use the code below to continue.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; font-size: 32px; letter-spacing: 8px; font-weight: bold;
                       color: #b91c1c; background: #fef2f2; padding: 12px 24px; border-radius: 8px;">
            {otp_code}
          </span>
        </div>
        <p style="color: #64748b; font-size: 13px;">
          This code expires in 10 minutes. If you didn't request a password reset, you can safely
          ignore this email -- your password will not be changed.
        </p>
      </div>
    </div>
    """


def send_password_reset_email(user, otp_code):
    """Send (or log, if unconfigured) the password-reset OTP email. Never raises."""
    if not _mail_is_configured():
        logger.warning(
            'MAIL_* not configured -- not actually sending email. '
            'Password reset OTP for %s <%s> is: %s (valid 10 minutes)',
            user.username, user.email, otp_code,
        )
        return {'sent': False, 'reason': 'mail_not_configured', 'otp_code_logged': True}

    try:
        msg = Message(
            subject='Reset your MedDiagnose AI password',
            recipients=[user.email],
            html=_password_reset_email_html(user, otp_code),
            sender=current_app.config.get('MAIL_DEFAULT_SENDER'),
        )
        mail.send(msg)
        return {'sent': True}
    except Exception as exc:  # pragma: no cover - depends on live SMTP
        logger.error('Failed to send password reset email to %s: %s', user.email, exc)
        return {'sent': False, 'reason': str(exc)}


def send_otp_email(user, otp_code):
    """Send (or log, if unconfigured) the OTP verification email. Never raises."""
    subject = 'Your MedDiagnose AI verification code'

    if not _mail_is_configured():
        logger.warning(
            'MAIL_* not configured -- not actually sending email. '
            'OTP for %s <%s> is: %s (valid 10 minutes)',
            user.username, user.email, otp_code,
        )
        return {'sent': False, 'reason': 'mail_not_configured', 'otp_code_logged': True}

    try:
        msg = Message(
            subject=subject,
            recipients=[user.email],
            html=_otp_email_html(user, otp_code),
            sender=current_app.config.get('MAIL_DEFAULT_SENDER'),
        )
        mail.send(msg)
        return {'sent': True}
    except Exception as exc:  # pragma: no cover - depends on live SMTP
        logger.error('Failed to send OTP email to %s: %s', user.email, exc)
        return {'sent': False, 'reason': str(exc)}