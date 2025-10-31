# Complete Backup & Restore Guide

This guide explains how to backup and restore your Trail Blogger data, ensuring everything (trails, images, descriptions, dates, GPS coordinates) is properly saved and can be redeployed to GitHub Pages.

## Quick Reference

### Create Backup
```bash
python complete_backup.py
```
Creates a timestamped backup in `backups/backup_YYYYMMDD_HHMMSS/` containing:
- `trails_backup.geojson` - All trail data with metadata
- `trail_images.zip` - All images (14+ MB)
- `README.md` - Restore instructions

### Restore from Backup
```bash
python complete_restore.py
```
Interactive script that lists available backups and restores the selected one.

### Deploy to GitHub Pages
```bash
python deploy.py
```
Deploys current `data/trails.geojson` and `data/trail_images/` to GitHub Pages.

---

## Understanding the System

### Data Flow

```
LOCAL DEVELOPMENT (localhost:5000)
    ↓
BACKUP (Python scripts)
    ↓
data/trails.geojson + data/trail_images/
    ↓
GIT COMMIT & PUSH
    ↓
GITHUB PAGES (Live Site)
```

### File Structure

```
trailBlogger/
├── data/
│   ├── trails.geojson          # All trail data (GPS, descriptions, metadata)
│   └── trail_images/           # Images organized by trail
│       ├── trail-1761587899908/
│       │   ├── image1.jpg
│       │   └── image2.jpg
│       └── trail-1761919613592/
│           └── image1.jpg
│
├── backups/                     # Created by complete_backup.py
│   └── backup_YYYYMMDD_HHMMSS/
│       ├── trails_backup.geojson
│       ├── trail_images.zip
│       └── README.md
│
├── complete_backup.py           # Create complete backup
├── complete_restore.py          # Restore from backup
└── deploy.py                    # Deploy to GitHub Pages
```

---

## Detailed Workflows

### Workflow 1: Make Changes and Deploy

**Scenario:** You've added/edited trails on localhost:5000 and want to push to GitHub Pages.

1. **Make your changes** on localhost:5000:
   - Add new trails with images
   - Edit existing trails (status, dates, descriptions)
   - Upload new images
   - Delete unwanted trails

2. **Create a backup** (recommended before deploying):
   ```bash
   python complete_backup.py
   ```
   This creates a safety backup in case you need to roll back.

3. **Deploy to GitHub Pages**:
   ```bash
   python deploy.py
   ```
   This will:
   - Validate `data/trails.geojson`
   - Create automatic backup
   - Commit changes to git
   - Push to main branch
   - GitHub Pages rebuilds (takes ~2 minutes)

4. **Verify deployment**:
   - Wait 2 minutes for GitHub Pages to rebuild
   - Visit: https://realcaddish.github.io/trailBlogger/
   - Check that trails, images, and descriptions are correct

---

### Workflow 2: Restore from Backup

**Scenario:** You need to restore from a previous backup (e.g., after accidental data loss).

1. **List available backups**:
   ```bash
   python complete_restore.py
   ```
   This shows all backups in `backups/` directory with metadata.

2. **Select and restore**:
   - Script will prompt you to confirm
   - Creates safety backup of current data first
   - Restores `data/trails.geojson`
   - Extracts `data/trail_images/` from ZIP

3. **Verify restoration**:
   - Start Flask server: `python server.py`
   - Visit localhost:5000
   - Check that trails and images are correct

4. **Deploy to GitHub Pages** (if desired):
   ```bash
   python deploy.py
   ```

---

### Workflow 3: Manual Backup for Safekeeping

**Scenario:** You want to create a backup before making risky changes.

1. **Create backup**:
   ```bash
   python complete_backup.py
   ```

2. **Copy backup somewhere safe**:
   - Backups are in `backups/backup_YYYYMMDD_HHMMSS/`
   - Copy this entire folder to:
     - External hard drive
     - Cloud storage (Google Drive, Dropbox, etc.)
     - Another location on your computer

3. **Backup contains**:
   - `trails_backup.geojson` (< 1 MB) - All trail metadata
   - `trail_images.zip` (~14 MB) - All images
   - `README.md` - Instructions for restore

---

