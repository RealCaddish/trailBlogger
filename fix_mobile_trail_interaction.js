/**
 * Fix mobile trail card interaction
 * On mobile: clicking trail card flies to map, shows details below map
 * On desktop: uses side description panel
 */

(function() {
    'use strict';
    
    let originalBounds = null;
    let currentlyOpenTrailId = null;
    
    document.addEventListener('DOMContentLoaded', function() {
        if (!window.trailBlogger) {
            console.warn('TrailBlogger not initialized yet');
            return;
        }
        
        // Store original map bounds
        if (window.trailBlogger.map) {
            setTimeout(() => {
                originalBounds = window.trailBlogger.map.getBounds();
            }, 1000);
        }
        
        // Override mobile trail card clicks
        overrideTrailCardBehavior();
    });
    
    function isMobile() {
        return window.innerWidth <= 768;
    }
    
    function overrideTrailCardBehavior() {
        // Intercept trail card clicks
        document.addEventListener('click', function(e) {
            if (!isMobile()) return;
            
            const trailItem = e.target.closest('.trail-item');
            if (!trailItem) return;
            
            // Prevent default behavior
            e.stopPropagation();
            e.preventDefault();
            
            const trailName = trailItem.dataset.trailName;
            const trail = window.trailBlogger.trails.find(t => t.name === trailName);
            
            if (!trail) return;
            
            // Check if clicking the same trail (toggle off)
            if (currentlyOpenTrailId === trail.id) {
                closeTrailDetails();
                return;
            }
            
            // Show new trail
            showTrailDetailsMobile(trail);
        }, true);
    }
    
    function showTrailDetailsMobile(trail) {
        currentlyOpenTrailId = trail.id;
        
        // Highlight trail card
        document.querySelectorAll('.trail-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`[data-trail-name="${trail.name}"]`)?.classList.add('selected');
        
        // Fly to trail on map
        if (trail.coordinates && trail.coordinates.length > 0) {
            const coords = trail.coordinates.map(c => [c[1], c[0]]);
            const bounds = L.latLngBounds(coords);
            window.trailBlogger.map.flyToBounds(bounds, {
                padding: [50, 50],
                maxZoom: 13,
                duration: 1
            });
        }
        
        // Create or update mobile details section
        let detailsSection = document.getElementById('mobileTrailDetails');
        if (!detailsSection) {
            detailsSection = document.createElement('div');
            detailsSection.id = 'mobileTrailDetails';
            detailsSection.className = 'mobile-trail-details';
            
            const mapContainer = document.querySelector('.map-container');
            mapContainer.parentNode.insertBefore(detailsSection, mapContainer.nextSibling);
        }
        
        // Build details HTML
        const descriptionText = trail.description || trail.blogPost || trail.blog_post || '';
        const dateText = trail.dateHiked ? new Date(trail.dateHiked).toLocaleDateString() : 'No date';
        
        detailsSection.innerHTML = `
            <div class="mobile-details-header">
                <div>
                    <h2>${trail.name}</h2>
                    <div class="trail-meta">
                        <span class="badge badge-${trail.status}">${trail.status}</span>
                        <span>${trail.length} miles</span>
                        <span>${trail.difficulty}</span>
                        <span>${dateText}</span>
                    </div>
                </div>
                <button class="close-details-btn" onclick="closeMobileTrailDetails()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            ${descriptionText ? `
            <div class="mobile-details-description">
                <h3>Description</h3>
                <p>${descriptionText}</p>
            </div>
            ` : ''}
            
            ${trail.images && trail.images.length > 0 ? `
            <div class="mobile-details-images">
                <h3>Photos (${trail.images.length})</h3>
                <div class="mobile-image-grid">
                    ${trail.images.map(img => {
                        const imgUrl = img.includes('/') ? img : `./data/trail_images/trail-${trail.id}/${img}`;
                        return `<img src="${imgUrl}" alt="Trail photo" onclick="window.trailBlogger.openImageModal('${imgUrl}')" />`;
                    }).join('')}
                </div>
            </div>
            ` : ''}
        `;
        
        // Scroll to details smoothly
        setTimeout(() => {
            detailsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 500);
    }
    
    // Global function for close button
    window.closeMobileTrailDetails = function() {
        closeTrailDetails();
    };
    
    function closeTrailDetails() {
        const detailsSection = document.getElementById('mobileTrailDetails');
        if (detailsSection) {
            detailsSection.innerHTML = '';
            detailsSection.style.display = 'none';
        }
        
        // Remove selection
        document.querySelectorAll('.trail-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Zoom back to original bounds
        if (originalBounds && window.trailBlogger.map) {
            window.trailBlogger.map.flyToBounds(originalBounds, {
                duration: 1
            });
        }
        
        currentlyOpenTrailId = null;
    }
})();

