/**
 * Disable Editing on GitHub Pages
 * This script ensures GitHub Pages is read-only
 */

(function() {
    'use strict';
    
    // Check if we're on GitHub Pages
    const isGitHubPages = window.location.hostname.includes('github.io');
    
    if (!isGitHubPages) {
        console.log('📝 Editing enabled (localhost)');
        return; // Exit if on localhost
    }
    
    console.log('👁️ Read-only mode (GitHub Pages)');
    
    // Wait for DOM to load
    document.addEventListener('DOMContentLoaded', function() {
        
        // 1. Hide "Add Trail" button
        const addTrailBtn = document.getElementById('importBtn');
        if (addTrailBtn) {
            addTrailBtn.style.display = 'none';
            console.log('Hidden: Add Trail button');
        }
        
        // 2. Hide "Data" button (backup/restore)
        const dataBtn = document.getElementById('backupBtn');
        if (dataBtn) {
            dataBtn.style.display = 'none';
            console.log('Hidden: Data Management button');
        }
        
        // 3. Add read-only indicator to header
        const headerControls = document.querySelector('.header-controls');
        if (headerControls) {
            const readOnlyBadge = document.createElement('span');
            readOnlyBadge.className = 'read-only-badge';
            readOnlyBadge.innerHTML = '<i class="fas fa-eye"></i> Read-Only Mode';
            readOnlyBadge.style.cssText = `
                background: #6c757d;
                color: white;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            `;
            headerControls.insertBefore(readOnlyBadge, headerControls.firstChild);
        }
        
        // 4. Disable all buttons that might trigger editing
        document.addEventListener('click', function(e) {
            // Prevent any edit/delete/save actions
            const target = e.target.closest('button, a');
            if (target) {
                const text = target.textContent.toLowerCase();
                if (text.includes('edit') || 
                    text.includes('delete') || 
                    text.includes('save') ||
                    text.includes('add') ||
                    text.includes('upload') ||
                    text.includes('remove')) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Show friendly message
                    alert('⚠️ Editing Disabled\n\nThis is the read-only live site.\n\nTo make changes:\n1. Run Flask server: python server.py\n2. Visit localhost:5000\n3. Make your edits\n4. Deploy: python deploy.py');
                    
                    console.log('Blocked editing action on GitHub Pages');
                    return false;
                }
            }
        }, true); // Capture phase to catch before other handlers
        
        // 5. Hide edit controls when trails are displayed
        const observer = new MutationObserver(function(mutations) {
            // Hide any edit/delete buttons that appear
            document.querySelectorAll('.edit-btn, .delete-btn, [data-action="edit"], [data-action="delete"]').forEach(btn => {
                btn.style.display = 'none';
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // 6. Disable form submissions
        document.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('⚠️ Editing Disabled\n\nThis is the read-only live site. Visit localhost:5000 to make changes.');
            return false;
        }, true);
        
        console.log('✅ GitHub Pages read-only mode active');
    });
})();

