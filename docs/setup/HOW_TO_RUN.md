# How to Run Trail Blogger

## 🚨 CRITICAL: You MUST Use the Python Server for Image Uploads!

The error `405 Method Not Allowed on port 5500` means you're using **VS Code Live Server** instead of the **Python Flask Server**.

### Why This Matters:
- **Live Server (port 5500)**: Only serves static files, **CANNOT** handle image uploads ❌
- **Flask Server (port 5000)**: Handles ALL functionality including image uploads ✅

---

## ⚡ EASY METHOD: Use the Startup Script

### Windows:
Double-click `START_SERVER.bat`

### Mac/Linux:
Run `./START_SERVER.sh` or `bash START_SERVER.sh`

Then open your browser to: **http://localhost:5000**

---

## 📋 Manual Method

### 1. Close Live Server
If Live Server is running, **stop it** or close the browser tab using port 5500.

### 2. Start the Python Server

Open a terminal in your project folder and run:

```bash
python server.py
```

You should see:
```
Starting Trail Blogger Server...
Access the application at: http://localhost:5000
 * Running on http://0.0.0.0:5000
```

### 3. Open Your Browser

Go to:
```
http://localhost:5000
```

**NOT** `http://127.0.0.1:5500` (Live Server) ❌
**NOT** `file:///C:/Users/...` (direct file) ❌

---

## 🎯 NEW: Automatic Detection

The app now **automatically detects** if you're on the wrong server!

If you try to use Live Server or open the file directly, you'll see a **big red warning screen** that says:

```
⚠️ WRONG SERVER DETECTED!
You are on port 5500 (probably Live Server).
Image uploads will FAIL with 405 errors!
```

**This warning means you MUST switch to the Flask server!**

---

## Verifying It's Working

1. Check your browser's address bar - it should show `localhost:5000` ✅
2. You should **NOT** see a red warning screen
3. The browser console should show: `✅ Running on Flask server - image uploads will work!`
4. Click the **About** button to read full instructions

---

## Image Upload Now Works!

Once you're on `localhost:5000`, you can:
- ✅ Add trails with images
- ✅ Edit trails and add more images
- ✅ Delete trails (and their images)
- ✅ Backup and restore image data

---

## What If I Get Errors?

### Error: "Failed to load resource: 405 Method Not Allowed"
**Solution:** You're still using Live Server. Close it and use `python server.py` instead.

### Error: "Connection refused"
**Solution:** The Python server isn't running. Start it with `python server.py`.

### Error: "No module named flask"
**Solution:** Install dependencies:
```bash
pip install flask flask-cors pillow
```

---

## Quick Reference

| What | Command | URL |
|------|---------|-----|
| Start Server | `python server.py` | http://localhost:5000 |
| Stop Server | `Ctrl + C` in terminal | - |
| View Images | Check `data/trail_images/` folder | - |

---

## Data Storage Locations

All your data stays on your computer:

- **Trail Data:** Browser localStorage (not visible as files)
- **Images:** `data/trail_images/trail-<id>/` folders
- **Backups:** Downloaded to your Downloads folder when you create them

Nothing is uploaded to the internet or cloud storage!

---

## Need Help?

1. Make sure Python server is running (`python server.py`)
2. Access via `http://localhost:5000` (not Live Server)
3. Check the terminal for error messages
4. Read the About section in the app for usage instructions

