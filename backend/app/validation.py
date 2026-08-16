"""
Input validation schemas using marshmallow.
Enforces strict type checking, range validation, and sanitization
for all API endpoints — a critical requirement for healthcare AI systems.
"""
from marshmallow import Schema, fields, validate, validates_schema, ValidationError


class UserRegistrationSchema(Schema):
    username = fields.String(
        required=True,
        validate=[
            validate.Length(min=3, max=80, error='Username must be 3-80 characters'),
            validate.Regexp(r'^[a-zA-Z0-9_]+$', error='Username must be alphanumeric')
        ]
    )
    email = fields.Email(required=True)
    password = fields.String(
        required=True,
        validate=validate.Length(min=6, max=128, error='Password must be 6-128 characters')
    )
    full_name = fields.String(
        validate=validate.Length(max=200)
    )
    role = fields.String(
        validate=validate.OneOf(['patient', 'doctor', 'admin']),
        load_default='patient'
    )
    recaptcha_token = fields.String(required=True)


class UserLoginSchema(Schema):
    username = fields.String(required=True)
    password = fields.String(required=True)
    recaptcha_token = fields.String(required=True)
    # Which tab/portal the person logged in from (doctor/clinician/patient).
    # Optional for backward compatibility; when present, the account's real
    # role must match or the login is rejected.
    portal = fields.String(required=False, load_default=None,
                            validate=validate.OneOf(['doctor', 'clinician', 'patient']))


class OTPVerifySchema(Schema):
    username = fields.String(required=True)
    otp_code = fields.String(
        required=True,
        validate=validate.Regexp(r'^\d{6}$', error='OTP must be a 6-digit code')
    )


class OTPResendSchema(Schema):
    username = fields.String(required=True)


class ForgotPasswordSchema(Schema):
    email = fields.Email(required=True)
    recaptcha_token = fields.String(required=True)


class ResetPasswordSchema(Schema):
    email = fields.Email(required=True)
    otp_code = fields.String(
        required=True,
        validate=validate.Regexp(r'^\d{6}$', error='OTP must be a 6-digit code')
    )
    new_password = fields.String(
        required=True,
        validate=validate.Length(min=6, max=128, error='Password must be 6-128 characters')
    )


