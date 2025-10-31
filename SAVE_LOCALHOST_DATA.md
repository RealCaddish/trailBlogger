# How to Save Your Localhost Data to the Server

## The Problem

Your edits (dates, descriptions, status changes) on localhost:5000 are stored in **browser localStorage** but not saved to the server files yet.

- ✅ You can see them in your browser
- ❌ They're not in `data/trails.geojson`
- ❌ They won't deploy to GitHub Pages

## Solution: Save from Browser to Server

### Step 1: Open localhost:5000

Make sure Flask server is running:
```bash
python server.py
```

Visit: http://localhost:5000

### Step 2: Export Browser Data

Open the browser console (`F12` or `Ctrl+Shift+I`), click **Console** tab, and paste this code:

```javascript
// Get trails from browser localStorage
const trails = JSON.parse(localStorage.getItem('trailBlogger_trails') || '[]');

console.log(`Found ${trails.length} trails in browser localStorage\n`);

// Show what data we have
trails.forEach((trail, i) => {
    console.log(`${i+1}. ${trail.name}`);
    console.log(`   Date: ${trail.dateHiked || trail.date_hiked || 'NO DATE'}`);
    console.log(`   Status: ${trail.status}`);
    console.log(`   Description: ${(trail.blogPost || trail.blog_post || '').length} chars`);
    console.log('');
});

// Create export file
const exportData = {
    timestamp: new Date().toISOString(),
    source: 'browser_localStorage',
    trails: trails
};

// Download as file
const dataStr = JSON.stringify(exportData, null, 2);
const dataBlob = new Blob([dataStr], {type: 'application/json'});
const url = URL.createObjectURL(dataBlob);
const link = document.createElement('a');
link.href = url;
link.download = `localhost_browser_data_${Date.now()}.json`;
link.click();

console.log('✅ Downloaded browser data! Check your Downloads folder.');
console.log('Send this file to continue...');
```

### Step 3: Send Me the File

Once you download `localhost_browser_data_XXXXX.json`:
1. Save it to your trailBlogger project folder
2. Let me know the filename
3. I'll create a script to merge this data into `trails.geojson`
4. Then we'll deploy to GitHub Pages

---

## Alternative: Use the Web Interface to Save

If the export doesn't work, you can save each trail manually:

1. Visit http://localhost:5000
2. For **each trail**:
   - Click on the trail
   - Click "Edit"
   - Don't change anything (or make a tiny change)
   - Click "Save"
3. This will save the trail from localStorage to the server

After saving all trails, run:
```bash
python sync_from_localhost.py
python deploy.py
```

---

## Important Note About GitHub Pages

⚠️ **GitHub Pages is static (read-only)**

- You can ONLY edit trails on **localhost:5000**
- GitHub Pages (live site) displays data but **cannot save changes**
- Workflow:
  1. Edit on localhost:5000
  2. Save changes
  3. Deploy to GitHub Pages with `python deploy.py`

If someone tries to edit on the live GitHub Pages site, those changes will be lost when the page refreshes because there's no server to save to.

---

## Quick Reference

| Action | Where It Happens | Is It Saved? |
|--------|------------------|--------------|
| Edit trail on localhost:5000 | Browser localStorage | ❌ No (temporary) |
| Click "Save" on localhost:5000 | Flask server → `data/trails.geojson` | ✅ Yes (permanent) |
| View on GitHub Pages | Static HTML | 👁️ Read-only |
| Edit on GitHub Pages | N/A | ❌ Cannot edit (static site) |

---

## Let's Get Your Data!

Run the JavaScript code above in your browser console at localhost:5000, and share the downloaded JSON file with me!

