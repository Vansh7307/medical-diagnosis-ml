"""
Tests for ML pipeline components.
"""
import pytest
import numpy as np
import pandas as pd
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.ml.pipelines import (
    create_heart_disease_pipeline,
    create_diabetes_pipeline,
    create_cancer_pipeline,
    get_pipeline,
    get_hyperparameter_grid,
    MODEL_INFO,
)
from app.data.preprocessor import MedicalDataPreprocessor
from app.data.dataset_loader import (
    load_heart_disease, load_diabetes, load_breast_cancer
)


class TestPipelines:
    """Test ML pipeline creation."""

    def test_create_heart_pipeline(self):
        pipeline = create_heart_disease_pipeline()
        assert pipeline is not None
        assert 'scaler' in pipeline.named_steps
        assert 'classifier' in pipeline.named_steps

    def test_create_diabetes_pipeline(self):
        pipeline = create_diabetes_pipeline()
        assert pipeline is not None
        assert 'scaler' in pipeline.named_steps
        assert 'classifier' in pipeline.named_steps

    def test_create_cancer_pipeline(self):
        pipeline = create_cancer_pipeline()
        assert pipeline is not None
        assert 'pca' in pipeline.named_steps
        assert 'classifier' in pipeline.named_steps

    def test_get_pipeline(self):
        for dtype in ['heart', 'diabetes', 'cancer']:
            pipeline = get_pipeline(dtype)
            assert pipeline is not None

    def test_get_pipeline_invalid(self):
        with pytest.raises(ValueError):
            get_pipeline('invalid_type')

    def test_hyperparameter_grids(self):
        for dtype in ['heart', 'diabetes', 'cancer']:
            grid = get_hyperparameter_grid(dtype)
            assert isinstance(grid, dict)

    def test_model_info(self):
        for dtype in ['heart', 'diabetes', 'cancer']:
            info = MODEL_INFO[dtype]
            assert 'name' in info
            assert 'features' in info
            assert 'description' in info
            assert len(info['features']) > 0


class TestPreprocessor:
    """Test data preprocessor."""

    def test_heart_preprocessor(self):
        pp = MedicalDataPreprocessor('heart')
        df = load_heart_disease()
        X, y, df_clean = pp.preprocess_pipeline(df, fit=True)
        assert X.shape[0] == df.shape[0]
        assert X.shape[1] == 13  # 13 features
        assert y is not None
        assert pp.is_fitted

    def test_diabetes_preprocessor(self):
        pp = MedicalDataPreprocessor('diabetes')
        df = load_diabetes()
        X, y, df_clean = pp.preprocess_pipeline(df, fit=True)
        assert X.shape[0] == df.shape[0]
        assert y is not None

    def test_cancer_preprocessor(self):
        pp = MedicalDataPreprocessor('cancer')
        df = load_breast_cancer()
        X, y, df_clean = pp.preprocess_pipeline(df, fit=True)
        assert X.shape[0] == df.shape[0]
        assert X.shape[1] == 30

    def test_transform_single_input(self):
        pp = MedicalDataPreprocessor('heart')
        df = load_heart_disease()
        pp.preprocess_pipeline(df, fit=True)

        input_dict = {
            'age': 55, 'sex': 1, 'cp': 2, 'trestbps': 140, 'chol': 250,
            'fbs': 0, 'restecg': 1, 'thalach': 140, 'exang': 1,
            'oldpeak': 2.0, 'slope': 1, 'ca': 1, 'thal': 3
        }
        X = pp.transform_single_input(input_dict)
        assert X.shape == (1, 13)

    def test_validation(self):
        pp = MedicalDataPreprocessor('heart')
        df = load_heart_disease()
        is_valid, issues = pp.validate_features(df)
        assert isinstance(is_valid, bool)
        assert isinstance(issues, list)

    def test_get_feature_names(self):
        pp = MedicalDataPreprocessor('heart')
        features = pp.get_feature_names()
        assert len(features) == 13
        assert 'age' in features

    def test_get_target_name(self):
        assert MedicalDataPreprocessor('heart').get_target_name() == 'target'
        assert MedicalDataPreprocessor('diabetes').get_target_name() == 'Outcome'
        assert MedicalDataPreprocessor('cancer').get_target_name() == 'target'


class TestDataLoader:
    """Test dataset loading."""

    def test_load_heart_disease(self):
        df = load_heart_disease()
        assert len(df) > 0
        assert 'target' in df.columns
        assert 'age' in df.columns

    def test_load_diabetes(self):
        df = load_diabetes()
        assert len(df) > 0
        assert 'Outcome' in df.columns
        assert 'Glucose' in df.columns

    def test_load_breast_cancer(self):
        df = load_breast_cancer()
        assert len(df) > 0
        assert 'target' in df.columns
        assert 'mean radius' in df.columns