class PatientCreateSchema(Schema):
    first_name = fields.String(
        required=True,
        validate=validate.Length(min=1, max=100)
    )
    last_name = fields.String(
        required=True,
        validate=validate.Length(min=1, max=100)
    )
    date_of_birth = fields.Date(format='%Y-%m-%d', required=False)
    gender = fields.String(
        validate=validate.OneOf(['Male', 'Female', 'Other'])
    )
    email = fields.Email()
    phone = fields.String(
        validate=validate.Length(max=20)
    )
    blood_type = fields.String(
        validate=validate.OneOf(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    )
    address = fields.String(validate=validate.Length(max=500))


class PatientUpdateSchema(Schema):
    first_name = fields.String(validate=validate.Length(min=1, max=100))
    last_name = fields.String(validate=validate.Length(min=1, max=100))
    date_of_birth = fields.Date(format='%Y-%m-%d')
    gender = fields.String(validate=validate.OneOf(['Male', 'Female', 'Other']))
    email = fields.Email()
    phone = fields.String(validate=validate.Length(max=20))
    blood_type = fields.String(
        validate=validate.OneOf(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    )
    address = fields.String(validate=validate.Length(max=500))


class HeartDiseaseFeaturesSchema(Schema):
    """Validation for UCI Heart Disease clinical features."""
    age = fields.Integer(
        required=True,
        validate=validate.Range(min=1, max=120, error='Age must be 1-120')
    )
    sex = fields.Integer(
        required=True,
        validate=validate.OneOf([0, 1], error='Sex: 0=Female, 1=Male')
    )
    cp = fields.Integer(
        required=True,
        validate=validate.Range(min=0, max=3, error='Chest pain type: 0-3')
    )
    trestbps = fields.Integer(
        required=True,
        validate=validate.Range(min=80, max=250, error='Resting BP: 80-250 mmHg')
    )
    chol = fields.Integer(
        required=True,
        validate=validate.Range(min=100, max=600, error='Cholesterol: 100-600 mg/dl')
    )
    fbs = fields.Integer(
        required=True,
        validate=validate.OneOf([0, 1], error='Fasting BS: 0 or 1')
    )
    restecg = fields.Integer(
        required=True,
        validate=validate.Range(min=0, max=2, error='Resting ECG: 0-2')
    )
    thalach = fields.Integer(
        required=True,
        validate=validate.Range(min=60, max=250, error='Max heart rate: 60-250')
    )
    exang = fields.Integer(
        required=True,
        validate=validate.OneOf([0, 1], error='Exercise angina: 0 or 1')
    )
    oldpeak = fields.Float(
        required=True,
        validate=validate.Range(min=0, max=10, error='ST depression: 0-10')
    )
    slope = fields.Integer(
        required=True,
        validate=validate.Range(min=0, max=2, error='Slope: 0-2')
    )
    ca = fields.Integer(
        required=True,
        validate=validate.Range(min=0, max=4, error='CA: 0-4')
    )
    thal = fields.Integer(
        required=True,
        validate=validate.OneOf([0, 1, 2, 3], error='Thal: 0-3')
    )


class DiabetesFeaturesSchema(Schema):
    """Validation for Pima Indian Diabetes clinical features."""
    Pregnancies = fields.Integer(
        required=True,
        validate=validate.Range(min=0, max=20, error='Pregnancies: 0-20')
    )
    Glucose = fields.Integer(
        required=True,
        validate=validate.Range(min=0, max=300, error='Glucose: 0-300 mg/dl')
    )
    BloodPressure = fields.Integer(
        required=True,
        validate=validate.Range(min=0, max=200, error='Blood Pressure: 0-200 mmHg')
    )
    SkinThickness = fields.Integer(
        required=True,
        validate=validate.Range(min=0, max=100, error='Skin Thickness: 0-100 mm')
    )
    Insulin = fields.Integer(
        required=True,
        validate=validate.Range(min=0, max=900, error='Insulin: 0-900 mu U/ml')
    )
    BMI = fields.Float(
        required=True,
        validate=validate.Range(min=0, max=70, error='BMI: 0-70')
    )
    DiabetesPedigreeFunction = fields.Float(
        required=True,
        validate=validate.Range(min=0, max=3, error='Pedigree Function: 0-3')
    )
    Age = fields.Integer(
        required=True,
        validate=validate.Range(min=1, max=120, error='Age: 1-120')
    )


class CancerFeaturesSchema(Schema):
    """Validation for Breast Cancer Wisconsin features (30 features)."""
    # Mean features
    mean_radius = fields.Float(data_key='mean radius', required=True, validate=validate.Range(min=0, max=50))
    mean_texture = fields.Float(data_key='mean texture', required=True, validate=validate.Range(min=0, max=50))
    mean_perimeter = fields.Float(data_key='mean perimeter', required=True, validate=validate.Range(min=0, max=500))
    mean_area = fields.Float(data_key='mean area', required=True, validate=validate.Range(min=0, max=3000))
    mean_smoothness = fields.Float(data_key='mean smoothness', required=True, validate=validate.Range(min=0, max=1))
    mean_compactness = fields.Float(data_key='mean compactness', required=True, validate=validate.Range(min=0, max=1))
    mean_concavity = fields.Float(data_key='mean concavity', required=True, validate=validate.Range(min=0, max=1))
    mean_concave_points = fields.Float(data_key='mean concave points', required=True, validate=validate.Range(min=0, max=1))
    mean_symmetry = fields.Float(data_key='mean symmetry', required=True, validate=validate.Range(min=0, max=1))
    mean_fractal_dimension = fields.Float(data_key='mean fractal dimension', required=True, validate=validate.Range(min=0, max=1))
    # Error features
    radius_error = fields.Float(data_key='radius error', required=True, validate=validate.Range(min=0, max=10))
    texture_error = fields.Float(data_key='texture error', required=True, validate=validate.Range(min=0, max=10))
    perimeter_error = fields.Float(data_key='perimeter error', required=True, validate=validate.Range(min=0, max=50))
    area_error = fields.Float(data_key='area error', required=True, validate=validate.Range(min=0, max=500))
    smoothness_error = fields.Float(data_key='smoothness error', required=True, validate=validate.Range(min=0, max=0.1))
    compactness_error = fields.Float(data_key='compactness error', required=True, validate=validate.Range(min=0, max=0.5))
    concavity_error = fields.Float(data_key='concavity error', required=True, validate=validate.Range(min=0, max=0.5))
    concave_points_error = fields.Float(data_key='concave points error', required=True, validate=validate.Range(min=0, max=0.2))
    symmetry_error = fields.Float(data_key='symmetry error', required=True, validate=validate.Range(min=0, max=0.5))
    fractal_dimension_error = fields.Float(data_key='fractal dimension error', required=True, validate=validate.Range(min=0, max=0.1))
    # Worst features
    worst_radius = fields.Float(data_key='worst radius', required=True, validate=validate.Range(min=0, max=50))
    worst_texture = fields.Float(data_key='worst texture', required=True, validate=validate.Range(min=0, max=50))
    worst_perimeter = fields.Float(data_key='worst perimeter', required=True, validate=validate.Range(min=0, max=500))
    worst_area = fields.Float(data_key='worst area', required=True, validate=validate.Range(min=0, max=3000))
    worst_smoothness = fields.Float(data_key='worst smoothness', required=True, validate=validate.Range(min=0, max=1))
    worst_compactness = fields.Float(data_key='worst compactness', required=True, validate=validate.Range(min=0, max=1))
    worst_concavity = fields.Float(data_key='worst concavity', required=True, validate=validate.Range(min=0, max=1))
    worst_concave_points = fields.Float(data_key='worst concave points', required=True, validate=validate.Range(min=0, max=1))
    worst_symmetry = fields.Float(data_key='worst symmetry', required=True, validate=validate.Range(min=0, max=1))
    worst_fractal_dimension = fields.Float(data_key='worst fractal dimension', required=True, validate=validate.Range(min=0, max=1))


class DiagnosisInputSchema(Schema):
    """Schema for the diagnosis request body."""
    features = fields.Dict(required=True)
    patient_id = fields.Integer(required=False, validate=validate.Range(min=1))


class MultiDiagnosisSchema(Schema):
    """Schema for multi-diagnosis."""
    heart_features = fields.Dict(required=False)
    diabetes_features = fields.Dict(required=False)
    cancer_features = fields.Dict(required=False)

    @validates_schema
    def validate_at_least_one(self, data, **kwargs):
        if not any(data.get(k) for k in ['heart_features', 'diabetes_features', 'cancer_features']):
            raise ValidationError('At least one set of features is required.')


class PaginationSchema(Schema):
    page = fields.Integer(validate=validate.Range(min=1), load_default=1)
    per_page = fields.Integer(validate=validate.Range(min=1, max=100), load_default=10)
    search = fields.String(load_default='')


class CompleteBBCSchema(Schema):
    """Validation for Complete Blood Count (CBC) with differential."""
    wbc = fields.Float(required=True, validate=validate.Range(min=3, max=30, error='WBC: 3-30 K/uL'))
    rbc = fields.Float(required=True, validate=validate.Range(min=3, max=7, error='RBC: 3-7 M/uL'))
    hemoglobin = fields.Float(required=True, validate=validate.Range(min=7, max=20, error='Hb: 7-20 g/dL'))
    hematocrit = fields.Float(required=True, validate=validate.Range(min=20, max=60, error='Hct: 20-60%'))
    platelets = fields.Float(required=True, validate=validate.Range(min=50, max=500, error='Platelets: 50-500 K/uL'))
    neutrophils = fields.Float(required=True, validate=validate.Range(min=40, max=80, error='Neutrophils: 40-80%'))
    lymphocytes = fields.Float(required=True, validate=validate.Range(min=15, max=45, error='Lymphocytes: 15-45%'))


class ComprehensiveMetabolicPanelSchema(Schema):
    """Validation for Comprehensive Metabolic Panel (CMP)."""
    glucose = fields.Float(required=True, validate=validate.Range(min=40, max=300, error='Glucose: 40-300 mg/dL'))
    calcium = fields.Float(required=True, validate=validate.Range(min=6, max=11, error='Calcium: 6-11 mg/dL'))
    sodium = fields.Float(required=True, validate=validate.Range(min=130, max=150, error='Sodium: 130-150 mEq/L'))
    potassium = fields.Float(required=True, validate=validate.Range(min=3, max=6, error='Potassium: 3-6 mEq/L'))
    co2 = fields.Float(required=True, validate=validate.Range(min=20, max=32, error='CO2: 20-32 mEq/L'))
    chloride = fields.Float(required=True, validate=validate.Range(min=95, max=110, error='Chloride: 95-110 mEq/L'))
    bun = fields.Float(required=True, validate=validate.Range(min=7, max=30, error='BUN: 7-30 mg/dL'))
    creatinine = fields.Float(required=True, validate=validate.Range(min=0.6, max=1.3, error='Creatinine: 0.6-1.3 mg/dL'))
    bilirubin = fields.Float(required=True, validate=validate.Range(min=0.1, max=1.3, error='Bilirubin: 0.1-1.3 mg/dL'))
    ast = fields.Float(required=True, validate=validate.Range(min=10, max=40, error='AST: 10-40 U/L'))
    alt = fields.Float(required=True, validate=validate.Range(min=7, max=56, error='ALT: 7-56 U/L'))
    alp = fields.Float(required=True, validate=validate.Range(min=44, max=147, error='ALP: 44-147 U/L'))


class LipidCardiovascularPanelSchema(Schema):
    """Validation for Lipid and Cardiovascular Risk Panel."""
    total_cholesterol = fields.Float(required=True, validate=validate.Range(min=100, max=400, error='Total Cholesterol: 100-400 mg/dL'))
    hdl = fields.Float(required=True, validate=validate.Range(min=20, max=100, error='HDL: 20-100 mg/dL'))
    ldl = fields.Float(required=True, validate=validate.Range(min=0, max=300, error='LDL: 0-300 mg/dL'))
    triglycerides = fields.Float(required=True, validate=validate.Range(min=30, max=500, error='Triglycerides: 30-500 mg/dL'))
    apob = fields.Float(required=True, validate=validate.Range(min=30, max=150, error='ApoB: 30-150 mg/dL'))
    hs_crp = fields.Float(required=True, validate=validate.Range(min=0, max=20, error='hs-CRP: 0-20 mg/L'))
    troponin_i = fields.Float(required=True, validate=validate.Range(min=0, max=5, error='Troponin-I: 0-5 ng/mL'))
    troponin_t = fields.Float(required=True, validate=validate.Range(min=0, max=5, error='Troponin-T: 0-5 ng/mL'))
    nt_probnp = fields.Float(required=True, validate=validate.Range(min=0, max=10000, error='NT-proBNP: 0-10000 pg/mL'))


class EndocrinePanelSchema(Schema):
    """Validation for Endocrine and Hormone Panel."""
    tsh = fields.Float(required=True, validate=validate.Range(min=0.1, max=10, error='TSH: 0.1-10 mIU/L'))
    free_t3 = fields.Float(required=True, validate=validate.Range(min=1.5, max=4.5, error='Free T3: 1.5-4.5 pg/mL'))
    free_t4 = fields.Float(required=True, validate=validate.Range(min=0.8, max=2, error='Free T4: 0.8-2 ng/dL'))
    hba1c = fields.Float(required=True, validate=validate.Range(min=4, max=15, error='HbA1c: 4-15%'))
    fasting_insulin = fields.Float(required=True, validate=validate.Range(min=2, max=20, error='Fasting Insulin: 2-20 uIU/mL'))
    cortisol = fields.Float(required=True, validate=validate.Range(min=3, max=25, error='Cortisol: 3-25 ug/dL'))
    testosterone = fields.Float(required=True, validate=validate.Range(min=0, max=1000, error='Testosterone: 0-1000 ng/dL'))
    estrogen = fields.Float(required=True, validate=validate.Range(min=0, max=500, error='Estrogen: 0-500 pg/mL'))
    vitamin_d = fields.Float(required=True, validate=validate.Range(min=10, max=100, error='Vitamin D: 10-100 ng/mL'))


class OncologyBiomarkersSchema(Schema):
    """Validation for Tumor Biomarkers and Oncology Panel."""
    psa = fields.Float(required=True, validate=validate.Range(min=0, max=100, error='PSA: 0-100 ng/mL'))
    cea = fields.Float(required=True, validate=validate.Range(min=0, max=20, error='CEA: 0-20 ng/mL'))
    ca125 = fields.Float(required=True, validate=validate.Range(min=0, max=200, error='CA-125: 0-200 U/mL'))
    ca199 = fields.Float(required=True, validate=validate.Range(min=0, max=200, error='CA 19-9: 0-200 U/mL'))
    afp = fields.Float(required=True, validate=validate.Range(min=0, max=500, error='AFP: 0-500 ng/mL'))


class ECGAnalysisSchema(Schema):
    """Validation for 12-Lead ECG/EKG Signal Analysis."""
    heart_rate = fields.Float(required=True, validate=validate.Range(min=30, max=200, error='HR: 30-200 bpm'))
    pr_interval = fields.Float(required=True, validate=validate.Range(min=120, max=200, error='PR: 120-200 ms'))
    qrs_duration = fields.Float(required=True, validate=validate.Range(min=80, max=120, error='QRS: 80-120 ms'))
    qt_interval = fields.Float(required=True, validate=validate.Range(min=200, max=450, error='QT: 200-450 ms'))
    st_segment = fields.Float(required=True, validate=validate.Range(min=-2, max=2, error='ST: -2 to +2 mm'))
    t_wave_amplitude = fields.Float(required=True, validate=validate.Range(min=-10, max=10, error='T-wave: -10 to +10 mm'))
    rhythm_regularity = fields.String(required=True, validate=validate.OneOf(['regular', 'irregular']))


class GenomicVariantSchema(Schema):
    """Validation for Genomic Variant and Polygenic Risk Assessment."""
    snp_count = fields.Integer(required=True, validate=validate.Range(min=0, max=100000, error='SNP count: 0-100000'))
    cardiovascular_prs = fields.Float(required=True, validate=validate.Range(min=0, max=100, error='CV PRS: 0-100 percentile'))
    oncological_prs = fields.Float(required=True, validate=validate.Range(min=0, max=100, error='Oncology PRS: 0-100 percentile'))
    neurological_prs = fields.Float(required=True, validate=validate.Range(min=0, max=100, error='Neuro PRS: 0-100 percentile'))
    consanguinity_flag = fields.Boolean(required=True)
    pathogenic_variant_count = fields.Integer(required=True, validate=validate.Range(min=0, max=50, error='Pathogenic variants: 0-50'))


class MicrobioAnalysisSchema(Schema):
    """Validation for Clinical Microbiology and Pathogen Identification."""
    organism_type = fields.String(required=True, validate=validate.OneOf(['bacteria', 'virus', 'fungus', 'parasite', 'unknown']))
    culture_growth_time = fields.Float(required=True, validate=validate.Range(min=0.5, max=72, error='Growth time: 0.5-72 hours'))
    antibiotic_sensitivity_count = fields.Integer(required=True, validate=validate.Range(min=0, max=30, error='Antibiotic panels: 0-30'))
    gram_stain_positive = fields.Boolean(required=True)
    aerobic_growth = fields.Boolean(required=True)
    virulence_score = fields.Float(required=True, validate=validate.Range(min=0, max=100, error='Virulence: 0-100%'))