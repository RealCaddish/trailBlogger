# Trail Blogger - Personal Trail Journal

A web-based application for tracking and documenting your hiking adventures. Create your personal trail journal with photos, descriptions, and trail data.

## Quick Start

### Prerequisites
- Python 3.7 or higher
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/trail-blogger.git
   cd trail-blogger
   ```

2. **Start the application**
   ```bash
   python server.py
   ```

3. **Open your browser**
   Navigate to `http://localhost:5000`

## Sharing Your Adventures

### How This Works
- **Trail data and images are stored in the repository**
- **When you push to GitHub, your trails and photos become publicly visible**
- **Others can view your hiking adventures by visiting your repository**
- **Fork the repo to create your own separate trail collection**

### What's Shared

#### **Public Repository (Shared)**
- Application code and functionality
- Your trail coordinates and routes
- Your hiking photos and images
- Journal entries and trail descriptions
- Trail statistics and hiking history

#### **Private (Not Shared)**
- Backup files you create locally
- Draft trails before you commit them
- Browser localStorage (temporary data)

### Data Storage Structure
```
trail-blogger/
├── app.js                 # Application logic
├── index.html            # Main interface
├── styles.css            # Styling
├── server.py             # Local server
├── data_manager.py       # Data handling
├── data/                 # YOUR TRAIL DATA (shared in repo)
│   ├── trails.geojson    # Your trail routes
│   ├── trail_images/     # Your hiking photos
│   ├── states.geojson    # Geographic data
│   └── parks_simplified.json  # Park boundaries
└── logo/                 # Application branding
```

## Setting Up Your Personal Data

### First Time Setup
1. **Create your data directory** (automatically created on first run)
2. **Import your first trail** using the "Import Trail" button
3. **Add photos and descriptions** to your trails
4. **Create backups** using the "Backup" button

### Data Management
- **Backup**: Click the "Backup" button to download a complete backup of your data
- **Restore**: Use the backup file to restore your data on a new machine
- **Export**: Your data is automatically saved locally and persists between sessions

## Features

### Trail Management
- **Import GeoJSON files** from mapping applications
- **Add trail details** (length, difficulty, status)
- **Track hiking progress** (hiked vs. unhiked trails)
- **Calculate trail statistics** automatically

### Personal Journal
- **Add photos** to each trail
- **Write detailed descriptions** of your experiences
- **Record hiking dates** and conditions
- **Organize by difficulty** and status

### Map Integration
- **Interactive map** with multiple basemap options
- **Trail visualization** with color-coded status
- **Zoom to trail** functionality
- **Geographic data** preservation

### Data Persistence
- **Local storage** ensures your data never leaves your machine
- **Automatic saving** of all changes
- **Backup system** for data protection
- **Cross-session persistence** (data survives browser restarts)

## Configuration

### Customizing for Your Region
Edit `app.js` to set your preferred default location:
```javascript
this.parks = {
    'your-region': {
        name: 'Your Region Name',
        center: [latitude, longitude],
        bounds: [
            [southwest_lat, southwest_lng],
            [northeast_lat, northeast_lng]
        ],
        zoom: 12
    }
};
```

### Adding New Parks
1. Add park configuration to the `parks` object
2. Update the park selector in `index.html`
3. Restart the application

## Development

### Local Development
```bash
# Start development server
python server.py

# Access application
http://localhost:5000

# View API documentation
http://localhost:5000/api/health
```

### File Structure
```
├── app.js              # Main application logic
├── index.html          # User interface
├── styles.css          # Styling and layout
├── server.py           # Flask server for data persistence
├── data_manager.py     # Data handling and file operations
├── data/               # User data directory (created automatically)
├── logo/               # Application branding
└── README.md           # This file
```

## Privacy & Security Features

### Data Protection
- **Local-only storage**: All data stays on your machine
- **No external dependencies**: No data sent to third-party services
- **Secure file handling**: Path traversal protection
- **Input validation**: XSS and injection protection

### Backup & Recovery
- **Automatic backups**: Create timestamped backups
- **Export functionality**: Download complete data sets
- **Data integrity**: Validation and error handling
- **Recovery options**: Restore from backup files

## Important Notes

### Before Making Repository Public
1. **Verify `.gitignore`** excludes all personal data
2. **Remove any personal content** from the repository
3. **Test with fresh clone** to ensure no data leaks
4. **Update documentation** for new users

### Data Safety
- **Regular backups**: Use the backup feature regularly
- **Multiple copies**: Keep backups in different locations
- **Version control**: Consider using git for your personal data directory
- **Cloud storage**: Sync backups to cloud storage for additional safety

## Contributing

### For Personal Use
- Fork the repository for your own use
- Customize features for your specific needs
- Keep your personal data separate from the code

### For Community
- Submit bug reports and feature requests
- Contribute code improvements
- Share customizations and enhancements
- Help improve documentation

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

### Common Issues
1. **Data not persisting**: Check browser localStorage settings
2. **Images not loading**: Verify file permissions in data directory
3. **Map not displaying**: Check internet connection for tile loading
4. **Import errors**: Verify GeoJSON file format

### Getting Help
- Check the browser console for error messages
- Verify all files are in the correct locations
- Ensure Python dependencies are installed
- Test with a fresh clone of the repository

---

**Remember**: Your trail data, photos, and journal entries are yours alone. This application is designed to keep your personal information private and secure on your local machine. 