## Image Path Format (Important!)

### How Images are Stored

In `data/trails.geojson`, images are referenced by **filename only**:

```json
{
  "properties": {
    "name": "Trail Name",
    "trail_id": "1761587899908",
    "images": ["image1.jpg", "image2.jpg"]
  }
}
```

### How Images are Organized

Images are physically stored in trail-specific folders:
```
data/trail_images/trail-1761587899908/image1.jpg
data/trail_images/trail-1761587899908/image2.jpg
```

### How Frontend Constructs Paths

The frontend (`app.js`) automatically constructs the full path:

```javascript
// For localhost:5000
const imgUrl = `/data/trail_images/trail-${trail.id}/${imgFilename}`;

// For GitHub Pages
const imgUrl = `./data/trail_images/trail-${trail.id}/${imgFilename}`;
```

**This means:** Image paths work correctly on both localhost and GitHub Pages!

---

## Troubleshooting

### Problem: Images not showing after restore

**Check:**
1. Are images extracted to `data/trail_images/` (not `data/trail_images/trail_images/`)?
   ```bash
   ls data/trail_images/
   # Should show: trail-<id> folders
   ```

2. Do image filenames in `trails.geojson` match actual files?
   ```bash
   python test_backup_restore_workflow.py
   ```

### Problem: Trails missing after deploy

**Check:**
1. Did git commit succeed?
   ```bash
   git status
   ```

2. Did git push succeed?
   ```bash
   git log -1
   ```

3. Wait 2 minutes for GitHub Pages to rebuild
   - Check: https://github.com/<username>/trailBlogger/actions

### Problem: Backup file too large

**Solution:**
- Backups with images are ~14 MB (normal)
- Images are compressed during upload to Flask server
- If you need smaller backups, consider backing up only new changes

---

## Technical Details

### Backup Format (v2.0)

```json
{
  "timestamp": "2025-10-31T16:23:30.123456",
  "version": "2.0",
  "metadata": {
    "totalTrails": 8,
    "hikedTrails": 8,
    "totalMiles": 44.95,
    "totalImages": 18,
    "backupCreated": "2025-10-31T16:23:30.123456"
  },
  "geojson": {
    "type": "FeatureCollection",
    "features": [...]
  }
}
```

### Backup Format Benefits

1. **Metadata** - Know what's in backup before restoring
2. **Versioned** - Can detect and handle different backup formats
3. **Complete** - Includes all trail data (GPS, descriptions, dates, images references)
4. **Portable** - Works on both localhost and GitHub Pages

### Import/Export Compatibility

The system supports:
- ✅ New backup format (v2.0) with metadata
- ✅ Plain GeoJSON FeatureCollection
- ✅ Old backup format (v1.x)
- ✅ Merge mode (add to existing)
- ✅ Replace mode (clear and restore)

---

## Best Practices

1. **Backup before major changes**
   - Before deleting trails
   - Before bulk imports
   - Before experimental edits

2. **Keep backups organized**
   - Backups are timestamped automatically
   - Keep recent backups (last 3-5)
   - Store important backups externally

3. **Test locally before deploying**
   - Make changes on localhost:5000
   - Test thoroughly
   - Then deploy to GitHub Pages

4. **Verify after deployment**
   - Wait 2 minutes for GitHub Pages
   - Check live site
   - Verify trails, images, GPS lines

---

## Quick Command Reference

| Task | Command |
|------|---------|
| Create backup | `python complete_backup.py` |
| Restore backup | `python complete_restore.py` |
| Deploy to GitHub Pages | `python deploy.py` |
| Verify deployment | `python verify_deployment.py` |
| Test backup workflow | `python test_backup_restore_workflow.py` |
| Start Flask server | `python server.py` |
| Clean up trails | `python cleanup_trails.py` |

---

## Summary

The backup/restore system ensures:
- ✅ All trail data is preserved (GPS, names, lengths, descriptions, dates, status)
- ✅ All images are backed up and linked correctly
- ✅ Easy restore from any backup
- ✅ Seamless deployment to GitHub Pages
- ✅ Works identically on localhost and live site
- ✅ No manual image path fixing needed

**Questions?** Check the README.md in any backup folder for specific restore instructions.

