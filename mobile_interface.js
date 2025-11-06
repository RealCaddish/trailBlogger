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
    fab.className = 'mobile-trails-fab';
    fab.id = 'mobileTrailsFab';
    fab.innerHTML = '<i class="fas fa-list"></i>';
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
    
    // Handle drag down to close (only on handle)
    const handle = document.getElementById('mobileDetailsHandle');
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    
    handle.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isDragging = true;
        panel.style.transition = 'none';
    });
    
    handle.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        if (deltaY > 0) {
            panel.style.transform = `translateY(${deltaY}px)`;
        }
    });
    
    handle.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        panel.style.transition = '';
        
        const deltaY = currentY - startY;
        if (deltaY > 100) {
            // Dragged down enough to close
            closeMobileDetails();
        } else {
            // Snap back
            panel.style.transform = '';
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
    
    // Sort by park name, then by trail name
    trails.sort((a, b) => {
        const parkA = (a.park || '').toLowerCase();
        const parkB = (b.park || '').toLowerCase();
        if (parkA !== parkB) {
            return parkA.localeCompare(parkB);
        }
        return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
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
    
    // Group by park for better organization
    const trailsByPark = {};
    trails.forEach(trail => {
        const park = trail.park || 'Other';
        if (!trailsByPark[park]) {
            trailsByPark[park] = [];
        }
        trailsByPark[park].push(trail);
    });
    
    console.log('Creating trail cards grouped by park...');
    Object.keys(trailsByPark).sort().forEach(park => {
        // Add park header
        const parkHeader = document.createElement('div');
        parkHeader.className = 'mobile-park-header';
        parkHeader.textContent = park;
        container.appendChild(parkHeader);
        
        // Add trails for this park
        trailsByPark[park].forEach((trail, index) => {
            const card = createMobileTrailCard(trail);
            container.appendChild(card);
            if (index < 2) {
                console.log(`Card appended: ${trail.name} (${park})`);
            }
        });
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
            
            if (Array.isArray(coords) && coords.length >= 2) {
                if (Array.isArray(coords[0])) {
                    // Array of coordinates - find center
                    const lats = coords.map(c => c[1] || c.lat);
                    const lngs = coords.map(c => c[0] || c.lng);
                    centerLat = lats.reduce((a, b) => a + b) / lats.length;
                    centerLng = lngs.reduce((a, b) => a + b) / lngs.length;
                } else {
                    // Single coordinate
                    centerLat = coords[1] || coords.lat;
                    centerLng = coords[0] || coords.lng;
                }
                
                window.app.map.flyTo([centerLat, centerLng], 13, {
                    duration: 1.5,
                    easeLinearity: 0.5
                });
                
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
    
    // Reset to description tab when opening
    const descTab = document.querySelector('.mobile-tab-btn[data-tab="description"]');
    const photosTab = document.querySelector('.mobile-tab-btn[data-tab="photos"]');
    const descContent = document.getElementById('mobileTabDescription');
    const photosContent = document.getElementById('mobileTabPhotos');
    
    if (descTab && photosTab && descContent && photosContent) {
        descTab.classList.add('active');
        photosTab.classList.remove('active');
        descContent.classList.add('active');
        photosContent.classList.remove('active');
    }
    
    // Show panel with animation
    panel.classList.add('active');
}

function closeMobileDetails() {
    const panel = document.getElementById('mobileTrailDetails');
    if (panel) {
        panel.classList.remove('active');
        // Reset transform in case it was dragged
        panel.style.transform = '';
    }
    
    // Clear selected card
    document.querySelectorAll('.mobile-trail-card').forEach(c => c.classList.remove('selected'));
    
    // Reset map view when closing
    if (window.app && window.app.resetToWorldView) {
        // Don't reset map view automatically - let user control it
        // window.app.resetToWorldView();
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
    console.log(`Found ${cards.length} cards and ${parkHeaders.length} park headers to filter`);
    
    const container = document.getElementById('mobileTrailScroll');
    
    // Remove any existing "no trails" message
    const existingMessage = container?.querySelector('.no-trails-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    let visibleCount = 0;
    
    // Track which parks have visible trails
    const parksWithVisibleTrails = new Set();
    
    cards.forEach(card => {
        const status = card.dataset.status;
        const park = card.dataset.park || '';
        
        if (filter === 'all') {
            card.style.display = 'block';
            visibleCount++;
            if (park) parksWithVisibleTrails.add(park);
        } else if (filter === 'hiked' && status === 'hiked') {
            card.style.display = 'block';
            visibleCount++;
            if (park) parksWithVisibleTrails.add(park);
        } else if (filter === 'unhiked' && status !== 'hiked') {
            card.style.display = 'block';
            visibleCount++;
            if (park) parksWithVisibleTrails.add(park);
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show/hide park headers based on visible trails
    parkHeaders.forEach(header => {
        const parkName = header.textContent.trim();
        if (parksWithVisibleTrails.has(parkName)) {
            header.style.display = 'block';
        } else {
            header.style.display = 'none';
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

