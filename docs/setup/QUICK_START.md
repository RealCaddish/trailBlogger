# 🚀 Trail Blogger - Quick Start Guide

## ❌ STOP! Are You Getting This Error?

```
POST http://127.0.0.1:5500/api/trails/.../images 405 (Method Not Allowed)
Error uploading images: SyntaxError: Failed to execute 'json' on 'Response'
```

**This means you're using the WRONG SERVER!** Follow the steps below to fix it.

---

## ✅ 3 Simple Steps to Fix Image Upload

### Step 1: Close Live Server
- If you see `127.0.0.1:5500` or `localhost:5500` in your browser's address bar
- **Close that tab** or stop Live Server in VS Code

### Step 2: Start the Flask Server

**EASY WAY (Windows):**
- Double-click `START_SERVER.bat` in your project folder
- A terminal window will open

**EASY WAY (Mac/Linux):**
- Open terminal in project folder
- Run: `bash START_SERVER.sh`

**OR Manual Way:**
- Open terminal in project folder
- Type: `python server.py`
- Press Enter

### Step 3: Open the Correct URL

Open your browser and type in the address bar:
```
http://localhost:5000
```

**Important:** Make sure it says **5000**, NOT 5500!

---

## 🎯 How to Know It's Working

### ✅ You're on the CORRECT server if:
- Browser address shows: `localhost:5000` or `127.0.0.1:5000`
- You see the Trail Blogger app load normally
- Console shows: "✅ Running on Flask server - image uploads will work!"
- NO red warning screen appears

### ❌ You're on the WRONG server if:
- Browser address shows: `localhost:5500` or `127.0.0.1:5500`
- You see a BIG RED WARNING screen
- Image uploads fail with 405 errors

---

## 📸 Testing Image Upload

Once you're on the correct server (`localhost:5000`):

1. Click **"Add Trail"** button
2. Import a GeoJSON trail file
3. Click **"Choose Files"** under Images section
4. Select 1-10 images (max 10MB each)
5. Click **"Import Trail"**

**It should work!** ✅

---

## 🆘 Still Having Problems?

### Check 1: Python Server Running?
Look at the terminal window. You should see:
```
Starting Trail Blogger Server...
Access the application at: http://localhost:5000
 * Running on http://0.0.0.0:5000
```

If not, the server isn't running. Run `python server.py`

### Check 2: Correct URL?
Look at your browser address bar. It MUST say:
- `http://localhost:5000` ✅
- NOT `http://localhost:5500` ❌
- NOT `file:///C:/Users/...` ❌

### Check 3: Dependencies Installed?
If server won't start, install requirements:
```bash
pip install flask flask-cors pillow
```

---

## 📝 Summary

| What You See | What It Means | What To Do |
|-------------|---------------|------------|
| Port 5500 | Live Server (Wrong) | Close it, use Flask |
| Port 5000 | Flask Server (Correct) | ✅ Good to go! |
| Red warning screen | Wrong server detected | Follow instructions on screen |
| 405 Error | API can't receive uploads | Switch to Flask server |

---

## 💡 Remember

**Image uploads ONLY work when you:**
1. ✅ Run the Python server (`python server.py`)
2. ✅ Access via `http://localhost:5000`
3. ✅ See no red warning screen

**Image uploads NEVER work when you:**
1. ❌ Use Live Server (port 5500)
2. ❌ Open index.html directly from files
3. ❌ See the red warning screen

---

## 🎉 That's It!

Once you're on `localhost:5000`, everything will work:
- ✅ Add trails
- ✅ Upload images
- ✅ Edit trails
- ✅ Delete trails
- ✅ Backup data

All your data stays on your computer - nothing is uploaded to the internet!

Happy trail logging! 🥾🌲

