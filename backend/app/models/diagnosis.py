from datetime import datetime, timezone
from app import db


class Diagnosis(db.Model):
    """Diagnosis model for ML prediction results."""
    __tablename__ = 'diagnoses'

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False, index=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    diagnosis_type = db.Column(db.String(50), nullable=False)  # heart, diabetes, cancer, multi
    prediction = db.Column(db.String(50), nullable=False)  # positive, negative, high_risk, etc.
    confidence = db.Column(db.Float, nullable=False)  # 0.0 to 1.0
    risk_score = db.Column(db.Float, nullable=True)  # 0.0 to 100.0
    
    # Input features stored as JSON string
    input_features = db.Column(db.Text, nullable=True)
    
    # Model metadata
    model_name = db.Column(db.String(100), nullable=True)
    model_version = db.Column(db.String(20), nullable=True)
    
    # Multi-diagnosis results (JSON for multiple predictions)
    multi_results = db.Column(db.Text, nullable=True)
    
    # Clinical notes
    notes = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='completed')  # pending, completed, reviewed
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'created_by': self.created_by,
            'diagnosis_type': self.diagnosis_type,
            'prediction': self.prediction,
            'confidence': self.confidence,
            'risk_score': self.risk_score,
            'input_features': self.input_features,
            'model_name': self.model_name,
            'model_version': self.model_version,
            'multi_results': self.multi_results,
            'notes': self.notes,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
