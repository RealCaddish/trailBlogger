# Trail Blogger - Complete Deployment Workflow

## 🎯 Goal
Ensure all changes made on `localhost:5000` (Flask server) are properly deployed to GitHub Pages at `https://realcaddish.github.io/trailBlogger/`

---

## 📋 What Needs to Sync

When you edit trails locally, these files change:
1. **`data/trails.geojson`** - All trail data (names, lengths, coordinates, descriptions, dates, status)
2. **`data/trail_images/`** - All trail photos organized in folders
3. **Trail edits include:**
   - Adding new trails
   - Editing trail names, descriptions, dates
   - Adding/removing images
   - Changing status (hiked ↔ unhiked)
   - Deleting trails
   - Moving trails between parks/states

---

## ✅ The Deployment Workflow

### Step 1: Make Changes Locally (Flask Server)

```bash
# Start your Flask server
python server.py

# Go to http://localhost:5000
# Make all your edits:
# - Add trails
# - Upload images
# - Edit descriptions
# - Change status (hiked/unhiked)
# - Delete trails
# - etc.
```

**Important:** All changes are automatically saved to:
- `data/trails.geojson` (trail data)
- `data/trail_images/` (images)

### Step 2: Test Your Changes Locally

Before deploying, verify:
- ✅ All trails show correctly in the sidebar
- ✅ Images load properly
- ✅ Descriptions display
- ✅ GPS paths show on map
- ✅ Statistics are accurate

### Step 3: Create a Backup (Optional but Recommended)

Use the built-in backup feature:
1. Click **"Data"** button in header
2. Click **"Backup Data"** or **"Export Data"**
3. Save the backup file (includes all trails + metadata)
4. Keep this as a safety net

### Step 4: Check What Changed

```bash
# See what files were modified
git status

# Should show:
#   modified: data/trails.geojson
#   new files in: data/trail_images/
```

### Step 5: Deploy to GitHub Pages

```bash
# Add all changes
git add data/trails.geojson
git add data/trail_images/

# Commit with descriptive message
git commit -m "Update trails: added 2 new hikes, edited descriptions for MST trail"

# Push to GitHub
git push origin main
```

### Step 6: Verify Deployment

1. Wait **1-2 minutes** for GitHub Pages to rebuild
2. Visit: https://realcaddish.github.io/trailBlogger/
3. **Hard refresh** to clear cache:
   - Windows: `Ctrl + F5`
   - Mac: `Cmd + Shift + R`
4. Verify your changes appear

---

## 🔍 Verification Checklist

After deploying, check:

- [ ] **Trail List:** All trails appear in sidebar with correct names
- [ ] **Images:** Photos load (not 404 errors)
- [ ] **GPS Lines:** Trail paths show on map
- [ ] **Descriptions:** Blog posts display when clicking trails
- [ ] **Statistics:** Counts and mileage are correct
- [ ] **Status:** Hiked/Unhiked status reflects your changes
- [ ] **Dates:** Dates hiked show correctly

---

## 🚀 Quick Deploy Script

I'll create a script to automate this for you:

```bash
# Run this after making changes on localhost:5000
python deploy.py
```

This will:
1. Verify trail data is valid
2. Check image files exist
3. Show you what changed
4. Commit and push to GitHub Pages
5. Give you the deployment URL

---

## 🛡️ Backup Strategy

### Automatic Backups
Every time you deploy, the script will:
1. Create timestamped backup: `data/backups/trails_backup_YYYYMMDD_HHMMSS.geojson`
2. Keep last 10 backups automatically

### Manual Backup (Through Web Interface)
1. Go to http://localhost:5000
2. Click **"Data"** button
3. Click **"Backup Data"**
4. Save the JSON file to your Downloads folder

### Restore from Backup
1. Go to http://localhost:5000
2. Click **"Data"** button
3. Click **"Restore Data"**
4. Select your backup file
5. Confirm restoration

---

## 🎨 Image Management

### How Images Work

**Locally (Flask):**
- Images stored in: `data/trail_images/trail-{TRAIL_ID}/`
- Flask serves via: `/api/trails/{TRAIL_ID}/images/{filename}`

**GitHub Pages:**
- Same folder structure: `data/trail_images/trail-{TRAIL_ID}/`
- Served as static files: `data/trail_images/trail-{TRAIL_ID}/{filename}`

**Trail Data Format:**
```json
{
  "images": [
    "image1.jpg",
    "image2.jpg"
  ]
}
```

The app automatically constructs full paths:
- Local: `/api/trails/{TRAIL_ID}/images/image1.jpg`
- GitHub Pages: `data/trail_images/trail-{TRAIL_ID}/image1.jpg`

---

## ⚠️ Common Issues & Fixes

### Issue 1: Images Don't Show After Deploy

