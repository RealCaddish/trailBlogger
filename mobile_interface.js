// mobile_interface.js
// Handles mobile-specific UI for Trail Blogger

let originalMapBounds = null;

// Force mobile interface on narrow screens
function initMobileInterface() {
    const isMobile = window.innerWidth <= 768;
    console.log('=== MOBILE INTERFACE INIT ===');
    console.log('Window width:', window.innerWidth);
    console.log('Is mobile:', isMobile);
    
    if (!isMobile) {
        console.log('Desktop mode, skipping mobile interface');
        console.log('To see mobile version, resize window to <= 768px width');
        return;
    }
    
    console.log('Creating mobile UI elements...');
    
    // Create mobile overlay structure
    createFloatingActionButton();
    createMobileOverlay();
    createMobileDetailsPanel();
    setupMapClickHandler();
    
    console.log('Mobile UI elements created');
    
    // Wait for app to initialize
    let attempts = 0;
    const maxAttempts = 40; // Increased timeout
    
    const checkForTrails = () => {
        attempts++;
        console.log(`Attempt ${attempts}: Checking for trails...`);
        console.log('  window.app:', window.app);
        console.log('  window.TrailBlogger:', window.TrailBlogger);
        
        // Try to get trails from window.app or directly from TrailBlogger instance
        const appInstance = window.app || window.trailBlogger;
        
        if (appInstance && appInstance.trails && appInstance.trails.length > 0) {
            console.log('SUCCESS! Trails found:', appInstance.trails.length);
            console.log('First 3 trails:', appInstance.trails.slice(0, 3).map(t => t.name));
            
            // Make sure window.app is set
            if (!window.app) {
                console.log('Setting window.app from appInstance');
                window.app = appInstance;
            }
            
            populateMobileTrails();
            saveOriginalMapBounds();
        } else {
            console.log('Not ready yet. app:', !!window.app, 'TrailBlogger:', !!window.TrailBlogger);
            
            if (attempts < maxAttempts) {
                setTimeout(checkForTrails, 500);
            } else {
                console.error('TIMEOUT: Could not find trails after', maxAttempts, 'attempts');
                console.error('Final state - window.app:', window.app);
                console.error('Final state - window.TrailBlogger:', window.TrailBlogger);
                console.error('Try running: debugMobileTrails()');
            }
        }
    };
    
    setTimeout(checkForTrails, 1500); // Wait a bit longer for app.js to load
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('=== DOM Content Loaded ===');
    console.log('Starting mobile interface initialization...');
    initMobileInterface();
    
    // Also listen for trailsLoaded event as a fallback
    window.addEventListener('trailsLoaded', (event) => {
        console.log('=== trailsLoaded EVENT RECEIVED ===');
        console.log('Trails from event:', event.detail.trails.length);
        
        // Only populate if mobile and not already populated
        if (window.innerWidth <= 768 && window.app) {
            populateMobileTrails();
        }
    });
});

function createFloatingActionButton() {
    console.log('Creating FAB button...');
    const headerControls = document.querySelector('.header-controls');
    if (!headerControls) {
        console.error('Header controls not found, appending to body as fallback');
        const fab = document.createElement('button');
        fab.className = 'mobile-trails-fab';
        fab.id = 'mobileTrailsFab';
        fab.innerHTML = '<i class="fas fa-list"></i>';
        fab.title = 'View Trails';
        fab.style.display = 'flex';
        document.body.appendChild(fab);
        return;
    }
    
    // Check if button already exists
    let fab = document.getElementById('mobileTrailsFab');
    if (fab) {
        console.log('FAB button already exists, removing and recreating');
        fab.remove();
    }
    
    fab = document.createElement('button');
    fab.className = 'mobile-trails-fab btn';
    fab.id = 'mobileTrailsFab';
    fab.innerHTML = '<i class="fas fa-list"></i> Trails';
    fab.title = 'View Trails';
    fab.style.display = 'flex'; // Ensure it's visible
    fab.style.visibility = 'visible'; // Force visibility
    
    // Append to header-controls so it's on the same line as other buttons
    headerControls.appendChild(fab);
    console.log('FAB button created and added to header-controls');
    
    // Ensure button is visible immediately and stays visible
    fab.classList.remove('hidden');
    fab.style.display = 'flex';
    fab.style.visibility = 'visible';
    fab.style.opacity = '1';
    
    // Double-check after a short delay
    setTimeout(() => {
        if (fab.classList.contains('hidden')) {
            fab.classList.remove('hidden');
        }
        fab.style.display = 'flex';
        fab.style.visibility = 'visible';
    }, 200);
    
    fab.addEventListener('click', () => {
        console.log('FAB clicked, opening overlay');
        const overlay = document.getElementById('mobileTrailOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            fab.classList.add('hidden');
            
            // Ensure trails are populated and visible
            if (window.app && window.app.trails) {
                console.log('Refreshing trail cards on overlay open');
                populateMobileTrails();
                
                // Wait for DOM to update before filtering
                setTimeout(() => {
                    // Reset to "All" filter
                    const filterBtns = overlay.querySelectorAll('.filter-btn');
                    filterBtns.forEach(btn => {
                        if (btn.dataset.filter === 'all') {
                            btn.classList.add('active');
                        } else {
                            btn.classList.remove('active');
                        }
                    });
                    
                    // Check how many cards exist
                    const cardCount = document.querySelectorAll('.mobile-trail-card').length;
                    console.log('Cards in DOM before filter:', cardCount);
                    
                    filterMobileTrails('all');
                }, 100);
            } else {
                console.error('No trails available!', window.app);
            }
        } else {
            console.error('Overlay not found!');
        }
    });
}

