"""
SHAP-based model explainability for clinical decision transparency.
Provides feature attribution for each prediction — critical for
healthcare AI compliance (FDA AI/ML guidelines).
"""
import os
import numpy as np
import base64
import io
import joblib
from flask import current_app

try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False


class ModelExplainer:
    """
    Provides SHAP (SHapley Additive exPlanations) for ML model predictions.
    Enables clinical decision transparency — shows which features drove
    a particular diagnosis.
    """

    def __init__(self, diagnosis_type):
        self.diagnosis_type = diagnosis_type
        self.explainer = None
        self.pipeline = None
        self.preprocessor = None
        self._background_data = None

    def load_model(self, models_dir=None):
        """Load the trained model and preprocessor."""
        if models_dir is None:
            models_dir = current_app.config['ML_MODELS_DIR']

        pipeline_path = os.path.join(models_dir, f'{self.diagnosis_type}_pipeline.pkl')
        preprocessor_path = os.path.join(models_dir, f'{self.diagnosis_type}_preprocessor.pkl')

        if os.path.exists(pipeline_path):
            self.pipeline = joblib.load(pipeline_path)
        if os.path.exists(preprocessor_path):
            self.preprocessor = joblib.load(preprocessor_path)

        return self.pipeline is not None

    def create_explainer(self, background_data=None):
        """
        Create a SHAP explainer for the model.
        Uses KernelExplainer for sklearn pipelines.
        """
        if not SHAP_AVAILABLE:
            return False

        if self.pipeline is None:
            if not self.load_model():
                return False

        if background_data is not None:
            self._background_data = background_data
        elif self._background_data is None:
            # Generate representative background data
            from app.data.dataset_loader import load_heart_disease, load_diabetes, load_breast_cancer

            loaders = {
                'heart': load_heart_disease,
                'diabetes': load_diabetes,
                'cancer': load_breast_cancer,
            }
            df = loaders[self.diagnosis_type]()
            target_col = 'Outcome' if self.diagnosis_type == 'diabetes' else 'target'
            X = df.drop(columns=[target_col])

            if self.preprocessor:
                X, _, _ = self.preprocessor.preprocess_pipeline(df, fit=False)

            # Sample for background (max 100 samples for performance)
            if X.shape[0] > 100:
                idx = np.random.choice(X.shape[0], 100, replace=False)
                X_bg = X[idx] if isinstance(X, np.ndarray) else X.iloc[idx].values
            else:
                X_bg = X.values if hasattr(X, 'values') else X

            self._background_data = X_bg

        # Use KernelExplainer for pipeline models
        predict_fn = lambda x: self.pipeline.predict_proba(x)
        self.explainer = shap.KernelExplainer(predict_fn, self._background_data)
        return True

    def explain_prediction(self, features_dict):
        """
        Generate SHAP values for a single prediction.

        Returns:
            dict with:
            - feature_importance: list of {feature, importance} sorted by impact
            - shap_summary_plot: base64 encoded plot
            - force_plot: base64 encoded force plot
            - base_value: the expected prediction value
            - prediction_value: the actual prediction probability
        """
        if not SHAP_AVAILABLE:
            return {
                'available': False,
                'message': 'SHAP library not installed. Install with: pip install shap'
            }

        if self.explainer is None:
            if not self.create_explainer():
                return {
                    'available': False,
                    'message': 'Could not create explainer. Train the model first.'
                }

        # Transform features
        try:
            if self.preprocessor:
                X = self.preprocessor.transform_single_input(features_dict)
            else:
                X = np.array([list(features_dict.values())])
        except Exception as e:
            return {'available': False, 'message': f'Feature transformation failed: {str(e)}'}

        # Get SHAP values
        shap_values = self.explainer.shap_values(X)

        # Handle binary classification (returns list of arrays)
        if isinstance(shap_values, list):
            shap_values = shap_values[1]  # Positive class

        # Get feature names
        feature_names = self._get_feature_names()

        # Build feature importance ranking
        importance = []
        for i, name in enumerate(feature_names):
            importance.append({
                'feature': name,
                'importance': round(float(shap_values[0][i]), 4),
                'absolute_importance': round(abs(float(shap_values[0][i])), 4)
            })
        importance.sort(key=lambda x: x['absolute_importance'], reverse=True)

        # Get prediction
        prediction_proba = float(self.pipeline.predict_proba(X)[0][1])
        prediction = int(self.pipeline.predict(X)[0])
        base_value = float(self.explainer.expected_value[1] if isinstance(
            self.explainer.expected_value, (list, np.ndarray)
        ) else self.explainer.expected_value)

        result = {
            'available': True,
            'feature_importance': importance,
            'top_features': importance[:5],
            'prediction': prediction,
            'prediction_probability': round(prediction_proba, 4),
            'base_value': round(base_value, 4),
        }

        # Generate SHAP summary plot
        if MATPLOTLIB_AVAILABLE:
            try:
                result['shap_summary_plot'] = self._generate_shap_plot(
                    X, shap_values, feature_names
                )
            except Exception:
                result['shap_summary_plot'] = None

        return result

    def _generate_shap_plot(self, X, shap_values, feature_names):
        """Generate a SHAP summary bar plot."""
        fig, ax = plt.subplots(figsize=(10, 6))

        # Get mean absolute SHAP values
        mean_abs = np.mean(np.abs(shap_values), axis=0)
        indices = np.argsort(mean_abs)[::-1]

        top_n = min(15, len(feature_names))
        top_features = [feature_names[i] for i in indices[:top_n]]
        top_values = mean_abs[indices[:top_n]]

        bars = ax.barh(range(top_n), top_values, color='#1e40af', alpha=0.8)
        ax.set_yticks(range(top_n))
        ax.set_yticklabels(top_features, fontsize=10)
        ax.invert_yaxis()
        ax.set_xlabel('Mean |SHAP Value|', fontsize=12)
        ax.set_title(f'SHAP Feature Importance — {self.diagnosis_type.title()}', fontsize=14)
        ax.set_facecolor('#f8fafc')
        fig.patch.set_facecolor('#ffffff')
        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        encoded = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        return encoded

    def _get_feature_names(self):
        """Get feature names for the diagnosis type."""
        from app.data.preprocessor import MedicalDataPreprocessor
        pp = MedicalDataPreprocessor(self.diagnosis_type)
        return pp.get_feature_names()


def create_explainer(diagnosis_type):
    """Factory function for creating explainers."""
    return ModelExplainer(diagnosis_type)
