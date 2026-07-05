"""
Synthetic medical data generator.
Generates realistic synthetic patient records with clinical vitals,
lab results, and symptom descriptions for multi-modal data support.
"""
import random
from datetime import date, timedelta
from faker import Faker
import numpy as np
import pandas as pd

fake = Faker()
fake.seed_instance(42)
np.random.seed(42)


# Medical reference data
BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
BLOOD_TYPE_WEIGHTS = [0.35, 0.06, 0.08, 0.02, 0.03, 0.01, 0.38, 0.07]

SYMPTOM_POOL = {
    'cardiac': [
        'chest pain', 'shortness of breath', 'palpitations', 'dizziness',
        'fatigue', 'swollen ankles', 'irregular heartbeat', 'cold sweats',
        'nausea', 'pain radiating to left arm'
    ],
    'diabetic': [
        'frequent urination', 'excessive thirst', 'unexplained weight loss',
        'blurred vision', 'slow-healing wounds', 'tingling in hands/feet',
        'fatigue', 'increased hunger', 'dark patches on skin', 'dry mouth'
    ],
    'general': [
        'headache', 'fever', 'body aches', 'cough', 'sore throat',
        'abdominal pain', 'back pain', 'joint pain', 'insomnia', 'anxiety'
    ]
}

MEDICAL_CONDITIONS = [
    'Hypertension', 'Type 2 Diabetes', 'Coronary Artery Disease',
    'Asthma', 'Arthritis', 'Hyperlipidemia', 'Obesity',
    'Hypothyroidism', 'Chronic Kidney Disease', 'Anemia'
]

ALLERGIES_POOL = [
    'Penicillin', 'Sulfa drugs', 'Aspirin', 'Ibuprofen', 'Latex',
    'Peanuts', 'Shellfish', 'Eggs', 'Pollen', 'None'
]


def generate_patient_record(patient_index=None):
    """Generate a single synthetic patient record."""
    gender = random.choice(['Male', 'Female'])
    first_name = fake.first_name_male() if gender == 'Male' else fake.first_name_female()
    last_name = fake.last_name()
    
    # Age distribution: skewed toward middle age
    age = int(np.clip(np.random.normal(52, 18), 18, 95))
    dob = date.today() - timedelta(days=age * 365 + random.randint(0, 364))
    
    # Select random symptoms based on age
    n_symptoms = random.randint(1, 5)
    all_symptoms = []
    for category in SYMPTOM_POOL.values():
        all_symptoms.extend(category)
    symptoms = random.sample(all_symptoms, n_symptoms)
    
    # Medical history
    n_conditions = random.choices([0, 1, 2, 3, 4], weights=[0.3, 0.3, 0.2, 0.15, 0.05])[0]
    conditions = random.sample(MEDICAL_CONDITIONS, min(n_conditions, len(MEDICAL_CONDITIONS)))
    
    # Allergies
    n_allergies = random.choices([0, 1, 2, 3], weights=[0.4, 0.3, 0.2, 0.1])[0]
    allergies = random.sample([a for a in ALLERGIES_POOL if a != 'None'], min(n_allergies, 5))
    
    record = {
        'patient_id': f"PAT-{(patient_index or random.randint(10000, 99999)):05d}",
        'first_name': first_name,
        'last_name': last_name,
        'date_of_birth': dob.isoformat(),
        'gender': gender,
        'age': age,
        'email': f"{first_name.lower()}.{last_name.lower()}@email.com",
        'phone': fake.phone_number()[:20],
        'address': fake.address().replace('\n', ', ')[:250],
        'blood_type': random.choices(BLOOD_TYPES, weights=BLOOD_TYPE_WEIGHTS)[0],
        'medical_history': ', '.join(conditions) if conditions else 'None',
        'allergies': ', '.join(allergies) if allergies else 'None',
        'symptoms': ', '.join(symptoms),
        'emergency_contact_name': fake.name(),
        'emergency_contact_phone': fake.phone_number()[:20],
    }
    
    return record


