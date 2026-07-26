"""
Skin Lesion Image Analyzer -- classical computer vision.

Classifies an uploaded lesion image as benign or malignant-style using
genuine image feature extraction (HOG shape/edge descriptors, color
histograms, GLCM texture statistics) followed by a Random Forest
classifier. Deliberately NOT a deep learning / CNN approach -- no
pretrained weights are reachable from this environment, and a full deep
learning framework risks exceeding free-tier hosting memory limits. This
is a genuine, working, classical CV pipeline instead: the same category
of technique used in computer vision before deep learning became dominant.

Trained on a synthetically generated (procedurally drawn) image dataset,
following the same synthetic-data-first approach as the project's other
models -- NOT real medical scans, which would raise its own licensing and
patient-consent problems for a portfolio project. The visual patterns
loosely mirror common dermoscopy heuristics (shape irregularity, color
variation, texture roughness) without any claim of real clinical validity.
"""
import os
import numpy as np
from PIL import Image
from skimage.feature import hog, graycomatrix, graycoprops
from skimage.color import rgb2gray
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib


MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
CLASSIFIER_PATH = os.path.join(MODELS_DIR, 'lesion_classifier.pkl')
IMAGE_SIZE = (96, 96)


# ---------------------------------------------------------------------------
# Synthetic dataset generation
# ---------------------------------------------------------------------------

def _generate_lesion_image(malignant: bool, rng: np.random.RandomState):
    """Procedurally draws one synthetic lesion image."""
    from PIL import ImageDraw, ImageFilter

    size = IMAGE_SIZE[0]
    img = Image.new('RGB', (size, size), color=(220, 190, 170))
    draw = ImageDraw.Draw(img)

    cx, cy = size // 2, size // 2
    base_radius = rng.randint(20, 32)

    if malignant:
        base_color = (rng.randint(30, 90), rng.randint(10, 50), rng.randint(10, 40))
        n_points = rng.randint(10, 16)
        irregularity = rng.uniform(0.35, 0.6)
        color_variation = 40
    else:
        base_color = (rng.randint(90, 140), rng.randint(60, 100), rng.randint(50, 90))
        n_points = rng.randint(6, 9)
        irregularity = rng.uniform(0.05, 0.15)
        color_variation = 12

    angles = np.linspace(0, 2 * np.pi, n_points, endpoint=False)
    points = []
    for angle in angles:
        r = base_radius * (1 + rng.uniform(-irregularity, irregularity))
        points.append((cx + r * np.cos(angle), cy + r * np.sin(angle)))
    draw.polygon(points, fill=base_color)

    pixels = np.array(img)
    noise = rng.randint(-color_variation, color_variation, pixels.shape).astype(int)
    pixels = np.clip(pixels.astype(int) + noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(pixels)

    img = img.filter(
        (ImageFilter.SMOOTH_MORE if rng.rand() > 0.5 else ImageFilter.DETAIL)
        if malignant else ImageFilter.SMOOTH
    )
    return img


def generate_lesion_dataset(n_per_class=150, seed=42):
    """Generate synthetic (image, label) pairs in memory -- no disk writes needed."""
    rng = np.random.RandomState(seed)
    images, labels = [], []
    for _ in range(n_per_class):
        images.append(_generate_lesion_image(False, rng))
        labels.append('benign')
        images.append(_generate_lesion_image(True, rng))
        labels.append('malignant')
    return images, labels


# ---------------------------------------------------------------------------
# Feature extraction
# ---------------------------------------------------------------------------

def extract_image_features(pil_image: Image.Image) -> np.ndarray:
    """Extract HOG (shape/edges) + color histogram + GLCM texture features."""
    img = pil_image.convert('RGB').resize(IMAGE_SIZE)
    arr = np.array(img)
    gray = rgb2gray(arr)

    hog_features = hog(
        gray, orientations=8, pixels_per_cell=(16, 16),
        cells_per_block=(2, 2), feature_vector=True
    )

    color_hist = []
    for channel in range(3):
        hist, _ = np.histogram(arr[:, :, channel], bins=16, range=(0, 256), density=True)
        color_hist.extend(hist)
    color_hist = np.array(color_hist)

    gray_uint8 = (gray * 255).astype(np.uint8)
    glcm = graycomatrix(gray_uint8, distances=[1], angles=[0], levels=256, symmetric=True, normed=True)
    texture_features = np.array([
        graycoprops(glcm, 'contrast')[0, 0],
        graycoprops(glcm, 'homogeneity')[0, 0],
        graycoprops(glcm, 'energy')[0, 0],
        graycoprops(glcm, 'correlation')[0, 0],
    ])

    return np.concatenate([hog_features, color_hist, texture_features])


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def train_lesion_classifier():
    """Train and persist the Random Forest lesion classifier."""
    os.makedirs(MODELS_DIR, exist_ok=True)
    images, labels = generate_lesion_dataset()

    X = np.array([extract_image_features(img) for img in images])
    y = np.array(labels)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    clf = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42)
    clf.fit(X_train, y_train)

    accuracy = accuracy_score(y_test, clf.predict(X_test))
    joblib.dump(clf, CLASSIFIER_PATH)

    return {'accuracy': round(float(accuracy), 4), 'n_samples': len(labels)}


# ---------------------------------------------------------------------------
# Inference
# ---------------------------------------------------------------------------

_cached_classifier = None


def _load_classifier():
    global _cached_classifier
    if _cached_classifier is None:
        if not os.path.exists(CLASSIFIER_PATH):
            raise FileNotFoundError(
                "Lesion classifier not trained yet. Run train_lesion_classifier() first."
            )
        _cached_classifier = joblib.load(CLASSIFIER_PATH)
    return _cached_classifier


def analyze_lesion_image(pil_image: Image.Image) -> dict:
    """Classify an uploaded lesion image as benign or malignant-style."""
    clf = _load_classifier()
    features = extract_image_features(pil_image).reshape(1, -1)

    prediction = str(clf.predict(features)[0])
    proba = clf.predict_proba(features)[0]
    classes = [str(c) for c in clf.classes_]

    return {
        'classification': prediction,
        'confidence': round(float(max(proba)), 4),
        'probabilities': {cls: round(float(p), 4) for cls, p in zip(classes, proba)},
    }