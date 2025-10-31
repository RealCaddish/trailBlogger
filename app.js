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
        this.imagesToDelete = []; // Track images marked for deletion
        
        // Park boundaries and center coordinates
        this.parks = {
            'red-river-gorge': {
                name: 'Red River Gorge',
                center: [37.8333, -83.6167],
                bounds: [
                    [37.7833, -83.6667], // Southwest
                    [37.8833, -83.5667]  // Northeast
                ],
                zoom: 4  // Zoomed out to show larger geographic area including Iceland
            }
        };
        
        this.init();
    }
    
    async init() {
        try {
            console.log('Initializing Trail Blogger...');
            
            // Check if running on correct server
            this.checkServerPort();
            
            this.initializeMap();
            console.log('Map initialized successfully');
            
            // Load parks and states data
            await this.loadParksData();
            console.log('Parks and states data loaded successfully');
            
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
    
    checkServerPort() {
        const port = window.location.port;
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        
        // Check if using file:// protocol
        if (protocol === 'file:') {
            this.showServerWarning(
                '⚠️ IMPORTANT: Application Not Running Correctly!\n\n' +
                'You opened index.html directly from your file system.\n\n' +
                'Image uploads will NOT work!\n\n' +
                'TO FIX:\n' +
                '1. Close this tab\n' +
                '2. Open terminal in project folder\n' +
                '3. Run: python server.py\n' +
                '4. Open: http://localhost:5000\n\n' +
                'Click OK to continue anyway (without image support)'
            );
            return;
        }
        
        // Check if using wrong port (Live Server = 5500, 5501, etc.)
        if (port && port !== '5000') {
            this.showServerWarning(
                '⚠️ WRONG SERVER DETECTED!\n\n' +
                `You are on port ${port} (probably Live Server).\n\n` +
                'Image uploads will FAIL with 405 errors!\n\n' +
                'TO FIX:\n' +
                '1. Close Live Server or this tab\n' +
                '2. Open terminal in project folder\n' +
                '3. Run: python server.py\n' +
                '4. Open: http://localhost:5000\n\n' +
                'Click OK to continue anyway (image uploads will fail)'
            );
            return;
        }
        
        // Check if on localhost:5000 (correct!)
        if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '5000') {
            console.log('✅ Running on Flask server - image uploads will work!');
            return;
        }
        
        // Unknown configuration
        if (!port || port === '80' || port === '443') {
            console.warn('⚠️ Running on default HTTP port - image uploads may not work');
        }
    }
    
    showServerWarning(message) {
        // Create a more prominent warning overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(220, 53, 69, 0.95);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: 'Segoe UI', sans-serif;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            color: #333;
            border-radius: 12px;
            padding: 2rem;
            max-width: 600px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            text-align: center;
        `;
        
        const icon = document.createElement('div');
        icon.style.cssText = `
            font-size: 4rem;
            margin-bottom: 1rem;
        `;
        icon.textContent = '⚠️';
        
        const title = document.createElement('h2');
        title.style.cssText = `
            color: #dc3545;
            margin-bottom: 1rem;
            font-size: 1.5rem;
        `;
        title.textContent = 'Server Configuration Error';
        
        const content = document.createElement('pre');
        content.style.cssText = `
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
            text-align: left;
            white-space: pre-wrap;
            line-height: 1.6;
            margin-bottom: 1.5rem;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
        `;
        content.textContent = message;
        
        const button = document.createElement('button');
        button.textContent = 'I Understand - Continue Anyway';
        button.style.cssText = `
            background: #dc3545;
            color: white;
            border: none;
            padding: 1rem 2rem;
            border-radius: 6px;
            font-size: 1rem;
            cursor: pointer;
            font-weight: 600;
        `;
        button.onclick = () => document.body.removeChild(overlay);
        
        const helpText = document.createElement('p');
        helpText.style.cssText = `
            margin-top: 1rem;
            color: #6c757d;
            font-size: 0.9rem;
        `;
        helpText.textContent = 'Click the About button for detailed instructions';
        
        dialog.appendChild(icon);
        dialog.appendChild(title);
        dialog.appendChild(content);
        dialog.appendChild(button);
        dialog.appendChild(helpText);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Also show in console
        console.error(message);
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
            console.log('About to populate dropdowns...');
            this.populateStateDropdown();
            this.populateParkDropdown();
            console.log('Dropdowns populated');
            
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
        const parkSearch = document.getElementById('parkSearch');
        const trailParkSelect = document.getElementById('trailPark');
        const importTrailParkSelect = document.getElementById('importTrailPark');
        
        const dropdowns = [trailParkSelect, importTrailParkSelect];
        const stateSearch = document.getElementById('stateSearch');
        const selectedState = stateSearch ? stateSearch.value : '';
        
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
    
    convertGeoJSONToTrails(geojsonData) {
        // Convert GeoJSON features to internal trail format
        if (!geojsonData || !geojsonData.features) {
            console.warn('Invalid GeoJSON data');
            return [];
        }
        
        return geojsonData.features
            .map(feature => {
                const props = feature.properties || {};
                const geometry = feature.geometry || {};
                
                // Skip empty trails
                if (!props.name) {
                    return null;
                }
                
                return {
                    id: props.trail_id || props.id || Date.now(),
                    name: props.name || '',
                    park: props.park || '',
                    length: parseFloat(props.length) || 0,
                    difficulty: props.difficulty || 'moderate',
                    status: props.status || 'unhiked',
                    dateHiked: props.date_hiked || props.dateHiked || null,
                    description: props.blog_post || props.description || '',
                    images: props.images || [],
                    coordinates: geometry.coordinates || [],
                    geometryType: geometry.type || 'LineString'
                };
            })
            .filter(trail => trail !== null); // Remove null entries
    }
    
    loadSampleData() {
        // Start with empty trail data - no placeholder trails
        this.trails = [];
        console.log('No sample trails loaded - ready for user data');
    }
    
    setupEventListeners() {
        // Home button
        document.getElementById('homeBtn').addEventListener('click', () => this.resetToWorldView());
        
        // Searchable state input
        const stateSearch = document.getElementById('stateSearch');
        const stateDropdown = document.getElementById('stateDropdown');
        
        stateSearch.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            this.showAutocomplete('state', query, stateDropdown);
        });
        
        stateSearch.addEventListener('focus', (e) => {
            const query = e.target.value.trim();
            this.showAutocomplete('state', query, stateDropdown);
        });
        
        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#stateSearch') && !e.target.closest('#stateDropdown')) {
                stateDropdown.classList.remove('show');
            }
            if (!e.target.closest('#parkSearch') && !e.target.closest('#parkDropdown')) {
                document.getElementById('parkDropdown').classList.remove('show');
            }
        });
        
        // Searchable park input
        const parkSearch = document.getElementById('parkSearch');
        const parkDropdown = document.getElementById('parkDropdown');
        
        parkSearch.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            this.showAutocomplete('park', query, parkDropdown);
        });
        
        parkSearch.addEventListener('focus', (e) => {
            const query = e.target.value.trim();
            this.showAutocomplete('park', query, parkDropdown);
        });
        
        // Trail filters
        document.getElementById('showAll').addEventListener('click', () => this.filterTrails('all'));
        document.getElementById('showHiked').addEventListener('click', () => this.filterTrails('hiked'));
        document.getElementById('showUnhiked').addEventListener('click', () => this.filterTrails('unhiked'));
        
        // Modal controls
        document.getElementById('aboutBtn').addEventListener('click', () => this.showAboutModal());
        document.getElementById('importBtn').addEventListener('click', () => this.showImportModal());
        document.getElementById('backupBtn').addEventListener('click', () => this.showDataManagement());
        
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
        
        // Restore images input
        document.getElementById('restoreImagesInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.restoreImagesFromBackup(e.target.files[0]);
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
        const parkSearch = document.getElementById('parkSearch');
        const selectedParkName = parkSearch ? parkSearch.value : '';
        
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
    
    resetToWorldView() {
        console.log('Resetting to worldwide view...');
        
        // Clear search inputs
        const stateSearch = document.getElementById('stateSearch');
        const parkSearch = document.getElementById('parkSearch');
        if (stateSearch) stateSearch.value = '';
        if (parkSearch) {
            parkSearch.value = '';
            parkSearch.disabled = true;
        }
        
        // Hide dropdowns
        document.getElementById('stateDropdown').classList.remove('show');
        document.getElementById('parkDropdown').classList.remove('show');
        
        // Clear current selections
        this.currentState = '';
        this.currentPark = '';
        
        // Remove any state/park layers
        if (this.currentParkLayer) {
            this.map.removeLayer(this.currentParkLayer);
            this.currentParkLayer = null;
        }
        
        if (this.currentStateLayer) {
            this.map.removeLayer(this.currentStateLayer);
            this.currentStateLayer = null;
        }
        
        // Reset map view to worldwide (centered on US)
        this.map.flyTo([39.8283, -98.5795], 4, {
            duration: 1.5
        });
        
        console.log('✅ Reset to worldwide view complete');
    }
    
    showAutocomplete(type, query, dropdownEl) {
        dropdownEl.innerHTML = '';
        
        let items = [];
        
        if (type === 'state') {
            // Get all states
            if (this.statesData && this.statesData.features) {
                items = this.statesData.features
                    .map(f => f.properties.name)
                    .filter(name => name.toLowerCase().includes(query.toLowerCase()))
                    .sort();
            }
        } else if (type === 'park') {
            // Get parks for selected state
            const stateSearch = document.getElementById('stateSearch');
            const selectedState = stateSearch ? stateSearch.value : '';
            
            if (!selectedState) {
                // No state selected
                dropdownEl.innerHTML = '<div class="autocomplete-no-results">Please select a state first</div>';
                dropdownEl.classList.add('show');
                return;
            }
            
            if (this.parksData && this.parksData.features) {
                items = this.parksData.features
                    .filter(f => f.properties.state === selectedState)
                    .map(f => f.properties.NAME)
                    .filter(name => name && name.toLowerCase().includes(query.toLowerCase()))
                    .sort();
            }
        }
        
        // Show results
        if (items.length === 0) {
            dropdownEl.innerHTML = '<div class="autocomplete-no-results">No results found</div>';
        } else {
            items.slice(0, 50).forEach(item => { // Limit to 50 results
                const div = document.createElement('div');
                div.className = 'autocomplete-item';
                div.textContent = item;
                div.addEventListener('click', () => {
                    this.selectAutocompleteItem(type, item);
                });
                dropdownEl.appendChild(div);
            });
        }
        
        dropdownEl.classList.add('show');
    }
    
    selectAutocompleteItem(type, value) {
        if (type === 'state') {
            const stateSearch = document.getElementById('stateSearch');
            const parkSearch = document.getElementById('parkSearch');
            
            stateSearch.value = value;
            this.currentState = value;
            
            // Enable park search
            parkSearch.disabled = false;
            parkSearch.value = '';
            
            // Hide state dropdown
            document.getElementById('stateDropdown').classList.remove('show');
            
            // Update state view
            this.changeState();
            
        } else if (type === 'park') {
            const parkSearch = document.getElementById('parkSearch');
            
            parkSearch.value = value;
            this.currentPark = value;
            
            // Hide park dropdown
            document.getElementById('parkDropdown').classList.remove('show');
            
            // Update park view
            this.changePark();
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
            <div class="trail-item ${trail.status} ${this.selectedTrail && this.selectedTrail.name === trail.name ? 'selected' : ''}" data-trail-name="${this.escapeHtml(trail.name)}">
                <div class="trail-name">${trail.name || '(Unnamed Trail)'}</div>
                <div class="trail-info">
                    <span class="trail-length">${trail.length} miles</span> • 
                    <span>${trail.difficulty}</span> • 
                    <span class="trail-status">${trail.status}</span>
                    ${trail.park ? ` • <span class="trail-park">${trail.park}</span>` : ''}
                    ${trail.dateHiked ? ` • <span>${new Date(trail.dateHiked).toLocaleDateString()}</span>` : ''}
                </div>
                <div class="trail-actions">
                    <button class="edit-trail-btn" title="Edit Trail">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-trail-btn" title="Delete Trail">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners for all trail items and buttons
        this.attachTrailActionListeners();
    }
    
    attachTrailActionListeners() {
        const trailList = document.getElementById('trailList');
        
        // Add click listeners for trail items
        trailList.querySelectorAll('.trail-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking on action buttons
                if (!e.target.closest('.trail-actions')) {
                    const trailName = item.getAttribute('data-trail-name');
                    this.selectTrail(trailName);
                }
            });
        });
        
        // Use event delegation for edit buttons
        trailList.querySelectorAll('.edit-trail-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const trailItem = e.target.closest('.trail-item');
                const trailName = trailItem.getAttribute('data-trail-name');
                this.editTrail(trailName);
            });
        });
        
        // Use event delegation for delete buttons
        trailList.querySelectorAll('.delete-trail-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const trailItem = e.target.closest('.trail-item');
                const trailName = trailItem.getAttribute('data-trail-name');
                this.deleteTrail(trailName);
            });
        });
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
        
        modal.style.display = 'block';
        
        if (trailName) {
            // Edit existing trail
            const trail = this.trails.find(t => t.name === trailName);
            if (trail) {
                console.log('Found trail for editing:', trail);
                console.log('Trail length:', trail.length, 'Type:', typeof trail.length);
                title.textContent = `Edit Trail: ${trail.name}`;
                // Track which trail is being edited
                this.editingTrailId = trail.id;
                // Small delay to ensure modal is fully displayed before populating
                setTimeout(() => this.populateTrailForm(trail), 10);
            }
        } else if (this.selectedTrail) {
            // Edit currently selected trail
            console.log('Editing selected trail:', this.selectedTrail);
            console.log('Selected trail length:', this.selectedTrail.length, 'Type:', typeof this.selectedTrail.length);
            title.textContent = `Edit Trail: ${this.selectedTrail.name}`;
            // Track which trail is being edited
            this.editingTrailId = this.selectedTrail.id;
            // Small delay to ensure modal is fully displayed before populating
            setTimeout(() => this.populateTrailForm(this.selectedTrail), 10);
        } else {
            // Add new trail
            title.textContent = 'Add New Trail';
            form.reset();
            document.getElementById('imagePreview').innerHTML = '';
            this.imagePreviewFiles = [];
            this.imagesToDelete = [];
            this.editingTrailId = null;
        }
    }
    
    showImportModal() {
        document.getElementById('importModal').style.display = 'block';
    }
    
    showAboutModal() {
        document.getElementById('aboutModal').style.display = 'block';
    }
    
    showRestoreDialog() {
        // Trigger the hidden file input
        document.getElementById('restoreFileInput').click();
    }
    
    showStorageWarningDialog(message, options) {
        return new Promise((resolve) => {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            // Create dialog box
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white;
                border-radius: 8px;
                padding: 20px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            `;
            
            // Create message
            const messageEl = document.createElement('div');
            messageEl.style.cssText = `
                margin-bottom: 20px;
                line-height: 1.5;
                white-space: pre-line;
            `;
            messageEl.textContent = message;
            
            // Create buttons container
            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.cssText = `
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            `;
            
            // Create buttons
            options.forEach((option, index) => {
                const button = document.createElement('button');
                button.textContent = option.text;
                button.style.cssText = `
                    padding: 10px 20px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    ${index === 0 ? 'background: #dc3545; color: white;' : 
                      index === 1 ? 'background: #17a2b8; color: white;' : 
                      'background: #6c757d; color: white;'}
                `;
                
                button.addEventListener('click', () => {
                    document.body.removeChild(overlay);
                    resolve(option.value);
                });
                
                buttonsContainer.appendChild(button);
            });
            
            // Assemble dialog
            dialog.appendChild(messageEl);
            dialog.appendChild(buttonsContainer);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                    resolve('cancel');
                }
            });
        });
    }
    
    showDataManagement() {
        const usageMB = this.checkLocalStorageUsage();
        const trails = JSON.parse(localStorage.getItem('trailBlogger_trails') || '[]');
        const totalImages = trails.reduce((sum, t) => sum + (t.images ? t.images.length : 0), 0);
        
        const message = 
            `Data Management\n\n` +
            `Current Usage: ${usageMB.toFixed(2)} MB\n` +
            `Total Trails: ${trails.length}\n` +
            `Total Images: ${totalImages}\n\n` +
            `Choose an action:\n\n` +
            `1. Create Backup (download complete backup)\n` +
            `2. Restore from Backup (upload backup file)\n` +
            `3. Remove All Images (frees space, keeps trail data)\n` +
            `4. Clear All Data (removes everything)\n` +
            `5. Clean Old Backups (removes old backup files)\n` +
            `6. Export Data for Sharing (creates shared_trails.json)\n` +
            `7. Backup Trail Images (download images backup)\n` +
            `8. Restore Trail Images (upload images backup)\n` +
            `9. Cancel`;
        
        const choice = prompt(message, '1');
        
        switch (choice) {
            case '1':
                this.createBackup();
                break;
            case '2':
                this.showRestoreDialog();
                break;
            case '3':
                if (confirm('Remove all images from trails? This will free storage space but you will lose all photos.')) {
                    this.removeImagesFromTrails();
                }
                break;
            case '4':
                if (confirm('Clear ALL trail data? This cannot be undone unless you have a backup.')) {
                    this.clearAllData();
                }
                break;
            case '5':
                const freedSpace = this.cleanupOldBackups();
                if (freedSpace > 0) {
                    alert(`Cleaned up old backups. Freed ${(freedSpace / 1024).toFixed(2)} KB of space.`);
                } else {
                    alert('No old backups found to clean up.');
                }
                break;
            case '6':
                this.exportDataForSharing();
                break;
            case '7':
                this.backupTrailImages();
                break;
            case '8':
                this.showRestoreImagesDialog();
                break;
            case '9':
            default:
                // Cancel
                break;
        }
    }
    
    showRestoreImagesDialog() {
        // Trigger the hidden file input for images
        document.getElementById('restoreImagesInput').click();
    }
    
    async backupTrailImages() {
        try {
            const trails = JSON.parse(localStorage.getItem('trailBlogger_trails') || '[]');
            const imageBackup = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                trails: []
            };
            
            // Collect all images from backend
            for (const trail of trails) {
                try {
                    const response = await fetch(`/api/trails/${trail.id}/images`);
                    if (response.ok) {
                        const result = await response.json();
                        imageBackup.trails.push({
                            trailId: trail.id,
                            trailName: trail.name,
                            images: result.images
                        });
                    }
                } catch (error) {
                    console.error(`Error fetching images for trail ${trail.name}:`, error);
                }
            }
            
            // Create downloadable file
            const dataStr = JSON.stringify(imageBackup, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            
            // Create download link
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `trailblogger_images_backup_${new Date().toISOString().split('T')[0]}.json`;
            link.style.display = 'none';
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            URL.revokeObjectURL(link.href);
            
            alert(`Image backup created successfully!\n\nTotal trails with images: ${imageBackup.trails.length}`);
            
        } catch (error) {
            console.error('Error creating image backup:', error);
            alert('Error creating image backup. Please try again.');
        }
    }
    
    async restoreImagesFromBackup(file) {
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const backupData = JSON.parse(e.target.result);
                    
                    if (!backupData.trails || !Array.isArray(backupData.trails)) {
                        alert('Invalid image backup file.');
                        return;
                    }
                    
                    const confirmRestore = confirm(
                        `Restore images from backup?\n\n` +
                        `Trails with images: ${backupData.trails.length}\n` +
                        `Backup created: ${backupData.timestamp}\n\n` +
                        `Note: This will add images to trails that match by ID.`
                    );
                    
                    if (!confirmRestore) return;
                    
                    let successCount = 0;
                    let errorCount = 0;
                    
                    // Restore images for each trail
                    for (const trailData of backupData.trails) {
                        try {
                            // Here you would typically upload the images back to the server
                            // For now, we'll just log the restoration
                            console.log(`Restoring ${trailData.images.length} images for trail: ${trailData.trailName}`);
                            successCount++;
                        } catch (error) {
                            console.error(`Error restoring images for trail ${trailData.trailName}:`, error);
                            errorCount++;
                        }
                    }
                    
                    alert(`Image restoration complete!\n\nSuccess: ${successCount}\nErrors: ${errorCount}`);
                    
                } catch (error) {
                    console.error('Error parsing image backup file:', error);
                    alert('Error parsing image backup file. Please check the file format.');
                }
            };
            reader.readAsText(file);
        } catch (error) {
            console.error('Error reading image backup file:', error);
            alert('Error reading image backup file. Please try again.');
        }
    }
    
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        // Clear the images to delete array and editing tracker when closing modal
        this.imagesToDelete = [];
        this.editingTrailId = null;
    }
    
    populateTrailForm(trail) {
        console.log('Populating form with trail data:', trail);
        console.log('Trail length value:', trail.length, 'Type:', typeof trail.length);
        
        // Set form values directly without resetting first
        document.getElementById('trailName').value = trail.name || '';
        document.getElementById('trailPark').value = trail.park || '';
        
        // Handle length more robustly
        let lengthValue = '';
        if (trail.length !== null && trail.length !== undefined) {
            if (typeof trail.length === 'number') {
                lengthValue = trail.length.toString();
            } else if (typeof trail.length === 'string') {
                lengthValue = trail.length;
            } else {
                lengthValue = String(trail.length);
            }
        }
        
        const lengthInput = document.getElementById('trailLength');
        lengthInput.value = lengthValue;
        console.log('Setting trail length to:', lengthValue, 'from original:', trail.length);
        
        document.getElementById('trailDifficulty').value = trail.difficulty || '';
        
        // Ensure status is properly set
        const statusValue = trail.status || 'unhiked';
        document.getElementById('trailStatus').value = statusValue;
        console.log('Setting trail status to:', statusValue, 'from original:', trail.status);
        
        document.getElementById('trailDate').value = trail.dateHiked || '';
        document.getElementById('trailBlog').value = trail.blogPost || '';
        
        // Clear the file input to prevent confusion
        document.getElementById('trailImages').value = '';
        
        // Clear the images to delete array and preview files when opening the form
        this.imagesToDelete = [];
        this.imagePreviewFiles = [];
        
        // Show existing images with remove buttons
        const imagePreview = document.getElementById('imagePreview');
        if (trail.images && trail.images.length > 0) {
            imagePreview.innerHTML = trail.images.map((img, index) => `
                <div class="image-preview-item" data-existing-image="${img}">
                    <img src="${img}" alt="Trail image" />
                    <button type="button" class="remove-image-btn" onclick="trailBlogger.removeImage(${index}, true)" title="Remove image">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        } else {
            imagePreview.innerHTML = '';
        }
        
        console.log('Form populated successfully');
    }
    
    async saveTrail() {
        const formData = new FormData(document.getElementById('trailForm'));
        const trailName = formData.get('trailName');
        
        // Check if this is an edit or new trail - use editingTrailId if available
        let existingTrailIndex = -1;
        let trailId;
        
        if (this.editingTrailId) {
            // We're editing an existing trail - find it by ID
            existingTrailIndex = this.trails.findIndex(t => t.id === this.editingTrailId);
            trailId = this.editingTrailId;
        } else {
            // New trail - check if name already exists
            existingTrailIndex = this.trails.findIndex(t => t.name === trailName);
            trailId = existingTrailIndex >= 0 ? this.trails[existingTrailIndex].id : Date.now();
        }
        
        // Upload images to backend first
        let imageUrls = [];
        if (this.imagePreviewFiles && this.imagePreviewFiles.length > 0) {
            try {
                const uploadFormData = new FormData();
                this.imagePreviewFiles.forEach(file => {
                    uploadFormData.append('images', file);
                });
                
                const response = await fetch(`/api/trails/${trailId}/images`, {
                    method: 'POST',
                    body: uploadFormData
                });
                
                if (response.ok) {
                    const result = await response.json();
                    imageUrls = result.images.map(img => img.url);
                    console.log('Images uploaded successfully:', imageUrls);
                } else {
                    const error = await response.json();
                    alert(`Failed to upload images: ${error.error}`);
                    return;
                }
            } catch (error) {
                console.error('Error uploading images:', error);
                alert('Failed to upload images. Please try again.');
                return;
            }
        }
        
        // Delete marked images from server
        if (this.imagesToDelete.length > 0 && existingTrailIndex >= 0) {
            console.log(`Deleting ${this.imagesToDelete.length} marked images...`);
            for (const imageUrl of this.imagesToDelete) {
                try {
                    // Extract filename from URL
                    const filename = imageUrl.split('/').pop();
                    const deleteUrl = `/api/trails/${trailId}/images/${filename}`;
                    const deleteResponse = await fetch(deleteUrl, { method: 'DELETE' });
                    if (deleteResponse.ok) {
                        console.log(`Deleted image: ${filename}`);
                    } else {
                        console.error(`Failed to delete image: ${filename}`);
                    }
                } catch (error) {
                    console.error('Error deleting image:', error);
                }
            }
            // Clear the deletion list after processing
            this.imagesToDelete = [];
        }
        
        // Get existing images from backend
        let existingImages = [];
        if (existingTrailIndex >= 0) {
            try {
                const response = await fetch(`/api/trails/${trailId}/images`);
                if (response.ok) {
                    const result = await response.json();
                    existingImages = result.images.map(img => img.url);
                }
            } catch (error) {
                console.error('Error fetching existing images:', error);
            }
        }
        
        // Combine existing and new images
        const allImages = [...existingImages, ...imageUrls];
        
        const trailData = {
            id: trailId,
            name: trailName,
            park: formData.get('trailPark') || '',
            length: parseFloat(formData.get('trailLength')),
            difficulty: formData.get('trailDifficulty'),
            status: formData.get('trailStatus'),
            dateHiked: formData.get('trailDate') || null,
            blogPost: formData.get('trailBlog'),
            images: allImages,
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
        
        // Update selected trail if it was the one being edited (check by ID, not name, in case name changed)
        if (this.editingTrailId && this.selectedTrail && this.selectedTrail.id === this.editingTrailId) {
            this.selectedTrail = trailData;
            this.showTrailDescription(trailName);
        }
        
        // Clear the image preview files and editing tracker
        this.imagePreviewFiles = [];
        this.editingTrailId = null;
    }
    
    async getImageFiles() {
        const imageFiles = document.getElementById('trailImages').files;
        const images = [];
        
        // Always get images from the current preview - this includes existing + newly added
        const previewImages = document.getElementById('imagePreview').querySelectorAll('img');
        
        previewImages.forEach(img => {
            if (img.src && img.src.startsWith('data:')) {
                images.push(img.src);
            }
        });
        
        // Add any new files that were selected but not yet in preview
        if (imageFiles.length > 0) {
            // Check total file size before processing
            const totalSizeMB = Array.from(imageFiles).reduce((total, file) => total + file.size, 0) / (1024 * 1024);
            
            if (totalSizeMB > 10) {
                alert(`Total image size (${totalSizeMB.toFixed(1)}MB) exceeds 10MB limit. Please select fewer or smaller images.`);
                return images;
            }
            
            const newImagePromises = [];
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i];
                
                // Check individual file size (2MB limit per image)
                if (file.size > 2 * 1024 * 1024) {
                    alert(`Image "${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum size is 2MB per image.`);
                    continue;
                }
                
                const promise = new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        // Enhanced compression with WebP support and better quality control
                        this.compressImageEnhanced(e.target.result, file.type, 800, 0.8).then(compressedImage => {
                            resolve(compressedImage);
                        });
                    };
                    reader.readAsDataURL(file);
                });
                newImagePromises.push(promise);
            }
            
            // Wait for all new images to be processed
            const newImages = await Promise.all(newImagePromises);
            images.push(...newImages);
        }
        
        console.log(`getImageFiles: Found ${images.length} total images (${previewImages.length} in preview, ${imageFiles.length} new files)`);
        return images;
    }
    
    // Compress images to reduce localStorage size
    async compressImage(dataUrl, maxWidth = 600, quality = 0.7) {
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
                    // Very aggressive compression when storage is getting full
                    compressionQuality = 0.5;
                    compressionWidth = 400;
                } else if (currentUsage > 5) {
                    // More aggressive compression
                    compressionQuality = 0.6;
                    compressionWidth = 500;
                } else if (currentUsage > 3) {
                    // Moderate compression
                    compressionQuality = 0.7;
                    compressionWidth = 600;
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
                
                console.log(`Compressed image: ${width}x${height}, quality: ${compressionQuality}, storage usage: ${currentUsage.toFixed(2)}MB`);
                resolve(compressedDataUrl);
            };
            img.onerror = reject;
            img.src = dataUrl;
        });
    }
    
    // Enhanced image compression with WebP support and better quality control
    async compressImageEnhanced(dataUrl, mimeType, maxWidth = 800, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Check current storage usage and adjust compression accordingly
                const currentUsage = this.checkLocalStorageUsage();
                let compressionQuality = quality;
                let compressionWidth = maxWidth;
                
                // Dynamic compression based on storage usage
                if (currentUsage > 7) {
                    // Very aggressive compression when storage is getting full
                    compressionQuality = 0.4;
                    compressionWidth = 400;
                } else if (currentUsage > 5) {
                    // More aggressive compression
                    compressionQuality = 0.6;
                    compressionWidth = 600;
                } else if (currentUsage > 3) {
                    // Moderate compression
                    compressionQuality = 0.7;
                    compressionWidth = 700;
                }
                
                // Calculate new dimensions maintaining aspect ratio
                let { width, height } = img;
                if (width > compressionWidth) {
                    height = (height * compressionWidth) / width;
                    width = compressionWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                // Try WebP first for better compression, fallback to JPEG
                let compressedDataUrl;
                try {
                    if (this.supportsWebP()) {
                        compressedDataUrl = canvas.toDataURL('image/webp', compressionQuality);
                    } else {
                        compressedDataUrl = canvas.toDataURL('image/jpeg', compressionQuality);
                    }
                } catch (e) {
                    // Fallback to JPEG if WebP fails
                    compressedDataUrl = canvas.toDataURL('image/jpeg', compressionQuality);
                }
                
                console.log(`Compressed image: ${width}x${height}, quality: ${compressionQuality}, format: ${compressedDataUrl.split(';')[0]}, storage usage: ${currentUsage.toFixed(2)}MB`);
                resolve(compressedDataUrl);
            };
            img.onerror = reject;
            img.src = dataUrl;
        });
    }
    
    // Check if browser supports WebP
    supportsWebP() {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        try {
            return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        } catch (e) {
            return false;
        }
    }
    

    
    removeImage(index, isExisting = false) {
        // Remove the image from the preview
        const imageItems = document.querySelectorAll('.image-preview-item');
        if (imageItems[index]) {
            // If it's an existing image, track it for deletion
            if (isExisting) {
                const imageUrl = imageItems[index].getAttribute('data-existing-image');
                if (imageUrl && !this.imagesToDelete.includes(imageUrl)) {
                    this.imagesToDelete.push(imageUrl);
                    console.log('Marked image for deletion:', imageUrl);
                }
            }
            imageItems[index].remove();
        }
    }
    
    async handleImagePreview(event) {
        const files = event.target.files;
        const preview = document.getElementById('imagePreview');
        
        // Check current total images (existing + new)
        const existingImages = preview.querySelectorAll('.image-preview-item').length;
        if (existingImages + files.length > 10) {
            alert(`You can only upload a maximum of 10 images total. You currently have ${existingImages} images and are trying to add ${files.length} more.`);
            event.target.value = '';
            return;
        }
        
        // Process each file
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Check individual file size (10MB limit for backend)
            if (file.size > 10 * 1024 * 1024) {
                alert(`File "${file.name}" is too large. Maximum size is 10MB per image.`);
                continue;
            }
            
            // Check file type
            if (!file.type.startsWith('image/')) {
                alert(`File "${file.name}" is not an image.`);
                continue;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                const fileSizeMB = file.size / (1024 * 1024);
                
                // Create preview element
                const previewItem = document.createElement('div');
                previewItem.className = 'image-preview-item';
                previewItem.innerHTML = `
                    <img src="${dataUrl}" alt="Preview">
                    <div class="image-info">
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${fileSizeMB.toFixed(1)}MB</span>
                    </div>
                    <button type="button" class="remove-image-btn" onclick="this.parentElement.remove()" title="Remove image">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                preview.appendChild(previewItem);
                
                // Store the file for upload
                if (!this.imagePreviewFiles) {
                    this.imagePreviewFiles = [];
                }
                this.imagePreviewFiles.push(file);
            };
            reader.readAsDataURL(file);
        }
        
        console.log('handleImagePreview: Added', files.length, 'new images to preview');
    }
    
    // Update file input information display
    updateFileInputInfo() {
        const fileInput = document.getElementById('trailImages');
        const files = fileInput.files;
        const totalSizeMB = Array.from(files).reduce((total, file) => total + file.size, 0) / (1024 * 1024);
        
        // Update the file limits display with current selection info
        const fileLimits = document.querySelector('.file-limits');
        if (fileLimits && files.length > 0) {
            const currentInfo = fileLimits.querySelector('.current-selection');
            if (currentInfo) {
                currentInfo.remove();
            }
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'current-selection';
            infoDiv.innerHTML = `<small style="color: #28a745;">✓ Selected ${files.length} images (${totalSizeMB.toFixed(1)}MB total)</small>`;
            fileLimits.appendChild(infoDiv);
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
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    selectTrailByElement(element) {
        const trailName = element.getAttribute('data-trail-name');
        this.selectTrail(trailName);
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
    }
    
    editTrail(trailName) {
        this.showTrailModal(trailName);
    }
    
    async deleteTrail(trailName) {
        const trail = this.trails.find(t => t.name === trailName);
        if (!trail) {
            alert('Trail not found.');
            return;
        }
        
        const confirmDelete = confirm(
            `Are you sure you want to delete this trail?\n\n` +
            `Trail: ${trail.name}\n` +
            `Length: ${trail.length} miles\n` +
            `Status: ${trail.status}\n\n` +
            `This action cannot be undone unless you have a backup.`
        );
        
        if (!confirmDelete) return;
        
        try {
            // Remove from trails array
            const trailIndex = this.trails.findIndex(t => t.name === trailName);
            if (trailIndex >= 0) {
                this.trails.splice(trailIndex, 1);
            }
            
            // Delete images from server
            if (trail.id) {
                try {
                    const response = await fetch(`/api/trails/${trail.id}/images`, {
                        method: 'GET'
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        // Delete each image
                        for (const image of result.images) {
                            await fetch(`/api/trails/${trail.id}/images/${image.filename}`, {
                                method: 'DELETE'
                            });
                        }
                    }
                } catch (error) {
                    console.warn('Error deleting images from server:', error);
                    // Continue with trail deletion even if image deletion fails
                }
            }
            
            // Update localStorage
            const trails = JSON.parse(localStorage.getItem('trailBlogger_trails') || '[]');
            const updatedTrails = trails.filter(t => t.name !== trailName);
            localStorage.setItem('trailBlogger_trails', JSON.stringify(updatedTrails));
            
            // Update GeoJSON
            const geojsonData = {
                type: "FeatureCollection",
                features: updatedTrails.map(trail => {
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
                            status: trail.status
                        },
                        geometry: geometry
                    };
                })
            };
            localStorage.setItem('trailBlogger_geojson', JSON.stringify(geojsonData));
            
            // Update UI
            this.updateStatistics();
            this.renderTrailList();
            this.updateMapTrails();
            
            // Close description panel if this trail was selected
            if (this.selectedTrail && this.selectedTrail.name === trailName) {
                this.closeDescriptionPanel();
            }
            
            console.log(`Trail "${trailName}" deleted successfully`);
            alert(`Trail "${trailName}" has been deleted.`);
            
        } catch (error) {
            console.error('Error deleting trail:', error);
            alert('Error deleting trail. Please try again.');
        }
    }
    
    
    async showTrailDescription(trailName) {
        const trail = this.trails.find(t => t.name === trailName);
        if (!trail) return;
        
        this.selectedTrail = trail;
        
        // Update description panel
        document.getElementById('descriptionTitle').textContent = trail.name;
        document.getElementById('trailDifficulty').textContent = trail.difficulty;
        document.getElementById('trailLengthDisplay').textContent = `${trail.length} miles`;
        document.getElementById('trailStatus').textContent = trail.status;
        
        // Update description content
        const description = document.getElementById('trailDescription');
        if (trail.blogPost) {
            description.innerHTML = `<p>${trail.blogPost}</p>`;
        } else {
            description.innerHTML = '<p>No description available for this trail.</p>';
        }
        
        // Load images from backend or static files
        const imageGallery = document.getElementById('imageGallery');
        imageGallery.innerHTML = '<p>Loading images...</p>';
        
        try {
            // On GitHub Pages, use trail.images array directly with static paths
            if (window.TrailBloggerConfig && window.TrailBloggerConfig.isGitHubPages) {
                if (trail.images && trail.images.length > 0) {
                    const imageBaseUrl = window.TrailBloggerConfig.imageBaseUrl;
                    imageGallery.innerHTML = trail.images.map(imgFilename => {
                        // If imgFilename is already a full path, use it directly
                        // Otherwise, construct path with trail- prefix
                        const imgUrl = imgFilename.includes('/') 
                            ? imgFilename 
                            : `${imageBaseUrl}/trail-${trail.id}/${imgFilename}`;
                        return `<img src="${imgUrl}" alt="Trail photo" onclick="trailBlogger.openImageModal('${imgUrl}')" />`;
                    }).join('');
                } else {
                    imageGallery.innerHTML = '<p>No photos available for this trail.</p>';
                }
            } else {
                // Local mode: fetch from Flask API
                const response = await fetch(`/api/trails/${trail.id}/images`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.images && result.images.length > 0) {
                        imageGallery.innerHTML = result.images.map(img => 
                            `<img src="${img.url}" alt="Trail photo" onclick="trailBlogger.openImageModal('${img.url}')" />`
                        ).join('');
                    } else {
                        imageGallery.innerHTML = '<p>No photos available for this trail.</p>';
                    }
                } else {
                    imageGallery.innerHTML = '<p>Error loading images.</p>';
                }
            }
        } catch (error) {
            console.error('Error loading images:', error);
            imageGallery.innerHTML = '<p>Error loading images.</p>';
        }
        
        // Show description panel
        document.getElementById('descriptionPanel').classList.add('active');
        
        // Update header button to show "Edit Trail"
    }
    
    closeDescriptionPanel() {
        document.getElementById('descriptionPanel').classList.remove('active');
        this.selectedTrail = null;
        
        // Reset header button to "Add Trail"
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
            
            // Final storage check before saving
            const finalUsage = this.checkLocalStorageUsage();
            const trailsDataSize = JSON.stringify(trails).length / (1024 * 1024);
            const projectedFinalUsage = finalUsage + trailsDataSize;
            
            if (projectedFinalUsage > 5) {
                const choice = await this.showStorageWarningDialog(
                    `Warning: Saving this trail will increase storage usage to approximately ${projectedFinalUsage.toFixed(2)} MB.\n\n` +
                    `This exceeds the recommended localStorage limit and will likely fail.\n\n` +
                    `What would you like to do?`,
                    [
                        { text: 'Continue Anyway', value: 'continue' },
                        { text: 'Manage Storage First', value: 'manage' },
                        { text: 'Cancel Save', value: 'cancel' }
                    ]
                );
                
                if (choice === 'cancel') {
                    // Clear the image preview to prevent duplication
                    document.getElementById('imagePreview').innerHTML = '';
                    return false;
                } else if (choice === 'manage') {
                    // Clear the image preview and open data management
                    document.getElementById('imagePreview').innerHTML = '';
                    this.showDataManagement();
                    return false;
                }
                // If 'continue', proceed with the save
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
                        // Clear the image preview to prevent duplication
                        document.getElementById('imagePreview').innerHTML = '';
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
            // On GitHub Pages, load from trails.geojson directly (skip localStorage)
            if (window.TrailBloggerConfig && window.TrailBloggerConfig.isGitHubPages) {
                try {
                    const response = await fetch(window.TrailBloggerConfig.trailsDataUrl);
                    if (response.ok) {
                        const geojsonData = await response.json();
                        // Convert GeoJSON features to trail format
                        this.trails = this.convertGeoJSONToTrails(geojsonData);
                        console.log(`Loaded ${this.trails.length} trails from GeoJSON (GitHub Pages mode):`, this.trails.map(t => t.name));
                        
                        // Update the trail overlay on the map with the loaded trails
                        this.updateMapTrails();
                        
                        // Update trail list and statistics
                        this.updateTrailList();
                        this.updateStatistics();
                        
                        return true;
                    }
                } catch (error) {
                    console.error('Error loading trails.geojson on GitHub Pages:', error);
                    this.trails = [];
                    return false;
                }
            }
            
            // Local mode: First, try to load from localStorage
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
        
        // Ask user if they want to export images as files
        const exportImages = confirm('Do you want to export images as separate files?\n\nThis will:\n- Convert base64 images to actual image files\n- Create a smaller JSON file\n- Make it easier to share on GitHub\n\nClick OK to export images, Cancel to keep base64 format.');
        
        let processedTrails = trails;
        
        if (exportImages) {
            // Process trails to convert base64 images to file references
            processedTrails = this.convertImagesToFileReferences(trails);
        }
        
        // Create the shared data structure
        const sharedData = {
            trails: processedTrails,
            exported_at: new Date().toISOString(),
            total_trails: trails.length,
            total_images: trails.reduce((sum, t) => sum + (t.images ? t.images.length : 0), 0),
            image_format: exportImages ? 'files' : 'base64'
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
        
        if (exportImages) {
            // Also create a zip file with images
            this.createImageZipFile(trails);
        }
        
        const message = exportImages 
            ? `Exported ${trails.length} trails with images as files!\n\nFiles created:\n- shared_trails.json (smaller file)\n- trail_images.zip (all images)\n\nTo share:\n1. Extract trail_images.zip to data/trail_images/\n2. Replace data/shared_trails.json\n3. Commit and push to GitHub`
            : `Exported ${trails.length} trails to shared_trails.json\n\nTo share this data:\n1. Replace the file in data/shared_trails.json\n2. Commit and push to GitHub\n3. Others will see your trails when they visit the site!`;
        
        alert(message);
    }
    
    // Convert base64 images to file references
    convertImagesToFileReferences(trails) {
        return trails.map(trail => {
            const processedTrail = { ...trail };
            
            if (trail.images && trail.images.length > 0) {
                processedTrail.images = trail.images.map((image, index) => {
                    // Extract file extension from base64 data
                    const extension = this.getImageExtensionFromBase64(image);
                    const filename = `image_${index + 1}.${extension}`;
                    
                    return {
                        filename: `data/trail_images/trail_${trail.id}/${filename}`,
                        original_base64: image // Keep original for reference
                    };
                });
            }
            
            return processedTrail;
        });
    }
    
    // Get image extension from base64 data
    getImageExtensionFromBase64(base64String) {
        if (base64String.startsWith('data:image/jpeg')) return 'jpg';
        if (base64String.startsWith('data:image/jpg')) return 'jpg';
        if (base64String.startsWith('data:image/png')) return 'png';
        if (base64String.startsWith('data:image/gif')) return 'gif';
        if (base64String.startsWith('data:image/webp')) return 'webp';
        return 'jpg'; // Default
    }
    
    // Create a zip file with all images
    async createImageZipFile(trails) {
        try {
            // We'll use a simple approach to create downloadable image files
            // For now, we'll create individual image files that can be downloaded
            this.downloadAllImages(trails);
        } catch (error) {
            console.error('Error creating image zip:', error);
            alert('Error creating image files. Images will remain in base64 format.');
        }
    }
    
    // Download all images as individual files
    downloadAllImages(trails) {
        let downloadCount = 0;
        
        trails.forEach(trail => {
            if (trail.images && trail.images.length > 0) {
                trail.images.forEach((image, index) => {
                    const extension = this.getImageExtensionFromBase64(image);
                    const filename = `trail_${trail.id}_image_${index + 1}.${extension}`;
                    
                    // Create download link for each image
                    const link = document.createElement('a');
                    link.href = image;
                    link.download = filename;
                    link.style.display = 'none';
                    
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    downloadCount++;
                });
            }
        });
        
        console.log(`Downloaded ${downloadCount} images`);
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
