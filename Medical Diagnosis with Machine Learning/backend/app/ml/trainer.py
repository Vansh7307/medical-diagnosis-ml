"""
Model training orchestrator.
Handles model training, cross-validation, hyperparameter tuning, and serialization.
"""
import os
import json
import hashlib
from datetime import datetime, timezone

import numpy as np
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV

from app.ml.pipelines import get_pipeline, get_hyperparameter_grid, MODEL_INFO
from app.data.dataset_loader import load_heart_disease, load_diabetes, load_breast_cancer
from app.data.preprocessor import MedicalDataPreprocessor


class ModelTrainer:
    """Orchestrates model training for medical diagnosis models."""
    
    def __init__(self, diagnosis_type, models_dir=None):
        """
        Args:
            diagnosis_type: 'heart', 'diabetes', or 'cancer'
            models_dir: Directory to save trained models
        """
        self.diagnosis_type = diagnosis_type
        self.models_dir = models_dir or os.path.join(
            os.path.dirname(__file__), 'models'
        )
        os.makedirs(self.models_dir, exist_ok=True)
        
        self.pipeline = None
        self.preprocessor = MedicalDataPreprocessor(diagnosis_type)
        self.metrics = {}
        self.model_version = None
        self.feature_importance = {}
    
    def load_data(self):
        """Load the appropriate dataset for the diagnosis type."""
        loaders = {
            'heart': load_heart_disease,
            'diabetes': load_diabetes,
            'cancer': load_breast_cancer,
        }
        return loaders[self.diagnosis_type]()
    
    def train(self, test_size=0.2, cv_folds=5, tune_hyperparameters=False):
        """
        Full training pipeline:
        1. Load and preprocess data
        2. Train/test split (stratified)
        3. Optional hyperparameter tuning
        4. Cross-validation
        5. Final training on full training set
        6. Evaluation on test set
        7. Save model artifact
        
        Returns:
            dict: Training results with metrics
        """
        print(f"\n{'='*60}")
        print(f"Training {self.diagnosis_type.upper()} model")
        print(f"{'='*60}")
        
        # Load data
        df = self.load_data()
        print(f"Dataset: {df.shape[0]} samples, {df.shape[1]} columns")
        
        # Preprocess
        X, y, df_clean = self.preprocessor.preprocess_pipeline(df, fit=True)
        print(f"Features shape: {X.shape}, Target shape: {y.shape}")
        print(f"Class distribution: {dict(zip(*np.unique(y, return_counts=True)))}")
        
        # Stratified train/test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, stratify=y, random_state=42
        )
        print(f"Train: {X_train.shape[0]}, Test: {X_test.shape[0]}")
        
        # Create pipeline
        self.pipeline = get_pipeline(self.diagnosis_type)
        
        # Optional hyperparameter tuning
        if tune_hyperparameters:
            self._tune_hyperparameters(X_train, y_train)
        
        # Cross-validation
        cv_scores = cross_val_score(
            self.pipeline, X_train, y_train,
            cv=cv_folds, scoring='accuracy'
        )
        print(f"\nCross-validation ({cv_folds}-fold):")
        print(f"  Mean accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")
        
        # Final training
        self.pipeline.fit(X_train, y_train)
        print(f"Model trained on full training set.")
        
        # Extract feature importance
        self._extract_feature_importance()
        
        # Evaluate on test set
        self.metrics = self._evaluate(X_test, y_test)
        
        # Generate model version
        self.model_version = self._generate_version()
        
        # Save model
        self._save_model()
        
        # Compile results
        results = {
            'diagnosis_type': self.diagnosis_type,
            'model_name': MODEL_INFO[self.diagnosis_type]['name'],
            'model_version': self.model_version,
            'cv_mean_accuracy': float(cv_scores.mean()),
            'cv_std_accuracy': float(cv_scores.std()),
            'test_metrics': self.metrics,
            'feature_importance': self.feature_importance,
            'train_samples': int(X_train.shape[0]),
            'test_samples': int(X_test.shape[0]),
            'n_features': int(X.shape[1]),
            'trained_at': datetime.now(timezone.utc).isoformat(),
            'dataset_hash': self._compute_dataset_hash(df),
        }
        
        print(f"\nModel Version: {self.model_version}")
        print(f"Test Accuracy: {self.metrics['accuracy']:.4f}")
        print(f"Test F1 Score: {self.metrics['f1_score']:.4f}")
        
        return results
    
    def _tune_hyperparameters(self, X_train, y_train):
        """Run GridSearchCV for hyperparameter tuning."""
        print("\nRunning hyperparameter tuning (GridSearchCV)...")
        param_grid = get_hyperparameter_grid(self.diagnosis_type)
        
        if not param_grid:
            print("No hyperparameter grid defined, skipping tuning.")
            return
        
        # Use a reduced grid for faster training
        reduced_grid = {}
        for key, values in param_grid.items():
            reduced_grid[key] = values[:2]  # Take first 2 values
        
        grid_search = GridSearchCV(
            self.pipeline, reduced_grid,
            cv=3, scoring='f1', n_jobs=-1, verbose=0
        )
        grid_search.fit(X_train, y_train)
        
        print(f"Best parameters: {grid_search.best_params_}")
        print(f"Best CV F1: {grid_search.best_score_:.4f}")
        
        # Use best pipeline
        self.pipeline = grid_search.best_estimator_
    
    def _evaluate(self, X_test, y_test):
        """Evaluate model on test set."""
        from sklearn.metrics import (
            accuracy_score, precision_score, recall_score,
            f1_score, roc_auc_score, confusion_matrix
        )
        
        y_pred = self.pipeline.predict(X_test)
        y_prob = self.pipeline.predict_proba(X_test)[:, 1]
        
        cm = confusion_matrix(y_test, y_pred)
        
        metrics = {
            'accuracy': float(accuracy_score(y_test, y_pred)),
            'precision': float(precision_score(y_test, y_pred, zero_division=0)),
            'recall': float(recall_score(y_test, y_pred, zero_division=0)),
            'f1_score': float(f1_score(y_test, y_pred, zero_division=0)),
            'roc_auc': float(roc_auc_score(y_test, y_prob)),
            'confusion_matrix': cm.tolist(),
        }
        
        print(f"\nTest Set Metrics:")
        print(f"  Accuracy:  {metrics['accuracy']:.4f}")
        print(f"  Precision: {metrics['precision']:.4f}")
        print(f"  Recall:    {metrics['recall']:.4f}")
        print(f"  F1 Score:  {metrics['f1_score']:.4f}")
        print(f"  ROC AUC:   {metrics['roc_auc']:.4f}")
        
        return metrics
    
    def _extract_feature_importance(self):
        """Extract feature importance from the trained model."""
        features = self.preprocessor.get_feature_names()
        
        try:
            classifier = self.pipeline.named_steps.get('classifier')
            
            if hasattr(classifier, 'feature_importances_'):
                importances = classifier.feature_importances_
            elif hasattr(classifier, 'estimators_'):
                # For VotingClassifier, average importances
                importances = np.mean([
                    est.feature_importances_
                    for est in classifier.estimators_
                    if hasattr(est, 'feature_importances_')
                ], axis=0)
            else:
                importances = None
            
            if importances is not None:
                # Handle feature selection reducing dimensionality
                n_importances = len(importances)
                n_features = len(features)
                if n_importances <= n_features:
                    used_features = features[:n_importances]
                else:
                    used_features = features
                    
                self.feature_importance = {
                    f: float(imp)
                    for f, imp in zip(used_features, importances)
                }
                # Sort by importance
                self.feature_importance = dict(
                    sorted(self.feature_importance.items(), key=lambda x: x[1], reverse=True)
                )
        except Exception as e:
            print(f"Could not extract feature importance: {e}")
            self.feature_importance = {}
    
    def _generate_version(self):
        """Generate a version string based on timestamp and metrics."""
        ts = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        acc = int(self.metrics.get('accuracy', 0) * 100)
        return f"v{acc}_{ts}"
    
    def _compute_dataset_hash(self, df):
        """Compute hash of dataset for lineage tracking."""
        data_str = df.to_string()
        return hashlib.md5(data_str.encode()).hexdigest()[:12]
    
    def _save_model(self):
        """Save trained model pipeline and metadata."""
        # Save pipeline
        model_path = os.path.join(
            self.models_dir, f'{self.diagnosis_type}_pipeline.pkl'
        )
        joblib.dump(self.pipeline, model_path)
        print(f"Model saved to: {model_path}")
        
        # Save preprocessor
        preprocessor_path = os.path.join(
            self.models_dir, f'{self.diagnosis_type}_preprocessor.pkl'
        )
        joblib.dump(self.preprocessor, preprocessor_path)
        print(f"Preprocessor saved to: {preprocessor_path}")
        
        # Save metadata
        metadata = {
            'diagnosis_type': self.diagnosis_type,
            'model_name': MODEL_INFO[self.diagnosis_type]['name'],
            'model_version': self.model_version,
            'metrics': self.metrics,
            'feature_importance': self.feature_importance,
            'trained_at': datetime.now(timezone.utc).isoformat(),
            'preprocessor_fitted': True,
        }
        metadata_path = os.path.join(
            self.models_dir, f'{self.diagnosis_type}_metadata.json'
        )
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        print(f"Metadata saved to: {metadata_path}")
    
    def predict(self, input_features):
        """
        Make prediction on new input.
        
        Args:
            input_features: dict or DataFrame with feature values
            
        Returns:
            dict with prediction, confidence, and risk score
        """
        if self.pipeline is None:
            self._load_model()
        
        if isinstance(input_features, dict):
            X = self.preprocessor.transform_single_input(input_features)
        elif isinstance(input_features, pd.DataFrame):
            X = self.preprocessor.transform_single_input(input_features.iloc[0].to_dict())
        else:
            X = input_features
        
        prediction = self.pipeline.predict(X)[0]
        probabilities = self.pipeline.predict_proba(X)[0]

        confidence = float(max(probabilities))

        # CRITICAL: Cancer dataset uses inverted encoding (0=malignant, 1=benign)
        # For heart/diabetes: class 1 = disease present → risk = P(class 1)
        # For cancer: class 0 = malignant (disease) → risk = P(class 0)
        if self.diagnosis_type == 'cancer':
            risk_score = float(probabilities[0] * 100)  # P(malignant)
        else:
            risk_score = float(probabilities[1] * 100)  # P(positive class)

        return {
            'prediction': int(prediction),
            'prediction_label': self._get_prediction_label(int(prediction)),
            'confidence': round(confidence, 4),
            'risk_score': round(risk_score, 2),
            'probabilities': {
                'negative': round(float(probabilities[0]), 4),
                'positive': round(float(probabilities[1]), 4),
            },
            'model_version': self.model_version,
        }
    
    def _get_prediction_label(self, prediction):
        """Convert numeric prediction to human-readable label."""
        labels = {
            'heart': {0: 'No Heart Disease', 1: 'Heart Disease Detected'},
            'diabetes': {0: 'Low Diabetes Risk', 1: 'High Diabetes Risk'},
            'cancer': {0: 'Malignant', 1: 'Benign'},
        }
        return labels.get(self.diagnosis_type, {}).get(prediction, 'Unknown')
    
    def _load_model(self):
        """Load a previously trained model from disk."""
        model_path = os.path.join(
            self.models_dir, f'{self.diagnosis_type}_pipeline.pkl'
        )
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"No trained model found for '{self.diagnosis_type}'. "
                f"Train the model first."
            )
        
        self.pipeline = joblib.load(model_path)
        
        # Load preprocessor
        preprocessor_path = os.path.join(
            self.models_dir, f'{self.diagnosis_type}_preprocessor.pkl'
        )
        if os.path.exists(preprocessor_path):
            self.preprocessor = joblib.load(preprocessor_path)
        
        # Load metadata
        metadata_path = os.path.join(
            self.models_dir, f'{self.diagnosis_type}_metadata.json'
        )
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            self.model_version = metadata.get('model_version', 'unknown')
            self.metrics = metadata.get('metrics', {})
            self.feature_importance = metadata.get('feature_importance', {})


def train_all_models(tune_hyperparameters=False):
    """Train all diagnosis models."""
    results = {}
    for dtype in ['heart', 'diabetes', 'cancer']:
        trainer = ModelTrainer(dtype)
        results[dtype] = trainer.train(tune_hyperparameters=tune_hyperparameters)
    return results


if __name__ == '__main__':
    print("Training all models...")
    results = train_all_models(tune_hyperparameters=False)
    print("\n" + "="*60)
    print("TRAINING SUMMARY")
    print("="*60)
    for dtype, res in results.items():
        print(f"\n{dtype.upper()}:")
        print(f"  Accuracy: {res['test_metrics']['accuracy']:.4f}")
        print(f"  F1 Score: {res['test_metrics']['f1_score']:.4f}")
        print(f"  ROC AUC:  {res['test_metrics']['roc_auc']:.4f}")
