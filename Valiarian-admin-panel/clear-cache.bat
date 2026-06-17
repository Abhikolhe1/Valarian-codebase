@echo off
echo Clearing all caches...

echo.
echo 1. Removing node_modules/.cache
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo    - Removed node_modules/.cache
) else (
    echo    - node_modules/.cache not found
)

echo.
echo 2. Removing build folder
if exist build (
    rmdir /s /q build
    echo    - Removed build folder
) else (
    echo    - build folder not found
)

echo.
echo 3. Removing .eslintcache
if exist .eslintcache (
    del /f .eslintcache
    echo    - Removed .eslintcache
) else (
    echo    - .eslintcache not found
)

echo.
echo Cache cleared successfully!
echo.
echo Next steps:
echo 1. Close your browser completely
echo 2. Run: npm start
echo 3. Open browser in incognito mode
echo 4. Navigate to the product details page
echo.
pause
