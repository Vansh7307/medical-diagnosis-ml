"""Shared route decorators."""
import functools
from flask import jsonify
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
