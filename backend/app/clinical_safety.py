"""Decision-support safety rules applied before every structured inference."""
from marshmallow import ValidationError

# Tighter physiological plausibility intervals than the schema's transport
# validation limits. Values outside these ranges are rejected, not imputed.
PLAUSIBLE_RANGES = {
    'heart': {'age': (18, 120), 'trestbps': (60, 260), 'chol': (80, 700), 'thalach': (40, 250)},
    'diabetes': {'Pregnancies': (0, 25), 'Glucose': (20, 600), 'BloodPressure': (20, 250), 'BMI': (10, 90), 'Age': (1, 120)},
    'cancer': {'mean radius': (0.1, 60), 'mean area': (1, 6000), 'worst radius': (0.1, 80), 'worst area': (1, 10000)},
}


def validate_clinical_safety(diagnosis_type, features):
    issues = {}
    for name, (minimum, maximum) in PLAUSIBLE_RANGES.get(diagnosis_type, {}).items():
        value = features.get(name)
        if value is None:
            continue
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            issues[name] = ['must be numeric']
            continue
        if not minimum <= numeric <= maximum:
            issues[name] = [f'must be within the plausible clinical interval {minimum}–{maximum}']
    if issues:
        raise ValidationError({'clinical_safety': issues})


def clinical_metadata(result):
    confidence = float(result.get('confidence', 0))
    risk = float(result.get('risk_score', 0))
    return {
        'decision_support_only': True,
        'disclaimer': 'Not a diagnosis or treatment recommendation. A qualified clinician must review all results.',
        'interoperability': {'format': 'FHIR-like', 'resource_type': 'DiagnosticReport'},
        'confidence_threshold': 0.70,
        'confidence_review_required': confidence < 0.70,
        'safety_flags': ['clinical_review_required'] if confidence < 0.70 or risk >= 70 else [],
    }


def differential_summary(diagnosis_type, result):
    """A transparent ranked model-output summary, not a list of new diseases."""
    probabilities = result.get('probabilities', {})
    labels = {
        'heart': ('Elevated coronary disease model signal', 'Lower coronary disease model signal'),
        'diabetes': ('Elevated diabetes model signal', 'Lower diabetes model signal'),
        'cancer': ('Malignant-pattern model signal', 'Benign-pattern model signal'),
    }
    positive, negative = labels[diagnosis_type]
    if diagnosis_type == 'cancer':
        positive_probability = float(probabilities.get('negative', 0))
    else:
        positive_probability = float(probabilities.get('positive', 0))
    ranked = [(positive, positive_probability), (negative, 1 - positive_probability)]
    return [
        {'rank': index + 1, 'label': label, 'confidence': round(score * 100, 1), 'kind': 'model_output'}
        for index, (label, score) in enumerate(sorted(ranked, key=lambda item: item[1], reverse=True))
    ]
