"""
ML Pipeline definitions.
Creates sklearn pipelines for each diagnosis model with preprocessing and model steps.
"""
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, PolynomialFeatures
from sklearn.decomposition import PCA
from sklearn.ensemble import (
    GradientBoostingClassifier,
    RandomForestClassifier,
    VotingClassifier,
    HistGradientBoostingClassifier,
)
from sklearn.svm import SVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_selection import SelectKBest, f_classif


def create_heart_disease_pipeline():
    """
    Heart Disease prediction pipeline.
    Ensemble: GradientBoosting + RandomForest + HistGradientBoosting with soft voting.
    Uses 3 models for better robustness on synthetic data.
    """
    gb = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        min_samples_split=8,
        min_samples_leaf=4,
        subsample=0.8,
        random_state=42
    )

    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=10,
        min_samples_split=6,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1
    )

    hgb = HistGradientBoostingClassifier(
        max_iter=300,
        max_depth=6,
        learning_rate=0.05,
        min_samples_leaf=10,
        l2_regularization=0.1,
        random_state=42
    )

    ensemble = VotingClassifier(
        estimators=[('gb', gb), ('rf', rf), ('hgb', hgb)],
        voting='soft'
    )

    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('classifier', ensemble)
    ])

    return pipeline


def create_diabetes_pipeline():
    """
    Diabetes risk classification pipeline.
    Feature selection + HistGradientBoosting (fast and accurate).
    """
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('feature_selection', SelectKBest(score_func=f_classif, k='all')),
        ('classifier', HistGradientBoostingClassifier(
            max_iter=300,
            max_depth=6,
            learning_rate=0.05,
            min_samples_leaf=8,
            l2_regularization=0.1,
            random_state=42
        ))
    ])

    return pipeline


def create_cancer_pipeline():
    """
    Breast Cancer classification pipeline.
    PCA dimensionality reduction + Calibrated SVM with RBF kernel.
    Uses CalibratedClassifierCV instead of SVC(probability=True) (deprecated in sklearn 1.9).
    """
    svm = SVC(
        kernel='rbf',
        C=10,
        gamma='scale',
        random_state=42
    )
    calibrated_svm = CalibratedClassifierCV(svm, cv=5, ensemble=False)

    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('pca', PCA(n_components=15, random_state=42)),
        ('classifier', calibrated_svm)
    ])

    return pipeline


def get_pipeline(diagnosis_type):
    """Get the appropriate pipeline for a diagnosis type."""
    pipelines = {
        'heart': create_heart_disease_pipeline,
        'diabetes': create_diabetes_pipeline,
        'cancer': create_cancer_pipeline,
    }
    
    if diagnosis_type not in pipelines:
        raise ValueError(f"Unknown diagnosis type: {diagnosis_type}. "
                        f"Available: {list(pipelines.keys())}")
    
    return pipelines[diagnosis_type]()


def get_hyperparameter_grid(diagnosis_type):
    """Get hyperparameter grid for GridSearchCV tuning."""
    grids = {
        'heart': {
            'classifier__gb__n_estimators': [100, 200, 300],
            'classifier__gb__max_depth': [3, 4, 6],
            'classifier__gb__learning_rate': [0.02, 0.05, 0.1],
            'classifier__rf__n_estimators': [200, 300],
            'classifier__rf__max_depth': [8, 10, 15],
            'classifier__hgb__max_iter': [200, 300, 500],
            'classifier__hgb__max_depth': [4, 6, 8],
        },
        'diabetes': {
            'classifier__max_iter': [200, 300, 500],
            'classifier__max_depth': [4, 6, 8],
            'classifier__learning_rate': [0.02, 0.05, 0.1],
            'classifier__min_samples_leaf': [5, 8, 15],
            'classifier__l2_regularization': [0.01, 0.1, 1.0],
        },
        'cancer': {
            'pca__n_components': [10, 15, 20],
            'classifier__C': [1, 5, 10, 50],
            'classifier__gamma': ['scale', 'auto'],
        },
    }

    return grids.get(diagnosis_type, {})


# Model metadata
MODEL_INFO = {
    'heart': {
        'name': 'Heart Disease Predictor',
        'description': 'Ensemble model (GradientBoosting + RandomForest + HistGradientBoosting) for predicting coronary heart disease',
        'features': [
            'age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg',
            'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal'
        ],
        'feature_descriptions': {
            'age': 'Age in years',
            'sex': 'Sex (1=male, 0=female)',
            'cp': 'Chest pain type (0-3)',
            'trestbps': 'Resting blood pressure (mm Hg)',
            'chol': 'Serum cholesterol (mg/dl)',
            'fbs': 'Fasting blood sugar > 120 mg/dl (1=true, 0=false)',
            'restecg': 'Resting electrocardiographic results (0-2)',
            'thalach': 'Maximum heart rate achieved',
            'exang': 'Exercise induced angina (1=yes, 0=no)',
            'oldpeak': 'ST depression induced by exercise',
            'slope': 'Slope of peak ST segment (0-2)',
            'ca': 'Number of major vessels colored (0-3)',
            'thal': 'Thallium stress test result (0-3)',
        },
        'target_description': 'Heart disease presence (1=yes, 0=no)',
    },
    'diabetes': {
        'name': 'Diabetes Risk Classifier',
        'description': 'Gradient Boosting with feature selection for diabetes risk assessment',
        'features': [
            'Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness',
            'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age'
        ],
        'feature_descriptions': {
            'Pregnancies': 'Number of pregnancies',
            'Glucose': 'Plasma glucose concentration (2hr oral glucose tolerance test)',
            'BloodPressure': 'Diastolic blood pressure (mm Hg)',
            'SkinThickness': 'Triceps skin fold thickness (mm)',
            'Insulin': '2-Hour serum insulin (mu U/ml)',
            'BMI': 'Body mass index (kg/m^2)',
            'DiabetesPedigreeFunction': 'Diabetes pedigree function',
            'Age': 'Age in years',
        },
        'target_description': 'Diabetes diagnosis (1=positive, 0=negative)',
    },
    'cancer': {
        'name': 'Breast Cancer Classifier',
        'description': 'SVM with PCA for breast cancer classification from cell features',
        'features': [
            'mean radius', 'mean texture', 'mean perimeter', 'mean area',
            'mean smoothness', 'mean compactness', 'mean concavity',
            'mean concave points', 'mean symmetry', 'mean fractal dimension',
            'radius error', 'texture error', 'perimeter error', 'area error',
            'smoothness error', 'compactness error', 'concavity error',
            'concave points error', 'symmetry error', 'fractal dimension error',
            'worst radius', 'worst texture', 'worst perimeter', 'worst area',
            'worst smoothness', 'worst compactness', 'worst concavity',
            'worst concave points', 'worst symmetry', 'worst fractal dimension'
        ],
        'feature_descriptions': {
            'mean radius': 'Mean of distances from center to perimeter points',
            'mean texture': 'Standard deviation of gray-scale values',
            'mean perimeter': 'Mean cell perimeter',
            'mean area': 'Mean cell area',
        },
        'target_description': 'Cancer diagnosis (1=benign, 0=malignant)',
    },
}
