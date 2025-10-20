# Trail Blogger Deployment Guide

## 🚀 Quick Deploy Options

### Option 1: Railway (Recommended - Free)
1. **Sign up** at [railway.app](https://railway.app)
2. **Connect GitHub** repository
3. **Add these files** to your project:

**Procfile:**
```
web: gunicorn server:app
```

**requirements.txt** (already exists):
```
Flask==2.3.3
Flask-CORS==4.0.0
Werkzeug==2.3.7
Pillow==10.0.1
gunicorn==21.2.0
```

4. **Deploy** - Railway will automatically:
   - Install dependencies
   - Start your Flask server
   - Provide a public URL
   - Handle image uploads

### Option 2: Render (Free Alternative)
1. **Sign up** at [render.com](https://render.com)
2. **Create Web Service** from GitHub
3. **Settings:**
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn server:app`
4. **Deploy**

### Option 3: GitHub Pages + Cloudinary (Static Only)
1. **Sign up** at [cloudinary.com](https://cloudinary.com)
2. **Get API credentials**
3. **Modify frontend** to upload to Cloudinary
4. **Deploy to GitHub Pages**

## 🔧 Development vs Production

### Local Development (Current)
- Flask server on `localhost:5000`
- Images stored in `data/trail_images/`
- Full backend functionality

### Production Deployment
- Flask server on Railway/Render
- Images stored on server filesystem
- Same functionality, public access

## 📁 File Structure for Deployment
```
trailBlogger/
├── server.py              # Flask backend
├── requirements.txt       # Python dependencies
├── Procfile              # Railway deployment config
├── data/                 # Local data (not deployed)
│   └── trail_images/     # Local images (not deployed)
├── index.html            # Frontend
├── app.js               # Frontend logic
└── styles.css           # Styling
```

## 🎯 Recommended: Railway Deployment

**Why Railway?**
- ✅ Free tier (500 hours/month)
- ✅ Automatic GitHub integration
- ✅ Persistent file storage
- ✅ Easy deployment
- ✅ Custom domain support

**Steps:**
1. Add `Procfile` to your project
2. Push to GitHub
3. Connect Railway to your repo
4. Deploy automatically
5. Get public URL (e.g., `https://your-app.railway.app`)

## 🔄 Workflow
1. **Develop locally** with Flask server
2. **Test image uploads** on localhost:5000
3. **Push to GitHub** when ready
4. **Railway auto-deploys** your changes
5. **Public site** works with full functionality

## 💡 Pro Tips
- Keep `data/` folder in `.gitignore` (local only)
- Use environment variables for production settings
- Railway provides persistent storage for images
- Your public site will have the same functionality as local development

