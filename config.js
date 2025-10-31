// Configuration for Trail Blogger
// Automatically detects if running on GitHub Pages or locally

const TrailBloggerConfig = {
    // Detect if we're on GitHub Pages or localhost
    isGitHubPages: window.location.hostname.includes('github.io'),
    
    // Base URL for API calls
    get apiBaseUrl() {
        return this.isGitHubPages ? '' : '';
    },
    
    // Base URL for images
    get imageBaseUrl() {
        return this.isGitHubPages 
            ? './data/trail_images'  // GitHub Pages: relative path
            : '/data/trail_images';   // Local: Flask serves this
    },
    
    // Base URL for data files
    get dataBaseUrl() {
        return this.isGitHubPages
            ? './data'  // GitHub Pages: relative path
            : '/data';  // Local: Flask serves this
    },
    
    // Features enabled/disabled
    get features() {
        return {
            canEdit: !this.isGitHubPages,  // Only allow editing locally
            canUpload: !this.isGitHubPages, // Only allow uploads locally
            canDelete: !this.isGitHubPages  // Only allow deletes locally
        };
    },
    
    // Get trails data URL
    get trailsDataUrl() {
        return `${this.dataBaseUrl}/trails.geojson`;
    }
};

// Make it globally available
window.TrailBloggerConfig = TrailBloggerConfig;




