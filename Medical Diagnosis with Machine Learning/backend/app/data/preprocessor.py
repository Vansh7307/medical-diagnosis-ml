"""
Data preprocessor module.
Handles cleaning, transformation, and validation of medical data
before feeding into ML models.
"""
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder


class MedicalDataPreprocessor:
    """Preprocessor for medical datasets with validation and cleaning."""
    
    # Feature schemas for each diagnosis type
    HEART_FEATURES = [
        'age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg',
        'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal'
    ]
    
    DIABETES_FEATURES = [
        'Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness',
        'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age'
    ]
    
    CANCER_FEATURES = [
        'mean radius', 'mean texture', 'mean perimeter', 'mean area',
        'mean smoothness', 'mean compactness', 'mean concavity',
        'mean concave points', 'mean symmetry', 'mean fractal dimension',
        'radius error', 'texture error', 'perimeter error', 'area error',
        'smoothness error', 'compactness error', 'concavity error',
        'concave points error', 'symmetry error', 'fractal dimension error',
        'worst radius', 'worst texture', 'worst perimeter', 'worst area',
        'worst smoothness', 'worst compactness', 'worst concavity',
        'worst concave points', 'worst symmetry', 'worst fractal dimension'
    ]
    
    # Value range validators
    VALID_RANGES = {
        'age': (18, 100),
        'sex': (0, 1),
        'cp': (0, 3),
        'trestbps': (80, 220),
        'chol': (100, 700),
        'fbs': (0, 1),
        'restecg': (0, 2),
        'thalach': (50, 220),
        'exang': (0, 1),
        'oldpeak': (0, 10),
        'slope': (0, 2),
        'ca': (0, 4),
        'thal': (0, 3),
        'Pregnancies': (0, 20),
        'Glucose': (30, 250),
        'BloodPressure': (20, 130),
        'SkinThickness': (0, 100),
        'Insulin': (0, 1000),
        'BMI': (10, 70),
        'DiabetesPedigreeFunction': (0.05, 3.0),
        'Age': (18, 100),
    }
    
    def __init__(self, diagnosis_type='heart'):
        """
        Initialize preprocessor.
        
        Args:
            diagnosis_type: One of 'heart', 'diabetes', 'cancer'
        """
        self.diagnosis_type = diagnosis_type
        self.scaler = StandardScaler()
        self.is_fitted = False
    
    def get_feature_names(self):
        """Get feature names for the current diagnosis type."""
        if self.diagnosis_type == 'heart':
            return self.HEART_FEATURES
        elif self.diagnosis_type == 'diabetes':
            return self.DIABETES_FEATURES
        elif self.diagnosis_type == 'cancer':
            return self.CANCER_FEATURES
        else:
            raise ValueError(f"Unknown diagnosis type: {self.diagnosis_type}")
    
    def get_target_name(self):
        """Get target column name for the current diagnosis type."""
        if self.diagnosis_type == 'heart':
            return 'target'
        elif self.diagnosis_type == 'diabetes':
            return 'Outcome'
        elif self.diagnosis_type == 'cancer':
            return 'target'
        else:
            raise ValueError(f"Unknown diagnosis type: {self.diagnosis_type}")
    
    def validate_features(self, df):
        """
        Validate feature values are within acceptable ranges.
        
        Returns:
            tuple: (is_valid, list of issues)
        """
        issues = []
        features = self.get_feature_names()
        
        # Check all required features exist
        missing = set(features) - set(df.columns)
        if missing:
            issues.append(f"Missing features: {missing}")
            return False, issues
        
        # Check value ranges
        for feature in features:
            if feature in self.VALID_RANGES:
                min_val, max_val = self.VALID_RANGES[feature]
                out_of_range = df[feature].dropna()
                out_of_range = out_of_range[(out_of_range < min_val) | (out_of_range > max_val)]
                if len(out_of_range) > 0:
                    issues.append(
                        f"'{feature}': {len(out_of_range)} values out of range "
                        f"[{min_val}, {max_val}]"
                    )
        
        return len(issues) == 0, issues
    
    def clean(self, df):
        """
        Clean the dataset: handle missing values, outliers, inconsistencies.
        
        Returns:
            Cleaned DataFrame
        """
        df = df.copy()
        features = self.get_feature_names()
        
        # Keep only relevant columns (+ target if present)
        target = self.get_target_name()
        cols_to_keep = [f for f in features if f in df.columns]
        if target in df.columns:
            cols_to_keep.append(target)
        df = df[cols_to_keep]
        
        # Fill missing values with median for numeric, mode for categorical
        for col in features:
            if col not in df.columns:
                continue
            if df[col].isna().any():
                if col in ['sex', 'cp', 'fbs', 'restecg', 'exang', 'slope', 'ca', 'thal', 'Pregnancies']:
                    df[col] = df[col].fillna(df[col].mode()[0])
                else:
                    df[col] = df[col].fillna(df[col].median())
        
        # Clip outliers for numeric features
        for feature in features:
            if feature in self.VALID_RANGES:
                min_val, max_val = self.VALID_RANGES[feature]
                df[feature] = df[feature].clip(min_val, max_val)
        
        return df
    
    def prepare_features(self, df, fit=False):
        """
        Prepare features for model input.
        
        Args:
            df: Input DataFrame
            fit: Whether to fit the scaler
            
        Returns:
            Scaled numpy array
        """
        features = self.get_feature_names()
        X = df[features].values.astype(np.float64)
        
        if fit:
            X_scaled = self.scaler.fit_transform(X)
            self.is_fitted = True
        else:
            if not self.is_fitted:
                raise RuntimeError("Preprocessor not fitted. Call with fit=True first.")
            X_scaled = self.scaler.transform(X)
        
        return X_scaled
    
    def prepare_target(self, df):
        """
        Extract and encode target variable.
        
        Returns:
            numpy array of target values
        """
        target = self.get_target_name()
        if target not in df.columns:
            raise ValueError(f"Target column '{target}' not found in data")
        return df[target].values.astype(int)
    
    def preprocess_pipeline(self, df, fit=False):
        """
        Full preprocessing pipeline: validate -> clean -> prepare.
        
        Returns:
            tuple: (X_scaled, y) where y is None if target not present
        """
        # Validate
        is_valid, issues = self.validate_features(df)
        if not is_valid:
            print(f"Validation issues found: {issues}")
        
        # Clean
        df_clean = self.clean(df)
        
        # Prepare
        X = self.prepare_features(df_clean, fit=fit)
        
        target = self.get_target_name()
        y = self.prepare_target(df_clean) if target in df_clean.columns else None
        
        return X, y, df_clean
    
    def transform_single_input(self, input_dict):
        """
        Transform a single input dictionary for prediction.
        
        Args:
            input_dict: Dictionary of feature name -> value
            
        Returns:
            Scaled numpy array of shape (1, n_features)
        """
        features = self.get_feature_names()
        values = []
        for feature in features:
            if feature not in input_dict:
                raise ValueError(f"Missing feature: {feature}")
            values.append(float(input_dict[feature]))
        
        X = np.array([values])
        
        if not self.is_fitted:
            raise RuntimeError("Preprocessor not fitted. Train the model first.")
        
        return self.scaler.transform(X)


if __name__ == '__main__':
    # Test preprocessing pipeline
    from app.data.dataset_loader import load_heart_disease, load_diabetes, load_breast_cancer
    
    for dtype in ['heart', 'diabetes', 'cancer']:
        print(f"\n--- {dtype.upper()} ---")
        loader = {'heart': load_heart_disease, 'diabetes': load_diabetes, 'cancer': load_breast_cancer}
        df = loader[dtype]()
        
        pp = MedicalDataPreprocessor(dtype)
        is_valid, issues = pp.validate_features(df)
        print(f"Valid: {is_valid}, Issues: {len(issues)}")
        
        X, y, df_clean = pp.preprocess_pipeline(df, fit=True)
        print(f"X shape: {X.shape}, y shape: {y.shape if y is not None else 'N/A'}")
