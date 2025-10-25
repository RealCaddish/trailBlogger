# Trail Blogger User Guides

Complete guides for all features in Trail Blogger.

---

##  Image Upload System

### File Size Limits

- **Maximum per image:** 10MB
- **Recommended:** 1-2MB for optimal performance
- **Maximum images per trail:** 10
- **Supported formats:** JPEG, PNG, WebP, GIF

### How to Upload Images

1. Click **"Add Trail"** or edit an existing trail
2. Click **"Choose Files"** in the Images section
3. Select up to 10 images
4. Images are automatically compressed and saved
5. Click **"Save"** to complete

### Automatic Compression

The backend automatically compresses images:
- **Server-side:** Resizes to max 1200px width
- **Quality:** 85% JPEG quality
- **Format:** Preserves original format
- **Storage:** Saved to `data/trail_images/trail-<id>/`

### Troubleshooting Image Uploads

**"Failed to upload images" error:**
- Make sure you're running Flask server (`python server.py`)
- Check you're on `http://localhost:5000` (not 5500)
- Verify images are under 10MB each

**Images not appearing:**
- Refresh the page
- Check terminal for server errors
- Verify images exist in `data/trail_images/` folder

---

##  Adding Georeferenced Trail Maps

Want to add official trail maps as overlays on your map?

### What is Georeferencing?

Georeferencing assigns real-world coordinates to a map image, allowing it to display at the correct location and scale.

### Tools You Need