**Cause:** Image files not committed to git

**Fix:**
```bash
# Make sure to add image folders
git add data/trail_images/
git commit -m "Add trail images"
git push origin main
```

### Issue 2: Trail Changes Don't Appear

**Cause:** Browser cache

**Fix:**
- Hard refresh: `Ctrl + F5` or `Cmd + Shift + R`
- Or open in incognito window

### Issue 3: Old Data Shows on GitHub Pages

**Cause:** Changes not saved by Flask server

**Fix:**
1. Check `data/trails.geojson` was actually updated (look at timestamp)
2. If not, re-make changes in Flask interface
3. Verify file changes with `git diff data/trails.geojson`

### Issue 4: Trail Coordinates Missing

**Cause:** Trail was added without GPS data

**Fix:**
1. Edit trail in Flask interface
2. Import GPX file or add coordinates manually
3. Save and re-deploy

---

## 📊 Data Integrity Checks

Before deploying, verify:

```bash
# Check trails.geojson is valid JSON
python -c "import json; json.load(open('data/trails.geojson'))"

# Count trails
python -c "import json; data = json.load(open('data/trails.geojson')); print(f'Total: {len(data[\"features\"])} trails')"

# Check for empty names
python -c "import json; data = json.load(open('data/trails.geojson')); empty = [t['properties']['trail_id'] for t in data['features'] if not t['properties'].get('name')]; print(f'Empty names: {len(empty)}')"
```

---

## 🔄 Complete Workflow Example

### Scenario: Adding a New Trail

**On localhost:5000:**
1. Click **"Add Trail"**
2. Enter trail name: "Sunset Ridge Trail"
3. Set length: 4.2 miles
4. Set difficulty: Moderate
5. Set status: Hiked
6. Set date: 2024-10-25
7. Add description: "Beautiful fall colors..."
8. Upload 5 photos
9. Import GPX file (or skip if no GPS data)
10. Click **"Save Trail"**

**Verify Locally:**
- Trail appears in sidebar ✓
- Photos display ✓
- GPS line shows on map ✓

**Deploy:**
```bash
git status
# Shows: modified: data/trails.geojson
#        new files in: data/trail_images/trail-1735678901234/

git add data/trails.geojson data/trail_images/
git commit -m "Add Sunset Ridge Trail with 5 photos and GPS track"
git push origin main
```

**Verify Live:**
- Wait 2 minutes
- Visit site and hard refresh
- See new trail ✓

---

## 🎯 Best Practices

1. **Always test locally first** before deploying
2. **Create backups** before major changes
3. **Use descriptive commit messages** so you know what changed
4. **Deploy frequently** rather than batching many changes
5. **Keep trail IDs consistent** (don't manually edit them)
6. **Verify on GitHub Pages** after each deployment
7. **Keep a backup** of your full data folder somewhere safe

---

## 📝 Git Workflow Cheat Sheet

```bash
# See what changed
git status

# See detailed changes to trails.geojson
git diff data/trails.geojson

# Add specific trail images
git add data/trail_images/trail-1234567890/

# Undo changes (DANGEROUS - you'll lose your edits!)
git restore data/trails.geojson

# See commit history
git log --oneline -10

# Create a branch for testing
git checkout -b testing-new-trails
git checkout main  # switch back
```

---

## 🆘 Recovery Procedures

### If You Accidentally Break Something

1. **Check recent backups:**
   ```bash
   ls -lht data/trails_backup_*.geojson | head -5
   ```

2. **Restore from backup:**
   - Copy backup file over current: `cp data/trails_backup_YYYYMMDD.geojson data/trails.geojson`
   - Or use web interface: Data → Restore

3. **Revert git changes:**
   ```bash
   git log --oneline  # find the commit before you broke it
   git checkout <commit-hash> data/trails.geojson
   git commit -m "Revert to working version"
   git push origin main
   ```

---

## 🔗 Quick Reference Links

- **Local Site:** http://localhost:5000
- **Live Site:** https://realcaddish.github.io/trailBlogger/
- **GitHub Repo:** https://github.com/RealCaddish/trailBlogger
- **GitHub Actions:** https://github.com/RealCaddish/trailBlogger/actions (deployment status)

---

## ✨ Pro Tips

1. **Keep Flask running** while making multiple edits - it auto-saves
2. **Use the "Data" backup button** regularly - it's your safety net
3. **Check the console** (F12) if something doesn't work - errors help debug
4. **Trail IDs are timestamps** - don't change them manually
5. **Image filenames include random hash** - this prevents collisions
6. **GPS coordinates need elevation** - format: [longitude, latitude, elevation]

---

**You're all set!** This workflow ensures localhost:5000 changes always make it to GitHub Pages correctly. 🎉

