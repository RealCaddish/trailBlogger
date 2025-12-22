@echo off
REM Import OSM Trails - Windows Batch Script
REM Usage: import_osm_trails.bat [state_file.geojson] [StateName]

echo ================================================
echo OSM Trail Importer for Trail Blogger
echo ================================================
echo.

if "%1"=="" (
    echo Usage: import_osm_trails.bat [geojson_file] [StateName]
    echo.
    echo Examples:
    echo   import_osm_trails.bat data\kentucky_osm_trails.geojson "Kentucky"
    echo   import_osm_trails.bat data\colorado_osm_trails.geojson "Colorado"
    echo.
    echo To merge with existing trails, add --merge:
    echo   import_osm_trails.bat data\kentucky_osm_trails.geojson "Kentucky" --merge
    echo.
    pause
    exit /b 1
)

if "%2"=="" (
    echo Error: State name required!
    echo Example: import_osm_trails.bat data\kentucky_osm_trails.geojson "Kentucky"
    pause
    exit /b 1
)

REM Check if file exists
if not exist "%1" (
    echo Error: File not found: %1
    pause
    exit /b 1
)

REM Build command
if "%3"=="--merge" (
    echo Running import with merge into existing trails.geojson...
    echo.
    python scripts\import_osm_trails.py "%1" --state "%2" --merge
) else (
    echo Running preview import (no merge)...
    echo To merge with existing trails, run again with --merge flag
    echo.
    python scripts\import_osm_trails.py "%1" --state "%2"
)

echo.
echo ================================================
echo Import complete!
echo ================================================
pause