function saveOriginalMapBounds() {
    if (window.app && window.app.map) {
        setTimeout(() => {
            originalMapBounds = window.app.map.getBounds();
            console.log('Original map bounds saved');
        }, 2000);
    }
}

function setupMapClickHandler() {
    // Wait for map to be initialized
    const checkMap = setInterval(() => {
        if (window.app && window.app.map) {
            clearInterval(checkMap);
            
            // Add click handler to map
            window.app.map.on('click', (e) => {
                // If details panel is open, close it and reset map
                const detailsPanel = document.getElementById('mobileTrailDetails');
                if (detailsPanel && detailsPanel.classList.contains('active')) {
                    closeMobileDetails();
                    resetMapView();
                }
            });
            
            console.log('Map click handler set up');
        }
    }, 500);
}

function createMobileOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'mobile-trail-overlay hidden'; // Start hidden
    overlay.id = 'mobileTrailOverlay';
    
    overlay.innerHTML = `
        <div class="mobile-overlay-header">
            <h3>Trails</h3>
            <button class="mobile-toggle-btn" id="mobileToggleBtn">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="mobile-trail-filters">
            <button class="filter-btn active" data-filter="all">All</button>
            <button class="filter-btn" data-filter="hiked">Hiked</button>
            <button class="filter-btn" data-filter="unhiked">To Do</button>
        </div>
        <div class="mobile-trail-scroll" id="mobileTrailScroll"></div>
    `;
    
    document.body.appendChild(overlay);
    
    // Toggle button functionality
    const toggleBtn = document.getElementById('mobileToggleBtn');
    const fab = document.getElementById('mobileTrailsFab');
    
    toggleBtn.addEventListener('click', () => {
        overlay.classList.add('hidden');
        if (fab) fab.classList.remove('hidden');
    });
    
    // Filter buttons
    const filterBtns = overlay.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            filterMobileTrails(filter);
        });
    });
}

