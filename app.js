// Trail Blogger - Main Application
class TrailBlogger {
    constructor() {
        this.map = null;
        this.trails = [];
        this.currentPark = 'red-river-gorge';
        this.trailOverlay = null;
        this.currentFilter = 'all';
        
        // Park boundaries and center coordinates
        this.parks = {
            'red-river-gorge': {
                name: 'Red River Gorge',
                center: [37.8333, -83.6167],
                bounds: [
                    [37.7833, -83.6667], // Southwest
                    [37.8833, -83.5667]  // Northeast
                ],
                zoom: 12
            }
        };
        
        this.init();
    }
    
    init() {
        this.initializeMap();
        this.loadSampleData();
        this.setupEventListeners();
        this.updateStatistics();
        this.renderTrailList();
    }
    
    initializeMap() {
        // Initialize the map
        this.map = L.map('map').setView(
            this.parks[this.currentPark].center, 
            this.parks[this.currentPark].zoom
        );
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);
        
        // Add satellite imagery option
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri',
            maxZoom: 19
        });
        
        // Add topographic map option
        L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenTopoMap',
            maxZoom: 17
        });
        
        // Load georeferenced trail overlay for Red River Gorge
        this.loadTrailOverlay();
    }
    
    loadTrailOverlay() {
        // For Red River Gorge, we'll create a sample trail overlay
        // In a real application, you would load this from a georeferenced image or GeoJSON
        const redRiverGorgeTrails = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    properties: {
                        name: "Natural Bridge Trail",
                        difficulty: "easy",
                        length: 0.75,
                        status: "hiked"
                    },
                    geometry: {
                        type: "LineString",
                        coordinates: [
                            [-83.6167, 37.8333],
                            [-83.6100, 37.8300],
                            [-83.6050, 37.8280],
                            [-83.6000, 37.8250]
                        ]
                    }
                },
                {
                    type: "Feature",
                    properties: {
                        name: "Gray's Arch Trail",
                        difficulty: "moderate",
                        length: 1.5,
                        status: "unhiked"
                    },
                    geometry: {
                        type: "LineString",
                        coordinates: [
                            [-83.6200, 37.8400],
                            [-83.6150, 37.8380],
                            [-83.6100, 37.8350],
                            [-83.6050, 37.8320]
                        ]
                    }
                },
                {
                    type: "Feature",
                    properties: {
                        name: "Indian Staircase",
                        difficulty: "difficult",
                        length: 2.2,
                        status: "unhiked"
                    },
                    geometry: {
                        type: "LineString",
                        coordinates: [
                            [-83.6300, 37.8500],
                            [-83.6250, 37.8480],
                            [-83.6200, 37.8450],
                            [-83.6150, 37.8420]
                        ]
                    }
                }
            ]
        };
        
        // Add the trail overlay to the map
        this.trailOverlay = L.geoJSON(redRiverGorgeTrails, {
            style: (feature) => {
                const status = feature.properties.status;
                return {
                    color: status === 'hiked' ? '#28a745' : '#ffc107',
                    weight: 4,
                    opacity: 0.8
                };
            },
            onEachFeature: (feature, layer) => {
                // Add popup for each trail
                const popupContent = `
                    <div class="trail-popup">
                        <h3>${feature.properties.name}</h3>
                        <div class="trail-stats">
                            <span>Length: ${feature.properties.length} miles</span>
                            <span>Difficulty: ${feature.properties.difficulty}</span>
                        </div>
                        <div class="trail-stats">
                            <span>Status: ${feature.properties.status}</span>
                        </div>
                    </div>
                `;
                layer.bindPopup(popupContent);
                
                // Add click handler to edit trail
                layer.on('click', () => {
                    this.editTrail(feature.properties.name);
                });
            }
        }).addTo(this.map);
    }
    
    loadSampleData() {
        // Load sample trail data
        this.trails = [
            {
                id: 1,
                name: "Natural Bridge Trail",
                length: 0.75,
                difficulty: "easy",
                status: "hiked",
                dateHiked: "2024-01-15",
                blogPost: "Beautiful short trail leading to the iconic Natural Bridge. The views from the top were spectacular, especially during sunset. The trail was well-maintained and perfect for families.",
                images: [],
                coordinates: [[-83.6167, 37.8333], [-83.6100, 37.8300], [-83.6050, 37.8280], [-83.6000, 37.8250]]
            },
            {
                id: 2,
                name: "Gray's Arch Trail",
                length: 1.5,
                difficulty: "moderate",
                status: "unhiked",
                dateHiked: null,
                blogPost: "",
                images: [],
                coordinates: [[-83.6200, 37.8400], [-83.6150, 37.8380], [-83.6100, 37.8350], [-83.6050, 37.8320]]
            },
            {
                id: 3,
                name: "Indian Staircase",
                length: 2.2,
                difficulty: "difficult",
                status: "unhiked",
                dateHiked: null,
                blogPost: "",
                images: [],
                coordinates: [[-83.6300, 37.8500], [-83.6250, 37.8480], [-83.6200, 37.8450], [-83.6150, 37.8420]]
            }
        ];
    }
    
    setupEventListeners() {
        // Park selection
        document.getElementById('parkSelect').addEventListener('change', (e) => {
            this.currentPark = e.target.value;
            this.changePark();
        });
        
        // Trail filters
        document.getElementById('showAll').addEventListener('click', () => this.filterTrails('all'));
        document.getElementById('showHiked').addEventListener('click', () => this.filterTrails('hiked'));
        document.getElementById('showUnhiked').addEventListener('click', () => this.filterTrails('unhiked'));
        
        // Modal controls
        document.getElementById('addTrailBtn').addEventListener('click', () => this.showTrailModal());
        document.getElementById('importBtn').addEventListener('click', () => this.showImportModal());
        
        // Close modals
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.closeModals());
        });
        
        // Form submissions
        document.getElementById('trailForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTrail();
        });
        
        document.getElementById('importForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.importGeoJSON();
        });
        
        // Cancel buttons
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModals());
        document.getElementById('importCancelBtn').addEventListener('click', () => this.closeModals());
        
        // Map controls
        document.getElementById('toggleTrailOverlay').addEventListener('click', () => this.toggleTrailOverlay());
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());
        
        // Image preview
        document.getElementById('trailImages').addEventListener('change', (e) => this.handleImagePreview(e));
        
        // GeoJSON file preview
        document.getElementById('geojsonFile').addEventListener('change', (e) => this.handleGeoJSONPreview(e));
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
    }
    
    changePark() {
        const park = this.parks[this.currentPark];
        this.map.setView(park.center, park.zoom);
        
        // Clear existing trail overlay
        if (this.trailOverlay) {
            this.map.removeLayer(this.trailOverlay);
        }
        
        // Load new trail overlay for the selected park
        this.loadTrailOverlay();
    }
    
    filterTrails(filter) {
        this.currentFilter = filter;
        
        // Update filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`show${filter.charAt(0).toUpperCase() + filter.slice(1)}`).classList.add('active');
        
        this.renderTrailList();
    }
    
    renderTrailList() {
        const trailList = document.getElementById('trailList');
        let filteredTrails = this.trails;
        
        if (this.currentFilter === 'hiked') {
            filteredTrails = this.trails.filter(trail => trail.status === 'hiked');
        } else if (this.currentFilter === 'unhiked') {
            filteredTrails = this.trails.filter(trail => trail.status === 'unhiked');
        }
        
        trailList.innerHTML = filteredTrails.map(trail => `
            <div class="trail-item ${trail.status}" onclick="trailBlogger.editTrail('${trail.name}')">
                <div class="trail-name">${trail.name}</div>
                <div class="trail-info">
                    <span class="trail-length">${trail.length} miles</span> • 
                    <span>${trail.difficulty}</span>
                    ${trail.dateHiked ? ` • <span>${new Date(trail.dateHiked).toLocaleDateString()}</span>` : ''}
                </div>
            </div>
        `).join('');
    }
    
    updateStatistics() {
        const totalTrails = this.trails.length;
        const hikedTrails = this.trails.filter(trail => trail.status === 'hiked').length;
        const totalMiles = this.trails
            .filter(trail => trail.status === 'hiked')
            .reduce((sum, trail) => sum + trail.length, 0);
        
        document.getElementById('totalTrails').textContent = totalTrails;
        document.getElementById('hikedTrails').textContent = hikedTrails;
        document.getElementById('totalMiles').textContent = totalMiles.toFixed(1);
    }
    
    showTrailModal(trailName = null) {
        const modal = document.getElementById('trailModal');
        const form = document.getElementById('trailForm');
        const title = document.getElementById('modalTitle');
        
        if (trailName) {
            // Edit existing trail
            const trail = this.trails.find(t => t.name === trailName);
            if (trail) {
                title.textContent = `Edit Trail: ${trail.name}`;
                this.populateTrailForm(trail);
            }
        } else {
            // Add new trail
            title.textContent = 'Add New Trail';
            form.reset();
            document.getElementById('imagePreview').innerHTML = '';
        }
        
        modal.style.display = 'block';
    }
    
    showImportModal() {
        document.getElementById('importModal').style.display = 'block';
    }
    
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
    
    populateTrailForm(trail) {
        document.getElementById('trailName').value = trail.name;
        document.getElementById('trailLength').value = trail.length;
        document.getElementById('trailDifficulty').value = trail.difficulty;
        document.getElementById('trailDate').value = trail.dateHiked || '';
        document.getElementById('trailBlog').value = trail.blogPost;
        
        // Show existing images
        const imagePreview = document.getElementById('imagePreview');
        imagePreview.innerHTML = trail.images.map(img => `
            <img src="${img}" alt="Trail image" />
        `).join('');
    }
    
    saveTrail() {
        const formData = new FormData(document.getElementById('trailForm'));
        const trailName = formData.get('trailName');
        
        // Check if this is an edit or new trail
        const existingTrailIndex = this.trails.findIndex(t => t.name === trailName);
        
        const trailData = {
            id: existingTrailIndex >= 0 ? this.trails[existingTrailIndex].id : Date.now(),
            name: trailName,
            length: parseFloat(formData.get('trailLength')),
            difficulty: formData.get('trailDifficulty'),
            status: formData.get('trailDate') ? 'hiked' : 'unhiked',
            dateHiked: formData.get('trailDate') || null,
            blogPost: formData.get('trailBlog'),
            images: this.getImageFiles(),
            coordinates: existingTrailIndex >= 0 ? this.trails[existingTrailIndex].coordinates : []
        };
        
        if (existingTrailIndex >= 0) {
            // Update existing trail
            this.trails[existingTrailIndex] = trailData;
        } else {
            // Add new trail
            this.trails.push(trailData);
        }
        
        this.closeModals();
        this.updateStatistics();
        this.renderTrailList();
        this.updateMapTrails();
    }
    
    getImageFiles() {
        const imageFiles = document.getElementById('trailImages').files;
        const images = [];
        
        for (let i = 0; i < imageFiles.length; i++) {
            const reader = new FileReader();
            reader.onload = (e) => {
                images.push(e.target.result);
            };
            reader.readAsDataURL(imageFiles[i]);
        }
        
        return images;
    }
    
    handleImagePreview(event) {
        const files = event.target.files;
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = '';
        
        for (let i = 0; i < files.length; i++) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML += `<img src="${e.target.result}" alt="Preview" />`;
            };
            reader.readAsDataURL(files[i]);
        }
    }
    
    handleGeoJSONPreview(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const geojson = JSON.parse(e.target.result);
                const preview = document.getElementById('geojsonPreview');
                preview.textContent = JSON.stringify(geojson, null, 2);
            } catch (error) {
                console.error('Invalid GeoJSON file:', error);
                alert('Invalid GeoJSON file. Please check the format.');
            }
        };
        reader.readAsText(file);
    }
    
    importGeoJSON() {
        const file = document.getElementById('geojsonFile').files[0];
        const trailName = document.getElementById('importTrailName').value;
        
        if (!file || !trailName) {
            alert('Please select a file and enter a trail name.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const geojson = JSON.parse(e.target.result);
                
                // Extract coordinates from GeoJSON
                let coordinates = [];
                if (geojson.type === 'Feature') {
                    coordinates = this.extractCoordinates(geojson.geometry);
                } else if (geojson.type === 'FeatureCollection') {
                    coordinates = this.extractCoordinates(geojson.features[0].geometry);
                }
                
                // Add new trail
                const newTrail = {
                    id: Date.now(),
                    name: trailName,
                    length: 0, // Will be calculated
                    difficulty: 'moderate',
                    status: 'unhiked',
                    dateHiked: null,
                    blogPost: '',
                    images: [],
                    coordinates: coordinates
                };
                
                this.trails.push(newTrail);
                this.closeModals();
                this.updateStatistics();
                this.renderTrailList();
                this.updateMapTrails();
                
                alert('Trail imported successfully!');
                
            } catch (error) {
                console.error('Error importing GeoJSON:', error);
                alert('Error importing GeoJSON file. Please check the format.');
            }
        };
        reader.readAsText(file);
    }
    
    extractCoordinates(geometry) {
        if (!geometry) return [];
        
        switch (geometry.type) {
            case 'LineString':
                return geometry.coordinates;
            case 'Polygon':
                return geometry.coordinates[0];
            case 'MultiLineString':
                return geometry.coordinates.flat();
            case 'MultiPolygon':
                return geometry.coordinates.flat()[0];
            default:
                return [];
        }
    }
    
    editTrail(trailName) {
        this.showTrailModal(trailName);
    }
    
    updateMapTrails() {
        // Clear existing trail overlay
        if (this.trailOverlay) {
            this.map.removeLayer(this.trailOverlay);
        }
        
        // Create new GeoJSON from trails data
        const geojsonData = {
            type: "FeatureCollection",
            features: this.trails.map(trail => ({
                type: "Feature",
                properties: {
                    name: trail.name,
                    difficulty: trail.difficulty,
                    length: trail.length,
                    status: trail.status
                },
                geometry: {
                    type: "LineString",
                    coordinates: trail.coordinates
                }
            }))
        };
        
        // Add updated trail overlay
        this.trailOverlay = L.geoJSON(geojsonData, {
            style: (feature) => {
                const status = feature.properties.status;
                return {
                    color: status === 'hiked' ? '#28a745' : '#ffc107',
                    weight: 4,
                    opacity: 0.8
                };
            },
            onEachFeature: (feature, layer) => {
                const popupContent = `
                    <div class="trail-popup">
                        <h3>${feature.properties.name}</h3>
                        <div class="trail-stats">
                            <span>Length: ${feature.properties.length} miles</span>
                            <span>Difficulty: ${feature.properties.difficulty}</span>
                        </div>
                        <div class="trail-stats">
                            <span>Status: ${feature.properties.status}</span>
                        </div>
                    </div>
                `;
                layer.bindPopup(popupContent);
                
                layer.on('click', () => {
                    this.editTrail(feature.properties.name);
                });
            }
        }).addTo(this.map);
    }
    
    toggleTrailOverlay() {
        if (this.trailOverlay) {
            if (this.map.hasLayer(this.trailOverlay)) {
                this.map.removeLayer(this.trailOverlay);
            } else {
                this.map.addLayer(this.trailOverlay);
            }
        }
    }
    
    toggleFullscreen() {
        const mapContainer = document.querySelector('.map-container');
        if (!document.fullscreenElement) {
            mapContainer.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
}

// Initialize the application when the page loads
let trailBlogger;
document.addEventListener('DOMContentLoaded', () => {
    trailBlogger = new TrailBlogger();
});
