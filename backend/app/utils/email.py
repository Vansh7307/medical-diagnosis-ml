"""
Email sending via Gmail SMTP using smtplib (built into Python - no extra library).
Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.
Works with any recipient email address.
"""
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger('app.email')


def init_mail(app):
    pass


def _is_configured():
    return bool(os.environ.get('GMAIL_USER') and os.environ.get('GMAIL_APP_PASSWORD'))


def _send(to_email, subject, html):
    gmail_user = os.environ.get('GMAIL_USER', '')
    gmail_password = os.environ.get('GMAIL_APP_PASSWORD', '')
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f'MedDiagnose AI <{gmail_user}>'
        msg['To'] = to_email
        msg.attach(MIMEText(html, 'html'))

        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(gmail_user, gmail_password)
            server.sendmail(gmail_user, to_email, msg.as_string())

        return {'sent': True}
    except Exception as exc:
        logger.error('Failed to send email to %s: %s', to_email, exc)
        return {'sent': False, 'reason': str(exc)}


def _otp_html(user, otp_code):
    name = user.full_name or user.username
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#0f172a,#1e40af);padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">MedDiagnose AI</h1>
        <p style="color:#cbd5e1;margin:4px 0 0;font-size:13px;">Medical Diagnosis with Machine Learning</p>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
        <p style="color:#334155;font-size:15px;">Hi {name},</p>
        <p style="color:#334155;font-size:15px;">Use the code below to verify your email and activate your account.</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="display:inline-block;font-size:32px;letter-spacing:8px;font-weight:bold;
                       color:#1e40af;background:#eff6ff;padding:12px 24px;border-radius:8px;">
            {otp_code}
          </span>
        </div>
        <p style="color:#64748b;font-size:13px;">Expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    </div>"""


def _reset_html(user, otp_code):
    name = user.full_name or user.username
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#0f172a,#1e40af);padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">MedDiagnose AI</h1>
        <p style="color:#cbd5e1;margin:4px 0 0;font-size:13px;">Medical Diagnosis with Machine Learning</p>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
        <p style="color:#334155;font-size:15px;">Hi {name},</p>
        <p style="color:#334155;font-size:15px;">Use the code below to reset your password.</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="display:inline-block;font-size:32px;letter-spacing:8px;font-weight:bold;
                       color:#b91c1c;background:#fef2f2;padding:12px 24px;border-radius:8px;">
            {otp_code}
          </span>
        </div>
        <p style="color:#64748b;font-size:13px;">Expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    </div>"""


def send_otp_email(user, otp_code):
    if not _is_configured():
        logger.warning('GMAIL_USER/GMAIL_APP_PASSWORD not set -- OTP for %s: %s', user.email, otp_code)
        return {'sent': False, 'reason': 'not_configured'}
    return _send(user.email, 'Your MedDiagnose AI verification code', _otp_html(user, otp_code))


def send_password_reset_email(user, otp_code):
    if not _is_configured():
        logger.warning('GMAIL_USER/GMAIL_APP_PASSWORD not set -- reset OTP for %s: %s', user.email, otp_code)
        return {'sent': False, 'reason': 'not_configured'}
    return _send(user.email, 'Reset your MedDiagnose AI password', _reset_html(user, otp_code))
