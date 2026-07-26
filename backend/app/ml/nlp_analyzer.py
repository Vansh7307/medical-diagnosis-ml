"""
Clinical Notes NLP Analyzer.

Classifies free-text clinical notes (symptom descriptions, chief complaints)
into an urgency tier (routine / urgent / emergency) using a TF-IDF +
Logistic Regression pipeline. Deliberately lightweight -- no transformer/LLM
dependency -- so it stays safe to run on free-tier hosting memory limits,
while still being a genuine, trained, working NLP classifier rather than a
keyword-matching stub.

Trained on a synthetically generated dataset of clinical note phrasing,
following the same synthetic-data-first approach already used for this
project's tabular diagnosis models (heart/diabetes/cancer) -- not real
patient records.
"""
import os
import json
import random
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score


MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
PIPELINE_PATH = os.path.join(MODELS_DIR, 'clinical_notes_pipeline.pkl')

# Symptom phrase banks by urgency tier, loosely based on common clinical
# triage language. Synthetic -- not sourced from any real patient data.
ROUTINE_PHRASES = [
    "mild seasonal allergies", "occasional dry cough for a few days",
    "requesting a routine prescription refill", "annual physical checkup",
    "mild fatigue, otherwise feeling well", "minor skin rash on forearm",
    "slight headache relieved by rest", "follow-up for stable blood pressure",
    "mild joint stiffness in the morning", "requesting vaccination",
    "occasional heartburn after meals", "minor cut healing well",
    "routine lab work requested", "general wellness check",
    "mild seasonal sniffles", "stable chronic condition, no new symptoms",
]

URGENT_PHRASES = [
    "persistent fever for three days", "worsening cough with mild wheezing",
    "moderate abdominal pain for two days", "dizziness on standing up",
    "recurring migraines not responding to usual medication",
    "swelling and pain in lower leg", "moderate shortness of breath on exertion",
    "unexplained weight loss over the past month", "persistent vomiting",
    "worsening back pain radiating down the leg", "high blood sugar readings this week",
    "rash spreading with mild fever", "moderate chest discomfort with activity",
    "irregular heartbeat noticed intermittently", "worsening vision in one eye",
]

EMERGENCY_PHRASES = [
    "severe chest pain radiating to the left arm", "sudden difficulty breathing at rest",
    "sudden slurred speech and facial drooping", "severe abdominal pain with rigidity",
    "loss of consciousness reported by family", "severe allergic reaction with facial swelling",
    "uncontrolled bleeding from a wound", "sudden severe headache, worst of life",
    "chest pain with sweating and nausea", "seizure witnessed moments ago",
    "severe difficulty breathing, blue lips noted", "high fever with confusion and stiff neck",
    "sudden weakness on one side of the body", "severe trauma from a fall",
    "unresponsive, weak pulse",
]

PREFIXES = [
    "Patient reports", "Patient presents with", "Chief complaint:",
    "Patient states", "On presentation,", "History of present illness:",
]

SUFFIXES = [
    "", " No known allergies.", " Vitals otherwise stable.",
    " Patient appears anxious.", " Family accompanying patient.",
    " No prior similar episodes.",
]


def _generate_note(phrases, rng):
    prefix = rng.choice(PREFIXES)
    phrase = rng.choice(phrases)
    extra = rng.choice(SUFFIXES)
    return f"{prefix} {phrase}.{extra}"


def generate_clinical_notes_dataset(n_per_class=300, seed=42):
    """Generate the synthetic training dataset. Returns list of {text, urgency}."""
    rng = random.Random(seed)
    rows = []
    for phrases, label in [
        (ROUTINE_PHRASES, 'routine'),
        (URGENT_PHRASES, 'urgent'),
        (EMERGENCY_PHRASES, 'emergency'),
    ]:
        for _ in range(n_per_class):
            rows.append({'text': _generate_note(phrases, rng), 'urgency': label})
    rng.shuffle(rows)
    return rows


def train_clinical_notes_model():
    """Train and persist the TF-IDF + Logistic Regression urgency classifier."""
    os.makedirs(MODELS_DIR, exist_ok=True)
    data = generate_clinical_notes_dataset()

    X = [row['text'] for row in data]
    y = [row['urgency'] for row in data]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=500, ngram_range=(1, 2), stop_words='english')),
        ('clf', LogisticRegression(max_iter=1000, C=1.0)),
    ])
    pipeline.fit(X_train, y_train)

    accuracy = accuracy_score(y_test, pipeline.predict(X_test))
    joblib.dump(pipeline, PIPELINE_PATH)

    return {'accuracy': round(float(accuracy), 4), 'n_samples': len(data)}


_cached_pipeline = None


def _load_pipeline():
    global _cached_pipeline
    if _cached_pipeline is None:
        if not os.path.exists(PIPELINE_PATH):
            raise FileNotFoundError(
                "Clinical notes model not trained yet. Run train_clinical_notes_model() first."
            )
        _cached_pipeline = joblib.load(PIPELINE_PATH)
    return _cached_pipeline


def analyze_clinical_notes(text):
    """
    Classify free-text clinical notes into an urgency tier.

    Returns:
        dict with predicted urgency, confidence per class, and the top
        words that most influenced this specific prediction (for
        explainability, mirroring the SHAP explanations used elsewhere).
    """
    pipeline = _load_pipeline()
    tfidf = pipeline.named_steps['tfidf']
    clf = pipeline.named_steps['clf']

    proba = pipeline.predict_proba([text])[0]
    prediction = pipeline.predict([text])[0]
    classes = list(pipeline.classes_)

    # Explainability: which words in THIS note contributed most to the
    # predicted class, using the logistic regression's learned coefficients
    # for the words that are actually present in this note.
    feature_names = tfidf.get_feature_names_out()
    note_vector = tfidf.transform([text]).toarray()[0]
    predicted_class_idx = classes.index(prediction)
    coefficients = clf.coef_[predicted_class_idx] if len(classes) > 2 else clf.coef_[0]

    present_word_contributions = []
    for i, tfidf_weight in enumerate(note_vector):
        if tfidf_weight > 0:
            contribution = float(tfidf_weight * coefficients[i])
            present_word_contributions.append({
                'term': feature_names[i],
                'contribution': round(contribution, 4),
            })
    present_word_contributions.sort(key=lambda x: abs(x['contribution']), reverse=True)

    return {
        'urgency': str(prediction),
        'confidence': round(float(max(proba)), 4),
        'probabilities': {str(cls): round(float(p), 4) for cls, p in zip(classes, proba)},
        'top_terms': present_word_contributions[:8],
    }