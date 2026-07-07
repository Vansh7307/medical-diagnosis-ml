"""
Simple, offline math CAPTCHA.

No external service (no reCAPTCHA keys needed). The correct answer is never
sent to the client in the clear -- it's embedded in a signed, time-limited
token (itsdangerous) that the server verifies on submit. This keeps the
implementation stateless (works fine across multiple workers/restarts)
without needing Redis or a database table.
"""
import random
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from flask import current_app

CAPTCHA_SALT = 'captcha-v1'
CAPTCHA_MAX_AGE_SECONDS = 5 * 60  # 5 minutes to answer

_OPERATORS = [
    ('+', lambda a, b: a + b),
    ('-', lambda a, b: a - b),
    ('*', lambda a, b: a * b),
]


def _serializer():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'], salt=CAPTCHA_SALT)


def generate_captcha():
    """Create a simple arithmetic question and a signed token holding the answer.

    Returns: {"question": "7 + 3 = ?", "captcha_token": "<signed token>"}
    """
    symbol, op = random.choice(_OPERATORS)
    a = random.randint(1, 15)
    b = random.randint(1, 15)
    if symbol == '-' and b > a:
        a, b = b, a  # avoid negative results, keeps it simple for users
    answer = op(a, b)

    token = _serializer().dumps({'answer': answer})
    return {
        'question': f'{a} {symbol} {b} = ?',
        'captcha_token': token,
    }


def verify_captcha(captcha_token, submitted_answer):
    """Verify a submitted answer against the signed token. Returns (ok, error_message)."""
    if not captcha_token or submitted_answer is None:
        return False, 'CAPTCHA answer is required'

    try:
        data = _serializer().loads(captcha_token, max_age=CAPTCHA_MAX_AGE_SECONDS)
    except SignatureExpired:
        return False, 'CAPTCHA expired, please try again'
    except BadSignature:
        return False, 'Invalid CAPTCHA, please try again'

    try:
        submitted_int = int(str(submitted_answer).strip())
    except (ValueError, TypeError):
        return False, 'CAPTCHA answer must be a number'

    if submitted_int != data.get('answer'):
        return False, 'Incorrect CAPTCHA answer'

    return True, None
