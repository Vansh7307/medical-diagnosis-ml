# 🚀 QUICK START - Fix CAPTCHA on Vercel & Render

## ⚡ In 5 Minutes:

### 1. Set Vercel Environment Variable (2 min)
```
1. https://vercel.com/dashboard
2. Click "medical-diagnosis-ml"
3. Settings → Environment Variables
4. Add: VITE_API_URL = https://medical-diagnosis-api-9toj.onrender.com/api
5. Save & close
```

### 2. Redeploy Vercel (2 min)
```
1. https://vercel.com/dashboard
2. Click "medical-diagnosis-ml"
3. Deployments tab
4. Click latest → Redeploy
5. Wait ~3 minutes
```

### 3. Test It
```
Visit: https://medical-diagnosis-ml.vercel.app
Should show: Math CAPTCHA (like "5 + 3 = ?")
NOT: "..."
```

---

## 📋 Full Process:

### A. Commit Changes
```bash
git add .
git commit -m "Fix CAPTCHA for Vercel and Render"
git push origin main
```

### B. Redeploy Backend (Render)
```
1. https://dashboard.render.com
2. Select "medical-diagnosis-api"
3. Click three dots → Manual Deploy
4. Wait ~5 minutes
```

### C. Redeploy Frontend (Vercel)
```
1. https://vercel.com/dashboard
2. Select "medical-diagnosis-ml"
3. Deployments → Latest → Redeploy
4. Wait ~3 minutes
```

### D. Test Both
```
Vercel: https://medical-diagnosis-ml.vercel.app
Render: https://medical-diagnosis-ml-1.onrender.com
```

---

## ✅ What Was Done For You

| Item | Status |
|------|--------|
| CORS updated in backend | ✅ |
| .env.production created | ✅ |
| Vercel config updated | ✅ |
| Unnecessary files deleted | ✅ |
| Documentation created | ✅ |

---

## ⚠️ Most Common Issue

**CAPTCHA shows "..." on Vercel?**

→ **Did you set the Vercel environment variable?**
→ https://vercel.com/dashboard → Settings → Environment Variables
→ Add: `VITE_API_URL = https://medical-diagnosis-api-9toj.onrender.com/api`

---

## 📚 Detailed Guides

- `FIXES_APPLIED.md` - What was fixed
- `VERCEL_SETUP.md` - Vercel-specific setup
- `DEPLOYMENT_RENDER.md` - Full deployment docs
- `REDEPLOYMENT_CHECKLIST.md` - Step-by-step checklist

---

## 🎯 Your URLs

| Service | URL |
|---------|-----|
| Frontend (Vercel) | https://medical-diagnosis-ml.vercel.app |
| Frontend (Render) | https://medical-diagnosis-ml-1.onrender.com |
| Backend API | https://medical-diagnosis-api-9toj.onrender.com/api |
| Health Check | https://medical-diagnosis-api-9toj.onrender.com/api/health |

---

That's it! 🎉
