# 🌍 Sharing Your Trail Adventures

## Overview

Trail Blogger is set up to share your hiking experiences publicly. When you add trails and photos, they become part of your repository and can be viewed by anyone who visits your GitHub page or deployed site.

---

## 📸 How Image Sharing Works

### 1. **Adding Images**
When you upload photos through the app:
- Images are saved to `data/trail_images/trail-<id>/`
- They're stored as regular files in your repository
- They're NOT git-ignored (they WILL be uploaded)

### 2. **Committing Changes**
After adding trails and photos:
```bash
git add data/trail_images/
git commit -m "Add photos from [Trail Name] hike"
git push origin main
```

### 3. **Others Can View**
Once pushed:
- Your photos are publicly visible on GitHub
- Anyone can see them in the repository
- Visitors to your deployed site see your trails and images

---

## 🗺️ Sharing Trail Data

### What Gets Shared:
- ✅ Trail routes (GeoJSON coordinates)
- ✅ Trail names and descriptions
- ✅ Hiking photos
- ✅ Journal entries and blog posts
- ✅ Hiking dates and statistics
- ✅ Difficulty ratings and trail info

### What Stays Private:
- ❌ Backup files (`.backup`, `*_backup_*.json`)
- ❌ Temporary files in `uploads/temp/`
- ❌ Browser localStorage (until you export it)

---

## 🚀 Publishing Your Trails

### Method 1: GitHub Repository
Your trails are visible directly on GitHub at:
```
https://github.com/yourusername/trail-blogger/tree/main/data/trail_images
```

### Method 2: GitHub Pages
Deploy your site publicly:
1. Go to repository Settings > Pages
2. Select branch: `main`
3. Click Save
4. Your site will be live at: `https://yourusername.github.io/trail-blogger`

### Method 3: Other Hosting
- Netlify
- Vercel
- Your own server

---

## 👥 Forking for Your Own Collection

Want to create your own trail collection?

### 1. Fork the Repository
Click "Fork" on GitHub to create your copy

### 2. Clone Your Fork
```bash
git clone https://github.com/YOURUSERNAME/trail-blogger
cd trail-blogger
```

### 3. Clear Existing Data (Optional)
If you want to start fresh without my trails:
```bash
# Remove existing trail images
rm -rf data/trail_images/trail-*

# Clear trails data (or edit manually)
# Edit data/trails.geojson or use the app to delete trails
```

### 4. Add Your Trails
- Run `python server.py`
- Add your own trails and photos
- Commit and push your changes

### 5. Your Collection is Now Separate
- Your fork is independent
- Your trails don't affect mine
- You have your own public collection

---

## 🎨 Customization Tips

### Personalize Your Instance:
1. **Update the About Section**
   - Edit `index.html` lines 266-293
   - Add your name and hiking story

2. **Change the Logo**
   - Replace `assets/logo/trailbloggerlibrary.png`
   - Update with your own branding

3. **Customize Colors**
   - Edit `styles.css`
   - Change the color scheme to match your style

---

## 📝 Best Practices

### 1. **Image Quality**
- Compress images before uploading (app does this automatically)
- Keep file sizes reasonable (< 2MB per image)
- Max 10 images per trail for performance

### 2. **Commit Messages**
Be descriptive:
```bash
git commit -m "Add photos from Mount Whitney summit hike (July 2024)"
git commit -m "Document Pacific Crest Trail - Section A"
```

### 3. **Regular Updates**
- Commit after each hike or batch of hikes
- Don't let uncommitted changes pile up
- Push regularly to keep GitHub in sync

### 4. **Privacy Considerations**
Remember:
- Photos will be public - don't include sensitive information
- Coordinates show exact trail locations
- Journal entries are visible to everyone
- Consider EXIF data in photos (location metadata)

---

## 🔄 Syncing Multiple Computers

### Scenario: Hiking laptop + home computer

**On hiking laptop (after a hike):**
```bash
# Add your new trails and photos
git add data/trail_images/
git commit -m "Add weekend hiking photos"
git push origin main
```

**On home computer:**
```bash
# Get the latest trails
git pull origin main

# Your new trails now appear!
```

---

## 🌐 Viewing Someone Else's Trails

### To explore another person's trail collection:

1. **Visit their repository**
   ```
   https://github.com/username/trail-blogger
   ```

2. **Clone their repo**
   ```bash
   git clone https://github.com/username/trail-blogger
   cd trail-blogger
   ```

3. **Run locally**
   ```bash
   python server.py
   # Visit http://localhost:5000
   ```

4. **Browse their trails**
   - See their hiking photos
   - Read their trail descriptions
   - View their routes on the map

---

## ❓ FAQs

### Q: Can I keep some trails private?
**A:** Not easily. All trails in the repo are public. For private trails, keep them in a separate local-only instance.

### Q: What if I don't want to share certain photos?
**A:** Don't add them to the trail, or keep that trail local only (don't commit it).

### Q: Can I have both public and private trails?
**A:** Yes! Maintain two repositories:
- Public repo: Trails you want to share
- Private repo (on GitHub with private settings): Personal trails

### Q: How do I remove a trail I shared?
**A:** 
```bash
# Delete the trail images
rm -rf data/trail_images/trail-12345/

# Delete the trail via the app or edit trails.geojson

# Commit the removal
git add -A
git commit -m "Remove trail"
git push origin main
```

---

## 🎯 Summary

**Trail Blogger is now a public sharing platform:**
- ✅ Your trails and photos are visible to everyone
- ✅ Perfect for showcasing your hiking adventures
- ✅ Others can explore your trail collection
- ✅ Easy to fork and create your own collection

**To keep trails private:** Use a private GitHub repository or maintain a local-only instance.

---

**Happy sharing, and happy trails!** 🥾🌲

