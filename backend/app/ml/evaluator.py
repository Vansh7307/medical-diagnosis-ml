"""
Model evaluator module.
Generates classification reports, confusion matrices, ROC curves, and fairness metrics.
"""
import os
import io
import base64
import json
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_curve, auc,
    precision_recall_curve, average_precision_score
)


class ModelEvaluator:
    """Evaluates trained ML models and generates comprehensive reports."""
    
    def __init__(self, diagnosis_type, pipeline, X_test, y_test, preprocessor):
        """
        Args:
            diagnosis_type: 'heart', 'diabetes', or 'cancer'
            pipeline: Trained sklearn pipeline
            X_test: Test features (scaled)
            y_test: Test labels
            preprocessor: Fitted MedicalDataPreprocessor
        """
        self.diagnosis_type = diagnosis_type
        self.pipeline = pipeline
        self.X_test = X_test
        self.y_test = y_test
        self.preprocessor = preprocessor
        
        self.y_pred = pipeline.predict(X_test)
        self.y_prob = pipeline.predict_proba(X_test)[:, 1]
    
    def classification_report(self):
        """Generate classification report as dictionary."""
        report = classification_report(
            self.y_test, self.y_pred,
            output_dict=True, zero_division=0
        )
        return report
    
    def confusion_matrix_data(self):
        """Get confusion matrix as numpy array."""
        return confusion_matrix(self.y_test, self.y_pred)
    
    def confusion_matrix_plot(self):
        """Generate confusion matrix as base64 encoded image."""
        cm = self.confusion_matrix_data()
        
        labels = self._get_class_labels()
        
        fig, ax = plt.subplots(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                    xticklabels=labels, yticklabels=labels, ax=ax)
        ax.set_xlabel('Predicted')
        ax.set_ylabel('Actual')
        ax.set_title(f'Confusion Matrix - {self.diagnosis_type.title()} Diagnosis')
        
        img_str = self._fig_to_base64(fig)
        plt.close(fig)
        
        return img_str
    
    def roc_curve_data(self):
        """Get ROC curve data points."""
        fpr, tpr, thresholds = roc_curve(self.y_test, self.y_prob)
        roc_auc = auc(fpr, tpr)
        
        return {
            'fpr': fpr.tolist(),
            'tpr': tpr.tolist(),
            'thresholds': thresholds.tolist(),
            'auc': float(roc_auc)
        }
    
    def roc_curve_plot(self):
        """Generate ROC curve as base64 encoded image."""
        fpr, tpr, _ = roc_curve(self.y_test, self.y_prob)
        roc_auc = auc(fpr, tpr)
        
        fig, ax = plt.subplots(figsize=(8, 6))
        ax.plot(fpr, tpr, color='darkorange', lw=2,
                label=f'ROC curve (AUC = {roc_auc:.4f})')
        ax.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--')
        ax.set_xlim([0.0, 1.0])
        ax.set_ylim([0.0, 1.05])
        ax.set_xlabel('False Positive Rate')
        ax.set_ylabel('True Positive Rate')
        ax.set_title(f'ROC Curve - {self.diagnosis_type.title()} Diagnosis')
        ax.legend(loc="lower right")
        ax.grid(True, alpha=0.3)
        
        img_str = self._fig_to_base64(fig)
        plt.close(fig)
        
        return img_str
    
    def precision_recall_curve_data(self):
        """Get precision-recall curve data."""
        precision, recall, _ = precision_recall_curve(self.y_test, self.y_prob)
        avg_precision = average_precision_score(self.y_test, self.y_prob)
        
        return {
            'precision': precision.tolist(),
            'recall': recall.tolist(),
            'average_precision': float(avg_precision)
        }
    
    def precision_recall_plot(self):
        """Generate precision-recall curve as base64 encoded image."""
        precision, recall, _ = precision_recall_curve(self.y_test, self.y_prob)
        avg_precision = average_precision_score(self.y_test, self.y_prob)
        
        fig, ax = plt.subplots(figsize=(8, 6))
        ax.plot(recall, precision, color='green', lw=2,
                label=f'PR curve (AP = {avg_precision:.4f})')
        ax.set_xlim([0.0, 1.0])
        ax.set_ylim([0.0, 1.05])
        ax.set_xlabel('Recall')
        ax.set_ylabel('Precision')
        ax.set_title(f'Precision-Recall Curve - {self.diagnosis_type.title()}')
        ax.legend(loc="lower left")
        ax.grid(True, alpha=0.3)
        
        img_str = self._fig_to_base64(fig)
        plt.close(fig)
        
        return img_str
    
    def feature_importance_plot(self):
        """Generate feature importance bar chart."""
        importance = self._get_feature_importance()
        if not importance:
            return None
        
        # Top 15 features
        top_features = dict(list(importance.items())[:15])
        
        fig, ax = plt.subplots(figsize=(10, 6))
        features = list(top_features.keys())
        values = list(top_features.values())
        
        bars = ax.barh(range(len(features)), values, color='steelblue')
        ax.set_yticks(range(len(features)))
        ax.set_yticklabels(features)
        ax.set_xlabel('Importance')
        ax.set_title(f'Top Feature Importance - {self.diagnosis_type.title()} Diagnosis')
        ax.invert_yaxis()
        ax.grid(True, alpha=0.3, axis='x')
        
        plt.tight_layout()
        img_str = self._fig_to_base64(fig)
        plt.close(fig)
        
        return img_str
    
    def prediction_distribution_plot(self):
        """Generate prediction probability distribution plot."""
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))
        
        # Probability distribution by class
        for label in [0, 1]:
            mask = self.y_test == label
            axes[0].hist(
                self.y_prob[mask], bins=30, alpha=0.6,
                label=f'Class {label}'
            )
        axes[0].set_xlabel('Predicted Probability')
        axes[0].set_ylabel('Count')
        axes[0].set_title('Prediction Probability Distribution')
        axes[0].legend()
        
        # Prediction confidence distribution
        confidences = np.maximum(self.y_prob, 1 - self.y_prob)
        axes[1].hist(confidences, bins=30, color='steelblue', alpha=0.7)
        axes[1].axvline(x=0.5, color='red', linestyle='--', label='Random baseline')
        axes[1].set_xlabel('Confidence')
        axes[1].set_ylabel('Count')
        axes[1].set_title('Prediction Confidence Distribution')
        axes[1].legend()
        
        plt.tight_layout()
        img_str = self._fig_to_base64(fig)
        plt.close(fig)
        
        return img_str
    
    def fairness_metrics(self, df_original=None):
        """
        Calculate fairness metrics by demographic groups.
        Requires original (unscaled) data with demographic features.
        """
        metrics = {}
        
        if df_original is None:
            return metrics
        
        # By gender (if available)
        if 'sex' in df_original.columns:
            gender_metrics = {}
            for gender_val, gender_label in [(1, 'Male'), (0, 'Female')]:
                mask = df_original['sex'] == gender_val
                if mask.sum() > 0:
                    y_true_group = self.y_test[mask.values[:len(self.y_test)]]
                    y_pred_group = self.y_pred[mask.values[:len(self.y_pred)]]
                    
                    if len(y_true_group) > 0:
                        gender_metrics[gender_label] = {
                            'count': int(mask.sum()),
                            'accuracy': float(np.mean(y_true_group == y_pred_group)),
                            'positive_rate': float(np.mean(y_pred_group)),
                        }
            metrics['by_gender'] = gender_metrics
        
        # By age group (if available)
        age_col = 'age' if 'age' in df_original.columns else 'Age' if 'Age' in df_original.columns else None
        if age_col:
            age_groups = {'Under 40': (0, 40), '40-55': (40, 55), '55-70': (55, 70), 'Over 70': (70, 200)}
            age_metrics = {}
            for group_name, (low, high) in age_groups.items():
                mask = (df_original[age_col] >= low) & (df_original[age_col] < high)
                if mask.sum() > 0:
                    y_true_group = self.y_test[mask.values[:len(self.y_test)]]
                    y_pred_group = self.y_pred[mask.values[:len(self.y_pred)]]
                    
                    if len(y_true_group) > 0:
                        age_metrics[group_name] = {
                            'count': int(mask.sum()),
                            'accuracy': float(np.mean(y_true_group == y_pred_group)),
                            'positive_rate': float(np.mean(y_pred_group)),
                        }
            metrics['by_age_group'] = age_metrics
        
        return metrics
    
    def full_evaluation_report(self, df_original=None):
        """Generate complete evaluation report with all metrics and plots."""
        report = {
            'diagnosis_type': self.diagnosis_type,
            'classification_report': self.classification_report(),
            'confusion_matrix': self.confusion_matrix_data().tolist(),
            'roc_curve': self.roc_curve_data(),
            'precision_recall': self.precision_recall_curve_data(),
            'fairness_metrics': self.fairness_metrics(df_original),
            'plots': {
                'confusion_matrix': self.confusion_matrix_plot(),
                'roc_curve': self.roc_curve_plot(),
                'precision_recall': self.precision_recall_plot(),
                'feature_importance': self.feature_importance_plot(),
                'prediction_distribution': self.prediction_distribution_plot(),
            },
            'generated_at': datetime.now(timezone.utc).isoformat(),
        }
        
        return report
    
    def _get_feature_importance(self):
        """Extract feature importance from pipeline."""
        features = self.preprocessor.get_feature_names()
        
        try:
            classifier = self.pipeline.named_steps.get('classifier')
            
            if hasattr(classifier, 'feature_importances_'):
                importances = classifier.feature_importances_
            elif hasattr(classifier, 'estimators_'):
                importances = np.mean([
                    est.feature_importances_
                    for est in classifier.estimators_
                    if hasattr(est, 'feature_importances_')
                ], axis=0)
            else:
                return None
            
            n = min(len(importances), len(features))
            return dict(sorted(
                zip(features[:n], importances[:n]),
                key=lambda x: x[1], reverse=True
            ))
        except Exception:
            return None
    
    def _get_class_labels(self):
        """Get human-readable class labels."""
        labels = {
            'heart': ['No Disease', 'Heart Disease'],
            'diabetes': ['Negative', 'Diabetic'],
            'cancer': ['Malignant', 'Benign'],
        }
        return labels.get(self.diagnosis_type, ['Class 0', 'Class 1'])
    
    @staticmethod
    def _fig_to_base64(fig):
        """Convert matplotlib figure to base64 string."""
        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        buf.close()
        return img_str
