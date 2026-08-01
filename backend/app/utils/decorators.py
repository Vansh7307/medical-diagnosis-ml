"""Shared route decorators."""
import os
import functools
from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt


def role_required(*roles):
    """Require the JWT to carry one of the given roles."""
    def decorator(f):
        @functools.wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            claims = get_jwt()
            user_role = claims.get('role', 'patient')
            if user_role not in roles:
                return jsonify({
                    'error': 'Forbidden',
                    'message': f'Access requires one of these roles: {", ".join(roles)}'
                }), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def get_client_ip():
    """Get the real client IP, accounting for Render's reverse proxy.
    X-Forwarded-For can contain a chain of proxy hops -- the first entry
    is the original client."""
    forwarded_for = request.headers.get('X-Forwarded-For', '')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.remote_addr


def admin_ip_restricted(f):
    """Restrict a route to only the IP addresses listed in the
    ADMIN_ALLOWED_IPS environment variable (comma-separated).

    If ADMIN_ALLOWED_IPS is not set at all, this fails OPEN (allows the
    request through) rather than permanently locking everyone out of the
    admin portal before it's configured. Once you set that environment
    variable, the restriction takes effect immediately -- until then, this
    check does nothing, so make sure to actually set it.
    """
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        allowed_ips_raw = os.environ.get('ADMIN_ALLOWED_IPS', '').strip()
        if not allowed_ips_raw:
            return f(*args, **kwargs)

        allowed_ips = [ip.strip() for ip in allowed_ips_raw.split(',') if ip.strip()]
        client_ip = get_client_ip()
        if client_ip not in allowed_ips:
            return jsonify({
                'error': 'Access to the admin portal is restricted to specific networks.'
            }), 403
        return f(*args, **kwargs)
    return decorated_function