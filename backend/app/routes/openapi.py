"""
OpenAPI 3.0 specification for the Medical Diagnosis ML API.
Auto-generated from route definitions for Swagger/OpenAPI documentation.
"""
from app.config import BaseConfig


def get_openapi_spec(app):
    """Generate OpenAPI 3.0 specification."""
    return {
        "openapi": "3.0.3",
        "info": {
            "title": "Medical Diagnosis ML API",
            "description": (
                "Production-grade AI-powered medical diagnosis system with "
                "multi-modal clinical data analysis, SHAP-based model "
                "explainability, and enterprise MLOps monitoring. "
                "Designed for healthcare-grade zero-tolerance accuracy."
            ),
            "version": app.config.get('API_VERSION', '1.0.0'),
            "contact": {
                "name": "Medical AI Team"
            },
            "license": {
                "name": "MIT"
            }
        },
        "servers": [
            {"url": "/api", "description": "API Server"}
        ],
        "tags": [
            {"name": "Authentication", "description": "User registration and JWT authentication"},
            {"name": "Patients", "description": "Patient record CRUD operations"},
            {"name": "Diagnosis", "description": "ML-powered medical diagnosis predictions"},
            {"name": "Analytics", "description": "Dashboard analytics, model metrics, and MLOps monitoring"},
            {"name": "System", "description": "Health checks and documentation"}
        ],
        "paths": {
            "/health": {
                "get": {
                    "tags": ["System"],
                    "summary": "Health check",
                    "description": "Returns API health status",
                    "responses": {
                        "200": {
                            "description": "API is healthy",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "status": {"type": "string", "example": "healthy"},
                                            "service": {"type": "string"},
                                            "version": {"type": "string"}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/auth/register": {
                "post": {
                    "tags": ["Authentication"],
                    "summary": "Register a new user",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/UserRegistration"}
                            }
                        }
                    },
                    "responses": {
                        "201": {"description": "User registered successfully"},
                        "400": {"description": "Validation error"},
                        "409": {"description": "Username or email already exists"}
                    }
                }
            },
            "/auth/login": {
                "post": {
                    "tags": ["Authentication"],
                    "summary": "Authenticate and receive JWT token",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/UserLogin"}
                            }
                        }
                    },
                    "responses": {
                        "200": {"description": "JWT token returned"},
                        "401": {"description": "Invalid credentials"}
                    }
                }
            },
            "/auth/profile": {
                "get": {
                    "tags": ["Authentication"],
                    "summary": "Get current user profile",
                    "security": [{"bearerAuth": []}],
                    "responses": {
                        "200": {"description": "User profile"},
                        "401": {"description": "Unauthorized"}
                    }
                }
            },
            "/patients": {
                "get": {
                    "tags": ["Patients"],
                    "summary": "List patients with search and pagination",
                    "security": [{"bearerAuth": []}],
                    "parameters": [
                        {"name": "page", "in": "query", "schema": {"type": "integer", "default": 1}},
                        {"name": "per_page", "in": "query", "schema": {"type": "integer", "default": 20}},
                        {"name": "search", "in": "query", "schema": {"type": "string"}}
                    ],
                    "responses": {
                        "200": {"description": "Paginated list of patients"}
                    }
                },
                "post": {
                    "tags": ["Patients"],
                    "summary": "Create a new patient record",
                    "security": [{"bearerAuth": []}],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/PatientCreate"}
                            }
                        }
                    },
                    "responses": {
                        "201": {"description": "Patient created"},
                        "400": {"description": "Validation error"},
                        "409": {"description": "Patient ID conflict"}
                    }
                }
            },
            "/patients/{patient_id}": {
                "get": {
                    "tags": ["Patients"],
                    "summary": "Get patient by ID",
                    "security": [{"bearerAuth": []}],
                    "parameters": [
                        {"name": "patient_id", "in": "path", "required": True, "schema": {"type": "integer"}}
                    ],
                    "responses": {
                        "200": {"description": "Patient details"},
                        "404": {"description": "Patient not found"}
                    }
                },
                "put": {
                    "tags": ["Patients"],
                    "summary": "Update patient record",
                    "security": [{"bearerAuth": []}],
                    "parameters": [
                        {"name": "patient_id", "in": "path", "required": True, "schema": {"type": "integer"}}
                    ],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/PatientCreate"}
                            }
                        }
                    },
                    "responses": {
                        "200": {"description": "Patient updated"},
                        "404": {"description": "Patient not found"}
                    }
                },
                "delete": {
                    "tags": ["Patients"],
                    "summary": "Delete patient record",
                    "security": [{"bearerAuth": []}],
                    "parameters": [
                        {"name": "patient_id", "in": "path", "required": True, "schema": {"type": "integer"}}
                    ],
                    "responses": {
                        "200": {"description": "Patient deleted"},
                        "404": {"description": "Patient not found"}
                    }
                }
            },
            "/diagnosis/heart": {
                "post": {
                    "tags": ["Diagnosis"],
                    "summary": "Predict heart disease risk",
                    "description": (
                        "Uses VotingClassifier (GradientBoosting + RandomForest) "
                        "on 13 UCI Heart Disease clinical features including chest pain type, "
                        "resting BP, cholesterol, and exercise-induced angina."
                    ),
                    "security": [{"bearerAuth": []}],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["features"],
                                    "properties": {
                                        "features": {"$ref": "#/components/schemas/HeartFeatures"},
                                        "patient_id": {"type": "integer", "description": "Optional patient ID"}
                                    }
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {"description": "Prediction result with risk score and confidence"},
                        "400": {"description": "Invalid features"},
                        "404": {"description": "Model not trained"},
                        "429": {"description": "Rate limit exceeded"}
                    }
                }
            },
            "/diagnosis/diabetes": {
                "post": {
                    "tags": ["Diagnosis"],
                    "summary": "Predict diabetes risk",
                    "description": (
                        "Uses SelectKBest + GradientBoosting pipeline on 8 Pima Indian "
                        "Diabetes features including glucose, BMI, and insulin levels."
                    ),
                    "security": [{"bearerAuth": []}],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["features"],
                                    "properties": {
                                        "features": {"$ref": "#/components/schemas/DiabetesFeatures"},
                                        "patient_id": {"type": "integer"}
                                    }
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {"description": "Diabetes risk prediction"},
                        "429": {"description": "Rate limit exceeded"}
                    }
                }
            },
            "/diagnosis/cancer": {
                "post": {
                    "tags": ["Diagnosis"],
                    "summary": "Predict breast cancer diagnosis",
                    "description": (
                        "Uses PCA + SVM pipeline on 30 Wisconsin Breast Cancer features "
                        "including cell radius, texture, perimeter, and area measurements."
                    ),
                    "security": [{"bearerAuth": []}],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["features"],
                                    "properties": {
                                        "features": {"type": "object", "description": "30 breast cancer features"},
                                        "patient_id": {"type": "integer"}
                                    }
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {"description": "Cancer diagnosis prediction (Benign/Malignant)"},
                        "429": {"description": "Rate limit exceeded"}
                    }
                }
            },
            "/diagnosis/multi": {
                "post": {
                    "tags": ["Diagnosis"],
                    "summary": "Run multi-model diagnosis",
                    "description": "Run multiple diagnosis models simultaneously on one patient.",
                    "security": [{"bearerAuth": []}],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "heart_features": {"type": "object"},
                                        "diabetes_features": {"type": "object"},
                                        "cancer_features": {"type": "object"},
                                        "patient_id": {"type": "integer"}
                                    }
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {"description": "Multi-model prediction results"},
                        "400": {"description": "No valid features provided"}
                    }
                }
            },
            "/diagnosis/explain/{type}": {
                "post": {
                    "tags": ["Diagnosis"],
                    "summary": "Get SHAP explanation for a prediction",
                    "description": (
                        "Returns SHAP (SHapley Additive exPlanations) values showing "
                        "which clinical features drove the prediction. Critical for "
                        "clinical decision transparency and FDA AI/ML compliance."
                    ),
                    "security": [{"bearerAuth": []}],
                    "parameters": [
                        {
                            "name": "type", "in": "path", "required": True,
                            "schema": {"type": "string", "enum": ["heart", "diabetes", "cancer"]}
                        }
                    ],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["features"],
                                    "properties": {
                                        "features": {"type": "object", "description": "Clinical feature values"}
                                    }
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {"description": "SHAP feature importance and explanation"},
                        "500": {"description": "Explanation generation failed"}
                    }
                }
            },
            "/diagnosis/models": {
                "get": {
                    "tags": ["Diagnosis"],
                    "summary": "Get model information",
                    "security": [{"bearerAuth": []}],
                    "responses": {
                        "200": {"description": "Model details for all diagnosis types"}
                    }
                }
            },
            "/diagnosis/history/{patient_id}": {
                "get": {
                    "tags": ["Diagnosis"],
                    "summary": "Get diagnosis history for a patient",
                    "security": [{"bearerAuth": []}],
                    "parameters": [
                        {"name": "patient_id", "in": "path", "required": True, "schema": {"type": "integer"}},
                        {"name": "page", "in": "query", "schema": {"type": "integer", "default": 1}},
                        {"name": "per_page", "in": "query", "schema": {"type": "integer", "default": 20}}
                    ],
                    "responses": {
                        "200": {"description": "Patient diagnosis history"},
                        "404": {"description": "Patient not found"}
                    }
                }
            },
            "/analytics/dashboard": {
                "get": {
                    "tags": ["Analytics"],
                    "summary": "Get dashboard statistics",
                    "security": [{"bearerAuth": []}],
                    "responses": {
                        "200": {"description": "Dashboard with patients, diagnoses, and model stats"}
                    }
                }
            },
            "/analytics/models": {
                "get": {
                    "tags": ["Analytics"],
                    "summary": "Get model details and metrics",
                    "security": [{"bearerAuth": []}],
                    "responses": {
                        "200": {"description": "Detailed model information"}
                    }
                }
            },
            "/analytics/drift": {
                "get": {
                    "tags": ["Analytics"],
                    "summary": "Get data drift detection reports",
                    "security": [{"bearerAuth": []}],
                    "responses": {
                        "200": {"description": "KS-test based drift reports per model"}
                    }
                }
            }
        },
        "components": {
            "securitySchemes": {
                "bearerAuth": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "JWT"
                }
            },
            "schemas": {
                "UserRegistration": {
                    "type": "object",
                    "required": ["username", "email", "password"],
                    "properties": {
                        "username": {"type": "string", "minLength": 3, "maxLength": 80},
                        "email": {"type": "string", "format": "email"},
                        "password": {"type": "string", "minLength": 6, "maxLength": 128},
                        "full_name": {"type": "string", "maxLength": 200},
                        "role": {"type": "string", "enum": ["patient", "doctor", "admin"], "default": "patient"}
                    }
                },
                "UserLogin": {
                    "type": "object",
                    "required": ["username", "password"],
                    "properties": {
                        "username": {"type": "string"},
                        "password": {"type": "string"}
                    }
                },
                "PatientCreate": {
                    "type": "object",
                    "required": ["first_name", "last_name"],
                    "properties": {
                        "first_name": {"type": "string", "minLength": 1, "maxLength": 100},
                        "last_name": {"type": "string", "minLength": 1, "maxLength": 100},
                        "date_of_birth": {"type": "string", "format": "date"},
                        "gender": {"type": "string", "enum": ["Male", "Female", "Other"]},
                        "email": {"type": "string", "format": "email"},
                        "phone": {"type": "string", "maxLength": 20},
                        "blood_type": {"type": "string", "enum": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]},
                        "address": {"type": "string", "maxLength": 500}
                    }
                },
                "HeartFeatures": {
                    "type": "object",
                    "required": ["age", "sex", "cp", "trestbps", "chol", "fbs", "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal"],
                    "properties": {
                        "age": {"type": "integer", "minimum": 1, "maximum": 120, "description": "Age in years"},
                        "sex": {"type": "integer", "enum": [0, 1], "description": "0=Female, 1=Male"},
                        "cp": {"type": "integer", "minimum": 0, "maximum": 3, "description": "Chest pain type (0-3)"},
                        "trestbps": {"type": "integer", "minimum": 80, "maximum": 250, "description": "Resting BP (mmHg)"},
                        "chol": {"type": "integer", "minimum": 100, "maximum": 600, "description": "Serum cholesterol (mg/dl)"},
                        "fbs": {"type": "integer", "enum": [0, 1], "description": "Fasting blood sugar > 120 mg/dl"},
                        "restecg": {"type": "integer", "minimum": 0, "maximum": 2, "description": "Resting ECG results (0-2)"},
                        "thalach": {"type": "integer", "minimum": 60, "maximum": 250, "description": "Maximum heart rate achieved"},
                        "exang": {"type": "integer", "enum": [0, 1], "description": "Exercise induced angina"},
                        "oldpeak": {"type": "number", "minimum": 0, "maximum": 10, "description": "ST depression"},
                        "slope": {"type": "integer", "minimum": 0, "maximum": 2, "description": "Slope of ST segment (0-2)"},
                        "ca": {"type": "integer", "minimum": 0, "maximum": 4, "description": "Major vessels colored by fluoroscopy"},
                        "thal": {"type": "integer", "enum": [0, 1, 2, 3], "description": "Thalassemia (0=normal, 1=fixed, 2=reversable, 3=none)"}
                    }
                },
                "DiabetesFeatures": {
                    "type": "object",
                    "required": ["Pregnancies", "Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI", "DiabetesPedigreeFunction", "Age"],
                    "properties": {
                        "Pregnancies": {"type": "integer", "minimum": 0, "maximum": 20},
                        "Glucose": {"type": "integer", "minimum": 0, "maximum": 300, "description": "Plasma glucose (mg/dl)"},
                        "BloodPressure": {"type": "integer", "minimum": 0, "maximum": 200, "description": "Diastolic BP (mmHg)"},
                        "SkinThickness": {"type": "integer", "minimum": 0, "maximum": 100, "description": "Triceps skin fold (mm)"},
                        "Insulin": {"type": "integer", "minimum": 0, "maximum": 900, "description": "2-Hour serum insulin (mu U/ml)"},
                        "BMI": {"type": "number", "minimum": 0, "maximum": 70, "description": "Body Mass Index"},
                        "DiabetesPedigreeFunction": {"type": "number", "minimum": 0, "maximum": 3, "description": "Diabetes pedigree function"},
                        "Age": {"type": "integer", "minimum": 1, "maximum": 120}
                    }
                },
                "DiagnosisResult": {
                    "type": "object",
                    "properties": {
                        "prediction": {"type": "integer"},
                        "prediction_label": {"type": "string"},
                        "confidence": {"type": "number"},
                        "risk_score": {"type": "number"},
                        "model_version": {"type": "string"}
                    }
                }
            }
        }
    }
