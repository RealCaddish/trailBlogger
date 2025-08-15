# Trail Blogger - Hiking Journal Web Map

A modern web application for tracking hiking trails, recording experiences, and visualizing your outdoor adventures on an interactive map.

## Features

- **Interactive Web Map**: Built with Leaflet.js for smooth navigation and trail visualization
- **Trail Management**: Track hiked vs unhiked trails with detailed information
- **GeoJSON Import**: Import trail routes from GeoJSON files
- **Blog Integration**: Add detailed blog posts and photos for each trail
- **Georeferenced Overlays**: Display official trail maps as overlays
- **Statistics Dashboard**: Track your hiking progress and total miles
- **Responsive Design**: Works on desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`

## How to Use

### Basic Navigation

1. **Select a Park**: Use the dropdown in the sidebar to switch between different parks
2. **View Trails**: The map shows all trails with color coding:
   - Green: Hiked trails
   - Yellow: Unhiked trails
3. **Filter Trails**: Use the filter buttons to show All, Hiked, or Unhiked trails
4. **Trail Details**: Click on any trail on the map or in the sidebar to view/edit details

### Adding Trails

#### Method 1: Manual Entry
1. Click "Add Trail" button
2. Fill in trail information:
   - Trail name
   - Length (miles)
   - Difficulty level
   - Date hiked (optional)
   - Blog post
   - Upload images
3. Click "Save Trail"

#### Method 2: GeoJSON Import
1. Click "Import Trail" button
2. Select a GeoJSON file containing trail coordinates
3. Enter a trail name
4. Click "Import Trail"

### Creating GeoJSON Files

To create your own trail GeoJSON files, you can:

1. **Use GPS tracking apps** like:
   - Gaia GPS
   - AllTrails
   - Strava
   - Garmin Connect

2. **Export as GeoJSON** from these apps

3. **Manual creation** using this format:
   ```json
   {
     "type": "Feature",
     "properties": {
       "name": "Trail Name",
       "difficulty": "moderate",
       "length": 2.5
     },
     "geometry": {
       "type": "LineString",
       "coordinates": [
         [longitude1, latitude1],
         [longitude2, latitude2],
         ...
       ]
     }
   }
   ```

### Adding Georeferenced Trail Maps

To add official trail maps as overlays:

1. **Find official trail maps** from:
   - National Park Service
   - State Park websites
   - US Forest Service
   - Local hiking organizations

2. **Georeference the image** using tools like:
   - QGIS (free)
   - ArcGIS
   - Online georeferencing tools

3. **Convert to web tiles** or use as image overlay

4. **Add to the application** by modifying the `loadTrailOverlay()` function in `app.js`

## Project Structure

```
trailBlogger/
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── app.js              # Main JavaScript application
├── package.json        # Project dependencies
├── sample-trail.geojson # Sample GeoJSON file for testing
└── README.md           # This file
```

## Customization

### Adding New Parks

1. Edit the `parks` object in `app.js`:
   ```javascript
   this.parks = {
       'red-river-gorge': {
           name: 'Red River Gorge',
           center: [37.8333, -83.6167],
           bounds: [
               [37.7833, -83.6667],
               [37.8833, -83.5667]
           ],
           zoom: 12
       },
       'your-park': {
           name: 'Your Park Name',
           center: [latitude, longitude],
           bounds: [
               [south, west],
               [north, east]
           ],
           zoom: 12
       }
   };
   ```

2. Add the option to the park select dropdown in `index.html`

### Styling Customization

- Edit `styles.css` to change colors, fonts, and layout
- The app uses a green color scheme that can be easily modified
- All interactive elements have hover effects and transitions

### Data Persistence

Currently, the app stores data in browser memory. For production use, consider:

1. **Local Storage**: For simple data persistence
2. **Database**: SQLite, PostgreSQL, or MongoDB
3. **Cloud Storage**: Firebase, AWS, or similar services

## Technical Details

### Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapping**: Leaflet.js
- **Icons**: Font Awesome
- **Development Server**: live-server

### Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### Performance Considerations

- Large GeoJSON files may impact performance
- Consider simplifying complex trail geometries
- Optimize images before uploading
- Use appropriate zoom levels for different map layers

## Troubleshooting

### Common Issues

1. **Map not loading**: Check internet connection for tile servers
2. **GeoJSON import fails**: Verify file format and coordinate system
3. **Images not displaying**: Check file size and format (JPG, PNG recommended)
4. **Trails not showing**: Ensure coordinates are in the correct format [longitude, latitude]

### Debug Mode

Open browser developer tools (F12) to see console logs and debug information.

## Future Enhancements

- [ ] User authentication and profiles
- [ ] Social features (share trails, follow other hikers)
- [ ] Offline map support
- [ ] GPS tracking integration
- [ ] Weather integration
- [ ] Trail difficulty ratings from community
- [ ] Export functionality (GPX, KML)
- [ ] Mobile app version
- [ ] Advanced statistics and analytics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues:
1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Create an issue in the repository

## Acknowledgments

- Leaflet.js for the mapping functionality
- OpenStreetMap for base map tiles
- Font Awesome for icons
- The hiking community for inspiration 
