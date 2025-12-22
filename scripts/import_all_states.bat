@echo off
REM Import all state OSM trails at once

echo ================================================
echo Importing OSM Trails for Multiple States
echo ================================================
echo.

echo This will import trails from:
echo   - Kentucky
echo   - Tennessee  
echo   - North Carolina
echo   - Colorado
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo ================================================
echo Importing Kentucky trails...
echo ================================================
if exist data\kentucky_osm_trails.geojson (
    python scripts\import_osm_trails.py data\kentucky_osm_trails.geojson --state "Kentucky" --merge
    echo.
) else (
    echo Warning: data\kentucky_osm_trails.geojson not found, skipping...
    echo.
)

echo ================================================
echo Importing Tennessee trails...
echo ================================================
if exist data\tennessee_osm_trails.geojson (
    python scripts\import_osm_trails.py data\tennessee_osm_trails.geojson --state "Tennessee" --merge
    echo.
) else (
    echo Warning: data\tennessee_osm_trails.geojson not found, skipping...
    echo.
)

echo ================================================
echo Importing North Carolina trails...
echo ================================================
if exist data\north_carolina_osm_trails.geojson (
    python scripts\import_osm_trails.py data\north_carolina_osm_trails.geojson --state "North Carolina" --merge
    echo.
) else (
    echo Warning: data\north_carolina_osm_trails.geojson not found, skipping...
    echo.
)

echo ================================================
echo Importing Colorado trails...
echo ================================================
if exist data\colorado_osm_trails.geojson (
    python scripts\import_osm_trails.py data\colorado_osm_trails.geojson --state "Colorado" --merge
    echo.
) else (
    echo Warning: data\colorado_osm_trails.geojson not found, skipping...
    echo.
)

echo.
echo ================================================
echo All imports complete!
echo ================================================
echo.
echo Next steps:
echo 1. Open http://localhost:5000 in your browser
echo 2. Refresh the page (Ctrl+F5)
echo 3. Click "Show Unhiked" to see new trails
echo.
pause