def generate_clinical_vitals(age, gender):
    """Generate realistic clinical vitals based on age and gender."""
    # Blood pressure correlates with age
    base_systolic = 110 + (age - 30) * 0.5
    systolic = int(np.clip(np.random.normal(base_systolic, 15), 85, 200))
    diastolic = int(np.clip(np.random.normal(75, 10), 50, 120))
    
    # Heart rate
    heart_rate = int(np.clip(np.random.normal(72, 12), 45, 130))
    
    # Temperature
    temperature = round(np.clip(np.random.normal(98.6, 0.7), 96.0, 103.0), 1)
    
    # Respiratory rate
    respiratory_rate = int(np.clip(np.random.normal(16, 3), 10, 30))
    
    # SpO2
    spo2 = int(np.clip(np.random.normal(97, 2), 85, 100))
    
    return {
        'systolic_bp': systolic,
        'diastolic_bp': diastolic,
        'heart_rate': heart_rate,
        'temperature': temperature,
        'respiratory_rate': respiratory_rate,
        'spo2': spo2,
    }


def generate_lab_results(age, gender):
    """Generate realistic lab test results."""
    # Cholesterol levels (age-adjusted)
    base_chol = 180 + (age - 30) * 0.8
    
    # Glucose (age-adjusted)
    base_glucose = 85 + (age - 30) * 0.3
    
    # BMI (gender-adjusted)
    base_bmi = 26.5 if gender == 'Male' else 27.5
    
    results = {
        'total_cholesterol': int(np.clip(np.random.normal(base_chol, 40), 100, 400)),
        'hdl_cholesterol': int(np.clip(np.random.normal(55, 15), 20, 100)),
        'ldl_cholesterol': int(np.clip(np.random.normal(base_chol - 70, 30), 50, 250)),
        'triglycerides': int(np.clip(np.random.lognormal(4.8, 0.5), 30, 600)),
        'fasting_glucose': int(np.clip(np.random.normal(base_glucose, 25), 50, 300)),
        'hba1c': round(np.clip(np.random.normal(5.7, 0.8), 4.0, 14.0), 1),
        'bmi': round(np.clip(np.random.normal(base_bmi, 5), 15, 55), 1),
        'creatinine': round(np.clip(np.random.normal(1.0, 0.3), 0.4, 3.5), 2),
        'hemoglobin': round(np.clip(np.random.normal(14.5 if gender == 'Male' else 12.5, 2), 7, 20), 1),
        'wbc_count': round(np.clip(np.random.normal(7.5, 2.5), 3, 20), 1),
        'platelet_count': int(np.clip(np.random.normal(250, 60), 100, 500)),
        'crp': round(np.clip(np.random.lognormal(0, 1), 0.1, 50), 1),
    }
    
    return results


def generate_heart_features(n_samples=100):
    """Generate synthetic heart disease features matching UCI format."""
    records = []
    for i in range(n_samples):
        age = random.randint(29, 77)
        sex = random.choice([0, 1])
        record = {
            'age': age,
            'sex': sex,
            'cp': random.choice([0, 1, 2, 3]),
            'trestbps': int(np.clip(np.random.normal(131, 18), 90, 200)),
            'chol': int(np.clip(np.random.normal(246, 52), 120, 600)),
            'fbs': random.choice([0, 1]),
            'restecg': random.choice([0, 1, 2]),
            'thalach': int(np.clip(np.random.normal(149, 23), 70, 210)),
            'exang': random.choice([0, 1]),
            'oldpeak': round(np.random.exponential(1.0), 1),
            'slope': random.choice([0, 1, 2]),
            'ca': random.choice([0, 1, 2, 3]),
            'thal': random.choice([0, 1, 2, 3]),
        }
        records.append(record)
    return pd.DataFrame(records)


