# Trail Blogger Backup
Created: 2025-10-31 16:23:30

## Contents
- `trails_backup.geojson`: All trail data (coordinates, descriptions, metadata)
- `trail_images.zip`: All trail images

## Statistics
- Total Trails: 8
- Hiked Trails: 8
- Total Miles: 44.95
- Total Images: 18

## Restore Instructions

### For Local Development (localhost:5000)
1. Stop the Flask server if running
2. Replace `data/trails.geojson` with `trails_backup.geojson`
3. Extract `trail_images.zip` to `data/` (this will create `data/trail_images/`)
4. Restart Flask server: `python server.py`

### For GitHub Pages
1. Replace `data/trails.geojson` with `trails_backup.geojson`
2. Extract `trail_images.zip` to `data/` (preserves folder structure)
3. Commit and push:
   ```bash
   git add data/trails.geojson data/trail_images/
   git commit -m "Restore from backup"
   git push origin main
   ```
4. Wait 2 minutes for GitHub Pages to rebuild

## Image Path Format
Images are referenced by filename only in trails.geojson:
- In GeoJSON: `"images": ["image1.jpg", "image2.jpg"]`
- Directory structure: `data/trail_images/trail-<id>/<filename>`
- Frontend constructs full path automatically

## Notes
- This backup includes ALL data from localhost:5000
- Image paths are relative and will work on both local and GitHub Pages
- The GeoJSON includes GPS coordinates, descriptions, dates, and all metadata
