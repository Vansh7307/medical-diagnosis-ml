import pytest
from marshmallow import ValidationError

from app.clinical_safety import clinical_metadata, differential_summary, validate_clinical_safety
from app.utils.ttl_cache import TTLCache


def test_rejects_implausible_glucose():
    with pytest.raises(ValidationError):
        validate_clinical_safety('diabetes', {'Glucose': 900})


def test_metadata_requires_human_review_at_low_confidence():
    metadata = clinical_metadata({'confidence': 0.55, 'risk_score': 20})
    assert metadata['decision_support_only'] is True
    assert metadata['confidence_review_required'] is True


def test_differential_summary_is_ranked_model_output():
    output = differential_summary('diabetes', {'probabilities': {'negative': 0.2, 'positive': 0.8}})
    assert output[0]['confidence'] == 80.0
    assert output[0]['kind'] == 'model_output'


def test_ttl_cache_returns_identical_request_only():
    cache = TTLCache()
    cache.set({'x': 1}, {'result': 'cached'})
    assert cache.get({'x': 1}) == {'result': 'cached'}
    assert cache.get({'x': 2}) is None
