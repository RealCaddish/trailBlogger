@echo off
echo ========================================
echo   Privacy Verification Check
echo ========================================
echo.
echo Checking what files Git will upload...
echo.

echo [1/3] Checking for tracked image files...
git ls-files | findstr /I ".jpg .jpeg .png .gif" | findstr /V "logo"
if %errorlevel% == 0 (
    echo WARNING: Found tracked image files above!
) else (
    echo OK: No personal images tracked by Git
)
echo.

echo [2/3] Checking for tracked trail data...
git ls-files | findstr "trail_images\trail-"
if %errorlevel% == 0 (
    echo WARNING: Found tracked trail image folders!
) else (
    echo OK: No trail image folders tracked by Git
)
echo.

echo [3/3] Checking for backup files...
git ls-files | findstr /I "backup"
if %errorlevel% == 0 (
    echo NOTE: Found backup-related files (check if intentional)
) else (
    echo OK: No backup files tracked by Git
)
echo.

echo ========================================
echo   Privacy Check Complete!
echo ========================================
echo.
echo Your personal data should NOT appear above.
echo Only application code and public data files are safe.
echo.
pause


