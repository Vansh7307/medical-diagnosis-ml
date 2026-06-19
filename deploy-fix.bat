@echo off
echo ========================================
echo DEPLOYING FIX TO RENDER
echo ========================================
echo.

echo This will:
echo 1. Commit the dataset directory fix
echo 2. Push to GitHub
echo 3. Render will auto-redeploy
echo.

pause

echo.
echo [1/3] Adding changes...
git add -A

echo.
echo [2/3] Committing...
git commit -m "Fix: Create datasets directory automatically + better build script"

echo.
echo [3/3] Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo PUSHED TO GITHUB ✓
echo ========================================
echo.
echo Render will now auto-deploy in 1-2 minutes.
echo.
echo Monitor your deployment at:
echo https://dashboard.render.com
echo.
echo Watch the build logs to see:
echo - Dataset generation
echo - Model training (3 models)
echo - Build success message
echo.
echo Build should take 5-8 minutes.
echo.
pause
