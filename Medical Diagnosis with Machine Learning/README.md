# Medical Diagnosis with Machine Learning

A comprehensive full-stack application for medical diagnosis prediction using machine learning, built with Flask/Python backend and React TypeScript frontend.

## Features

- **ML-Powered Diagnosis**: Multiple machine learning models for breast cancer, diabetes, and heart disease prediction
- **Patient Management**: Complete patient records management system
- **Analytics Dashboard**: Real-time analytics and monitoring of predictions
- **MLOps Monitoring**: Track model performance, versioning, and audit trails
- **Authentication**: Secure user authentication with JWT tokens
- **Explainability**: Model prediction explanations using SHAP/explainability tools
- **REST API**: Comprehensive RESTful API for all operations
- **Docker Support**: Easy deployment with Docker and Docker Compose

## Tech Stack

### Backend
- **Framework**: Flask with SQLAlchemy ORM
- **ML Libraries**: scikit-learn, pandas, numpy
- **Database**: SQLite (development) / PostgreSQL (production)
- **API Documentation**: OpenAPI/Swagger
- **Testing**: pytest
- **MLOps**: Custom logging, monitoring, and model versioning

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI**: Tailwind CSS
- **HTTP Client**: Axios
- **State Management**: React Context/Hooks

## Project Structure

```
.
├── backend/              # Flask API server
│   ├── app/
│   │   ├── data/        # Data loading and preprocessing
│   │   ├── ml/          # ML models and training pipelines
│   │   ├── mlops/       # Monitoring, logging, versioning
│   │   ├── models/      # SQLAlchemy ORM models
│   │   └── routes/      # API endpoints
│   ├── tests/           # Backend test suite
│   ├── migrations/      # Alembic database migrations
│   ├── requirements.txt # Python dependencies
│   └── run.py          # Flask application entry point
├── frontend/            # React TypeScript application
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── pages/      # Page components
│   │   ├── services/   # API integration
│   │   └── utils/      # Utility functions
│   ├── package.json
│   └── vite.config.ts
├── notebooks/           # Jupyter notebooks for analysis
├── docker-compose.yml   # Docker Compose configuration
└── README.md           # This file
```

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Docker and Docker Compose (optional)

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/medical-diagnosis-ml.git
   cd medical-diagnosis-ml/backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run the application**
   ```bash
   python run.py
   ```

The API will be available at `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`

### Docker Deployment

```bash
docker-compose up --build
```

This will start both backend and frontend services.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Diagnosis
- `POST /api/diagnosis` - Create new diagnosis
- `GET /api/diagnosis/<id>` - Get diagnosis details
- `GET /api/diagnosis/history/<patient_id>` - Get patient diagnosis history

### Patients
- `GET /api/patients` - List all patients
- `POST /api/patients` - Create new patient
- `GET /api/patients/<id>` - Get patient details
- `PUT /api/patients/<id>` - Update patient

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard analytics
- `GET /api/analytics/model-performance` - Get model performance metrics

### MLOps
- `GET /api/mlops/monitor` - Get monitoring data
- `GET /api/mlops/model-versions` - Get model versions

See API documentation at `/docs` when running the backend.

## Available ML Models

### Breast Cancer Prediction
- Dataset: Wisconsin Breast Cancer Dataset
- Features: 30 physiological measurements
- Output: Malignant/Benign classification

### Diabetes Prediction
- Dataset: Pima Indians Diabetes Dataset
- Features: 8 health indicators
- Output: Diabetic/Non-diabetic classification

### Heart Disease Prediction
- Dataset: Cleveland Heart Disease Dataset
- Features: 13 cardiac indicators
- Output: Disease risk levels

## Testing

### Run Backend Tests
```bash
cd backend
pytest tests/
```

### Run with Coverage
```bash
pytest --cov=app tests/
```

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
CORS_ORIGINS=http://localhost:5173
DATABASE_URL=sqlite:///instance/medical_diagnosis.db
```

## Database Migrations

```bash
cd backend
alembic upgrade head  # Apply migrations
```

## Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and test thoroughly
3. Commit with clear messages: `git commit -m "Add feature description"`
4. Push to your fork: `git push origin feature/your-feature`
5. Create a Pull Request

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request with a clear description

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Authors

- Medical Diagnosis ML Team

## Support

For issues and questions, please open an issue on GitHub.

## Acknowledgments

- Dataset sources: UCI Machine Learning Repository
- ML frameworks: scikit-learn, pandas, numpy
- Frontend framework: React
- Backend framework: Flask