**QGIS (Free, Recommended):**
1. Download from [qgis.org](https://qgis.org/)
2. Use the Georeferencer plugin
3. Export as GeoTIFF or web tiles

**Online Tools:**
- [MapTiler](https://www.maptiler.com/) - Upload and georeference
- [QGIS Cloud](https://qgiscloud.com/) - Online version

### Step-by-Step Process

#### 1. Find Official Maps

Sources for trail maps:
- National Park Service (nps.gov)
- US Forest Service (fs.usda.gov)
- State park websites
- AllTrails (premium)
- Gaia GPS (premium)

#### 2. Georeference in QGIS

1. Open QGIS
2. Add base map: OpenStreetMap
3. Go to Raster → Georeferencer
4. Add your trail map image
5. Place 3-4 reference points matching known coordinates
6. Click "Start Georeferencing"
7. Save as GeoTIFF

#### 3. Add to Trail Blogger

Add this code to `app.js`:

```javascript
// Example for Red River Gorge
const trailMapOverlay = L.imageOverlay(
    'path/to/your/trail-map.jpg',
    [
        [37.7833, -83.6667],  // Southwest corner
        [37.8833, -83.5667]   // Northeast corner
    ],
    { opacity: 0.7 }
).addTo(this.map);

// Add layer control
L.control.layers(null, {
    'Trail Map': trailMapOverlay
}).addTo(this.map);
```

### Finding Coordinates

Use these methods to find corner coordinates:
1. Google Earth - right-click → "What's here?"
2. Google Maps - right-click → lat/lng
3. QGIS - read from the status bar
4. Trail map legends (if they include coordinates)

---

##  Sharing Your Trails

### How Sharing Works

By default, **your trails and images are shared publicly** when you push to GitHub.

#### What Gets Shared:
-  Trail routes (GeoJSON)
-  Trail names and descriptions
-  Hiking photos
-  Journal entries
-  Dates and statistics

#### What Stays Private:
-  Backup files (`.backup`, `*_backup_*.json`)
-  Temporary files (`uploads/temp/`)
-  Browser localStorage (until exported)

### Publishing Your Collection

#### Method 1: GitHub Repository

Your trails are visible at:
```
https://github.com/yourusername/trail-blogger/tree/main/data/trail_images
```

#### Method 2: GitHub Pages (Static Site)

1. Go to repository Settings → Pages
2. Select branch: `main`
3. Save
4. Site live at: `https://yourusername.github.io/trail-blogger`

**Note:** Image uploads won't work on static sites.

#### Method 3: Railway/Render (Full App)

Deploy to Railway or Render for full functionality including image uploads.

### Forking for Your Own Collection

Want your own trail collection?

1. **Fork** the repository on GitHub
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOURUSERNAME/trail-blogger
   ```
3. **Clear existing data** (optional):
   ```bash
   rm -rf data/trail_images/trail-*
   ```
4. **Add your trails** using the app
5. **Push changes:**
   ```bash
   git add .
   git commit -m "Add my hiking adventures"
   git push origin main
   ```

Your fork is now independent with your own public collection!

### Privacy Considerations

**Before sharing publicly:**
- Review all photos for sensitive information
- Check journal entries for private details
- Consider removing EXIF data (GPS coordinates in photos)
- Remember: once pushed, it's public!

**To keep trails private:**

Add this to `.gitignore`:
```
data/trail_images/*/
data/trails.geojson
```

---

##  Feature Guide

### Home Button

Click **"Trail Blogger"** title in the header to:
- Reset map to worldwide view
- Clear state/park selections
- Start fresh exploration

### Searchable State/Park Selection

**Type to search:**
- Start typing in the State field
- Autocomplete shows matching states
- Click to select

**Park search:**
- Only enabled after selecting a state
- Type to filter parks in that state
- Click to zoom to park

### Delete Trail

**How to delete:**
1. Hover over a trail in the list
2. Click the red trash icon
3. Confirm deletion
4. Trail, images, and data are removed

**What gets deleted:**
- Trail from the list and map
- Associated images from server
- Entry from localStorage and GeoJSON

### Data Management Menu

Click **"Data"** button for options:

1. **Create Backup** - Full trail data + images
2. **Import GeoJSON** - Bulk import trails
3. **Export All Trails** - Download all data
4. **Export Current Trail** - Single trail export
5. **Import Trail from File** - Import one trail
6. **Clear All Data** - Reset app (with confirmation)
7. **Backup Images** - Export image metadata
8. **Restore Images** - Re-upload from backup
9. **View Statistics** - See your hiking stats

---

##  Tips & Best Practices

### For Best Performance:

1. **Keep images under 2MB** - Faster uploads
2. **Regular backups** - Use the Data menu
3. **Limit to 10 images per trail** - Optimal loading
4. **Compress before uploading** - Server does this automatically

### For Better Organization:

1. **Use descriptive trail names**
2. **Add detailed journal entries**
3. **Tag difficulty and length accurately**
4. **Mark trails as "hiked" or "planned"**

### For Sharing:

1. **Add context to photos** - Descriptions help viewers
2. **Write detailed trail notes** - Share your experience
3. **Include dates** - Track your progress
4. **Commit regularly** - Keep GitHub in sync

---

##  Workflow Examples

### Weekend Hiking Workflow:

1. **Before hike:** Mark trail as "planned"
2. **During hike:** Take photos with phone
3. **After hike:** 
   - Add trail to app
   - Upload photos
   - Write journal entry
   - Mark as "hiked"
4. **Later:** Backup data, push to GitHub

### Multi-Computer Workflow:

**On laptop (field):**
```bash
# Add trails after hiking
git add data/
git commit -m "Add weekend trails"
git push origin main
```

**On desktop (home):**
```bash
# Sync latest trails
git pull origin main
# Your new trails appear!
```

---

##  Browser Compatibility

**Fully Supported:**
-  Chrome/Edge (Chromium)
-  Firefox
-  Safari (macOS/iOS)
-  Modern mobile browsers

**Not Supported:**
-  Internet Explorer
-  Very old mobile browsers

---

##  Troubleshooting

### Common Issues

**Trail won't save:**
- Check terminal for errors
- Verify server is running
- Try refreshing the page

**Map not loading:**
- Check internet connection (base maps need internet)
- Verify no console errors (F12)
- Try a different browser

**Images won't display:**
- Verify server is running (`python server.py`)
- Check `data/trail_images/` folder exists
- Look for errors in terminal

**Can't find my trail:**
- Use the search feature
- Check if filters are applied
- Verify trail was saved (check Data menu)

---

**For more help, check [SETUP.md](SETUP.md) or [DEVELOPMENT.md](DEVELOPMENT.md).**

**Happy trails!** 

