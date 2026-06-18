"""
Structured ML logging module.
Provides JSON logging for all ML operations with prediction audit trail.
"""
import os
import json
import logging
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler


class MLLogger:
    """Structured JSON logger for ML operations."""
    
    def __init__(self, log_dir=None):
        self.log_dir = log_dir or os.path.join(
            os.path.dirname(__file__), 'logs'
        )
        os.makedirs(self.log_dir, exist_ok=True)
        
        # Setup Python logger
        self.logger = logging.getLogger('ml_operations')
        self.logger.setLevel(logging.INFO)
        
        # Avoid duplicate handlers
        if not self.logger.handlers:
            # Rotating file handler
            log_path = os.path.join(self.log_dir, 'ml_operations.json')
            handler = RotatingFileHandler(
                log_path, maxBytes=10*1024*1024, backupCount=5
            )
            handler.setFormatter(JsonFormatter())
            self.logger.addHandler(handler)
            
            # Console handler for development
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(JsonFormatter())
            self.logger.addHandler(console_handler)
        
        # Prediction audit log (separate file)
        self.audit_path = os.path.join(self.log_dir, 'prediction_audit.jsonl')
    
    def log_prediction(self, diagnosis_type, input_features, prediction, model_version):
        """
        Log a prediction event for audit trail.
        
        Args:
            diagnosis_type: Type of diagnosis
            input_features: Input feature dictionary
            prediction: Prediction result dictionary
            model_version: Version of model used
        """
        audit_record = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'event_type': 'prediction',
            'diagnosis_type': diagnosis_type,
            'model_version': model_version,
            'input_features': self._sanitize_features(input_features),
            'prediction': prediction.get('prediction'),
            'prediction_label': prediction.get('prediction_label'),
            'confidence': prediction.get('confidence'),
            'risk_score': prediction.get('risk_score'),
        }
        
        # Log to audit file (JSONL format - one JSON per line)
        with open(self.audit_path, 'a') as f:
            f.write(json.dumps(audit_record) + '\n')
        
        # Also log to structured logger
        self.logger.info('prediction_made', extra={
            'event': audit_record
        })
    
    def log_training(self, diagnosis_type, metrics, model_version, duration_seconds=None):
        """Log a model training event."""
        event = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'event_type': 'training',
            'diagnosis_type': diagnosis_type,
            'model_version': model_version,
            'metrics': metrics,
            'duration_seconds': duration_seconds,
        }
        
        self.logger.info('model_trained', extra={'event': event})
    
    def log_evaluation(self, diagnosis_type, metrics, model_version):
        """Log a model evaluation event."""
        event = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'event_type': 'evaluation',
            'diagnosis_type': diagnosis_type,
            'model_version': model_version,
            'metrics': metrics,
        }
        
        self.logger.info('model_evaluated', extra={'event': event})
    
    def log_drift_alert(self, diagnosis_type, feature_name, severity, ks_statistic):
        """Log a drift detection alert."""
        event = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'event_type': 'drift_alert',
            'diagnosis_type': diagnosis_type,
            'feature_name': feature_name,
            'severity': severity,
            'ks_statistic': ks_statistic,
        }
        
        self.logger.warning('drift_detected', extra={'event': event})
    
    def log_error(self, diagnosis_type, operation, error_message):
        """Log an error event."""
        event = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'event_type': 'error',
            'diagnosis_type': diagnosis_type,
            'operation': operation,
            'error_message': error_message,
        }
        
        self.logger.error('ml_error', extra={'event': event})
    
    def get_audit_log(self, limit=100, diagnosis_type=None):
        """
        Read prediction audit log entries.
        
        Args:
            limit: Maximum number of entries to return
            diagnosis_type: Filter by diagnosis type
            
        Returns:
            List of audit records (most recent first)
        """
        if not os.path.exists(self.audit_path):
            return []
        
        records = []
        with open(self.audit_path, 'r') as f:
            for line in f:
                try:
                    record = json.loads(line.strip())
                    if diagnosis_type and record.get('diagnosis_type') != diagnosis_type:
                        continue
                    records.append(record)
                except json.JSONDecodeError:
                    continue
        
        # Return most recent first
        records.reverse()
        return records[:limit]
    
    def _sanitize_features(self, features):
        """Sanitize feature values for logging (remove sensitive data)."""
        if not isinstance(features, dict):
            return {}
        
        sanitized = {}
        for key, value in features.items():
            if isinstance(value, (int, float)):
                sanitized[key] = round(float(value), 4)
            elif isinstance(value, str):
                sanitized[key] = value[:50]  # Truncate long strings
            else:
                sanitized[key] = str(value)[:50]
        
        return sanitized


class JsonFormatter(logging.Formatter):
    """JSON formatter for structured logging."""
    
    def format(self, record):
        log_entry = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': record.levelname,
            'message': record.getMessage(),
            'logger': record.name,
        }
        
        if hasattr(record, 'event'):
            log_entry['event'] = record.event
        
        return json.dumps(log_entry)
