"""
Email via Resend API (HTTPS port 443 - works on Render free tier).
SMTP port 587 is blocked by Render. Resend uses HTTP API instead.
Free tier: 3,000 emails/month, sends to ANY email address.
Requires: RESEND_API_KEY env var.
"""
import logging
import os
import urllib.request
import urllib.error
import json

logger = logging.getLogger('app.email')

RESEND_API_URL = 'https://api.resend.com/emails'
FROM_ADDRESS = 'MedDiagnose AI <onboarding@resend.dev>'


def init_mail(app):
    pass


def _is_configured():
    return bool(os.environ.get('RESEND_API_KEY'))


def _send(to_email, subject, html):
    api_key = os.environ.get('RESEND_API_KEY', '')
    payload = json.dumps({
        'from': FROM_ADDRESS,
        'to': [to_email],
        'subject': subject,
        'html': html,
    }).encode('utf-8')
    req = urllib.request.Request(
        RESEND_API_URL,
        data=payload,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status in (200, 201):
                return {'sent': True}
            body = resp.read().decode()
            logger.error('Resend error %s: %s', resp.status, body)
            return {'sent': False, 'reason': body}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        logger.error('Resend HTTP error %s: %s', e.code, body)
        return {'sent': False, 'reason': body}
    except Exception as exc:
        logger.error('Resend request failed: %s', exc)
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
        logger.warning('RESEND_API_KEY not set -- OTP for %s: %s', user.email, otp_code)
        return {'sent': False, 'reason': 'not_configured'}
    return _send(user.email, 'Your MedDiagnose AI verification code', _otp_html(user, otp_code))


def send_password_reset_email(user, otp_code):
    if not _is_configured():
        logger.warning('RESEND_API_KEY not set -- reset OTP for %s: %s', user.email, otp_code)
        return {'sent': False, 'reason': 'not_configured'}
    return _send(user.email, 'Reset your MedDiagnose AI password', _reset_html(user, otp_code))
