"""
Model Cards — FDA AI/ML Action Plan compliant documentation for each ML model.
Model cards document: intended use, training data, performance metrics,
limitations, fairness analysis, and ethical considerations.

Reference: Mitchell et al., "Model Cards for Model Reporting" (2019)
"""

MODEL_CARDS = {
    "heart": {
        "model_details": {
            "name": "Heart Disease Prediction Model",
            "version": "1.0.0",
            "type": "VotingClassifier (GradientBoosting + RandomForest)",
            "date_trained": "2026-06-18",
            "framework": "scikit-learn 1.9+",
            "developer": "Medical AI Platform",
        },
        "intended_use": {
            "primary_use": "Predict the presence of heart disease based on 13 clinical features",
            "users": "Clinicians, cardiologists, clinical decision support systems",
            "out_of_scope": [
                "Not a substitute for clinical diagnosis",
                "Not validated for pediatric patients",
                "Should not be used as sole determinant for treatment",
            ]
        },
        "training_data": {
            "dataset": "UCI Heart Disease (Cleveland) — synthetic reproduction",
            "samples": 600,
            "features": 13,
            "target_distribution": "~45% positive, ~55% negative",
            "data_sources": "Based on UCI ML Repository Cleveland Heart Disease dataset",
            "preprocessing": "StandardScaler normalization, missing value imputation",
        },
        "performance_metrics": {
            "accuracy": "Expected: 80-90% (with improved signal-to-noise data)",
            "cross_validation": "5-fold stratified CV",
            "primary_metric": "Balanced accuracy (accounts for class imbalance)",
        },
        "feature_importance": {
            "top_features": [
                "ca (Number of major vessels)",
                "thalach (Maximum heart rate)",
                "oldpeak (ST depression)",
                "exang (Exercise-induced angina)",
                "age (Patient age)",
                "cp (Chest pain type)",
            ],
            "method": "Built-in feature importance from GradientBoosting",
        },
        "limitations": {
            "known_limitations": [
                "Trained on synthetic data — real-world performance may differ",
                "Limited to adult patients (29-77 years)",
                "Features based on resting clinical measurements only",
                "Does not account for medication effects",
                "No temporal data (disease progression)",
            ],
        },
        "fairness": {
            "sex_bias": "Model may show different sensitivity/specificity for male vs female patients. Monitor fairness metrics.",
            "age_bias": "Performance may vary across age groups. Older patients (>70) may have different feature distributions.",
            "mitigation": "Fairness metrics tracked per deployment. Alert threshold at 0.15 disparity.",
        },
        "ethical_considerations": [
            "Model should augment, not replace, clinical judgment",
            "False negatives (missed heart disease) are more costly than false positives",
            "Patient consent required for ML-based clinical decision support",
        ],
    },
    "diabetes": {
        "model_details": {
            "name": "Diabetes Risk Prediction Model",
            "version": "1.0.0",
            "type": "SelectKBest + GradientBoosting",
            "date_trained": "2026-06-18",
            "framework": "scikit-learn 1.9+",
            "developer": "Medical AI Platform",
        },
        "intended_use": {
            "primary_use": "Predict Type 2 diabetes risk based on 8 clinical features",
            "users": "Primary care physicians, endocrinologists, preventive medicine",
            "out_of_scope": [
                "Not validated for Type 1 diabetes",
                "Not validated for gestational diabetes",
                "Not a diagnostic tool — screening only",
            ]
        },
        "training_data": {
            "dataset": "Pima Indians Diabetes — synthetic reproduction",
            "samples": 1200,
            "features": 8,
            "target_distribution": "~35% positive, ~65% negative",
            "data_sources": "Based on NIDDK Pima Indians Diabetes dataset",
            "preprocessing": "StandardScaler normalization, zero-value handling",
        },
        "performance_metrics": {
            "accuracy": "Expected: 78-85% (with improved signal-to-noise data)",
            "cross_validation": "5-fold stratified CV",
            "primary_metric": "F1-score (harmonic mean of precision and recall)",
        },
        "feature_importance": {
            "top_features": [
                "Glucose (Plasma glucose concentration)",
                "BMI (Body Mass Index)",
                "Age",
                "DiabetesPedigreeFunction (Genetic predisposition)",
                "Insulin (2-Hour serum insulin)",
            ],
            "method": "SelectKBest with f_classif",
        },
        "limitations": {
            "known_limitations": [
                "Trained on synthetic data based on Pima Indian population",
                "May not generalize to other ethnic populations",
                "Does not account for diet, exercise, or lifestyle factors",
                "Zero values in features (Glucose, BP) treated as missing",
                "Limited to adults aged 21-81",
            ],
        },
        "fairness": {
            "population_bias": "Original dataset based on Pima Indian population. Performance on other ethnicities unknown.",
            "age_bias": "May show age-related bias. Monitor across age groups.",
            "mitigation": "Population-specific validation recommended before clinical deployment.",
        },
        "ethical_considerations": [
            "Screening tool only — not diagnostic",
            "False negatives may delay diabetes detection",
            "Consider social determinants of health beyond clinical features",
        ],
    },
    "cancer": {
        "model_details": {
            "name": "Breast Cancer Diagnosis Model",
            "version": "1.0.0",
            "type": "PCA + SVM (RBF kernel)",
            "date_trained": "2026-06-18",
            "framework": "scikit-learn 1.9+",
            "developer": "Medical AI Platform",
        },
        "intended_use": {
            "primary_use": "Classify breast masses as malignant or benign based on 30 cell nucleus features",
            "users": "Pathologists, radiologists, oncology decision support",
            "out_of_scope": [
                "Not a screening tool for breast cancer",
                "Requires fine-needle aspirate features (not imaging)",
                "Not validated for male breast cancer",
            ]
        },
        "training_data": {
            "dataset": "Breast Cancer Wisconsin (Diagnostic)",
            "samples": 569,
            "features": 30,
            "target_distribution": "~37% malignant, ~63% benign",
            "data_sources": "sklearn.datasets.load_breast_cancer (original: UCI ML Repository)",
            "preprocessing": "StandardScaler, PCA dimensionality reduction",
        },
        "performance_metrics": {
            "accuracy": "~97% (real dataset from UCI)",
            "cross_validation": "5-fold stratified CV",
            "primary_metric": "Sensitivity (recall for malignant class)",
        },
        "feature_importance": {
            "top_features": [
                "worst area",
                "worst perimeter",
                "worst radius",
                "worst concave points",
                "mean concave points",
            ],
            "method": "PCA loadings on original features",
        },
        "limitations": {
            "known_limitations": [
                "Features computed from digitized images — depends on image quality",
                "Does not incorporate patient history or imaging findings",
                "Single-center dataset (University of Wisconsin)",
                "PCA may reduce interpretability of individual features",
            ],
        },
        "fairness": {
            "gender_bias": "Dataset contains only female patients. Model not validated for male breast cancer.",
            "population_bias": "Single-center data — may not generalize across demographics.",
            "mitigation": "Multi-center validation recommended before clinical use.",
        },
        "ethical_considerations": [
            "High sensitivity prioritized (miss fewer cancers)",
            "False negatives (missed cancer) are life-threatening",
            "Should be used as second opinion, not primary diagnosis",
        ],
    },
}


def get_model_card(diagnosis_type):
    """Get the model card for a specific diagnosis type."""
    return MODEL_CARDS.get(diagnosis_type, {})


def get_all_model_cards():
    """Get all model cards."""
    return MODEL_CARDS