def generate_diabetes_features(n_samples=100):
    """Generate synthetic diabetes features matching Pima format."""
    records = []
    for i in range(n_samples):
        age = random.randint(21, 81)
        record = {
            'Pregnancies': random.randint(0, 17),
            'Glucose': int(np.clip(np.random.normal(120, 32), 44, 200)),
            'BloodPressure': int(np.clip(np.random.normal(72, 12), 30, 122)),
            'SkinThickness': int(np.clip(np.random.normal(29, 10), 0, 99)),
            'Insulin': int(np.clip(np.random.lognormal(3.8, 1.2), 0, 900)),
            'BMI': round(np.clip(np.random.normal(32, 7), 18, 67), 1),
            'DiabetesPedigreeFunction': round(np.clip(np.random.lognormal(-0.8, 0.7), 0.08, 2.5), 3),
            'Age': age,
        }
        records.append(record)
    return pd.DataFrame(records)


def generate_full_patient_dataset(n_samples=200):
    """
    Generate a complete synthetic patient dataset with multi-modal data:
    demographics, vitals, lab results, symptoms, and diagnosis targets.
    """
    records = []
    for i in range(n_samples):
        patient = generate_patient_record(i)
        vitals = generate_clinical_vitals(patient['age'], patient['gender'])
        labs = generate_lab_results(patient['age'], patient['gender'])
        
        # Combine all data
        record = {**patient, **vitals, **labs}
        
        # Generate risk scores based on features
        cardiac_risk = _calculate_cardiac_risk(record)
        diabetes_risk = _calculate_diabetes_risk(record)
        
        record['cardiac_risk_score'] = round(cardiac_risk, 2)
        record['diabetes_risk_score'] = round(diabetes_risk, 2)
        record['cardiac_diagnosis'] = int(cardiac_risk > 0.5)
        record['diabetes_diagnosis'] = int(diabetes_risk > 0.5)
        
        records.append(record)
    
    return pd.DataFrame(records)


def _calculate_cardiac_risk(record):
    """Calculate cardiac risk score from features."""
    score = 0.0
    age = record.get('age', 50)
    score += 0.02 * max(0, age - 40)
    score += 0.1 if record.get('gender') == 'Male' else 0
    score += 0.005 * max(0, record.get('systolic_bp', 120) - 120)
    score += 0.002 * max(0, record.get('total_cholesterol', 200) - 200)
    score += 0.05 * max(0, record.get('bmi', 25) - 25)
    score += 0.1 if 'Hypertension' in record.get('medical_history', '') else 0
    score += 0.1 if 'Coronary Artery Disease' in record.get('medical_history', '') else 0
    return min(1.0, max(0.0, score + np.random.normal(0, 0.05)))


def _calculate_diabetes_risk(record):
    """Calculate diabetes risk score from features."""
    score = 0.0
    age = record.get('age', 50)
    score += 0.01 * max(0, age - 35)
    score += 0.005 * max(0, record.get('fasting_glucose', 90) - 90)
    score += 0.05 * max(0, record.get('hba1c', 5.5) - 5.5)
    score += 0.03 * max(0, record.get('bmi', 25) - 25)
    score += 0.1 if 'Type 2 Diabetes' in record.get('medical_history', '') else 0
    score += 0.05 if 'Obesity' in record.get('medical_history', '') else 0
    return min(1.0, max(0.0, score + np.random.normal(0, 0.05)))


if __name__ == '__main__':
    print("Generating synthetic patient dataset...")
    df = generate_full_patient_dataset(200)
    print(f"Generated {len(df)} patient records")
    print(f"Columns: {list(df.columns)}")
    print(f"\nCardiac diagnosis distribution: {df['cardiac_diagnosis'].value_counts().to_dict()}")
    print(f"Diabetes diagnosis distribution: {df['diabetes_diagnosis'].value_counts().to_dict()}")
