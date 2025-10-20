# Adding Georeferenced Trail Maps - Complete Guide

This guide will walk you through the process of adding official trail maps as overlays to your Trail Blogger application.

## What is a Georeferenced Map?

A georeferenced map is an image (like a PDF or JPEG) that has been assigned real-world coordinates, allowing it to be displayed at the correct location and scale on a digital map.

## Step-by-Step Process

### 1. Finding Official Trail Maps

**Red River Gorge Sources:**
- [Daniel Boone National Forest Maps](https://www.fs.usda.gov/recarea/dbnf/recarea/?recid=39460)
- [Kentucky State Parks](https://parks.ky.gov/parks/recreationparks/red-river-gorge)
- [Red River Gorge Geological Area](https://www.fs.usda.gov/recarea/dbnf/recarea/?recid=39460)

**Other Sources:**
- National Park Service (nps.gov)
- State Park websites
- US Forest Service (fs.usda.gov)
- Local hiking organizations
- AllTrails premium maps
- Gaia GPS premium maps

### 2. Georeferencing Tools

#### Option A: QGIS (Free, Recommended)
1. Download QGIS from [qgis.org](https://qgis.org/)
2. Install and open QGIS
3. Add a base map layer (OpenStreetMap)
4. Add your trail map image
5. Use the Georeferencer plugin to assign coordinates
6. Export as GeoTIFF or web tiles

#### Option B: Online Tools
- [MapTiler](https://www.maptiler.com/) - Upload and georeference images
- [QGIS Cloud](https://qgiscloud.com/) - Online QGIS alternative
- [ArcGIS Online](https://www.arcgis.com/) - If you have access

#### Option C: Manual Georeferencing
For simple cases, you can manually calculate coordinates and use image overlays.

### 3. QGIS Georeferencing Tutorial

#### Step 1: Prepare Your Image
1. Download the trail map as a high-resolution image
2. Ensure it's in a common format (JPEG, PNG, TIFF)
3. Note any coordinate information on the map

#### Step 2: Set Up QGIS
1. Open QGIS
2. Add a base map: Layer → Add Layer → Add XYZ Layer
3. Use OpenStreetMap URL: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`

#### Step 3: Georeference the Image
1. Go to Raster → Georeferencer → Georeferencer
2. Click "Add Raster" and select your trail map image
3. Click "Add Point" and place points on your image
4. Enter the corresponding real-world coordinates
5. Use at least 3-4 points for accuracy
6. Click "Start Georeferencing"

#### Step 4: Export
1. Save as GeoTIFF (.tif) for best quality
2. Or export as web tiles for web use

### 4. Adding to Trail Blogger

#### Method A: Image Overlay (Simple)
```javascript
// Add this to the loadTrailOverlay() function in app.js
const imageUrl = 'path/to/your/georeferenced-map.jpg';
const imageBounds = [
    [37.7833, -83.6667], // Southwest corner
    [37.8833, -83.5667]  // Northeast corner
];

L.imageOverlay(imageUrl, imageBounds, {
    opacity: 0.7,
    interactive: true
}).addTo(this.map);
```

#### Method B: Web Tiles (Advanced)
1. Convert your georeferenced image to web tiles using:
   - [MapTiler](https://www.maptiler.com/)
   - [GDAL2Tiles](https://gdal.org/programs/gdal2tiles.html)
   - QGIS with the QTiles plugin

2. Add to your application:
```javascript
L.tileLayer('path/to/your/tiles/{z}/{x}/{y}.png', {
    attribution: 'Your Trail Map',
    maxZoom: 18,
    opacity: 0.8
}).addTo(this.map);
```

### 5. Red River Gorge Specific Example

Here's how to add a Red River Gorge trail map:

```javascript
// In app.js, modify the loadTrailOverlay() function
loadTrailOverlay() {
    // Existing trail overlay code...
    
    // Add georeferenced trail map overlay
    if (this.currentPark === 'red-river-gorge') {
        const redRiverGorgeMap = L.imageOverlay(
            'assets/red-river-gorge-trail-map.jpg',
            [
                [37.7833, -83.6667], // Southwest
                [37.8833, -83.5667]  // Northeast
            ],
            {
                opacity: 0.6,
                interactive: true
            }
        ).addTo(this.map);
        
        // Add toggle control
        const overlayControl = L.control.layers(null, {
            'Trail Map': redRiverGorgeMap
        }).addTo(this.map);
    }
}
```

### 6. Creating Your Own Trail Map

If you can't find an official map, create your own:

#### Using GPS Data
1. Record your hike with a GPS app
2. Export as GPX or KML
3. Convert to GeoJSON
4. Style it in the application

#### Using Satellite Imagery
1. Use Google Earth or Google Maps
2. Trace trails manually
3. Export coordinates
4. Create GeoJSON features

### 7. Best Practices

#### Image Quality
- Use high-resolution images (300+ DPI)
- Ensure good contrast between trails and background
- Keep file sizes reasonable for web use

#### Coordinate Accuracy
- Use multiple reference points for georeferencing
- Verify coordinates with known landmarks
- Test at different zoom levels

#### Performance
- Optimize images for web (compress JPEGs)
- Use appropriate tile sizes
- Consider lazy loading for large maps

### 8. Troubleshooting

#### Common Issues
1. **Map appears in wrong location**: Check coordinate system (WGS84 vs NAD83)
2. **Poor image quality**: Use higher resolution source images
3. **Slow loading**: Optimize image size and use web tiles
4. **Trails don't align**: Improve georeferencing accuracy

#### Coordinate Systems
- **WGS84**: Standard for web maps (latitude/longitude)
- **NAD83**: Common in US maps
- **UTM**: Projected coordinate system

### 9. Advanced Features

#### Multiple Map Layers
```javascript
const mapLayers = {
    'Official Trail Map': officialMap,
    'Satellite Imagery': satelliteLayer,
    'Topographic Map': topoLayer
};

L.control.layers(null, mapLayers).addTo(this.map);
```

#### Interactive Features
```javascript
// Add click handlers to map features
redRiverGorgeMap.on('click', function(e) {
    console.log('Clicked at:', e.latlng);
    // Add custom functionality
});
```

#### Custom Styling
```javascript
// Style the overlay
const customOverlay = L.imageOverlay(imageUrl, bounds, {
    opacity: 0.7,
    className: 'custom-trail-overlay'
});
```

### 10. Resources

#### Software
- [QGIS](https://qgis.org/) - Free GIS software
- [GIMP](https://www.gimp.org/) - Image editing
- [Inkscape](https://inkscape.org/) - Vector graphics

#### Online Services
- [MapTiler](https://www.maptiler.com/) - Map hosting and tiling
- [Carto](https://carto.com/) - Map hosting
- [Mapbox](https://www.mapbox.com/) - Map services

#### Documentation
- [Leaflet Image Overlay Documentation](https://leafletjs.com/reference.html#imageoverlay)
- [QGIS Georeferencing Tutorial](https://docs.qgis.org/3.16/en/docs/training_manual/vector_analysis/georeferencing_basics.html)
- [GDAL Documentation](https://gdal.org/)

## Example Implementation

Here's a complete example for adding a Red River Gorge trail map:

```javascript
// Add this to your app.js file
class TrailMapOverlay {
    constructor(map) {
        this.map = map;
        this.overlay = null;
        this.isVisible = false;
    }
    
    addRedRiverGorgeMap() {
        const imageUrl = 'assets/red-river-gorge-trails.jpg';
        const bounds = [
            [37.7833, -83.6667], // Southwest
            [37.8833, -83.5667]  // Northeast
        ];
        
        this.overlay = L.imageOverlay(imageUrl, bounds, {
            opacity: 0.6,
            interactive: true
        });
        
        // Add toggle button
        const toggleBtn = L.Control.extend({
            onAdd: function() {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                const button = L.DomUtil.create('a', 'trail-map-toggle', container);
                button.innerHTML = '🗺️';
                button.title = 'Toggle Trail Map';
                
                L.DomEvent.on(button, 'click', function() {
                    if (this.isVisible) {
                        this.map.removeLayer(this.overlay);
                        this.isVisible = false;
                    } else {
                        this.map.addLayer(this.overlay);
                        this.isVisible = true;
                    }
                }, this);
                
                return container;
            }
        });
        
        this.map.addControl(new toggleBtn());
    }
}

// Usage in your main app
const trailMapOverlay = new TrailMapOverlay(this.map);
trailMapOverlay.addRedRiverGorgeMap();
```

This guide should help you successfully add georeferenced trail maps to your Trail Blogger application!
