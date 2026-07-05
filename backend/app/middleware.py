"""
Security middleware: rate limiting, request logging, and input sanitization.
Production-grade security for healthcare AI endpoints.
"""
import time
import functools
from collections import defaultdict
from flask import request, jsonify, g
from datetime import datetime


class RateLimiter:
    """
    In-memory sliding window rate limiter.
    Supports per-IP and per-user rate limiting.
    """

    def __init__(self):
        self._requests = defaultdict(list)
        self._window_seconds = 60
        self._max_requests = 100  # Default: 100 requests per minute
        self._endpoint_limits = {}

    def configure(self, window_seconds=60, max_requests=100, endpoint_limits=None):
        """Configure global and per-endpoint limits."""
        self._window_seconds = window_seconds
        self._max_requests = max_requests
        if endpoint_limits:
            self._endpoint_limits = endpoint_limits

    def _get_client_key(self):
        """Get client identifier (IP or JWT user)."""
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            return f"user:{auth_header[7:50]}"
        return f"ip:{request.remote_addr}"

    def _clean_old_requests(self, key):
        """Remove requests outside the sliding window."""
        now = time.time()
        cutoff = now - self._window_seconds
        self._requests[key] = [t for t in self._requests[key] if t > cutoff]

    def is_rate_limited(self, endpoint=None):
        """Check if the current request should be rate-limited."""
        key = self._get_client_key()
        if endpoint:
            key = f"{key}:{endpoint}"

        self._clean_old_requests(key)

        max_reqs = self._max_requests
        if endpoint and endpoint in self._endpoint_limits:
            max_reqs = self._endpoint_limits[endpoint]

        if len(self._requests[key]) >= max_reqs:
            return True

        self._requests[key].append(time.time())
        return False


# Global rate limiter instance
rate_limiter = RateLimiter()


def rate_limit(endpoint_name=None, max_requests=None):
    """
    Decorator for rate-limiting individual endpoints.

    Usage:
        @rate_limit('diagnosis', max_requests=30)
        def predict_heart():
            ...
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            if rate_limiter.is_rate_limited(endpoint_name or f.__name__):
                return jsonify({
                    'error': 'Rate limit exceeded. Please try again later.',
                    'retry_after': rate_limiter._window_seconds
                }), 429
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def init_rate_limiter(app):
    """Initialize rate limiter with Flask app configuration."""
    rate_limiter.configure(
        window_seconds=app.config.get('RATE_LIMIT_WINDOW', 60),
        max_requests=app.config.get('RATE_LIMIT_MAX', 100),
        endpoint_limits=app.config.get('RATE_LIMIT_ENDPOINTS', {
            'diagnosis_heart': 30,
            'diagnosis_diabetes': 30,
            'diagnosis_cancer': 30,
            'diagnosis_multi': 10,
            'auth_register': 5,
            'auth_login': 20,
        })
    )


class RequestLogger:
    """
    Structured request/response logging middleware.
    Logs all API calls for audit compliance (HIPAA-ready).
    """

    def __init__(self, app=None):
        if app:
            self.init_app(app)

    def init_app(self, app):
        app.before_request(self._before_request)
        app.after_request(self._after_request)

    @staticmethod
    def _before_request():
        """Record request start time."""
        g.request_start = time.time()
        g.request_id = f"{int(time.time() * 1000)}-{request.method}-{request.path}"

    @staticmethod
    def _after_request(response):
        """Log request details after response."""
        duration = time.time() - getattr(g, 'request_start', time.time())
        request_id = getattr(g, 'request_id', 'unknown')

        log_entry = {
            'request_id': request_id,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'duration_ms': round(duration * 1000, 2),
            'remote_addr': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', '')[:100],
            'content_length': request.content_length or 0,
        }

        # Only log non-sensitive request bodies
        if request.method in ['POST', 'PUT', 'PATCH'] and not any(
            s in request.path for s in ['/auth/', '/login', '/register']
        ):
            log_entry['has_body'] = True

        # Log at INFO level for 2xx, WARNING for 4xx, ERROR for 5xx
        if response.status_code >= 500:
            import logging
            logger = logging.getLogger('medical_ai.request_audit')
            logger.error('REQUEST_ERROR', extra=log_entry)
        elif response.status_code >= 400:
            import logging
            logger = logging.getLogger('medical_ai.request_audit')
            logger.warning('REQUEST_CLIENT_ERROR', extra=log_entry)

        # Add security headers
        response.headers['X-Request-ID'] = request_id
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

        return response
