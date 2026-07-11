# Vercel Deployment Guide

## Quick Setup for Your Vercel Frontend

Your Vercel app is already deployed at: **https://medical-diagnosis-ml.vercel.app**

### Environment Variables Configuration

To fix the CAPTCHA issue on Vercel, you need to set the API URL:

1. Go to: **https://vercel.com/dashboard**
2. Select your project: **medical-diagnosis-ml**
3. Click **Settings** → **Environment Variables**
4. Add this variable:

```
VITE_API_URL = https://medical-diagnosis-api-9toj.onrender.com/api
```

5. Click **Save**
6. Go to **Deployments** tab
7. Click the latest deployment → **Redeploy**
8. Wait for build to complete (~3-5 minutes)

### Verify It Works

After redeployment:
1. Visit: https://medical-diagnosis-ml.vercel.app
2. Go to Login or Register page
3. CAPTCHA should now show a math question (not "...")
4. If still not working:
   - Hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
   - Check browser DevTools → Network tab
   - Look for `/api/captcha` request
   - Should return `{ "question": "...", "captcha_token": "..." }`

---

## Automatic Deployments

Vercel is already configured to auto-deploy when you push to GitHub:
- Edit code locally
- Push to main branch: `git push origin main`
- Vercel automatically detects changes
- Build starts within 1 minute
- Deployment complete in 3-5 minutes

---

## Backend CORS Configuration

The backend (Render) now includes your Vercel URL in CORS:

✅ **Updated in render.yaml:**
```yaml
CORS_ORIGINS: "http://localhost:5173,http://localhost:3000,https://medical-diagnosis-ml-1.onrender.com,https://medical-diagnosis-ml.vercel.app"
```

To activate this:
1. Commit and push changes: `git push origin main`
2. Go to Render dashboard
3. Select backend service "medical-diagnosis-api"
4. Click "Manual Deploy"
5. Wait for redeploy to complete
6. Check health endpoint: https://medical-diagnosis-api-9toj.onrender.com/api/health

---

## Files for Vercel

Located in `frontend/`:

### `.env.production`
Used during Vercel build:
```
VITE_API_URL=https://medical-diagnosis-api-9toj.onrender.com/api
```

### `vercel.json`
Vercel configuration:
- Build command: `npm run build`
- Output directory: `dist`
- SPA routing (rewrites to index.html)
- Environment variable reference

---

## Troubleshooting Vercel Issues

### Build Fails on Vercel
1. Check **Deployments** → latest → **Build Logs**
2. Look for error messages
3. Common fixes:
   - Clear npm cache: `rm -r node_modules package-lock.json`
   - Reinstall: `npm install`
   - Test locally: `npm run build`
   - Push again

### Environment Variables Not Applied
1. Verify they're set in Vercel Settings
2. Click "Redeploy" to rebuild with new env vars
3. Cannot use env vars during build without redeployment

### CAPTCHA Still Not Working
1. **Check 1**: Open DevTools (F12) → Network tab
   - Reload page
   - Look for `/api/captcha` request
   - Check status (should be 200, not 403)
   - Check Response body

2. **Check 2**: Verify environment variable
   - Vercel Settings → Environment Variables
   - Confirm `VITE_API_URL` is set correctly

3. **Check 3**: Clear browser cache
   - `Ctrl+Shift+Del` → select "Cached images and files"
   - Hard refresh: `Ctrl+Shift+R`

### 404 or Page Not Found
- Check that output directory is `dist`
- Verify `vercel.json` has correct rewrites
- Test locally: `npm run build && npm run preview`

---

## Domain Configuration

To use a custom domain on Vercel:
1. Go to **Settings** → **Domains**
2. Add your domain
3. Follow DNS setup instructions
4. Update backend CORS_ORIGINS if using custom domain

---

## Performance Tips

1. **Vercel Analytics**: Enabled by default
   - Check performance metrics in dashboard
   - Look for slow endpoints

2. **Image Optimization**: Vercel automatically optimizes
   - No changes needed

3. **Edge Caching**: Automatic for static files
   - Frontend assets cached at edge locations worldwide

---

## Next Steps

1. ✅ Set `VITE_API_URL` environment variable in Vercel
2. ✅ Redeploy Vercel project
3. ✅ Redeploy Render backend
4. ✅ Test CAPTCHA on your Vercel URL
5. ✅ Share the app: https://medical-diagnosis-ml.vercel.app

---

## Questions?

Refer to:
- `DEPLOYMENT_RENDER.md` - Full deployment guide
- `REDEPLOYMENT_CHECKLIST.md` - Step-by-step checklist
- `FIXES_APPLIED.md` - What was fixed