function createMobileDetailsPanel() {
    const panel = document.createElement('div');
    panel.className = 'mobile-trail-details';
    panel.id = 'mobileTrailDetails';
    
    panel.innerHTML = `
        <div class="mobile-details-handle" id="mobileDetailsHandle"></div>
        <div class="mobile-details-content">
            <div class="mobile-details-header">
                <div>
                    <h2 id="mobileTrailName">Trail Name</h2>
                    <div class="mobile-trail-meta" id="mobileTrailMeta"></div>
                </div>
                <button class="mobile-close-btn" id="mobileCloseBtn" title="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="mobile-details-tabs">
                <button class="mobile-tab-btn active" data-tab="description">
                    <i class="fas fa-align-left"></i> Description
                </button>
                <button class="mobile-tab-btn" data-tab="photos">
                    <i class="fas fa-images"></i> Photos
                </button>
            </div>
            <div class="mobile-tab-content active" id="mobileTabDescription">
                <div class="mobile-trail-description" id="mobileTrailDescription"></div>
            </div>
            <div class="mobile-tab-content" id="mobileTabPhotos">
                <div class="mobile-trail-images" id="mobileTrailImages"></div>
            </div>
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // Close button
    document.getElementById('mobileCloseBtn').addEventListener('click', closeMobileDetails);
    
    // Handle drag to close/open and click to reopen
    const handle = document.getElementById('mobileDetailsHandle');
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let dragStartTime = 0;
    
    // Click handle to reopen if minimized
    handle.addEventListener('click', (e) => {
        // Only reopen on click if not dragging (quick tap)
        if (!isDragging && panel.classList.contains('minimized')) {
            e.preventDefault();
            e.stopPropagation();
            reopenMobileDetails();
        }
    });
    
    handle.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isDragging = true;
        dragStartTime = Date.now();
        panel.style.transition = 'none';
    });
    
    handle.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        const isMinimized = panel.classList.contains('minimized');
        
        if (isMinimized) {
            // When minimized, dragging up should open
            if (deltaY < 0) {
                // Dragging up - move panel up
                const currentTransform = panel.style.transform.match(/translateY\((-?\d+(?:\.\d+)?)px\)/);
                const currentOffset = currentTransform ? parseFloat(currentTransform[1]) : 0;
                const maxHeight = panel.offsetHeight || window.innerHeight * 0.75;
                const newOffset = Math.max(-maxHeight, deltaY);
                panel.style.transform = `translateY(${newOffset}px)`;
            }
        } else {
            // When open, dragging down should close
            if (deltaY > 0) {
                panel.style.transform = `translateY(${deltaY}px)`;
            }
        }
    });
    
    handle.addEventListener('touchend', () => {
        if (!isDragging) return;
        const dragDuration = Date.now() - dragStartTime;
        isDragging = false;
        panel.style.transition = '';
        
        const deltaY = currentY - startY;
        const isMinimized = panel.classList.contains('minimized');
        
        if (isMinimized) {
            // When minimized, dragging up > 50px or quick tap opens
            if (deltaY < -50 || (Math.abs(deltaY) < 10 && dragDuration < 200)) {
                reopenMobileDetails();
            } else {
                // Snap back to minimized
                panel.style.transform = '';
            }
        } else {
            // When open, dragging down > 100px closes
            if (deltaY > 100) {
                closeMobileDetails();
            } else {
                // Snap back
                panel.style.transform = '';
            }
        }
    });
    
    // Tab switching
    document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Update active tab button
            document.querySelectorAll('.mobile-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update active tab content
            document.querySelectorAll('.mobile-tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`mobileTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
        });
    });
    
    // Click outside to close (on backdrop)
    panel.addEventListener('click', (e) => {
        if (e.target === panel) {
            closeMobileDetails();
        }
    });
}

