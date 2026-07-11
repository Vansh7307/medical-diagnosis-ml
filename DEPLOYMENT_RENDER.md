# Deployment to Render & Vercel

## Overview
This project is deployed to two platforms:
- **Backend**: Render.com (Python Flask API)
- **Frontend**: Vercel (React/Vite) OR Render Static Site

## Backend Deployment (Render Web Service)

### Setup
1. Connect your GitHub repository to Render
2. Create a new Web Service and select this repository
3. Configure with these settings:
   - **Name**: medical-diagnosis-api
   - **Runtime**: Python 3.12
   - **Region**: Oregon (or your preference)
   - **Plan**: Free (or Paid for better performance)

### Build Command
```
pip install -r requirements.txt && python build.py
```

### Start Command
```
gunicorn -w 2 -b 0.0.0.0:$PORT --timeout 120 run:app
```

### Environment Variables
These are automatically generated/set in Render:
- `FLASK_ENV`: production
- `SECRET_KEY`: (auto-generated)
- `JWT_SECRET_KEY`: (auto-generated)
- `CORS_ORIGINS`: http://localhost:5173,http://localhost:3000,https://medical-diagnosis-ml-1.onrender.com,https://medical-diagnosis-ml.vercel.app

⚠️ **IMPORTANT**: Both frontend URLs are included in CORS_ORIGINS

### Health Check
- **Path**: `/api/health`
- **Timeout**: 30 seconds
- **Check Interval**: 10 seconds

---

## Frontend Deployment Option 1: Vercel (Recommended)

### Setup
1. Go to https://vercel.com
2. Create new project and connect your GitHub repository
3. Select the `frontend` directory as root
4. Framework: Vite
5. Build Command: `npm run build`
6. Output Directory: `dist`

### Environment Variables in Vercel
In Vercel Dashboard → Settings → Environment Variables, add:
```
VITE_API_URL = https://medical-diagnosis-api-9toj.onrender.com/api
```

### Deployment
- Vercel auto-deploys on every push to main
- Your app: https://medical-diagnosis-ml.vercel.app

---

## Frontend Deployment Option 2: Render Static Site

### Setup
1. Create a new Static Site on Render
2. Connect your GitHub repository
3. Configure build settings:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `frontend/dist`

### Environment Variables
- `VITE_API_URL`: https://medical-diagnosis-api-9toj.onrender.com/api

### Deployment
- Your app: https://medical-diagnosis-ml-1.onrender.com

---

## API Endpoints

| Service | URL |
|---------|-----|
| Backend API | https://medical-diagnosis-api-9toj.onrender.com/api |
| Health Check | https://medical-diagnosis-api-9toj.onrender.com/api/health |
| Frontend (Vercel) | https://medical-diagnosis-ml.vercel.app |
| Frontend (Render) | https://medical-diagnosis-ml-1.onrender.com |

---

## Troubleshooting

### CAPTCHA showing "..."
- Ensure `CORS_ORIGINS` in backend render.yaml includes your frontend URL
- Check that `VITE_API_URL` is correctly set in Vercel environment variables
- Verify Network tab in browser DevTools to see actual API requests
- Hard refresh (Ctrl+Shift+R) to clear cache

### Build Failures on Render (Backend)
- Check render logs in dashboard
- Ensure `requirements.txt` is up to date
- Verify `build.py` runs without errors: `python build.py`

### Build Failures on Vercel (Frontend)
- Check Vercel build logs
- Ensure Node.js version is compatible
- Verify `npm install && npm run build` works locally
- Check that `.env.production` has correct API URL

### 502 Bad Gateway
- Backend service crashed - check Render logs
- Check if `SECRET_KEY` and `JWT_SECRET_KEY` are generated
- Redeploy with "Manual Deploy" button

### CAPTCHA API returns 403 Forbidden
- CORS error - update CORS_ORIGINS to include new frontend URL
- Redeploy backend after changing render.yaml
- Wait 2-3 minutes for changes to take effect

---

## Files Included
- `backend/render.yaml` - Backend deployment configuration (includes both frontend URLs)
- `frontend/.env.production` - Vercel production environment
- `frontend/.env.development` - Local development
- `frontend/vercel.json` - Vercel-specific configuration
- `backend/.env.example` - Example environment variables

---

## Updating CORS Origins
If you add a new frontend deployment URL:
1. Edit `backend/render.yaml`
2. Update the `CORS_ORIGINS` value to include all frontend URLs separated by commas
3. Commit and push
4. Render will automatically redeploy
5. Wait 2-3 minutes for health check to pass

Example format:
```
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://url1.vercel.app,https://url2.onrender.com
```

---

## For Local Development
See `.env.development` in frontend directory for local API URL configuration.
Run backend with: `python run.py`
Run frontend with: `npm run dev`

