# Deployment and Backup Guide

## Overview

This guide covers deploying your Trail Blogger application to GitHub Pages and managing backups.

## Deployment Workflow

### Prerequisites
- Python 3.7 or higher
- Git installed and configured
- GitHub repository set up with Pages enabled

### Deployment Process

#### Step 1: Make Changes Locally

```bash
# Start your Flask server
python server.py

# Navigate to http://localhost:5000
# Make all your edits:
# - Add/edit/delete trails
# - Upload images
# - Edit descriptions
# - Change status (hiked/unhiked)
```

#### Step 2: Deploy to GitHub Pages

```bash
# Run the deployment script
python scripts/deploy.py
```

The deployment script automatically:
- Validates trail data for errors
- Verifies all image files exist
- Shows what changed (git diff)
- Creates automatic backup
- Commits changes with descriptive message
- Pushes to GitHub

#### Step 3: Verify Deployment

```bash
# Optional: verify the deployment was successful
python scripts/verify_deployment.py
```

Wait 1-2 minutes for GitHub Pages to update, then visit:
`https://yourusername.github.io/trailBlogger/`

### Two-Environment System

**Localhost:5000 (Editing Environment)**
- Add, edit, and delete trails
- Upload and manage images
- Change trail status (hiked/unhiked)
- Create backups
- All changes saved to local files

**GitHub Pages (Public Site)**
- Read-only static site
- Fast, reliable hosting
- Share with anyone
- No server needed
- Updates via git push

### What Gets Deployed

When you deploy, these files sync to GitHub Pages:
- `data/trails.geojson` - All trail data
- `data/trail_images/` - All trail photos
- `index.html`, `app.js`, `styles.css` - Application code
- `config.js` - Configuration

## Backup System

### Creating Backups

#### Complete Backup (Recommended)

```bash
python scripts/complete_backup.py
```

Creates a timestamped backup in `backups/` containing:
- `trails_backup.geojson` - All trail data with metadata
- `trail_images.zip` - All images compressed
- `README.md` - Restore instructions

**Backup includes:**
- Total trail count
- Hiked vs unhiked counts
- Total images count
- Total mileage
- Creation timestamp

#### Quick Data Backup

Use the "Data" button in the web interface:
- Option 2: Export complete dataset as JSON

### Restoring Backups

#### From Complete Backup

```bash
python scripts/complete_restore.py
```

The restore script:
1. Lists all available backups with metadata
2. Shows backup details before restoring
3. Creates safety backup of current data
4. Restores trail data
5. Restores images (optional)

#### From Web Interface Export

1. Click "Data" button
2. Choose "Import Trail Data"
3. Select your exported JSON file
4. Choose "Replace all existing trails"

### Backup Best Practices

**Before Major Changes:**
- Create a backup before bulk edits
- Create a backup before deleting trails
- Create a backup before importing data

**Regular Schedule:**
- Weekly backups if actively editing
- Before each deployment
- After adding multiple trails

**Storage:**
- Keep backups in the `backups/` folder (gitignored)
- Consider copying important backups to external storage
- Name backups descriptively for easy identification

## Troubleshooting

### Deployment Issues

**Changes not showing on GitHub Pages:**
- Wait 2-3 minutes for GitHub to rebuild
- Clear browser cache (Ctrl+Shift+R)
- Check GitHub Actions tab for build status

**Deploy script fails:**
- Ensure all trails have required fields
- Check that image files exist
- Verify git is configured correctly
- Check internet connection

### Backup/Restore Issues

**Backup fails:**
- Check disk space
- Ensure `backups/` folder exists
- Verify write permissions

**Restore doesn't work:**
- Check backup file integrity
- Ensure backup format matches current version
- Try restoring data and images separately

**Images not restoring:**
- Check `trail_images.zip` exists in backup
- Verify zip file is not corrupted
- Ensure sufficient disk space

## Advanced Topics

### Manual Deployment

If you prefer manual control:

```bash
# Check what changed
git status
git diff data/trails.geojson

# Stage changes
git add data/trails.geojson data/trail_images/

# Commit with descriptive message
git commit -m "Updated trails: added descriptions and images"

# Push to GitHub
git push origin main
```

### Selective Backup

To backup only specific trails or data:

```python
# Edit scripts/complete_backup.py
# Modify the backup logic as needed
```

### Backup to External Location

```bash
# Copy backup to external drive
cp -r backups/backup_YYYYMMDD_HHMMSS /path/to/external/drive/
```

## Configuration

### GitHub Pages Settings

In your GitHub repository:
1. Go to Settings > Pages
2. Source: Deploy from branch
3. Branch: main
4. Folder: / (root)

### Local Server Port

Default: `http://localhost:5000`

To change the port, edit `server.py`:
```python
if __name__ == '__main__':
    app.run(debug=True, port=5000)  # Change port here
```

## Summary

**Quick Workflow:**
1. Edit locally on `localhost:5000`
2. Run `python scripts/deploy.py`
3. Wait 2 minutes
4. View changes on GitHub Pages

**Regular Backups:**
1. Run `python scripts/complete_backup.py` weekly
2. Keep backups before major changes
3. Test restores occasionally

**For Help:**
- Check `docs/SETUP.md` for installation issues
- Check `docs/GUIDES.md` for feature usage
- Check `docs/DEVELOPMENT.md` for technical details

