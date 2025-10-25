# Trail Blogger Development Documentation

Technical documentation for developers, security considerations, and deployment details.

---

##  Security & Privacy

### Security Status: **SAFE FOR PERSONAL USE**

This application is designed for **single-user, local development**. It is safe for personal trail journaling but requires modifications for production/multi-user scenarios.

###  Security Strengths

- No hardcoded credentials or API keys
- Excellent `.gitignore` configuration (personal data excluded)
- Local-only storage (no external data transmission)
- File type validation for uploads
- File size limits enforced (10MB per image)
- Path traversal protection in file operations
- Filename sanitization with `secure_filename()`

###  Known Limitations

**For Personal Use (Acceptable):**
- CORS allows all origins (`CORS(app)`)
- No authentication/authorization
- Flask debug mode enabled
- No rate limiting on endpoints
- XSS possible via trail names (user-controlled data)

**For Production (Would Need Changes):**
- Add user authentication
- Restrict CORS to specific domains
- Disable debug mode
- Implement rate limiting
- Add CSRF protection
- Sanitize all user inputs
- Use production WSGI server (Gunicorn)

### Privacy Checklist

**Before sharing on GitHub:**

- [x] No personal photos in repository (unless intended)
- [x] `.gitignore` excludes sensitive data
- [x] No API keys or passwords in code
- [x] README explains privacy model
- [x] Users understand data storage

**What's tracked by Git:**
```bash
# Check what's in your repo
git ls-files

# Should NOT see:
# - Personal trail data (if using .gitignore rules)
# - Backup files
# - User secrets
```

### EXIF Data Warning

Photos may contain GPS coordinates and camera info. To strip EXIF data:

```python
# Add to server.py image processing:
from PIL import Image
img = Image.open(image_path)
data = list(img.getdata())
img_without_exif = Image.new(img.mode, img.size)
img_without_exif.putdata(data)
img_without_exif.save(image_path)
```

---

## Architecture

### Tech Stack

**Frontend:**
- HTML5, CSS3, JavaScript (ES6+)
- Leaflet.js for maps
- Font Awesome for icons
- No build process (vanilla JS)

**Backend:**
- Python 3.7+
- Flask (web framework)
- Flask-CORS (cross-origin requests)
- Pillow (image processing)

**Data Storage:**
- Browser localStorage (client-side)
- File system (images + GeoJSON)
- No database required

### Data Flow

```
User Action
    ↓
app.js (Frontend Logic)
    ↓
API Request (fetch/POST)
    ↓
server.py (Flask Backend)
    ↓
File System (data/ directory)
    ↓
Response to Frontend
    ↓
UI Update (DOM manipulation)
```

### File Structure

```
trailBlogger/
├── Frontend (Served by Flask)
│   ├── index.html         # UI layout
│   ├── app.js            # Application logic
│   └── styles.css        # Styling
│
├── Backend (Flask)
│   ├── server.py         # API endpoints
│   └── data_manager.py   # Data handling (optional)
│
├── Data (User Content)
│   ├── trails.geojson    # Trail coordinates
│   └── trail_images/     # User photos
│
└── Configuration
    ├── requirements.txt  # Python deps
    ├── .gitignore       # Git rules
    └── Procfile         # Deployment config
```

---

## 🔧 API Endpoints

### Trail Management

**GET /api/trails**
- Returns all trail data as GeoJSON
- Used on app startup to load trails

**POST /api/trails**
- Saves trail data to `data/trails.geojson`
- Accepts GeoJSON format
- Returns success/error status

### Image Management

**POST /api/trails/<trail_id>/images**
- Uploads images for a specific trail
- Handles multiple files (max 10)
- Compresses and saves to `data/trail_images/trail-<id>/`
- Returns image URLs

**GET /api/trails/<trail_id>/images/<filename>**
- Serves image files
- Handles caching headers
- Secure filename validation

**DELETE /api/trails/<trail_id>/images**
- Deletes all images for a trail
- Removes directory and contents
- Returns success status

### Statistics

**GET /api/statistics**
- Returns trail stats (count, total distance, etc.)
- Calculated from trail data

---

##  Image Processing

### Backend Compression (server.py)

```python
def compress_image(image_path, max_width=1200, quality=85):
    """Compress and resize images for storage efficiency"""
    img = Image.open(image_path)
    
    # Calculate new dimensions
    if img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.LANCZOS)
    
    # Save with compression
    img.save(image_path, quality=quality, optimize=True)
```

### Upload Flow

1. User selects images via file input
2. Frontend sends files via FormData
3. Backend receives and validates:
   - File size (< 10MB each)
   - File type (images only)
   - Count (max 10)
4. Backend saves and compresses
5. Returns URLs to frontend
6. Frontend updates UI

### Storage Optimization

- Images compressed to ~85% JPEG quality
- Resized to max 1200px width
- Organized in trail-specific folders
- Original format preserved when possible

---

##  Deployment Options

### Local Development

```bash
python server.py
# Access at http://localhost:5000
```

**Pros:** Full functionality, easy testing  
**Cons:** Not accessible remotely

### GitHub Pages (Static)

**Setup:**
1. Push to GitHub
2. Settings → Pages → Deploy from `main` branch
3. Site live at `https://username.github.io/trail-blogger`

**Pros:** Free, automatic updates  
**Cons:** No image uploads (static hosting only)

### Railway (Full App)

**Setup:**
1. Add `Procfile`:
   ```
   web: gunicorn server:app
   ```
2. Add `gunicorn` to `requirements.txt`
3. Connect Railway to GitHub repo
4. Auto-deploy on push

