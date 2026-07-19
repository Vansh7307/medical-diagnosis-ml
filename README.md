# Medical Diagnosis with Machine Learning

A full-stack application for medical diagnosis prediction using machine learning, with a Flask/Python backend and a React TypeScript frontend. Supports three portals — Doctor, Clinician, and Patient — each with role-appropriate access, plus an Admin portal for account management.

## Features

- **ML-Powered Diagnosis** — models for breast cancer, diabetes, and heart disease prediction, with SHAP-based explainability
- **Patient Management** — full patient records CRUD for clinic staff (doctor/clinician/admin)
- **Patient Self-Service Portal** — patients get their own dashboard, profile, and diagnosis history, automatically linked to their medical record by email match at registration
- **Role-locked Login** — separate Doctor / Clinician / Patient login tabs, each enforced server-side; a separate Admin portal at `/admin/login`
- **Analytics Dashboard** — clinic-wide stats for staff, personal stats for patients
- **MLOps Monitoring** — model performance tracking, versioning, and audit logging
- **Admin Tools** — user management, role/status control, and a "Link Patient Record" tool for connecting existing accounts to existing patient records
- **Security** — JWT auth, CAPTCHA on login/register/forgot-password, rate limiting, session-scoped tokens (logs out on browser/tab close)

## Tech Stack

**Backend:** Flask, SQLAlchemy, PostgreSQL (production) / SQLite (local dev fallback), scikit-learn, pandas, SHAP, JWT, marshmallow, pytest

**Frontend:** React 18 + TypeScript, Vite, Tailwind CSS, Axios, Recharts

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── data/          # Dataset loading & preprocessing
│   │   ├── ml/             # Models, training, explainability
│   │   ├── mlops/          # Logging, monitoring, versioning
│   │   ├── models/         # SQLAlchemy models (User, Patient, Diagnosis, ...)
│   │   ├── routes/         # API endpoints (auth, admin, patients, diagnosis, analytics)
│   │   └── utils/          # CAPTCHA, email, decorators
│   ├── tests/               # pytest suite
│   ├── requirements.txt
│   └── run.py                # Entry point
└── frontend/
    ├── src/
    │   ├── components/     # Layout, ColdStartBanner
    │   ├── pages/           # Login, AdminLogin, Dashboard, MyProfile, Patients, ...
    │   └── services/api.ts # Axios client + all API calls
    └── vite.config.ts
```

## Local Development Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # then edit .env with your own values
python run.py
```
API runs at `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```
App runs at `http://localhost:5173` (or whatever Vite prints).

## Environment Variables

See `.env.example` for the full list. The important ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (falls back to local SQLite if unset) |
| `JWT_SECRET_KEY` | Signing key for auth tokens |
| `RESEND_API_KEY` | Email delivery (password reset codes) via [Resend](https://resend.com) |
| `BOOTSTRAP_ADMIN_SECRET` | One-time secret to promote the first user to admin — **must be set**, the endpoint refuses to run without it |
| `CORS_ORIGINS` | Allowed frontend origin(s) |

## Deployment

Currently deployed as:
- **Backend + API:** Render (free tier Web Service) — see `render.yaml`
- **Database:** Neon (free tier Postgres) — persists independently of backend deploys
- **Frontend:** Vercel — see `vercel.json`

### Creating the first admin account

1. Register a normal account through the site
2. Call the bootstrap endpoint once (only works if no admin exists yet):
   ```bash
   curl -X POST https://<your-backend-url>/api/admin/bootstrap-admin \
     -H "Content-Type: application/json" \
     -d '{"secret": "<BOOTSTRAP_ADMIN_SECRET value>", "username": "<your_username>"}'
   ```
3. Log in at `/admin/login`

### Free-tier cold starts

Render's free tier spins the backend down after ~15 minutes idle, and Neon's free tier suspends its database compute independently. Both are mitigated by:
- A `/api/health` check that also pings the database (keeps both warm)
- An external uptime monitor (e.g. [cron-job.org](https://cron-job.org)) hitting `/api/health` every ~10 minutes
- A frontend banner (`ColdStartBanner`) that shows "waking up the server" if a request takes more than a couple of seconds

## Running Tests

```bash
cd backend
pytest tests/ -v --cov=app
```

CI runs this automatically on every push via GitHub Actions (`.github/workflows/ci-cd.yml`), which also builds the frontend.

## Roles

| Role | Access |
|---|---|
| `patient` | Own dashboard, own profile (`/my-profile`), own diagnosis history, can run new diagnoses |
| `doctor` / `clinician` | Full patient list, patient CRUD (including edit), diagnosis history search, new diagnoses, patient-account linking |
| `admin` | Everything staff have, plus the Admin Portal: user management, role changes, account status, patient-account linking |

## License

Add your license here.