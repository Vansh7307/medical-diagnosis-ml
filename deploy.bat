@echo off
REM Deployment Script for Medical Diagnosis ML Platform
REM This script prepares and deploys both backend and frontend

echo ========================================
echo Medical Diagnosis ML - Deployment Script
echo ========================================
echo.

REM Step 1: Check if we're in the right directory
if not exist "backend\run.py" (
    echo ERROR: Please run this script from the project root directory
    echo Current directory: %CD%
    pause
    exit /b 1
)

echo [1/5] Checking Git status...
git status
echo.

REM Step 2: Add all changes
echo [2/5] Adding all changes to Git...
git add -A
echo.

REM Step 3: Commit changes
echo [3/5] Committing changes...
set /p COMMIT_MSG="Enter commit message (or press Enter for default): "
if "%COMMIT_MSG%"=="" set COMMIT_MSG=Production deployment - All fixes applied

git commit -m "%COMMIT_MSG%"
echo.

REM Step 4: Push to GitHub
echo [4/5] Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo.
    echo WARNING: Git push failed. Common reasons:
    echo   - No changes to commit
    echo   - Authentication required
    echo   - Branch doesn't exist
    echo.
    echo You can manually push with: git push origin main
    pause
)
echo.

REM Step 5: Display next steps
echo [5/5] Git push complete!
echo.
echo ========================================
echo NEXT STEPS FOR RENDER DEPLOYMENT
echo ========================================
echo.
echo 1. Go to https://render.com and sign in
echo 2. Click "New" and select "Web Service"
echo 3. Connect your GitHub repository
echo 4. Render will auto-detect render.yaml configuration
echo 5. Click "Create Web Service"
echo.
echo Your backend will be deployed to:
echo https://medical-diagnosis-api.onrender.com
echo.
echo ========================================
echo FRONTEND CONNECTION
echo ========================================
echo.
echo Your frontend is configured to connect to:
echo https://medical-diagnosis-api.onrender.com/api
echo.
echo After Render deployment completes:
echo 1. Get your actual Render URL
echo 2. Update CORS_ORIGINS in Render dashboard if needed
echo 3. Your frontend on Vercel will automatically connect
echo.
echo ========================================
echo IMPORTANT
echo ========================================
echo.
echo First deployment takes 5-10 minutes because:
echo - Dependencies installation
echo - Dataset generation
echo - ML model training for 3 models
echo.
echo Monitor the build logs in Render dashboard.
echo.
echo Full deployment guide: DEPLOYMENT.md
echo.
pause
