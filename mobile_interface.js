// mobile_interface.js
// Handles mobile-specific UI for Trail Blogger

let originalMapBounds = null;

document.addEventListener('DOMContentLoaded', () => {
    // Only run on mobile devices
    if (window.innerWidth > 768) return;
    
    console.log('Initializing mobile interface...');
    
    // Create mobile overlay structure
    createFloatingActionButton();
    createMobileOverlay();
    createMobileDetailsPanel();
    setupMapClickHandler();
    
    // Wait for app to initialize
    setTimeout(() => {
        if (window.app && window.app.trails) {
            populateMobileTrails();
            saveOriginalMapBounds();
        } else {
            console.log('Waiting for trails to load...');
            // Retry after app loads
            const checkInterval = setInterval(() => {
                if (window.app && window.app.trails && window.app.trails.length > 0) {
                    clearInterval(checkInterval);
                    populateMobileTrails();
                    saveOriginalMapBounds();
                }
            }, 500);
        }
    }, 1000);
});

function createFloatingActionButton() {
    const fab = document.createElement('button');
    fab.className = 'mobile-trails-fab';
    fab.id = 'mobileTrailsFab';
    fab.innerHTML = '<i class="fas fa-list"></i>';
    fab.title = 'View Trails';
    
    document.body.appendChild(fab);
    
    fab.addEventListener('click', () => {
        const overlay = document.getElementById('mobileTrailOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            fab.classList.add('hidden');
            
            // Ensure trails are populated and visible
            if (window.app && window.app.trails) {
                console.log('Refreshing trail cards on overlay open');
                populateMobileTrails();
                
                // Reset to "All" filter
                const filterBtns = overlay.querySelectorAll('.filter-btn');
                filterBtns.forEach(btn => {
                    if (btn.dataset.filter === 'all') {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
                filterMobileTrails('all');
            }
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
                <button class="mobile-close-btn" id="mobileCloseBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="mobile-trail-description" id="mobileTrailDescription"></div>
            <div class="mobile-trail-images" id="mobileTrailImages"></div>
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // Close button
    document.getElementById('mobileCloseBtn').addEventListener('click', closeMobileDetails);
    
    // Handle drag to close
    const handle = document.getElementById('mobileDetailsHandle');
    handle.addEventListener('click', closeMobileDetails);
}

function populateMobileTrails() {
    if (!window.app || !window.app.trails) {
        console.log('App or trails not available yet');
        return;
    }
    
    const trails = window.app.trails;
    console.log(`Populating ${trails.length} trails for mobile`);
    
    const container = document.getElementById('mobileTrailScroll');
    if (!container) {
        console.error('Mobile trail scroll container not found!');
        return;
    }
    
    container.innerHTML = '';
    
    if (trails.length === 0) {
        container.innerHTML = '<p style="padding: 2rem; text-align: center; color: #6c757d;">No trails found</p>';
        return;
    }
    
    trails.forEach(trail => {
        const card = createMobileTrailCard(trail);
        container.appendChild(card);
    });
    
    // Log status counts for debugging
    const hiked = trails.filter(t => t.status === 'hiked').length;
    const unhiked = trails.filter(t => t.status !== 'hiked').length;
    console.log(`Trail status - Hiked: ${hiked}, Unhiked: ${unhiked}`);
    
    // Ensure all cards are visible by default
    const cards = container.querySelectorAll('.mobile-trail-card');
    console.log(`Created ${cards.length} trail cards`);
    cards.forEach(card => {
        card.style.display = 'block';
    });
}

function createMobileTrailCard(trail) {
    const card = document.createElement('div');
    card.className = 'mobile-trail-card';
    card.dataset.trailId = trail.id;
    card.dataset.status = trail.status || 'unhiked';
    
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
        handleMobileTrailClick(trail);
    });
    
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
    const statusClass = trail.status === 'hiked' ? 'hiked' : '';
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
        
        // Add images heading
        const heading = document.createElement('h4');
        heading.textContent = 'Photos';
        imagesContainer.appendChild(heading);
        
        trail.images.forEach(imgFilename => {
            const img = document.createElement('img');
            
            // Construct image URL
            const imgUrl = imgFilename.includes('/')
                ? imgFilename
                : `${imageBaseUrl}/trail-${trail.id}/${imgFilename}`;
            
            img.src = imgUrl;
            img.alt = trail.name;
            img.loading = 'lazy';
            
            img.onerror = () => {
                console.error('Failed to load image:', imgUrl);
                img.style.display = 'none';
            };
            
            imagesContainer.appendChild(img);
        });
    }
    
    // Show panel with animation
    panel.classList.add('active');
}

function closeMobileDetails() {
    const panel = document.getElementById('mobileTrailDetails');
    if (panel) {
        panel.classList.remove('active');
    }
    
    // Clear selected card
    document.querySelectorAll('.mobile-trail-card').forEach(c => c.classList.remove('selected'));
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
    console.log(`Found ${cards.length} cards to filter`);
    
    const container = document.getElementById('mobileTrailScroll');
    
    // Remove any existing "no trails" message
    const existingMessage = container?.querySelector('.no-trails-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    let visibleCount = 0;
    
    cards.forEach(card => {
        const status = card.dataset.status;
        
        if (filter === 'all') {
            card.style.display = 'block';
            visibleCount++;
        } else if (filter === 'hiked' && status === 'hiked') {
            card.style.display = 'block';
            visibleCount++;
        } else if (filter === 'unhiked' && status !== 'hiked') {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
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

// Make functions globally available
window.populateMobileTrails = populateMobileTrails;
window.closeMobileDetails = closeMobileDetails;

