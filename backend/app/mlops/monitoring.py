"""
Model monitoring module.
Tracks prediction distributions, detects data drift, and alerts on performance degradation.
"""
import os
import json
from datetime import datetime, timezone
from collections import deque

import numpy as np
from scipy import stats


class ModelMonitor:
    """Monitors ML model predictions for drift and performance issues."""
    
    # Maximum prediction records to keep in memory
    MAX_RECORDS = 10000
    
    def __init__(self, diagnosis_type, monitor_dir=None):
        self.diagnosis_type = diagnosis_type
        self.monitor_dir = monitor_dir or os.path.join(
            os.path.dirname(__file__), 'monitor_data'
        )
        os.makedirs(self.monitor_dir, exist_ok=True)
        
        self.predictions = deque(maxlen=self.MAX_RECORDS)
        self.reference_distribution = None
        
        # Load existing records
        self._load_records()
    
    def record_prediction(self, features, result):
        """Record a prediction for monitoring."""
        record = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'features': {k: float(v) if isinstance(v, (int, float)) else v
                        for k, v in features.items()},
            'prediction': result.get('prediction'),
            'confidence': result.get('confidence'),
            'risk_score': result.get('risk_score'),
        }
        self.predictions.append(record)
        
        # Set reference distribution from first 50 predictions
        if len(self.predictions) == 50 and self.reference_distribution is None:
            self._set_reference_distribution()
        
        # Save periodically (every 100 predictions)
        if len(self.predictions) % 100 == 0:
            self._save_records()
    
    def detect_drift(self, new_features_list):
        """
        Detect data drift using Kolmogorov-Smirnov test.
        Compares new feature distributions against reference.
        
        Returns:
            dict: Drift detection results per feature
        """
        if self.reference_distribution is None:
            return {'status': 'insufficient_data', 'message': 'Need at least 50 predictions for reference'}
        
        drift_results = {}
        
        for feature_name, ref_values in self.reference_distribution.items():
            # Extract feature values from new data
            new_values = [
                f.get(feature_name) for f in new_features_list
                if feature_name in f
            ]
            
            if len(new_values) < 10:
                continue
            
            ref_arr = np.array(ref_values, dtype=float)
            new_arr = np.array(new_values, dtype=float)
            
            # Kolmogorov-Smirnov test
            ks_stat, p_value = stats.ks_2samp(ref_arr, new_arr)
            
            drift_results[feature_name] = {
                'ks_statistic': float(ks_stat),
                'p_value': float(p_value),
                'drift_detected': p_value < 0.05,  # Significant at 5% level
                'severity': self._classify_severity(ks_stat),
            }
        
        return drift_results
    
    def get_prediction_distribution(self):
        """Get distribution of recent predictions."""
        if not self.predictions:
            return {}
        
        pred_values = [p['prediction'] for p in self.predictions]
        confidence_values = [p['confidence'] for p in self.predictions if p.get('confidence')]
        risk_values = [p['risk_score'] for p in self.predictions if p.get('risk_score')]
        
        unique, counts = np.unique(pred_values, return_counts=True)
        
        return {
            'total_predictions': len(self.predictions),
            'prediction_counts': dict(zip(unique.tolist(), counts.tolist())),
            'avg_confidence': float(np.mean(confidence_values)) if confidence_values else 0,
            'avg_risk_score': float(np.mean(risk_values)) if risk_values else 0,
            'risk_score_std': float(np.std(risk_values)) if risk_values else 0,
        }
    
    def get_drift_report(self):
        """Generate a comprehensive drift report."""
        distribution = self.get_prediction_distribution()
        
        # Get recent features for drift detection
        recent_features = [
            p['features'] for p in list(self.predictions)[-100:]
            if p.get('features')
        ]
        
        drift_results = self.detect_drift(recent_features) if recent_features else {}
        
        # Count drift alerts
        drift_count = sum(1 for v in drift_results.values() if v.get('drift_detected'))
        
        # Recommendations
        recommendations = []
        if drift_count > len(drift_results) * 0.3:
            recommendations.append('Significant drift detected. Consider retraining the model.')
        if distribution.get('avg_confidence', 1) < 0.6:
            recommendations.append('Low average confidence. Model may need recalibration.')
        
        return {
            'diagnosis_type': self.diagnosis_type,
            'distribution': distribution,
            'drift_results': drift_results,
            'drift_features_count': drift_count,
            'total_features_monitored': len(drift_results),
            'recommendations': recommendations,
            'last_updated': datetime.now(timezone.utc).isoformat(),
        }
    
    def _set_reference_distribution(self):
        """Set reference feature distributions from initial predictions."""
        self.reference_distribution = {}
        
        for record in list(self.predictions)[:50]:
            for feature, value in record.get('features', {}).items():
                if isinstance(value, (int, float)):
                    if feature not in self.reference_distribution:
                        self.reference_distribution[feature] = []
                    self.reference_distribution[feature].append(value)
    
    def _classify_severity(self, ks_stat):
        """Classify drift severity based on KS statistic."""
        if ks_stat < 0.1:
            return 'none'
        elif ks_stat < 0.2:
            return 'low'
        elif ks_stat < 0.4:
            return 'medium'
        else:
            return 'high'
    
    def _save_records(self):
        """Save prediction records to file."""
        path = os.path.join(
            self.monitor_dir, f'{self.diagnosis_type}_predictions.json'
        )
        data = {
            'predictions': list(self.predictions),
            'reference_distribution': self.reference_distribution,
        }
        with open(path, 'w') as f:
            json.dump(data, f)
    
    def _load_records(self):
        """Load prediction records from file."""
        path = os.path.join(
            self.monitor_dir, f'{self.diagnosis_type}_predictions.json'
        )
        if os.path.exists(path):
            try:
                with open(path, 'r') as f:
                    data = json.load(f)
                self.predictions = deque(
                    data.get('predictions', []),
                    maxlen=self.MAX_RECORDS
                )
                self.reference_distribution = data.get('reference_distribution')
            except (json.JSONDecodeError, KeyError):
                pass
