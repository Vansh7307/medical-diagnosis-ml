# Deployment Guide: Vercel (Frontend) + Railway (Backend)

## Quick Start
1. **Deploy Backend on Railway first** (takes ~2 min)
2. **Get the Railway URL**
3. **Deploy Frontend on Vercel** (takes ~3 min)
4. **Connect them with environment variables**

---

## STEP 1: Deploy Backend on Railway

### Prerequisites
- Railway account: https://railway.app (free tier available)
- Your GitHub repository pushed with code

### Deployment Steps
1. Go to https://railway.app
2. Click **"New Project"** → **"Deploy from GitHub"**
3. Connect your GitHub account and select your repository
4. Select the repository branch
5. Railway auto-detects Python. Configure:
   - **Root Directory**: `backend`
   - **Python Version**: 3.11

6. **Add Environment Variables** (click "Add Variable"):
   ```
   FLASK_ENV=production
   DEBUG=False
   PYTHONUNBUFFERED=1
   SECRET_KEY=[generate: python -c "import secrets; print(secrets.token_hex(32))"]
   JWT_SECRET_KEY=[generate: python -c "import secrets; print(secrets.token_hex(32))"]
   CORS_ORIGINS=https://your-vercel-app.vercel.app
   ```

7. Click **"Deploy"** and wait for build to complete (~2-3 minutes)

8. **Copy the Railway URL** from the "Domain" section (looks like: `https://your-app.up.railway.app`)

---

## STEP 2: Deploy Frontend on Vercel

### Prerequisites
- Vercel account: https://vercel.com (free tier)
- GitHub repository

### Deployment Steps
1. Go to https://vercel.com/new
2. Select **"Import Git Repository"**
3. Connect your GitHub account and select your repository
4. **Configuration**:
   - **Project name**: `medical-diagnosis-ml` (or your choice)
   - **Framework**: Select **Vite**
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. **Add Environment Variables**:
   - Click "Environment Variables"
   - Add: `VITE_API_URL` = `https://your-railway-backend.up.railway.app/api`
   (Use the Railway URL you copied in Step 1)

6. Click **"Deploy"** and wait for completion (~2-3 minutes)

7. **Get your Vercel URL** (looks like: `https://your-app.vercel.app`)

---

## STEP 3: Update Backend CORS

Now that you have both URLs, update the backend to allow the frontend:

### In Railway Dashboard:
1. Go to your Railway project
2. Click **"Variables"**
3. Edit `CORS_ORIGINS` to: `https://your-vercel-app.vercel.app`
4. Redeploy (Railway auto-redeploys on variable changes)

---

## Testing the Connection

1. Open your Vercel app: `https://your-vercel-app.vercel.app`
2. Try logging in or making an API call
3. Check browser console (F12) for errors
4. Check Railway logs if there are issues

### Check Logs

**Vercel Logs:**
- Dashboard → Your Project → "Deployments" → Click latest → "View Logs"

**Railway Logs:**
- Dashboard → Your Project → "Logs" tab

---

## Troubleshooting

### CORS Errors
- Make sure `CORS_ORIGINS` in Railway matches your Vercel URL exactly
- Include the `https://` protocol

### API Calls Fail
- Check that Railway backend is running (check "Logs" in Railway)
- Verify `VITE_API_URL` environment variable in Vercel settings
- Ensure the backend URL includes `/api` suffix

### Build Fails
- **Vercel**: Check "Build Logs" in Deployment tab
- **Railway**: Check "Logs" tab
- Ensure `requirements.txt` has all dependencies

### Database Issues
- Default uses SQLite (no setup needed)
- For PostgreSQL: Add PostgreSQL plugin in Railway, copy `DATABASE_URL` to env vars

---

## Production Checklist

- [ ] Both apps deployed and working
- [ ] CORS properly configured
- [ ] Environment variables set on both platforms
- [ ] API calls working end-to-end
- [ ] Check production logs for errors
- [ ] Test all main features (login, diagnosis, predictions)

---

## Environment Variables Reference

### Backend (Railway)
- `FLASK_ENV`: Set to `production`
- `DEBUG`: Set to `False`
- `SECRET_KEY`: Generate with `python -c "import secrets; print(secrets.token_hex(32))"`
- `JWT_SECRET_KEY`: Generate with `python -c "import secrets; print(secrets.token_hex(32))"`
- `CORS_ORIGINS`: Your Vercel frontend URL
- `DATABASE_URL`: PostgreSQL URL (optional, uses SQLite by default)

### Frontend (Vercel)
- `VITE_API_URL`: Your Railway backend URL + `/api`

---

## Scaling (Future)

- **Database**: Add PostgreSQL addon in Railway for production data
- **Performance**: Both platforms auto-scale on free tier
- **Monitoring**: Check Railway/Vercel dashboards for usage

---

## Support
- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs

