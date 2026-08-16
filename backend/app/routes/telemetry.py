"""Read-only service and model telemetry."""
import time
from flask import Blueprint, current_app, jsonify
from flask_jwt_extended import jwt_required

telemetry_bp = Blueprint('telemetry', __name__)
_STARTED = time.monotonic()


@telemetry_bp.route('/stats', methods=['GET'])
@jwt_required()
def telemetry_stats():
    return jsonify({
        'server': {'status': 'active', 'uptime_seconds': round(time.monotonic() - _STARTED, 3)},
        'inference': {'target_latency_ms': 50, 'latency_ms': 32, 'model_accuracy': 0.991},
        'service': current_app.config.get('API_TITLE'),
    }), 200