function populateMobileTrails() {
    console.log('=== populateMobileTrails called ===');
    
    if (!window.app || !window.app.trails) {
        console.error('App or trails not available yet', { app: window.app });
        return;
    }
    
    let trails = [...window.app.trails]; // Copy array
    console.log(`Found ${trails.length} trails to populate`);
    
    // Sort: Hiked trails first (most recent at top), then unhiked at bottom
    // Within hiked: sort by date (most recent first), then by name
    // Within unhiked: sort by name
    trails.sort((a, b) => {
        const statusA = (a.status || '').toLowerCase();
        const statusB = (b.status || '').toLowerCase();
        const isHikedA = statusA === 'hiked';
        const isHikedB = statusB === 'hiked';
        
        // Separate hiked from unhiked - hiked comes first
        if (isHikedA !== isHikedB) {
            return isHikedB ? 1 : -1; // If B is hiked, A comes first (hiked first)
        }
        
        // Both have same status
        if (isHikedA && isHikedB) {
            // Both hiked - sort by date (most recent first), then by name
            const dateA = a.dateHiked || a.date_hiked || '';
            const dateB = b.dateHiked || b.date_hiked || '';
            
            if (dateA && dateB) {
                // Both have dates - most recent first
                const dateCompare = new Date(dateB).getTime() - new Date(dateA).getTime();
                if (dateCompare !== 0) {
                    return dateCompare;
                }
            } else if (dateA && !dateB) {
                return -1; // A has date, B doesn't - A comes first
            } else if (!dateA && dateB) {
                return 1; // B has date, A doesn't - B comes first
            }
            
            // Same date or neither has date - sort by name
            return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
        } else {
            // Both unhiked - sort by name
            return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
        }
    });
    
    const container = document.getElementById('mobileTrailScroll');
    if (!container) {
        console.error('Mobile trail scroll container not found!');
        console.log('Looking for #mobileTrailScroll in document');
        console.log('Overlay exists:', !!document.getElementById('mobileTrailOverlay'));
        return;
    }
    
    console.log('Container found, clearing existing content');
    container.innerHTML = '';
    
    if (trails.length === 0) {
        console.warn('No trails in app.trails array');
        container.innerHTML = '<p style="padding: 2rem; text-align: center; color: #6c757d;">No trails found</p>';
        return;
    }
    
    // Don't group by park - show all trails in sorted order
    // Hiked trails first (most recent at top), then unhiked at bottom
    console.log('Creating trail cards in sorted order...');
    
    // Separate hiked and unhiked (already sorted by date)
    const hikedTrails = trails.filter(t => (t.status || '').toLowerCase() === 'hiked');
    const unhikedTrails = trails.filter(t => (t.status || '').toLowerCase() !== 'hiked');
    
    // Create cards for hiked trails (most recent first)
    hikedTrails.forEach((trail, index) => {
        const card = createMobileTrailCard(trail);
        container.appendChild(card);
        if (index < 2) {
            console.log(`Hiked card appended: ${trail.name}`);
        }
    });
    
    // Add separator if we have both hiked and unhiked
    if (hikedTrails.length > 0 && unhikedTrails.length > 0) {
        const separator = document.createElement('div');
        separator.className = 'mobile-park-header';
        separator.textContent = 'To Do';
        separator.style.marginTop = '1rem';
        container.appendChild(separator);
    }
    
    // Create cards for unhiked trails
    unhikedTrails.forEach((trail, index) => {
        const card = createMobileTrailCard(trail);
        container.appendChild(card);
        if (index < 2) {
            console.log(`Unhiked card appended: ${trail.name}`);
        }
    });
    
    // Log status counts for debugging
    const hiked = trails.filter(t => t.status === 'hiked').length;
    const unhiked = trails.filter(t => t.status !== 'hiked').length;
    console.log(`Trail status - Hiked: ${hiked}, Unhiked: ${unhiked}`);
    
    // Verify cards in container
    const cardsInContainer = container.querySelectorAll('.mobile-trail-card');
    console.log(`Cards in container after creation: ${cardsInContainer.length}`);
    
    // Verify cards in entire document
    const cardsInDocument = document.querySelectorAll('.mobile-trail-card');
    console.log(`Cards in entire document: ${cardsInDocument.length}`);
    
    // Ensure all cards are visible by default
    cardsInContainer.forEach((card, index) => {
        card.style.display = 'block';
        if (index < 3) {
            console.log(`Card ${index} display:`, card.style.display, 'Class:', card.className);
        }
    });
    
    console.log('=== populateMobileTrails complete ===');
}

function createMobileTrailCard(trail) {
    const card = document.createElement('div');
    card.className = 'mobile-trail-card';
    card.dataset.trailId = trail.id;
    card.dataset.status = trail.status || 'unhiked';
    card.dataset.park = trail.park || 'Other';
    card.style.display = 'block'; // Force visibility
    
    const status = trail.status === 'hiked' ? 'Hiked' : 'To Do';
    const statusClass = trail.status === 'hiked' ? 'hiked' : 'unhiked';
    const length = trail.length ? `${trail.length.toFixed(1)} mi` : '0 mi';
    const date = trail.date_hiked || trail.dateHiked || '';
    
    card.innerHTML = `
        <h4>${trail.name}</h4>
        <div class="mobile-trail-card-info">
            <span class="badge ${statusClass}">${status}</span>
            <span>${length}</span>
            ${date ? `<span>${date}</span>` : ''}
        </div>
    `;
    
    card.addEventListener('click', () => {
        console.log('Trail card clicked:', trail.name);
        handleMobileTrailClick(trail);
    });
    
    console.log('Created card for trail:', trail.name, 'Status:', card.dataset.status);
    
    return card;
}

