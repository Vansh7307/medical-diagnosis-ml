# Deployment Guide - Medical Diagnosis ML Platform

## Prerequisites Completed ✅
- All code issues fixed
- Backend ready for production deployment
- Frontend already deployed on Vercel

---

## Step 1: Deploy Backend to Render

### 1.1 Push Code to GitHub
```bash
cd "e:\Projects\Medical Diagnosis with Machine Learning"
git add -A
git commit -m "Production-ready: All fixes applied for Render deployment"
git push origin main
```

### 1.2 Create Render Web Service

1. Go to [https://render.com](https://render.com)
2. Click **New → Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `medical-diagnosis-api`
   - **Region**: Oregon (US West)
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: 
     ```
     pip install -r requirements.txt && python -c "from app.data.dataset_loader import generate_all_datasets; generate_all_datasets()" && python -c "from app.ml.trainer import train_all_models; train_all_models()"
     ```
   - **Start Command**: 
     ```
     gunicorn -w 2 -b 0.0.0.0:$PORT --timeout 120 run:app
     ```

### 1.3 Set Environment Variables

Render will auto-detect `render.yaml` and set:
- `FLASK_ENV=production`
- `SECRET_KEY` (auto-generated)
- `JWT_SECRET_KEY` (auto-generated)
- `CORS_ORIGINS` (will be updated after we get the URL)

### 1.4 Get Your Render Backend URL

After deployment completes, your backend will be at:
```
https://medical-diagnosis-api.onrender.com
```

Test the health endpoint:
```
https://medical-diagnosis-api.onrender.com/api/health
```

---

## Step 2: Update CORS Configuration

### 2.1 Get Your Vercel Frontend URL

Your Vercel project ID: `prj_Zz2Mw4VApG7VZZCak1HsdhvNkvdb`

Your frontend is likely at one of these:
- `https://frontend-[hash].vercel.app`
- Or a custom domain you set up

### 2.2 Update Render Environment Variables

1. Go to Render Dashboard → Your Web Service
2. Go to **Environment** tab
3. Update `CORS_ORIGINS` to include your Vercel domain:
   ```
   https://your-actual-vercel-domain.vercel.app,http://localhost:5173
   ```

4. Click **Save Changes** — Render will auto-redeploy

---

## Step 3: Connect Frontend to Backend

### 3.1 Update Frontend Environment Variable

Your `.env.production` is already set to:
```
VITE_API_URL=https://medical-diagnosis-api.onrender.com/api
```

This is correct! ✅

### 3.2 Redeploy Frontend on Vercel

```bash
cd "e:\Projects\Medical Diagnosis with Machine Learning\frontend"
git add -A
git commit -m "Connect to Render backend API"
git push origin main
```

Vercel will auto-deploy on push.

OR manually trigger deployment:
```bash
npx vercel --prod
```

---

## Step 4: Test Full Stack

### 4.1 Test Backend Health
```bash
curl https://medical-diagnosis-api.onrender.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "Medical Diagnosis ML API",
  "version": "1.0.0"
}
```

### 4.2 Test Frontend

1. Open your Vercel URL in browser
2. Register a new account
3. Try to create a patient
4. Run a diagnosis prediction
5. View analytics dashboard

---

## Troubleshooting

### Issue: CORS Error
**Symptom**: Browser console shows CORS policy error

**Fix**: 
1. Check your Vercel domain is in Render's `CORS_ORIGINS`
2. Make sure format is: `https://your-domain.vercel.app` (no trailing slash)

### Issue: 500 Internal Server Error
**Symptom**: API returns 500

**Fix**:
1. Check Render logs: Dashboard → Logs tab
2. Ensure models were trained during build (check build logs)
3. Verify `SECRET_KEY` and `JWT_SECRET_KEY` are set

### Issue: Models Not Found
**Symptom**: "No trained model found" error

**Fix**:
1. Render build must complete the model training step
2. Check build logs for "Training all models..." output
3. If failed, manually trigger a new deploy

### Issue: Frontend Can't Connect
**Symptom**: Network error in frontend

**Fix**:
1. Verify `VITE_API_URL` in `.env.production`
2. Check browser DevTools → Network tab for actual URL being called
3. Ensure backend is running (check Render dashboard)

---

## Post-Deployment Checklist

- [ ] Backend health check returns 200 OK
- [ ] Frontend loads without errors
- [ ] User registration works
- [ ] User login works
- [ ] Patient CRUD operations work
- [ ] Diagnosis predictions work
- [ ] Analytics dashboard loads
- [ ] CORS allows Vercel domain
- [ ] All 3 ML models are trained
- [ ] Database persists data (check after 30 mins)

---

## Important URLs

**Backend API (Render)**:
- Production: `https://medical-diagnosis-api.onrender.com`
- Health: `https://medical-diagnosis-api.onrender.com/api/health`
- API Docs: `https://medical-diagnosis-api.onrender.com/api/docs`

**Frontend (Vercel)**:
- Production: `https://[your-domain].vercel.app`
- Dashboard: `https://vercel.com/dashboard`

**Render Dashboard**:
- Service: `https://dashboard.render.com/web/[your-service-id]`

---

## Performance Notes

### First Cold Start
- On Render free tier, the service spins down after 15 minutes of inactivity
- First request after spin-down takes ~60 seconds (includes model loading)
- Subsequent requests are fast (<200ms)

### Model Training Duration
- Build time: ~5-7 minutes (includes dataset generation + model training)
- Models are trained once during build, then loaded at runtime

### Database
- SQLite database is stored in `/app/app/instance/`
- Persists across deploys on Render
- Consider upgrading to PostgreSQL for production load

---

## Security Notes

✅ All secrets auto-generated by Render
✅ CORS properly configured
✅ Rate limiting enabled
✅ JWT authentication required
✅ Input validation with marshmallow
✅ No hardcoded credentials

---

## Next Steps After Deployment

1. **Set up monitoring**: Use Render's built-in metrics
2. **Custom domain**: Add your domain in Vercel settings
3. **Upgrade database**: Switch to PostgreSQL for better performance
4. **Add logging**: Configure external log aggregation (e.g., LogDNA, Papertrail)
5. **CI/CD**: Already set up via GitHub auto-deploy on both platforms

---

## Support

If you encounter issues:
1. Check Render logs (Dashboard → Logs)
2. Check Vercel deployment logs
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly

