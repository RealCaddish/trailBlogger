// mobile_interface.js
// Handles mobile-specific UI for Trail Blogger

document.addEventListener('DOMContentLoaded', () => {
    // Only run on mobile devices
    if (window.innerWidth > 768) return;
    
    console.log('Initializing mobile interface...');
    
    // Create mobile overlay structure
    createMobileOverlay();
    createMobileDetailsPanel();
    
    // Wait for app to initialize
    setTimeout(() => {
        if (window.app && window.app.trails) {
            populateMobileTrails();
        } else {
            console.log('Waiting for trails to load...');
            // Retry after app loads
            const checkInterval = setInterval(() => {
                if (window.app && window.app.trails && window.app.trails.length > 0) {
                    clearInterval(checkInterval);
                    populateMobileTrails();
                }
            }, 500);
        }
    }, 1000);
});

function createMobileOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'mobile-trail-overlay';
    overlay.id = 'mobileTrailOverlay';
    
    overlay.innerHTML = `
        <div class="mobile-overlay-header">
            <h3>Trails</h3>
            <button class="mobile-toggle-btn" id="mobileToggleBtn">
                <i class="fas fa-chevron-up"></i>
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
    toggleBtn.addEventListener('click', () => {
        overlay.classList.toggle('hidden');
        const icon = toggleBtn.querySelector('i');
        if (overlay.classList.contains('hidden')) {
            icon.className = 'fas fa-chevron-down';
        } else {
            icon.className = 'fas fa-chevron-up';
        }
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
    if (!container) return;
    
    container.innerHTML = '';
    
    trails.forEach(trail => {
        const card = createMobileTrailCard(trail);
        container.appendChild(card);
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
    
    // Hide the trail list overlay
    const overlay = document.getElementById('mobileTrailOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
        const icon = document.getElementById('mobileToggleBtn')?.querySelector('i');
        if (icon) icon.className = 'fas fa-chevron-down';
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
    } else {
        imagesContainer.innerHTML = '<p>No images available.</p>';
    }
    
    // Show panel with animation
    panel.classList.add('active');
}

function closeMobileDetails() {
    const panel = document.getElementById('mobileTrailDetails');
    if (panel) {
        panel.classList.remove('active');
    }
    
    // Show trail list again
    const overlay = document.getElementById('mobileTrailOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        const icon = document.getElementById('mobileToggleBtn')?.querySelector('i');
        if (icon) icon.className = 'fas fa-chevron-up';
    }
    
    // Clear selected card
    document.querySelectorAll('.mobile-trail-card').forEach(c => c.classList.remove('selected'));
}

function filterMobileTrails(filter) {
    const cards = document.querySelectorAll('.mobile-trail-card');
    
    cards.forEach(card => {
        const status = card.dataset.status;
        
        if (filter === 'all') {
            card.style.display = 'block';
        } else if (filter === 'hiked' && status === 'hiked') {
            card.style.display = 'block';
        } else if (filter === 'unhiked' && status !== 'hiked') {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Make functions globally available
window.populateMobileTrails = populateMobileTrails;
window.closeMobileDetails = closeMobileDetails;

