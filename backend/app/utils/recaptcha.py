"""
Google reCAPTCHA v2 verification.

Replaces the offline math CAPTCHA with Google's reCAPTCHA widget. The
frontend renders the widget using the public SITE key and gets back a
response token when the user completes it; this module verifies that
token against Google's siteverify API using the SECRET key (never exposed
to the frontend).
"""
import json
import os
import urllib.request
import urllib.parse
import urllib.error
from flask import current_app

VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'


def verify_recaptcha(token, remote_ip=None):
    """Verify a reCAPTCHA response token with Google.

    Returns (ok: bool, error_message: str | None).
    """
    if not token:
        return False, 'Please complete the reCAPTCHA challenge'

    # Test/CI environments can't reach Google's real API and shouldn't need
    # to -- a fixed test token is accepted only when the app is explicitly
    # running in testing mode (never in production).
    if current_app.config.get('TESTING') and token == 'test-recaptcha-token':
        return True, None

    is_local_dev = (
        current_app.config.get('DEBUG')
        or current_app.config.get('ENV') == 'development'
        or os.environ.get('FLASK_ENV', '').lower() == 'development'
    )
    if is_local_dev and token == 'dev-recaptcha-bypass':
        current_app.logger.warning(
            'Development reCAPTCHA bypass enabled because no valid Google keys are configured.'
        )
        return True, None

    secret_key = os.environ.get('RECAPTCHA_SECRET_KEY')
    if not secret_key:
        if is_local_dev:
            current_app.logger.warning(
                'RECAPTCHA_SECRET_KEY is missing in development mode; only the dev bypass token is allowed.'
            )
            return False, 'reCAPTCHA is not configured for local development; set RECAPTCHA_SECRET_KEY or use the development bypass token'
        # Not configured -- fail closed with a clear server-side message,
        # rather than silently accepting every request unverified.
        return False, 'reCAPTCHA is not configured on this server'

    payload = {'secret': secret_key, 'response': token}
    if remote_ip:
        payload['remoteip'] = remote_ip

    data = urllib.parse.urlencode(payload).encode('utf-8')
    req = urllib.request.Request(
        VERIFY_URL,
        data=data,
        headers={
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'MedDiagnoseAI-Backend/1.0',
        },
        method='POST',
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode('utf-8'))
    except urllib.error.URLError:
        return False, 'Could not verify reCAPTCHA right now, please try again'
    except Exception:
        return False, 'Could not verify reCAPTCHA right now, please try again'

    if not result.get('success'):
        error_codes = result.get('error-codes', [])
        if 'timeout-or-duplicate' in error_codes:
            return False, 'reCAPTCHA expired, please try again'
        return False, 'reCAPTCHA verification failed, please try again'

    return True, None