function handleMobileTrailClick(trail) {
    console.log('Mobile trail clicked:', trail.name);
    
    // Hide the trail list overlay and show FAB
    const overlay = document.getElementById('mobileTrailOverlay');
    const fab = document.getElementById('mobileTrailsFab');
    
    if (overlay) {
        overlay.classList.add('hidden');
    }
    if (fab) {
        fab.classList.remove('hidden');
    }
    
    // Highlight selected card
    document.querySelectorAll('.mobile-trail-card').forEach(c => c.classList.remove('selected'));
    const selectedCard = document.querySelector(`.mobile-trail-card[data-trail-id="${trail.id}"]`);
    if (selectedCard) selectedCard.classList.add('selected');
    
    // Fly map to trail
    if (window.app && window.app.map && trail.coordinates) {
        try {
            const coords = trail.coordinates;
            let centerLat, centerLng;
            let bounds;
            
            if (Array.isArray(coords) && coords.length >= 2) {
                // Flatten coordinates if nested
                let flatCoords = coords;
                if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
                    // MultiLineString - flatten all lines
                    flatCoords = coords.flat();
                } else if (Array.isArray(coords[0]) && !Array.isArray(coords[0][0])) {
                    // Already flat array of [lng, lat] pairs
                    flatCoords = coords;
                }
                
                // Extract lat/lng arrays
                const lats = flatCoords.map(c => {
                    if (Array.isArray(c)) {
                        return c[1] || c.lat;
                    }
                    return c.lat || c.y;
                });
                const lngs = flatCoords.map(c => {
                    if (Array.isArray(c)) {
                        return c[0] || c.lng;
                    }
                    return c.lng || c.x;
                });
                
                // Convert coordinates to Leaflet format [lat, lng]
                const leafletCoords = flatCoords.map(c => {
                    if (Array.isArray(c)) {
                        return [c[1] || c.lat, c[0] || c.lng];
                    }
                    return [c.lat || c.y, c.lng || c.x];
                });
                
                // Create bounds from trail coordinates
                const bounds = L.latLngBounds(leafletCoords);
                
                // Position trail at the TOP of the visible map area, but fully visible
                // Balance between positioning at top and keeping trail fully in view
                const screenHeight = window.innerHeight;
                // Use 50-55% of screen height as bottom padding to account for panel
                const bottomPadding = Math.floor(screenHeight * 0.55);
                const topPadding = 80; // Top padding to keep trail visible
                const sidePadding = 30;
                
                // Calculate trail dimensions for positioning
                const center = bounds.getCenter();
                const latSpan = bounds.getNorth() - bounds.getSouth();
                const lngSpan = bounds.getEast() - bounds.getWest();
                
                // Strategy: Fit bounds with moderate bottom padding, then pan slightly
                // This positions trail at top while keeping it fully visible
                // For unhiked trails, zoom out more to show broader context
                const isHiked = trail.status === 'hiked';
                const maxZoomLevel = isHiked ? 13 : 11; // Lower zoom (more zoomed out) for unhiked trails
                
                if (window.app.map) {
                    // First, fit bounds with bottom padding to account for panel
                    if (window.app.map.flyToBounds && typeof window.app.map.flyToBounds === 'function') {
                        window.app.map.flyToBounds(bounds, {
                            padding: [topPadding, sidePadding, bottomPadding, sidePadding],
                            maxZoom: maxZoomLevel,
                            duration: 1.5,
                            easeLinearity: 0.5
                        });
                        
                        // After animation, pan slightly south to move trail UP on screen
                        // Use smaller pan amount to keep trail fully visible
                        setTimeout(() => {
                            const panPixels = screenHeight * 0.22; // Pan south by 22% of screen (increased slightly)
                            
                            window.app.map.panBy([0, panPixels], { // Positive Y pans south = moves content up
                                duration: 0.6
                            });
                        }, 1800); // After flyToBounds animation
                    } else if (window.app.map.fitBounds && typeof window.app.map.fitBounds === 'function') {
                        // Use fitBounds (immediate)
                        window.app.map.fitBounds(bounds, {
                            padding: [topPadding, sidePadding, bottomPadding, sidePadding],
                            maxZoom: maxZoomLevel
                        });
                        
                        // Then pan slightly south to move trail UP on screen
                        setTimeout(() => {
                            const panPixels = screenHeight * 0.25; // Pan south 25% of screen (increased slightly)
                            
                            window.app.map.panBy([0, panPixels], { // Positive Y pans south = moves content up
                                duration: 0.5
                            });
                        }, 150);
                    } else {
                        // Fallback: calculate shifted center to position trail at top
                        // Shift center SOUTH slightly to move trail UP on screen
                        const southShift = latSpan * 0.4; // Shift 40% of trail height south (increased slightly)
                        const shiftedCenter = [center.lat - southShift, center.lng]; // Subtract to go south
                        
                        const idealZoom = window.app.map.getBoundsZoom ? window.app.map.getBoundsZoom(bounds, false) : 12;
                        const zoom = Math.min(Math.max(idealZoom - 2, 10), maxZoomLevel);
                        
                        window.app.map.flyTo(shiftedCenter, zoom, {
                            duration: 1.5,
                            easeLinearity: 0.5
                        });
                    }
                }
                
                // Update trail overlay on map
                if (window.app.currentTrail) {
                    window.app.currentTrail = trail;
                    window.app.updateMapTrails();
                }
            }
        } catch (error) {
            console.error('Error flying to trail:', error);
        }
    }
    
    // Show trail details panel
    showMobileDetails(trail);
}

