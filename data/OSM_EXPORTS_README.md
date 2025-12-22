# OSM Trail Exports

This directory is for storing GeoJSON files exported from QGIS/OpenStreetMap.

## Expected Files

Place your OSM trail exports here with these naming conventions:

```
kentucky_osm_trails.geojson
tennessee_osm_trails.geojson
north_carolina_osm_trails.geojson
colorado_osm_trails.geojson
```

## File Format

Each file should be a GeoJSON FeatureCollection with LineString geometries representing hiking trails.

### Required Fields
- `name` or `ref` - Trail name
- `osm_id` - OpenStreetMap ID
- `highway` - Path type (path, footway, track)

### Recommended Fields
- `sac_scale` - Hiking difficulty rating
- `length_miles` - Trail length in miles (calculated in QGIS)
- `difficulty` - Mapped difficulty (easy, moderate, hard)

## How to Generate These Files

See the complete guide: `docs/OSM_IMPORT_GUIDE.md`

Quick steps:
1. Open QGIS
2. Use QuickOSM plugin to query trails
3. Export as GeoJSON (EPSG:4326)
4. Save files here
5. Run import script

## Import Command

Once you have your GeoJSON files here:

```bash
# Preview import (recommended first)
python scripts/import_osm_trails.py data/kentucky_osm_trails.geojson --state "Kentucky"

# Merge with existing trails
python scripts/import_osm_trails.py data/kentucky_osm_trails.geojson --state "Kentucky" --merge

# Or use the batch script (Windows)
scripts\import_osm_trails.bat data\kentucky_osm_trails.geojson "Kentucky" --merge
```

## Files Generated After Import

- `osm_trails_import.geojson` - Preview of converted trails (before merge)
- `trails_backup_YYYYMMDD_HHMMSS.geojson` - Automatic backup before merge
- `trails.geojson` - Updated with new trails (if using --merge)

## Notes

- The import script automatically filters out very short trails (< 0.1 miles)
- Duplicate trail names are automatically skipped
- Trails are imported with `status: "unhiked"`
- State name is added to trail names for identification

