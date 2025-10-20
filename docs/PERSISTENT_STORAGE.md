# Trail Blogger Persistent Storage System

## Overview

The Trail Blogger application now includes a robust persistent storage system that saves all trail data and images to local files, ensuring your data is never lost across browser sessions or page reloads.

## Features

### 🔒 **Persistent Data Storage**
- All trail information is saved to `data/trails.geojson`
- Images are stored as files in `data/images/[trail-name]/`
- Data persists across browser sessions, page reloads, and application restarts

### 📁 **File Structure**
```
data/
├── trails.geojson          # Main trail data file
├── images/                 # Image storage directory
│   ├── Natural_Bridge_Trail/
│   │   ├── image_001.jpg
│   │   └── image_002.png
│   └── Grays_Arch_Trail/
│       └── image_001.jpg
└── backup_YYYYMMDD_HHMMSS/ # Automatic backups
    ├── trails.geojson
    └── images/
```

### 🖼️ **Image Management**
- Images are automatically saved as files when uploaded
- Original image formats are preserved (JPEG, PNG, GIF, etc.)
- Images are organized by trail name for easy management
- Automatic cleanup when trails are deleted

### 💾 **Backup System**
- One-click backup creation via the "Backup" button
- Backups include all trail data and images
- Timestamped backup directories for version control
- Manual backup creation available

## How It Works

### Frontend Integration
The application automatically:
1. **Saves data** to the backend API when trails are created/edited
2. **Loads data** from the backend API on startup
3. **Falls back** to localStorage if the backend is unavailable
4. **Serves images** from the local file system

### Backend API Endpoints
- `GET /api/trails` - Load all trail data
- `POST /api/trails` - Save trail data (including images)
- `GET /api/images/<path>` - Serve image files
- `POST /api/backup` - Create backup of all data
- `GET /api/statistics` - Get trail statistics

### Data Flow
1. **Upload Image** → Convert to base64 → Send to backend
2. **Backend** → Save image as file → Store file path in GeoJSON
3. **Load Trail** → Backend serves image URLs → Frontend displays images
4. **Backup** → Copy all files to timestamped directory

## Benefits

### ✅ **Data Persistence**
- No more lost data when clearing browser cache
- Data survives browser updates and system restarts
- Professional-grade data management

### ✅ **Image Storage**
- Images stored as actual files (not base64 in database)
- Better performance and smaller database size
- Easy to browse and manage images manually

### ✅ **Backup & Recovery**
- Automatic backup creation
- Easy data recovery and migration
- Version control for your trail data

### ✅ **Scalability**
- Efficient storage for large numbers of trails and images
- Organized file structure for easy management
- API-based architecture for future enhancements

## Usage

### Starting the Application
1. **With Python Backend** (Recommended):
   ```bash
   python server.py
   ```
   Access at: http://localhost:5000

2. **With Live Server** (Fallback):
   ```bash
   npx live-server
   ```
   Uses localStorage fallback

### Creating Backups
1. Click the "Backup" button in the header
2. Backups are created in `data/backup_YYYYMMDD_HHMMSS/`
3. Each backup contains complete trail data and images

### Managing Data
- **Add Trails**: Use the "Add Trail" button or import GeoJSON
- **Edit Trails**: Click on trail names or use the edit button
- **Upload Images**: Select images when adding/editing trails
- **View Images**: Images appear in the trail description panel

## Technical Details

### Image Processing
- Images are converted from base64 to binary files
- File extensions are determined from MIME types
- Safe filenames are generated from trail names
- Images are organized in trail-specific directories

### Data Format
Trail data is stored in GeoJSON format with custom properties:
```json
{
  "type": "Feature",
  "properties": {
    "name": "Trail Name",
    "length": 2.5,
    "difficulty": "moderate",
    "status": "hiked",
    "date_hiked": "2024-01-15",
    "blog_post": "Trail description...",
    "images": ["images/Trail_Name/image_001.jpg"],
    "trail_id": "1234567890"
  },
  "geometry": {
    "type": "LineString",
    "coordinates": [[lng, lat], ...]
  }
}
```

### Security Features
- Path traversal protection for image serving
- Input sanitization for trail names
- Safe file extension handling
- CORS configuration for API access

## Troubleshooting

### Common Issues

**Images not loading:**
- Check that the Python backend is running
- Verify image files exist in the data/images directory
- Check browser console for API errors

**Data not persisting:**
- Ensure the backend API is accessible
- Check that the data directory has write permissions
- Verify trails.geojson file exists and is writable

**Backup creation fails:**
- Check disk space availability
- Verify write permissions for the data directory
- Check Python backend logs for error details

### Manual Data Recovery
If the application fails to load data:
1. Check `data/trails.geojson` for data integrity
2. Restore from a backup directory if needed
3. Verify image files are present in `data/images/`
4. Restart the Python backend server

## Future Enhancements

- **Cloud Storage Integration**: Optional cloud backup
- **Data Export**: Export to various formats (GPX, KML, etc.)
- **Image Optimization**: Automatic image compression and resizing
- **Multi-User Support**: User-specific data directories
- **Real-time Sync**: Live data synchronization across devices