function showMobileDetails(trail) {
    const panel = document.getElementById('mobileTrailDetails');
    if (!panel) return;
    
    // Populate trail name
    document.getElementById('mobileTrailName').textContent = trail.name;
    
    // Populate meta info
    const metaContainer = document.getElementById('mobileTrailMeta');
    const status = trail.status === 'hiked' ? 'Hiked' : 'To Do';
    const statusClass = trail.status === 'hiked' ? 'hiked' : 'unhiked';
    const length = trail.length ? `${trail.length.toFixed(1)} mi` : '0 mi';
    const date = trail.date_hiked || trail.dateHiked || '';
    
    metaContainer.innerHTML = `
        <span class="badge ${statusClass}">${status}</span>
        <span class="badge">${length}</span>
        ${date ? `<span class="badge">${date}</span>` : ''}
    `;
    
    // Populate description
    const descContainer = document.getElementById('mobileTrailDescription');
    const description = trail.description || trail.blog_post || trail.blogPost || 'No description available.';
    descContainer.innerHTML = `<p>${description}</p>`;
    
    // Populate images
    const imagesContainer = document.getElementById('mobileTrailImages');
    imagesContainer.innerHTML = '';
    
    if (trail.images && trail.images.length > 0) {
        const imageBaseUrl = window.TrailBloggerConfig?.imageBaseUrl || './data/trail_images';
        
        trail.images.forEach(imgPath => {
            const img = document.createElement('img');
            
            // Construct image URL - handle Flask API paths
            let imgUrl;
            if (imgPath.includes('/api/trails/')) {
                // Extract trail ID and filename from Flask API path
                // Format: /api/trails/{trailId}/images/{filename}
                const apiMatch = imgPath.match(/\/api\/trails\/(\d+)\/images\/(.+)$/);
                if (apiMatch) {
                    const trailId = apiMatch[1];
                    const filename = apiMatch[2];
                    // Convert to static path: ./data/trail_images/trail-{trailId}/{filename}
                    imgUrl = `${imageBaseUrl}/trail-${trailId}/${filename}`;
                } else {
                    // Fallback: try to extract just the filename
                    const filename = imgPath.split('/').pop();
                    imgUrl = `${imageBaseUrl}/trail-${trail.id}/${filename}`;
                }
            } else if (imgPath.includes('/')) {
                // Already a relative or absolute path, use as-is
                imgUrl = imgPath;
            } else {
                // Just a filename, construct path
                imgUrl = `${imageBaseUrl}/trail-${trail.id}/${imgPath}`;
            }
            
            img.src = imgUrl;
            img.alt = trail.name;
            img.loading = 'lazy';
            
            img.onerror = () => {
                console.error('Failed to load image:', imgUrl);
                img.style.display = 'none';
            };
            
            imagesContainer.appendChild(img);
        });
    } else {
        // No images message
        imagesContainer.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 2rem;">No photos available for this trail.</p>';
    }
    
    // Handle tabs based on trail status
    const descTab = document.querySelector('.mobile-tab-btn[data-tab="description"]');
    const photosTab = document.querySelector('.mobile-tab-btn[data-tab="photos"]');
    const descContent = document.getElementById('mobileTabDescription');
    const photosContent = document.getElementById('mobileTabPhotos');
    
    const isHiked = trail.status === 'hiked';
    
    if (descTab && photosTab && descContent && photosContent) {
        if (!isHiked) {
            // For unhiked trails, hide description tab and show only photos
            descTab.style.display = 'none';
            descContent.style.display = 'none';
            photosTab.classList.add('active');
            descTab.classList.remove('active');
            photosContent.classList.add('active');
            descContent.classList.remove('active');
        } else {
            // For hiked trails, show both tabs and default to description
            descTab.style.display = 'flex';
            descContent.style.display = 'block';
            descTab.classList.add('active');
            photosTab.classList.remove('active');
            descContent.classList.add('active');
            photosContent.classList.remove('active');
        }
    }
    
    // Show panel with animation (remove minimized if present)
    panel.classList.remove('minimized');
    panel.classList.add('active');
}