**Pros:** Full functionality, free tier  
**Cons:** 500 hour/month limit

### Render (Alternative)

**Setup:**
1. Create Web Service on Render
2. Build: `pip install -r requirements.txt`
3. Start: `gunicorn server:app`

**Pros:** Free tier, good performance  
**Cons:** Slower cold starts than Railway

### Production Considerations

**For public deployment:**

1. **Use Gunicorn** (not Flask dev server):
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5000 server:app
   ```

2. **Disable debug mode** in `server.py`:
   ```python
   app.run(debug=False, host='0.0.0.0', port=5000)
   ```

3. **Restrict CORS**:
   ```python
   CORS(app, resources={
       r"/api/*": {"origins": ["https://yourdomain.com"]}
   })
   ```

4. **Add authentication** (e.g., Flask-HTTPAuth)

5. **Use environment variables**:
   ```python
   import os
   SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key')
   ```

---

##  Testing

### Manual Testing Checklist

**Basic Functionality:**
- [ ] App loads at localhost:5000
- [ ] Map displays correctly
- [ ] Can add a trail
- [ ] Can upload images
- [ ] Can edit trail details
- [ ] Can delete trail
- [ ] Data persists after reload

**Image Uploads:**
- [ ] Single image upload works
- [ ] Multiple images (up to 10) work
- [ ] Large files are compressed
- [ ] Images display in trail details
- [ ] Delete removes images from server

**Data Management:**
- [ ] Backup creates downloadable file
- [ ] Import loads GeoJSON correctly
- [ ] Export downloads all trails
- [ ] Statistics show correct data

**UI/UX:**
- [ ] Searchable state dropdown works
- [ ] Searchable park dropdown works
- [ ] Home button resets view
- [ ] About modal displays properly
- [ ] Responsive on mobile

### Testing Commands

**Check for errors:**
```bash
# Backend logs (in terminal running server.py)
# Should see successful API calls

# Frontend logs (browser console - F12)
# Should see no red errors
```

**Test fresh install:**
```bash
# Clone to new directory
git clone <your-repo> test-install
cd test-install
pip install -r requirements.txt
python server.py
# Open http://localhost:5000
```

---

##  Debugging

### Common Development Issues

**405 Method Not Allowed:**
- Verify CORS OPTIONS handler exists
- Check you're using Flask server (not Live Server)
- Confirm endpoint accepts POST/OPTIONS

**Images not uploading:**
- Check file size (< 10MB)
- Verify `data/trail_images/` directory exists
- Check server logs for Python errors
- Ensure Pillow is installed

**Trail data not persisting:**
- Check `data/trails.geojson` is writable
- Verify localStorage is enabled in browser
- Check API responses in Network tab (F12)

**Map not displaying:**
- Check internet connection (tiles need it)
- Verify Leaflet.js loaded (check Network tab)
- Check console for JavaScript errors

### Debug Mode

Enable verbose logging in `server.py`:

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Will show all API requests and responses
```

### Browser DevTools

**Console (F12 → Console):**
- JavaScript errors and logs
- Network requests
- API responses

**Network Tab:**
- See all API calls
- Check request/response data
- Verify image uploads

**Application Tab:**
- View localStorage data
- Clear cache
- Inspect cookies

---

##  Git Workflow

### Typical Development Flow

```bash
# 1. Make changes to code
# 2. Test locally (python server.py)
# 3. Add trails and test features

# 4. Stage changes
git add .

# 5. Commit with descriptive message
git commit -m "feat: Add home button to reset map view"

# 6. Push to GitHub
git push origin main

# 7. Deployment (if using Railway/Render)
# Auto-deploys on push
```

### Commit Message Format

Use conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `style:` UI/styling changes
- `refactor:` Code restructuring
- `test:` Adding tests

**Example:**
```bash
git commit -m "feat: Add searchable state dropdown with autocomplete"
```

---

##  Dependencies

### Python (requirements.txt)

```
Flask==2.3.3           # Web framework
Flask-CORS==4.0.0      # CORS support
Pillow==10.0.1         # Image processing
gunicorn==21.2.0       # Production server (optional)
```

### JavaScript (CDN)

- Leaflet.js 1.9.4 - Map library
- Font Awesome 6.4.0 - Icons

### Updating Dependencies

```bash
# Check for updates
pip list --outdated

# Update specific package
pip install --upgrade flask

# Update all
pip install --upgrade -r requirements.txt
```

---

##  Resources

### Documentation

- [Flask Docs](https://flask.palletsprojects.com/)
- [Leaflet Docs](https://leafletjs.com/reference.html)
- [Pillow Docs](https://pillow.readthedocs.io/)

### Tutorials

- [Flask Mega-Tutorial](https://blog.miguelgrinberg.com/post/the-flask-mega-tutorial-part-i-hello-world)
- [Leaflet Quick Start](https://leafletjs.com/examples/quick-start/)

### Tools

- [QGIS](https://qgis.org/) - Georeferencing
- [Postman](https://www.postman.com/) - API testing
- [VS Code](https://code.visualstudio.com/) - Editor

---

##  Future Enhancements

### Planned Features

- User authentication system
- Cloud storage integration
- Advanced search/filtering
- GPS track recording
- Elevation profiles
- Social sharing features
- Mobile app (PWA)
- Offline functionality

### Performance Improvements

- Lazy loading for images
- Virtual scrolling for long trail lists
- Service worker for caching
- IndexedDB for larger storage
- Image thumbnails

---

**For setup help, see [SETUP.md](SETUP.md).**  
**For user guides, see [GUIDES.md](GUIDES.md).**

**Happy coding!** 

