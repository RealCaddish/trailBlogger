// Trail Blogger - Main Application
class TrailBlogger {
    constructor() {
        this.map = null;
        this.trails = [];
        this.currentPark = 'red-river-gorge';
        this.trailOverlay = null;
        this.currentFilter = 'all';
        this.selectedTrail = null;
        this.parksData = null; // Will store the parks from parks_simplified.json
        this.parksLayer = null; // Will store the parks GeoJSON layer
        this.statesData = null; // Will store the states from states.geojson
        this.currentState = null; // Currently selected state
        
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
    
    async init() {
        try {
            console.log('Initializing Trail Blogger...');
            this.initializeMap();
            console.log('Map initialized successfully');
            
            // Load parks data
            await this.loadParksData();
            console.log('Parks data loaded successfully');
            
            // Try to load data from storage first
            const loadedFromStorage = await this.loadTrailsFromFile();
            if (!loadedFromStorage) {
                console.log('Loading sample data...');
                this.loadSampleData();
            }
            
            this.setupEventListeners();
            this.updateStatistics();
            this.renderTrailList();
            
            // Check localStorage usage after loading data
            setTimeout(() => {
                this.checkLocalStorageUsage();
            }, 1000);
            
            console.log('Trail Blogger initialization complete');
        } catch (error) {
            console.error('Error during initialization:', error);
        }
    }
    
    initializeMap() {
        try {
            console.log('Creating map...');
            // Initialize the map
            this.map = L.map('map').setView(
                this.parks[this.currentPark].center, 
                this.parks[this.currentPark].zoom
            );
            console.log('Map created successfully');
            
            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(this.map);
            console.log('OpenStreetMap tiles added');
            
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
            console.log('Trail overlay loaded');
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    }
    
    async loadParksData() {
        try {
            console.log('Loading parks and states data...');
            
            // Load parks data
            const parksResponse = await fetch('data/parks_simplified.json');
            if (!parksResponse.ok) {
                throw new Error(`HTTP error! status: ${parksResponse.status}`);
            }
            this.parksData = await parksResponse.json();
            console.log('Parks data loaded:', this.parksData.features.length, 'parks');
            
            // Load states data
            const statesResponse = await fetch('data/states.geojson');
            if (!statesResponse.ok) {
                throw new Error(`HTTP error! status: ${statesResponse.status}`);
            }
            this.statesData = await statesResponse.json();
            console.log('States data loaded:', this.statesData.features.length, 'states');
            
            // Populate dropdowns
            this.populateStateDropdown();
            this.populateParkDropdown();
            
            // Add parks layer to map
            this.addParksLayer();
            
        } catch (error) {
            console.error('Error loading parks/states data:', error);
        }
    }
    
    populateStateDropdown() {
        const stateSelect = document.getElementById('stateSelect');
        if (stateSelect && this.statesData && this.statesData.features) {
            stateSelect.innerHTML = '<option value="">Select a State</option>';
            
            // Sort states alphabetically by name
            const sortedStates = [...this.statesData.features].sort((a, b) => 
                a.properties.name.localeCompare(b.properties.name)
            );
            
            sortedStates.forEach(feature => {
                const stateName = feature.properties.name;
                const option = document.createElement('option');
                option.value = stateName;
                option.textContent = stateName;
                stateSelect.appendChild(option);
            });
        }
    }
    
    populateParkDropdown() {
        const parkSelect = document.getElementById('parkSelect');
        const trailParkSelect = document.getElementById('trailPark');
        const importTrailParkSelect = document.getElementById('importTrailPark');
        
        const dropdowns = [parkSelect, trailParkSelect, importTrailParkSelect];
        const selectedState = document.getElementById('stateSelect').value;
        
        console.log('Populating park dropdown...');
        console.log('Selected state:', selectedState);
        console.log('Parks data available:', this.parksData ? 'Yes' : 'No');
        console.log('Number of parks:', this.parksData ? this.parksData.features.length : 0);
        
        dropdowns.forEach(dropdown => {
            if (dropdown) {
                dropdown.innerHTML = '<option value="">Select a Park</option>';
                
                if (this.parksData && this.parksData.features) {
                    // Filter parks by selected state if a state is selected
                    let parksToShow = this.parksData.features;
                    
                    if (selectedState) {
                        parksToShow = this.parksData.features.filter(feature => {
                            const parkState = feature.properties.state;
                            const matches = parkState === selectedState;
                            console.log(`Park: ${feature.properties.NAME}, State: ${parkState}, Matches: ${matches}`);
                            return matches;
                        });
                        console.log(`Filtered parks for state "${selectedState}":`, parksToShow.length);
                    }
                    
                    // Sort parks alphabetically by name
                    const sortedFeatures = [...parksToShow].sort((a, b) => {
                        const nameA = a.properties.NAME || '';
                        const nameB = b.properties.NAME || '';
                        return nameA.localeCompare(nameB);
                    });
                    
                    console.log('Adding parks to dropdown:', sortedFeatures.length);
                    sortedFeatures.forEach(feature => {
                        const parkName = feature.properties.NAME;
                        if (parkName) { // Only add parks with valid names
                            const option = document.createElement('option');
                            option.value = parkName;
                            option.textContent = parkName;
                            dropdown.appendChild(option);
                        }
                    });
                }
            }
        });
    }
    
    addParksLayer() {
        if (this.parksData) {
            this.parksLayer = L.geoJSON(this.parksData, {
                style: {
                    color: '#007cbf',
                    weight: 2,
                    opacity: 0.6,
                    fillColor: '#007cbf',
                    fillOpacity: 0.1
                },
                onEachFeature: (feature, layer) => {
                    const parkName = feature.properties.NAME;
                    layer.bindPopup(`<b>${parkName}</b><br>Type: ${feature.properties.FEATTYPE || 'Unknown'}`);
                }
            });
            
            // Initially hide the parks layer
            // this.map.addLayer(this.parksLayer);
        }
    }
    
    loadTrailOverlay() {
        // Start with empty trail overlay - trails will be added dynamically
        this.trailOverlay = L.geoJSON({
            type: "FeatureCollection",
            features: []
        }, {
            style: (feature) => {
                const status = feature.properties.status;
                return {
                    color: status === 'hiked' ? '#007cbf' : '#ffc107',
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
                            ${feature.properties.park ? `<span>Park: ${feature.properties.park}</span>` : ''}
                        </div>
                    </div>
                `;
                layer.bindPopup(popupContent);
                
                // Add click handler to zoom to trail and show description
                layer.on('click', () => {
                    this.zoomToTrail(feature.properties.name);
                });
            }
        }).addTo(this.map);
        
        console.log('Empty trail overlay initialized - ready for imported trails');
    }
    
    loadSampleData() {
        // Start with empty trail data - no placeholder trails
        this.trails = [];
        console.log('No sample trails loaded - ready for user data');
    }
    
    setupEventListeners() {
        // State selection
        document.getElementById('stateSelect').addEventListener('change', (e) => {
            console.log('State selection changed to:', e.target.value);
            this.currentState = e.target.value;
            this.changeState();
        });
        
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
        document.getElementById('backupBtn').addEventListener('click', () => this.createBackup());
        document.getElementById('restoreBtn').addEventListener('click', () => this.showRestoreDialog());
        document.getElementById('storageBtn').addEventListener('click', () => this.showStorageManagement());
        
        // Close modals
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.closeModals());
        });
        
        // Form submissions
        document.getElementById('trailForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveTrail();
        });
        
        document.getElementById('importForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.importGeoJSON();
        });
        
        // Cancel buttons
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModals());
        document.getElementById('importCancelBtn').addEventListener('click', () => this.closeModals());
        
        // Map controls
        document.getElementById('toggleTrailOverlay').addEventListener('click', () => this.toggleTrailOverlay());
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());
        
        // Add reset view button if it doesn't exist
        this.addResetViewButton();
        
        // Image preview
        document.getElementById('trailImages').addEventListener('change', (e) => this.handleImagePreview(e));
        
        // GeoJSON file preview
        document.getElementById('geojsonFile').addEventListener('change', (e) => this.handleGeoJSONPreview(e));
        
        // Restore file input
        document.getElementById('restoreFileInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.restoreFromBackup(e.target.files[0]);
                e.target.value = ''; // Reset input
            }
        });
        
        // Description panel controls
        document.getElementById('closeDescription').addEventListener('click', () => this.closeDescriptionPanel());
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
        
        // Clear trail highlight when clicking on empty map area
        this.map.on('click', (e) => {
            // Only clear if clicking on the map itself, not on a trail
            if (e.originalEvent.target.classList.contains('leaflet-interactive')) {
                return;
            }
            this.clearTrailHighlight();
        });
    }
    
    changeState() {
        console.log('changeState() called with currentState:', this.currentState);
        // Update park dropdown when state changes
        this.populateParkDropdown();
        
        // Clear existing layers
        if (this.currentParkLayer) {
            this.map.removeLayer(this.currentParkLayer);
            this.currentParkLayer = null;
        }
        
        if (this.currentStateLayer) {
            this.map.removeLayer(this.currentStateLayer);
            this.currentStateLayer = null;
        }
        
        if (!this.currentState) {
            // No state selected, show default view
            this.map.flyTo([37.8333, -83.6167], 8, {
                duration: 1.5
            });
            return;
        }
        
        // Find the selected state in the states data
        const selectedState = this.statesData.features.find(feature => 
            feature.properties.name === this.currentState
        );
        
        if (selectedState) {
            // Create a layer for the selected state
            const selectedStateLayer = L.geoJSON(selectedState, {
                style: {
                    color: '#28a745',
                    weight: 2,
                    opacity: 0.6,
                    fillColor: '#28a745',
                    fillOpacity: 0.1
                },
                onEachFeature: (feature, layer) => {
                    const stateName = feature.properties.name;
                    layer.bindPopup(`<b>${stateName}</b>`);
                }
            });
            
            // Add the selected state layer
            this.map.addLayer(selectedStateLayer);
            
            // Fly to the selected state
            this.map.flyToBounds(selectedStateLayer.getBounds(), { 
                padding: [50, 50],
                duration: 1.5
            });
            
            // Store reference to current state layer
            this.currentStateLayer = selectedStateLayer;
        }
    }
    
    changePark() {
        const selectedParkName = document.getElementById('parkSelect').value;
        
        // Clear existing layers
        if (this.currentParkLayer) {
            this.map.removeLayer(this.currentParkLayer);
            this.currentParkLayer = null;
        }
        
        if (this.currentStateLayer) {
            this.map.removeLayer(this.currentStateLayer);
            this.currentStateLayer = null;
        }
        
        if (!selectedParkName) {
            // No park selected, show default view
            this.map.flyTo([37.8333, -83.6167], 8, {
                duration: 1.5
            });
            return;
        }
        
        // Find the selected park in the parks data
        const selectedPark = this.parksData.features.find(feature => 
            feature.properties.NAME === selectedParkName
        );
        
        if (selectedPark) {
            // Create a layer for just the selected park
            const selectedParkLayer = L.geoJSON(selectedPark, {
                style: {
                    color: '#007cbf',
                    weight: 3,
                    opacity: 0.8,
                    fillColor: '#007cbf',
                    fillOpacity: 0.2
                },
                onEachFeature: (feature, layer) => {
                    const parkName = feature.properties.NAME;
                    layer.bindPopup(`<b>${parkName}</b><br>Type: ${feature.properties.FEATTYPE || 'Unknown'}`);
                }
            });
            
            // Add the selected park layer
            this.map.addLayer(selectedParkLayer);
            
            // Fly to the selected park
            this.map.flyToBounds(selectedParkLayer.getBounds(), { 
                padding: [20, 20],
                duration: 1.5
            });
            
            // Store reference to current park layer
            this.currentParkLayer = selectedParkLayer;
        }
    }
    
    highlightParkForTrail(parkName) {
        // Clear any existing park highlight
        if (this.trailParkHighlight) {
            this.map.removeLayer(this.trailParkHighlight);
            this.trailParkHighlight = null;
        }
        
        // Find the park in the parks data
        const park = this.parksData.features.find(feature => 
            feature.properties.NAME === parkName
        );
        
        if (park) {
            // Create a highlight layer for the park
            this.trailParkHighlight = L.geoJSON(park, {
                style: {
                    color: '#28a745',
                    weight: 2,
                    opacity: 0.6,
                    fillColor: '#28a745',
                    fillOpacity: 0.1
                },
                onEachFeature: (feature, layer) => {
                    const parkName = feature.properties.NAME;
                    layer.bindPopup(`<b>${parkName}</b><br>Type: ${feature.properties.FEATTYPE || 'Unknown'}`);
                }
            });
            
            // Add the park highlight layer
            this.map.addLayer(this.trailParkHighlight);
        }
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
            <div class="trail-item ${trail.status} ${this.selectedTrail && this.selectedTrail.name === trail.name ? 'selected' : ''}" onclick="trailBlogger.selectTrail('${trail.name}')">
                <div class="trail-name">${trail.name}</div>
                <div class="trail-info">
                    <span class="trail-length">${trail.length} miles</span> • 
                    <span>${trail.difficulty}</span> • 
                    <span class="trail-status">${trail.status}</span>
                    ${trail.park ? ` • <span class="trail-park">${trail.park}</span>` : ''}
                    ${trail.dateHiked ? ` • <span>${new Date(trail.dateHiked).toLocaleDateString()}</span>` : ''}
                </div>
                <div class="trail-actions">
                    <button class="edit-trail-btn" onclick="event.stopPropagation(); trailBlogger.editTrail('${trail.name}')" title="Edit Trail">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    updateStatistics() {
        const totalTrails = this.trails.length;
        const hikedTrails = this.trails.filter(trail => trail.status === 'hiked').length;
        
        console.log('Updating statistics...');
        console.log('Total trails:', totalTrails);
        console.log('Hiked trails:', hikedTrails);
        
        // Debug: Log each hiked trail and its length
        const hikedTrailsList = this.trails.filter(trail => trail.status === 'hiked');
        console.log('Hiked trails details:');
        hikedTrailsList.forEach(trail => {
            console.log(`  - ${trail.name}: ${trail.length} miles (type: ${typeof trail.length})`);
        });
        
        const totalMiles = hikedTrailsList.reduce((sum, trail) => {
            const length = parseFloat(trail.length) || 0;
            console.log(`Adding ${length} miles from ${trail.name}`);
            return sum + length;
        }, 0);
        
        console.log('Total miles calculated:', totalMiles);
        
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
        } else if (this.selectedTrail) {
            // Edit currently selected trail
            title.textContent = `Edit Trail: ${this.selectedTrail.name}`;
            this.populateTrailForm(this.selectedTrail);
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
    
    showRestoreDialog() {
        // Trigger the hidden file input
        document.getElementById('restoreFileInput').click();
    }
    
    showStorageManagement() {
        const usageMB = this.checkLocalStorageUsage();
        const trails = JSON.parse(localStorage.getItem('trailBlogger_trails') || '[]');
        const totalImages = trails.reduce((sum, t) => sum + (t.images ? t.images.length : 0), 0);
        
        const message = 
            `Storage Management\n\n` +
            `Current Usage: ${usageMB.toFixed(2)} MB\n` +
            `Total Trails: ${trails.length}\n` +
            `Total Images: ${totalImages}\n\n` +
            `Choose an action:\n\n` +
            `1. Create Backup (recommended before cleanup)\n` +
            `2. Remove All Images (frees space, keeps trail data)\n` +
            `3. Clear All Data (removes everything)\n` +
            `4. Clean Old Backups (removes old backup files)\n` +
            `5. Export Data for Sharing (creates shared_trails.json)\n` +
            `6. Cancel`;
        
        const choice = prompt(message, '1');
        
        switch (choice) {
            case '1':
                this.createBackup();
                break;
            case '2':
                if (confirm('Remove all images from trails? This will free storage space but you will lose all photos.')) {
                    this.removeImagesFromTrails();
                }
                break;
            case '3':
                if (confirm('Clear ALL trail data? This cannot be undone unless you have a backup.')) {
                    this.clearAllData();
                }
                break;
            case '4':
                const freedSpace = this.cleanupOldBackups();
                if (freedSpace > 0) {
                    alert(`Cleaned up old backups. Freed ${(freedSpace / 1024).toFixed(2)} KB of space.`);
                } else {
                    alert('No old backups found to clean up.');
                }
                break;
            case '5':
                this.exportDataForSharing();
                break;
            case '6':
            default:
                // Cancel
                break;
        }
    }
    
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
    
    populateTrailForm(trail) {
        document.getElementById('trailName').value = trail.name;
        document.getElementById('trailPark').value = trail.park || '';
        document.getElementById('trailLength').value = trail.length;
        document.getElementById('trailDifficulty').value = trail.difficulty;
        document.getElementById('trailStatus').value = trail.status;
        document.getElementById('trailDate').value = trail.dateHiked || '';
        document.getElementById('trailBlog').value = trail.blogPost;
        
        // Show existing images with remove buttons
        const imagePreview = document.getElementById('imagePreview');
        imagePreview.innerHTML = trail.images.map((img, index) => `
            <div class="image-preview-item">
                <img src="${img}" alt="Trail image" />
                <button type="button" class="remove-image-btn" onclick="trailBlogger.removeImage(${index})" title="Remove image">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }
    
    async saveTrail() {
        const formData = new FormData(document.getElementById('trailForm'));
        const trailName = formData.get('trailName');
        
        // Check if this is an edit or new trail
        const existingTrailIndex = this.trails.findIndex(t => t.name === trailName);
        
        // Get images properly (preserve existing + add new)
        const images = await this.getImageFiles();
        
        const trailData = {
            id: existingTrailIndex >= 0 ? this.trails[existingTrailIndex].id : Date.now(),
            name: trailName,
            park: formData.get('trailPark') || '',
            length: parseFloat(formData.get('trailLength')),
            difficulty: formData.get('trailDifficulty'),
            status: formData.get('trailStatus'),
            dateHiked: formData.get('trailDate') || null,
            blogPost: formData.get('trailBlog'),
            images: images,
            coordinates: existingTrailIndex >= 0 ? this.trails[existingTrailIndex].coordinates : [],
            // Preserve original GeoJSON geometry if it exists
            originalGeoJSON: existingTrailIndex >= 0 ? this.trails[existingTrailIndex].originalGeoJSON : null
        };
        
        if (existingTrailIndex >= 0) {
            // Update existing trail
            this.trails[existingTrailIndex] = trailData;
        } else {
            // Add new trail
            this.trails.push(trailData);
        }
        
        this.closeModals();
        
        // Save to persistent storage
        await this.saveTrailToFile(trailData);
        
        this.updateStatistics();
        this.renderTrailList();
        this.updateMapTrails();
        
        // Update selected trail if it was the one being edited
        if (this.selectedTrail && this.selectedTrail.name === trailName) {
            this.selectedTrail = trailData;
            this.showTrailDescription(trailName);
        }
    }
    
    async getImageFiles() {
        const imageFiles = document.getElementById('trailImages').files;
        const images = [];
        
        // First, add any existing images that are already in the preview
        const existingImages = document.getElementById('imagePreview').querySelectorAll('img');
        existingImages.forEach(img => {
            if (img.src && img.src.startsWith('data:')) {
                images.push(img.src);
            }
        });
        
        // Then add any new files that were selected
        const newImagePromises = [];
        for (let i = 0; i < imageFiles.length; i++) {
            const promise = new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    // Compress the image to reduce storage size
                    this.compressImage(e.target.result, 800, 0.8).then(compressedImage => {
                        resolve(compressedImage);
                    }).catch(() => {
                        // If compression fails, use original
                        resolve(e.target.result);
                    });
                };
                reader.readAsDataURL(imageFiles[i]);
            });
            newImagePromises.push(promise);
        }
        
        // Wait for all new images to be processed
        const newImages = await Promise.all(newImagePromises);
        images.push(...newImages);
        
        return images;
    }
    
    // Compress images to reduce localStorage size
    async compressImage(dataUrl, maxWidth = 800, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Check current storage usage and adjust compression accordingly
                const currentUsage = this.checkLocalStorageUsage();
                let compressionQuality = quality;
                let compressionWidth = maxWidth;
                
                if (currentUsage > 7) {
                    // More aggressive compression when storage is getting full
                    compressionQuality = 0.6;
                    compressionWidth = 600;
                } else if (currentUsage > 5) {
                    // Moderate compression
                    compressionQuality = 0.7;
                    compressionWidth = 700;
                }
                
                // Calculate new dimensions
                let { width, height } = img;
                if (width > compressionWidth) {
                    height = (height * compressionWidth) / width;
                    width = compressionWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', compressionQuality);
                
                console.log(`Compressed image: ${width}x${height}, quality: ${compressionQuality}`);
                resolve(compressedDataUrl);
            };
            img.onerror = reject;
            img.src = dataUrl;
        });
    }
    
    removeImage(index) {
        // Remove the image from the preview
        const imageItems = document.querySelectorAll('.image-preview-item');
        if (imageItems[index]) {
            imageItems[index].remove();
        }
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
                
                // Calculate and display trail length
                let coordinates = [];
                if (geojson.type === 'Feature') {
                    coordinates = this.extractCoordinates(geojson.geometry);
                } else if (geojson.type === 'FeatureCollection' && geojson.features.length > 0) {
                    coordinates = this.extractCoordinates(geojson.features[0].geometry);
                }
                
                if (coordinates.length > 0) {
                    const length = this.calculateTrailLength(coordinates);
                    document.getElementById('importTrailLength').value = `${length} miles`;
                } else {
                    document.getElementById('importTrailLength').value = 'Could not calculate length';
                }
            } catch (error) {
                console.error('Invalid GeoJSON file:', error);
                alert('Invalid GeoJSON file. Please check the format.');
                document.getElementById('importTrailLength').value = 'Error reading file';
            }
        };
        reader.readAsText(file);
    }
    
    async importGeoJSON() {
        const file = document.getElementById('geojsonFile').files[0];
        const trailName = document.getElementById('importTrailName').value;
        const trailPark = document.getElementById('importTrailPark').value;
        
        if (!file || !trailName) {
            alert('Please select a file and enter a trail name.');
            return;
        }
        
        console.log('Starting GeoJSON import for trail:', trailName);
        console.log('File details:', { name: file.name, size: file.size, type: file.type });
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const geojson = JSON.parse(e.target.result);
                console.log('Successfully parsed GeoJSON:', geojson);
                console.log('GeoJSON type:', geojson.type);
                
                        // Extract trail data from GeoJSON
        let trailData = null;
        
        if (geojson.type === 'Feature') {
            console.log('Processing single Feature');
            trailData = this.extractTrailFromFeature(geojson, trailName, trailPark);
        } else if (geojson.type === 'FeatureCollection') {
            console.log('Processing FeatureCollection with', geojson.features.length, 'features');
            if (geojson.features.length > 0) {
                trailData = this.extractTrailFromFeature(geojson.features[0], trailName, trailPark);
            } else {
                alert('FeatureCollection contains no features.');
                return;
            }
        } else {
            alert('Unsupported GeoJSON type. Please use Feature or FeatureCollection.');
            return;
        }
        
        // Use the calculated length from the import form if available
        const calculatedLength = document.getElementById('importTrailLength').value;
        if (calculatedLength && calculatedLength !== 'Could not calculate length' && calculatedLength !== 'Error reading file') {
            const lengthMatch = calculatedLength.match(/(\d+\.?\d*)/);
            if (lengthMatch) {
                trailData.length = parseFloat(lengthMatch[1]);
                console.log('Using calculated length from form:', trailData.length);
            }
        }
                
                if (!trailData) {
                    alert('Could not extract trail data from GeoJSON file.');
                    return;
                }
                
                console.log('Successfully extracted trail data:', trailData);
                console.log('Trail coordinates:', trailData.coordinates);
                console.log('Calculated length:', trailData.length, 'miles');
                
                // Add new trail
                this.trails.push(trailData);
                console.log('Trail added to memory. Total trails:', this.trails.length);
                
                // Save to persistent storage
                const saveResult = await this.saveTrailToFile(trailData);
                console.log('Save result:', saveResult);
                
                this.closeModals();
                this.updateStatistics();
                this.renderTrailList();
                this.updateMapTrails();
                
                alert(`Trail "${trailName}" imported successfully!\nLength: ${trailData.length} miles\nCoordinates: ${trailData.coordinates.length} points`);
                
            } catch (error) {
                console.error('Error importing GeoJSON:', error);
                alert('Error importing GeoJSON file. Please check the format and try again.\n\nError: ' + error.message);
            }
        };
        
        reader.onerror = (error) => {
            console.error('FileReader error:', error);
            alert('Error reading the file. Please try again.');
        };
        
        reader.readAsText(file);
    }
    
    extractTrailFromFeature(feature, trailName, trailPark = '') {
        if (!feature || !feature.geometry) {
            console.error('Invalid feature or missing geometry');
            return null;
        }
        
        console.log('Extracting trail from feature:', feature);
        console.log('Geometry type:', feature.geometry.type);
        
        // Extract properties from the feature
        const properties = feature.properties || {};
        console.log('Feature properties:', properties);
        
        // Extract coordinates based on geometry type
        let coordinates = [];
        let length = 0;
        
        switch (feature.geometry.type) {
            case 'LineString':
                coordinates = feature.geometry.coordinates;
                console.log('LineString coordinates:', coordinates);
                length = this.calculateTrailLength(coordinates);
                break;
            case 'Polygon':
                // For polygons, use the outer ring as the trail
                coordinates = feature.geometry.coordinates[0];
                console.log('Polygon outer ring coordinates:', coordinates);
                length = this.calculateTrailLength(coordinates);
                break;
            case 'MultiLineString':
                // For multi-line strings, flatten all lines into one
                coordinates = feature.geometry.coordinates.flat();
                console.log('MultiLineString flattened coordinates:', coordinates);
                length = this.calculateTrailLength(coordinates);
                break;
            case 'MultiPolygon':
                // For multi-polygons, use the first polygon's outer ring
                coordinates = feature.geometry.coordinates[0][0];
                console.log('MultiPolygon first outer ring coordinates:', coordinates);
                length = this.calculateTrailLength(coordinates);
                break;
            default:
                console.error('Unsupported geometry type:', feature.geometry.type);
                return null;
        }
        
        if (coordinates.length === 0) {
            console.error('No coordinates extracted from geometry');
            return null;
        }
        
        console.log('Final coordinates array length:', coordinates.length);
        console.log('Calculated trail length:', length, 'miles');
        
        // Create trail object with extracted data
        const trailData = {
            id: Date.now(),
            name: trailName,
            park: trailPark,
            length: length,
            difficulty: properties.difficulty || properties.DIFFICULTY || 'moderate',
            status: properties.status || properties.STATUS || 'unhiked',
            dateHiked: properties.dateHiked || properties.DATE_HIKED || null,
            blogPost: properties.blogPost || properties.BLOG_POST || properties.description || properties.DESCRIPTION || '',
            images: properties.images || properties.IMAGES || [],
            coordinates: coordinates,
            // Store the original GeoJSON for reference
            originalGeoJSON: feature
        };
        
        console.log('Successfully created trail data object:', trailData);
        return trailData;
    }
    
    calculateTrailLength(coordinates) {
        if (coordinates.length < 2) return 0;
        
        let totalLength = 0;
        for (let i = 1; i < coordinates.length; i++) {
            const prev = coordinates[i - 1];
            const curr = coordinates[i];
            
            // Calculate distance between two points using Haversine formula
            const lat1 = prev[1] * Math.PI / 180;
            const lat2 = curr[1] * Math.PI / 180;
            const deltaLat = (curr[1] - prev[1]) * Math.PI / 180;
            const deltaLng = (curr[0] - prev[0]) * Math.PI / 180;
            
            const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                     Math.cos(lat1) * Math.cos(lat2) *
                     Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            
            // Earth's radius in miles
            const R = 3959;
            totalLength += R * c;
        }
        
        return Math.round(totalLength * 10) / 10; // Round to 1 decimal place
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
    
    selectTrail(trailName) {
        // Clear any existing highlight first
        this.clearTrailHighlight();
        
        // Find the selected trail
        const trail = this.trails.find(t => t.name === trailName);
        if (!trail) return;
        
        // Highlight the park polygon if the trail has a park
        if (trail.park) {
            this.highlightParkForTrail(trail.park);
        }
        
        // Zoom to trail and show description
        this.zoomToTrail(trailName);
        
        // Update the header button to show "Edit Trail" instead of "Add Trail"
        this.updateHeaderButton();
    }
    
    editTrail(trailName) {
        this.showTrailModal(trailName);
    }
    
    updateHeaderButton() {
        const addTrailBtn = document.getElementById('addTrailBtn');
        if (this.selectedTrail) {
            addTrailBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Trail';
            addTrailBtn.title = 'Edit Selected Trail';
        } else {
            addTrailBtn.innerHTML = '<i class="fas fa-plus"></i> Add Trail';
            addTrailBtn.title = 'Add New Trail';
        }
    }
    
    showTrailDescription(trailName) {
        const trail = this.trails.find(t => t.name === trailName);
        if (!trail) return;
        
        this.selectedTrail = trail;
        
        // Update description panel
        document.getElementById('descriptionTitle').textContent = trail.name;
        document.getElementById('trailDifficulty').textContent = trail.difficulty;
        document.getElementById('trailLength').textContent = `${trail.length} miles`;
        document.getElementById('trailStatus').textContent = trail.status;
        
        // Update description content
        const description = document.getElementById('trailDescription');
        if (trail.blogPost) {
            description.innerHTML = `<p>${trail.blogPost}</p>`;
        } else {
            description.innerHTML = '<p>No description available for this trail.</p>';
        }
        
        // Update images
        const imageGallery = document.getElementById('imageGallery');
        if (trail.images && trail.images.length > 0) {
            imageGallery.innerHTML = trail.images.map(img => 
                `<img src="${img}" alt="Trail photo" onclick="trailBlogger.openImageModal('${img}')" />`
            ).join('');
        } else {
            imageGallery.innerHTML = '<p>No photos available for this trail.</p>';
        }
        
        // Update stats
        const statsGrid = document.getElementById('statsGrid');
        statsGrid.innerHTML = `
            <div class="stat-item-detail">
                <span class="stat-label-detail">Length:</span>
                <span class="stat-value-detail">${trail.length} miles</span>
            </div>
            <div class="stat-item-detail">
                <span class="stat-label-detail">Difficulty:</span>
                <span class="stat-value-detail">${trail.difficulty}</span>
            </div>
            <div class="stat-item-detail">
                <span class="stat-label-detail">Status:</span>
                <span class="stat-value-detail">${trail.status}</span>
            </div>
            ${trail.park ? `
            <div class="stat-item-detail">
                <span class="stat-label-detail">Park:</span>
                <span class="stat-value-detail">${trail.park}</span>
            </div>
            ` : ''}
            ${trail.dateHiked ? `
            <div class="stat-item-detail">
                <span class="stat-label-detail">Date Hiked:</span>
                <span class="stat-value-detail">${new Date(trail.dateHiked).toLocaleDateString()}</span>
            </div>
            ` : ''}
        `;
        
        // Show description panel
        document.getElementById('descriptionPanel').classList.add('active');
        
        // Update header button to show "Edit Trail"
        this.updateHeaderButton();
    }
    
    closeDescriptionPanel() {
        document.getElementById('descriptionPanel').classList.remove('active');
        this.selectedTrail = null;
        
        // Reset header button to "Add Trail"
        this.updateHeaderButton();
    }
    
    zoomToTrail(trailName) {
        const trail = this.trails.find(t => t.name === trailName);
        if (!trail || !trail.coordinates || trail.coordinates.length === 0) {
            console.warn('Trail not found or no coordinates available:', trailName);
            console.log('Available trails:', this.trails.map(t => ({ name: t.name, coords: t.coordinates })));
            return;
        }
        
        console.log('Zooming to trail:', trailName);
        console.log('Trail coordinates:', trail.coordinates);
        
        // The coordinates are already in [lng, lat] format (GeoJSON standard)
        // Leaflet expects [lat, lng] format, so we need to convert
        const validCoordinates = trail.coordinates.map(coord => [coord[1], coord[0]]);
        
        console.log('Converted coordinates for Leaflet [lat, lng]:', validCoordinates);
        
        // Create bounds from trail coordinates
        const bounds = L.latLngBounds(validCoordinates);
        
        console.log('Map bounds:', bounds);
        
        // Fly to the trail with some padding
        this.map.flyToBounds(bounds, {
            padding: [50, 50],
            maxZoom: 16,
            duration: 1.5
        });
        
        // Highlight the trail with purple
        this.highlightTrail(trailName);
        
        // Show trail description
        this.showTrailDescription(trailName);
    }
    
    highlightTrail(trailName) {
        // Find the trail layer and highlight it with purple color
        if (this.trailOverlay) {
            this.trailOverlay.eachLayer((layer) => {
                if (layer.feature && layer.feature.properties.name === trailName) {
                    // Store original style
                    layer.originalStyle = {
                        color: layer.options.color,
                        weight: layer.options.weight,
                        opacity: layer.options.opacity
                    };
                    
                    // Apply highlight style with purple color and increased weight
                    layer.setStyle({
                        color: '#8B5CF6', // Purple
                        weight: 8,
                        opacity: 1,
                        fillOpacity: 0.2
                    });
                    
                    // Add CSS class for animation
                    layer.getElement()?.classList.add('trail-highlighted');
                }
            });
        }
    }
    
    clearTrailHighlight() {
        // Reset all trail styles to original
        if (this.trailOverlay) {
            this.trailOverlay.eachLayer((layer) => {
                // Remove CSS class
                layer.getElement()?.classList.remove('trail-highlighted');
                
                // Always reset to default style based on status
                const status = layer.feature.properties.status;
                layer.setStyle({
                    color: status === 'hiked' ? '#007cbf' : '#ffc107',
                    weight: 4,
                    opacity: 0.8
                });
                
                // Clear any stored original style
                delete layer.originalStyle;
            });
        }
        
        // Clear park highlight
        if (this.trailParkHighlight) {
            this.map.removeLayer(this.trailParkHighlight);
            this.trailParkHighlight = null;
        }
        
        // Clear selected trail and reset header button
        this.selectedTrail = null;
        this.updateHeaderButton();
    }
    
    openImageModal(imageSrc) {
        // Create a simple image modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 80%; max-height: 80%; padding: 0;">
                <div class="modal-header">
                    <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
                </div>
                <div class="modal-body" style="padding: 0;">
                    <img src="${imageSrc}" style="width: 100%; height: auto; display: block;" alt="Trail photo" />
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'block';
    }
    
    // Data persistence methods
    async saveTrailToFile(trailData) {
        try {
            console.log('Saving trail data to localStorage:', trailData.name);
            
            // Check storage usage before saving
            const currentUsage = this.checkLocalStorageUsage();
            if (currentUsage > 8) {
                const shouldContinue = confirm(
                    `Warning: Your trail data is taking up ${currentUsage.toFixed(2)} MB of storage.\n\n` +
                    `This is close to the localStorage limit and may cause errors.\n\n` +
                    `Would you like to:\n` +
                    `1. Continue anyway (may fail)\n` +
                    `2. Create a backup and clear old data first\n` +
                    `3. Cancel the save operation`
                );
                
                if (shouldContinue === false) {
                    return false;
                }
            }
            
            // Load existing trails from localStorage
            const trails = JSON.parse(localStorage.getItem('trailBlogger_trails') || '[]');
            console.log('Existing trails in localStorage:', trails.length);
            
            const existingIndex = trails.findIndex(t => t.name === trailData.name);
            if (existingIndex >= 0) {
                console.log('Updating existing trail at index:', existingIndex);
                // Preserve creation date and add update timestamp
                trailData.created_at = trails[existingIndex].created_at || new Date().toISOString();
                trailData.updated_at = new Date().toISOString();
                trails[existingIndex] = trailData;
            } else {
                console.log('Adding new trail to localStorage');
                trailData.created_at = new Date().toISOString();
                trailData.updated_at = new Date().toISOString();
                trails.push(trailData);
            }
            
            // Try to save with error handling
            try {
                localStorage.setItem('trailBlogger_trails', JSON.stringify(trails));
                console.log('Trails array saved to localStorage. Total trails:', trails.length);
            } catch (storageError) {
                if (storageError.name === 'QuotaExceededError') {
                    console.error('localStorage quota exceeded. Attempting to free space...');
                    
                    // Try to free space by removing old backups
                    this.cleanupOldBackups();
                    
                    // Try saving again
                    try {
                        localStorage.setItem('trailBlogger_trails', JSON.stringify(trails));
                        console.log('Successfully saved after cleanup');
                    } catch (retryError) {
                        console.error('Still cannot save after cleanup:', retryError);
                        alert(
                            'Unable to save trail data due to storage limits.\n\n' +
                            'Please:\n' +
                            '1. Create a backup of your data\n' +
                            '2. Remove some images from existing trails\n' +
                            '3. Clear browser data for this site\n' +
                            '4. Try again'
                        );
                        return false;
                    }
                } else {
                    throw storageError;
                }
            }
            
            // Also save as GeoJSON for compatibility (with error handling)
            try {
                const geojsonData = {
                    type: "FeatureCollection",
                    features: trails.map(trail => {
                        // Use original GeoJSON geometry if available, otherwise create LineString
                        const geometry = trail.originalGeoJSON && trail.originalGeoJSON.geometry 
                            ? trail.originalGeoJSON.geometry 
                            : {
                                type: "LineString",
                                coordinates: trail.coordinates
                            };
                        
                        return {
                            type: "Feature",
                            properties: {
                                name: trail.name,
                                length: trail.length,
                                difficulty: trail.difficulty,
                                status: trail.status,
                                date_hiked: trail.dateHiked,
                                blog_post: trail.blogPost,
                                images: trail.images,
                                created_at: trail.created_at,
                                updated_at: trail.updated_at
                            },
                            geometry: geometry
                        };
                    })
                };
                
                localStorage.setItem('trailBlogger_geojson', JSON.stringify(geojsonData));
                console.log('GeoJSON data saved to localStorage');
            } catch (geojsonError) {
                console.warn('Could not save GeoJSON data:', geojsonError);
                // Continue anyway - the main trails data was saved
            }
            
            // Try to save backup (optional - don't fail if this doesn't work)
            try {
                const backupKey = `trailBlogger_backup_${new Date().toISOString().split('T')[0]}`;
                localStorage.setItem(backupKey, JSON.stringify(trails));
            } catch (backupError) {
                console.warn('Could not save backup:', backupError);
            }
            
            // Verify the save worked
            const savedTrails = JSON.parse(localStorage.getItem('trailBlogger_trails') || '[]');
            console.log('Verification: trails in localStorage after save:', savedTrails.length);
            
            console.log('Trail data saved successfully to localStorage');
            return true;
        } catch (error) {
            console.error('Error saving trail data to localStorage:', error);
            alert('Error saving trail data. Please try again or create a backup first.');
            return false;
        }
    }
    
    async loadTrailsFromFile() {
        try {
            // First, try to load from localStorage
            const trails = JSON.parse(localStorage.getItem('trailBlogger_trails') || '[]');
            
            // If no local trails, load shared trails
            if (trails.length === 0) {
                try {
                    const response = await fetch('data/shared_trails.json');
                    if (response.ok) {
                        const sharedData = await response.json();
                        this.trails = sharedData.trails || [];
                        console.log(`Loaded ${this.trails.length} shared trails:`, this.trails.map(t => t.name));
                        
                        // Save shared trails to localStorage for future use
                        localStorage.setItem('trailBlogger_trails', JSON.stringify(this.trails));
                    }
                } catch (sharedError) {
                    console.log('No shared trails found, starting with empty trail list');
                    this.trails = [];
                }
            } else {
                this.trails = trails;
                console.log(`Loaded ${trails.length} trails from localStorage:`, trails.map(t => t.name));
            }
            
            // Log details about loaded data
            this.trails.forEach(trail => {
                console.log(`Trail: ${trail.name}`);
                console.log(`  - Length: ${trail.length} miles`);
                console.log(`  - Difficulty: ${trail.difficulty}`);
                console.log(`  - Status: ${trail.status}`);
                console.log(`  - Date Hiked: ${trail.dateHiked || 'Not hiked'}`);
                console.log(`  - Blog Post: ${trail.blogPost ? 'Yes' : 'No'}`);
                console.log(`  - Images: ${trail.images ? trail.images.length : 0} images`);
                console.log(`  - Coordinates: ${trail.coordinates ? trail.coordinates.length : 0} points`);
                console.log(`  - Created: ${trail.created_at || 'Unknown'}`);
                console.log(`  - Updated: ${trail.updated_at || 'Unknown'}`);
            });
            
            // Update the map with loaded trails
            this.updateMapTrails();
            
            return this.trails.length > 0;
        } catch (error) {
            console.error('Error loading trail data:', error);
            return false;
        }
    }
    
    updateMapTrails() {
        // Clear existing trail overlay
        if (this.trailOverlay) {
            this.map.removeLayer(this.trailOverlay);
        }
        
        // Create new GeoJSON from trails data
        const geojsonData = {
            type: "FeatureCollection",
            features: this.trails.map(trail => {
                // If the trail has original GeoJSON, use that geometry
                if (trail.originalGeoJSON && trail.originalGeoJSON.geometry) {
                    return {
                        type: "Feature",
                        properties: {
                            name: trail.name,
                            difficulty: trail.difficulty,
                            length: trail.length,
                            status: trail.status
                        },
                        geometry: trail.originalGeoJSON.geometry
                    };
                } else {
                    // Fallback to LineString for trails without original GeoJSON
                    return {
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
                    };
                }
            })
        };
        
        console.log('Updated GeoJSON data:', geojsonData);
        
        // Add updated trail overlay
        this.trailOverlay = L.geoJSON(geojsonData, {
            style: (feature) => {
                const status = feature.properties.status;
                return {
                    color: status === 'hiked' ? '#007cbf' : '#ffc107',
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
                            ${feature.properties.park ? `<span>Park: ${feature.properties.park}</span>` : ''}
                        </div>
                    </div>
                `;
                layer.bindPopup(popupContent);
                
                layer.on('click', () => {
                    this.zoomToTrail(feature.properties.name);
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
    
    addResetViewButton() {
        const mapControls = document.querySelector('.map-controls');
        if (!document.getElementById('resetViewBtn')) {
            const resetBtn = document.createElement('button');
            resetBtn.id = 'resetViewBtn';
            resetBtn.className = 'map-btn';
            resetBtn.title = 'Reset View';
            resetBtn.innerHTML = '<i class="fas fa-home"></i>';
            resetBtn.addEventListener('click', () => this.resetMapView());
            mapControls.appendChild(resetBtn);
        }
        
        // Add debug button (only in development)
        if (!document.getElementById('debugBtn')) {
            const debugBtn = document.createElement('button');
            debugBtn.id = 'debugBtn';
            debugBtn.className = 'map-btn';
            debugBtn.title = 'Debug Info';
            debugBtn.innerHTML = '<i class="fas fa-bug"></i>';
            debugBtn.addEventListener('click', () => this.showStoredData());
            mapControls.appendChild(debugBtn);
        }
    }
    
    resetMapView() {
        const park = this.parks[this.currentPark];
        this.map.flyTo(park.center, park.zoom, {
            duration: 1.5
        });
        this.clearTrailHighlight();
        this.closeDescriptionPanel();
    }
    
    // Debug method to clear all stored data
    clearAllData() {
        localStorage.removeItem('trailBlogger_trails');
        localStorage.removeItem('trailBlogger_geojson');
        this.trails = [];
        this.updateStatistics();
        this.renderTrailList();
        this.updateMapTrails();
        console.log('All trail data cleared');
    }
    
    // Remove images from trails to free storage space
    removeImagesFromTrails() {
        const trails = JSON.parse(localStorage.getItem('trailBlogger_trails') || '[]');
        let totalImagesRemoved = 0;
        let freedSpace = 0;
        
        trails.forEach(trail => {
            if (trail.images && trail.images.length > 0) {
                // Calculate size of images
                trail.images.forEach(img => {
                    if (img.startsWith('data:')) {
                        freedSpace += img.length;
                    }
                });
                
                totalImagesRemoved += trail.images.length;
                trail.images = []; // Remove all images
            }
        });
        
        if (totalImagesRemoved > 0) {
            // Save updated trails
            localStorage.setItem('trailBlogger_trails', JSON.stringify(trails));
            this.trails = trails;
            this.updateStatistics();
            this.renderTrailList();
            this.updateMapTrails();
            
            console.log(`Removed ${totalImagesRemoved} images, freed ${(freedSpace / 1024).toFixed(2)} KB`);
            alert(`Removed ${totalImagesRemoved} images from all trails.\nFreed ${(freedSpace / 1024).toFixed(2)} KB of storage space.`);
        } else {
            alert('No images found to remove.');
        }
    }
    
    // Restore data from backup file
    async restoreFromBackup(file) {
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const backupData = JSON.parse(e.target.result);
                    
                    if (!backupData.trails || !Array.isArray(backupData.trails)) {
                        alert('Invalid backup file. No trail data found.');
                        return;
                    }
                    
                    // Confirm restoration
                    const confirmRestore = confirm(
                        `Restore ${backupData.trails.length} trails from backup?\n\n` +
                        `This will replace all current data.\n\n` +
                        `Backup created: ${backupData.metadata?.backupCreated || 'Unknown'}\n` +
                        `Trails: ${backupData.trails.length}\n` +
                        `Images: ${backupData.metadata?.totalImages || 'Unknown'}`
                    );
                    
                    if (!confirmRestore) return;
                    
                    // Clear current data
                    this.clearAllData();
                    
                    // Restore trails
                    this.trails = backupData.trails;
                    
                    // Save to localStorage
                    localStorage.setItem('trailBlogger_trails', JSON.stringify(this.trails));
                    
                    // Update GeoJSON if available
                    if (backupData.geojson) {
                        localStorage.setItem('trailBlogger_geojson', JSON.stringify(backupData.geojson));
                    }
                    
                    // Update UI
                    this.updateStatistics();
                    this.renderTrailList();
                    this.updateMapTrails();
                    
                    console.log(`Restored ${this.trails.length} trails from backup`);
                    alert(`Successfully restored ${this.trails.length} trails from backup!`);
                    
                } catch (error) {
                    console.error('Error parsing backup file:', error);
                    alert('Error parsing backup file. Please check the file format.');
                }
            };
            reader.readAsText(file);
        } catch (error) {
            console.error('Error reading backup file:', error);
            alert('Error reading backup file. Please try again.');
        }
    }
    
    // Debug method to show current stored data
    showStoredData() {
        const trails = JSON.parse(localStorage.getItem('trailBlogger_trails') || '[]');
        console.log('Stored trails:', trails);
        console.log('Current trails in memory:', this.trails);
        
        // Check localStorage usage
        this.checkLocalStorageUsage();
        
        // Test coordinate conversion for each trail
        this.trails.forEach(trail => {
            console.log(`\nTrail: ${trail.name}`);
            console.log('Original coordinates [lng, lat]:', trail.coordinates);
            const converted = trail.coordinates.map(coord => [coord[1], coord[0]]);
            console.log('Converted coordinates [lat, lng]:', converted);
            
            // Test bounds creation
            const bounds = L.latLngBounds(converted);
            console.log('Bounds:', bounds);
            console.log('Bounds center:', bounds.getCenter());
        });
    }
    
    // Check localStorage usage and provide warnings
    checkLocalStorageUsage() {
        try {
            let totalSize = 0;
            const keys = Object.keys(localStorage);
            
            keys.forEach(key => {
                if (key.startsWith('trailBlogger_')) {
                    const size = localStorage.getItem(key).length;
                    totalSize += size;
                    console.log(`Key: ${key}, Size: ${(size / 1024).toFixed(2)} KB`);
                }
            });
            
            const totalKB = totalSize / 1024;
            const totalMB = totalKB / 1024;
            
            console.log(`Total TrailBlogger data: ${totalKB.toFixed(2)} KB (${totalMB.toFixed(2)} MB)`);
            
            // localStorage limit is typically 5-10 MB
            if (totalMB > 8) {
                console.warn('⚠️ localStorage is getting full! Consider creating a backup and clearing old data.');
                alert('Warning: Your trail data is taking up a lot of space. Consider creating a backup and removing some old images.');
            } else if (totalMB > 5) {
                console.warn('⚠️ localStorage usage is moderate. Consider compressing images.');
            }
            
            return totalMB;
        } catch (error) {
            console.error('Error checking localStorage usage:', error);
            return 0;
        }
    }
    
    // Clean up old backups to free storage space
    cleanupOldBackups() {
        try {
            const keys = Object.keys(localStorage);
            const backupKeys = keys.filter(key => 
                key.startsWith('trailBlogger_backup_') && 
                key !== 'trailBlogger_backup_' + new Date().toISOString().split('T')[0]
            );
            
            // Sort by date (oldest first)
            backupKeys.sort();
            
            // Remove oldest backups (keep the 2 most recent)
            const keysToRemove = backupKeys.slice(0, Math.max(0, backupKeys.length - 2));
            
            let freedSpace = 0;
            keysToRemove.forEach(key => {
                const size = localStorage.getItem(key).length;
                freedSpace += size;
                localStorage.removeItem(key);
                console.log(`Removed old backup: ${key} (${(size / 1024).toFixed(2)} KB)`);
            });
            
            if (freedSpace > 0) {
                console.log(`Freed ${(freedSpace / 1024).toFixed(2)} KB of storage space`);
                return freedSpace;
            }
            
            return 0;
        } catch (error) {
            console.error('Error cleaning up old backups:', error);
            return 0;
        }
    }
    
    // Export data for sharing
    exportDataForSharing() {
        const trails = JSON.parse(localStorage.getItem('trailBlogger_trails') || '[]');
        
        if (trails.length === 0) {
            alert('No trail data to export.');
            return;
        }
        
        // Create the shared data structure
        const sharedData = {
            trails: trails,
            exported_at: new Date().toISOString(),
            total_trails: trails.length,
            total_images: trails.reduce((sum, t) => sum + (t.images ? t.images.length : 0), 0)
        };
        
        // Create and download the file
        const dataStr = JSON.stringify(sharedData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'shared_trails.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert(`Exported ${trails.length} trails to shared_trails.json\n\nTo share this data:\n1. Replace the file in data/shared_trails.json\n2. Commit and push to GitHub\n3. Others will see your trails when they visit the site!`);
    }
    
    // Backup functionality
    async createBackup() {
        try {
            console.log('Creating backup of trail data...');
            
            // Get all trail data
            const trails = JSON.parse(localStorage.getItem('trailBlogger_trails') || '[]');
            const geojson = JSON.parse(localStorage.getItem('trailBlogger_geojson') || '{"type":"FeatureCollection","features":[]}');
            
            // Check localStorage usage before backup
            const usageMB = this.checkLocalStorageUsage();
            
            // Create backup object
            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.1',
                metadata: {
                    totalTrails: trails.length,
                    hikedTrails: trails.filter(t => t.status === 'hiked').length,
                    totalMiles: trails.filter(t => t.status === 'hiked').reduce((sum, t) => sum + t.length, 0),
                    totalImages: trails.reduce((sum, t) => sum + (t.images ? t.images.length : 0), 0),
                    storageSizeMB: usageMB,
                    backupCreated: new Date().toISOString()
                },
                trails: trails,
                geojson: geojson
            };
            
            // Create downloadable file
            const dataStr = JSON.stringify(backupData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            
            // Create download link
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `trailblogger_backup_${new Date().toISOString().split('T')[0]}_${trails.length}trails.json`;
            link.style.display = 'none';
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            URL.revokeObjectURL(link.href);
            
            console.log('Backup created successfully');
            console.log(`Backup contains ${trails.length} trails with ${backupData.metadata.totalImages} images`);
            alert(`Backup created successfully!\n\nTrails: ${trails.length}\nImages: ${backupData.metadata.totalImages}\nSize: ${usageMB.toFixed(2)} MB`);
            
        } catch (error) {
            console.error('Error creating backup:', error);
            alert('Error creating backup. Please try again.');
        }
    }
}

// Initialize the application when the page loads
let trailBlogger;
document.addEventListener('DOMContentLoaded', () => {
    trailBlogger = new TrailBlogger();
});