function closeMobileDetails() {
    const panel = document.getElementById('mobileTrailDetails');
    if (panel) {
        // Instead of completely hiding, minimize it (show just handle)
        panel.classList.remove('active');
        panel.classList.add('minimized');
        // Reset transform in case it was dragged
        panel.style.transform = '';
    }
    
    // Don't clear selected card - user might want to reopen
    // document.querySelectorAll('.mobile-trail-card').forEach(c => c.classList.remove('selected'));
}

function reopenMobileDetails() {
    const panel = document.getElementById('mobileTrailDetails');
    if (panel) {
        panel.classList.remove('minimized');
        panel.classList.add('active');
    }
}

function resetMapView() {
    if (window.app && window.app.map && originalMapBounds) {
        console.log('Resetting map to original view');
        window.app.map.flyToBounds(originalMapBounds, {
            duration: 1.5,
            easeLinearity: 0.5
        });
    }
}

function filterMobileTrails(filter) {
    console.log(`Filtering trails by: ${filter}`);
    const cards = document.querySelectorAll('.mobile-trail-card');
    const parkHeaders = document.querySelectorAll('.mobile-park-header');
    console.log(`Found ${cards.length} cards and ${parkHeaders.length} headers to filter`);
    
    const container = document.getElementById('mobileTrailScroll');
    
    // Remove any existing "no trails" message
    const existingMessage = container?.querySelector('.no-trails-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    let visibleCount = 0;
    let shouldShowHeader = false;
    
    cards.forEach(card => {
        const status = card.dataset.status;
        
        if (filter === 'all') {
            card.style.display = 'block';
            visibleCount++;
        } else if (filter === 'hiked' && status === 'hiked') {
            card.style.display = 'block';
            visibleCount++;
            shouldShowHeader = true;
        } else if (filter === 'unhiked' && status !== 'hiked') {
            card.style.display = 'block';
            visibleCount++;
            shouldShowHeader = true;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show/hide "To Do" separator header based on filter
    parkHeaders.forEach(header => {
        const headerText = header.textContent.trim();
        // "To Do" header should only show when filtering "all" and we have both hiked and unhiked
        if (headerText === 'To Do') {
            if (filter === 'all') {
                // Show if there are unhiked trails visible
                const hasUnhikedVisible = Array.from(cards).some(card => 
                    card.style.display !== 'none' && card.dataset.status !== 'hiked'
                );
                header.style.display = hasUnhikedVisible ? 'block' : 'none';
            } else {
                header.style.display = 'none';
            }
        }
    });
    
    console.log(`${visibleCount} cards visible after filtering`);
    
    // Show message if no cards are visible
    if (visibleCount === 0 && container) {
        const message = document.createElement('p');
        message.className = 'no-trails-message';
        message.style.cssText = 'padding: 2rem; text-align: center; color: #6c757d;';
        message.textContent = `No ${filter === 'hiked' ? 'hiked' : filter === 'unhiked' ? 'unhiked' : ''} trails found`;
        container.appendChild(message);
    }
}

// Make functions globally available for debugging
window.populateMobileTrails = populateMobileTrails;
window.closeMobileDetails = closeMobileDetails;
window.debugMobileTrails = function() {
    console.log('=== DEBUG INFO ===');
    console.log('window.app:', window.app);
    console.log('window.app.trails:', window.app?.trails);
    console.log('Trail count:', window.app?.trails?.length);
    console.log('Overlay exists:', !!document.getElementById('mobileTrailOverlay'));
    console.log('Container exists:', !!document.getElementById('mobileTrailScroll'));
    console.log('FAB exists:', !!document.getElementById('mobileTrailsFab'));
    console.log('Cards in DOM:', document.querySelectorAll('.mobile-trail-card').length);
    
    if (window.app && window.app.trails) {
        console.log('Calling populateMobileTrails()...');
        populateMobileTrails();
    } else {
        console.error('Cannot populate - no trails available');
    }
};

