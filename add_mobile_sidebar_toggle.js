/**
 * Mobile sidebar toggle functionality
 * Allows mobile users to collapse the sidebar to see more map
 */

(function() {
    'use strict';
    
    // Only add toggle button on mobile/tablet
    if (window.innerWidth <= 1024) {
        document.addEventListener('DOMContentLoaded', function() {
            addSidebarToggle();
            
            // Re-check on resize
            window.addEventListener('resize', function() {
                const toggle = document.getElementById('sidebarToggle');
                if (window.innerWidth <= 1024 && !toggle) {
                    addSidebarToggle();
                } else if (window.innerWidth > 1024 && toggle) {
                    toggle.remove();
                    document.querySelector('.sidebar').classList.remove('collapsed');
                }
            });
        });
    }
    
    function addSidebarToggle() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar || document.getElementById('sidebarToggle')) return;
        
        // Create toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'sidebarToggle';
        toggleBtn.className = 'sidebar-toggle';
        toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i> <span>Hide Trail List</span>';
        toggleBtn.setAttribute('aria-label', 'Toggle trail list');
        
        // Add click handler
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            const isCollapsed = sidebar.classList.contains('collapsed');
            
            if (isCollapsed) {
                toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i> <span>Show Trail List</span>';
                toggleBtn.setAttribute('aria-expanded', 'false');
            } else {
                toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i> <span>Hide Trail List</span>';
                toggleBtn.setAttribute('aria-expanded', 'true');
            }
        });
        
        // Insert at top of sidebar
        sidebar.insertBefore(toggleBtn, sidebar.firstChild);
    }
})();

