# Trail Blogger Setup Guide

##  Quick Start

###  Fastest Way to Get Started

**Windows:**
```bash
# Double-click START_SERVER.bat
```

**Mac/Linux:**
```bash
bash START_SERVER.sh
```

Then open: **http://localhost:5000**

---

##  Full Setup Instructions

### 1. Prerequisites

- **Python 3.7+** - [Download here](https://www.python.org/downloads/)
- **Git** (optional) - For version control
- Modern web browser (Chrome, Firefox, Edge, Safari)

### 2. Install Dependencies

Open a terminal in the project folder and run:

```bash
pip install flask flask-cors pillow
```

Or use the requirements file:

```bash
pip install -r requirements.txt
```

### 3. Start the Server

```bash
python server.py
```

You should see:
```
Starting Trail Blogger Server...
Access the application at: http://localhost:5000
 * Running on http://0.0.0.0:5000
```

### 4. Open in Browser

Navigate to:
```
http://localhost:5000
```

**Important:** Must be `localhost:5000`, not `5500` or any other port!

---

##  Common Issues & Fixes

### Error: "405 Method Not Allowed"

**Problem:** You're using VS Code Live Server (port 5500) instead of Flask server.

**Solution:**
1. Close Live Server or the browser tab on port 5500
2. Run `python server.py`
3. Open `http://localhost:5000`

The app now **automatically detects** the wrong server and shows a red warning screen!

### Error: "No module named flask"

**Problem:** Dependencies not installed.

**Solution:**
```bash
pip install flask flask-cors pillow
```

### Error: "Connection refused"

**Problem:** Python server isn't running.

**Solution:** Start it with `python server.py`

### Server Warning Messages

If you see:
```
WARNING: This is a development server. Do not use it in a production deployment.
```

**This is normal!** It's just letting you know this is for local development. For production, see the Deployment section below.

---

##  How to Know It's Working

###  You're on the CORRECT server if:
- Browser shows: `localhost:5000` or `127.0.0.1:5000`
- NO red warning screen appears
- Console shows: ` Running on Flask server - image uploads will work!`

###  You're on the WRONG server if:
- Browser shows: `localhost:5500` or `127.0.0.1:5500`
- You see a BIG RED WARNING screen
- Image uploads fail with 405 errors

---

##  Project Structure

```
trailBlogger/
├── index.html          # Main application UI
├── app.js             # Application logic
├── styles.css         # Styling
├── server.py          # Flask backend server
├── requirements.txt   # Python dependencies
├── data/             # Your trail data (git-ignored)
│   ├── trails.geojson      # Trail coordinates
│   └── trail_images/       # Your photos
└── docs/             # Documentation
    ├── SETUP.md           # This file
    ├── GUIDES.md          # User guides
    └── DEVELOPMENT.md     # Developer docs
```

---

##  Deployment (Making Your Site Public)

### Option 1: GitHub Pages (Static Files Only)

**Good for:** Viewing trails without uploading new ones

1. Push your code to GitHub
2. Go to repository Settings → Pages
3. Select branch: `main`
4. Your site will be at: `https://yourusername.github.io/trail-blogger`

**Note:** Image uploads won't work on GitHub Pages (static hosting only).

### Option 2: Railway (Full Functionality)

**Good for:** Full app with image uploads

1. Sign up at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Railway auto-detects Flask and deploys
4. Get a public URL with full functionality

**Free tier:** 500 hours/month

### Option 3: Render

**Alternative to Railway:**

1. Sign up at [render.com](https://render.com)
2. Create Web Service from GitHub
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `gunicorn server:app`

**Free tier available**

---

##  Data Storage

All your data stays on your computer:

- **Trail Data:** Browser localStorage + `data/trails.geojson`
- **Images:** `data/trail_images/trail-<id>/` folders
- **Backups:** Downloaded to your Downloads folder

**Nothing is uploaded to the internet** unless you push to GitHub!

---

##  Sharing Your Trails

### To Share with Friends/Public:

Your trails and images **are included in Git** by default, so when you push to GitHub:

1. Your trail data is visible
2. Your photos are publicly accessible
3. Others can fork and create their own collections

### To Keep Trails Private:

If you want to keep trails private, add this to `.gitignore`:
```
data/trail_images/*/
data/trails.geojson
```

---

##  Getting Help

1. Click the **About** button in the app for usage instructions
2. Check the [GUIDES.md](GUIDES.md) for feature documentation
3. Review [DEVELOPMENT.md](DEVELOPMENT.md) for technical details
4. Check terminal/console for error messages

---

##  Quick Reference

| Action | Command | URL |
|--------|---------|-----|
| Start Server | `python server.py` | http://localhost:5000 |
| Stop Server | `Ctrl + C` in terminal | - |
| Install Dependencies | `pip install -r requirements.txt` | - |
| View Logs | Check terminal running `server.py` | - |

---

**Happy hiking!** 

