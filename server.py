#!/usr/bin/env python3
"""
Trail Blogger Web Server
Simple Flask server to handle trail data persistence
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
from data_manager import TrailDataManager
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize data manager
data_manager = TrailDataManager()

@app.route('/')
def index():
    """Serve the main application"""
    response = send_from_directory('.', 'index.html')
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    response = send_from_directory('.', filename)
    
    # Add cache control for static assets
    if filename.endswith(('.js', '.css')):
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    else:
        # For other files, allow caching but with a short expiration
        response.headers['Cache-Control'] = 'public, max-age=300'  # 5 minutes
    
    return response

@app.route('/api/trails', methods=['GET'])
def get_trails():
    """Get all trails"""
    try:
        trails = data_manager.load_all_trails()
        return jsonify(trails)
    except Exception as e:
        logger.error(f"Error getting trails: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/trails', methods=['POST'])
def save_trail():
    """Save a trail"""
    try:
        trail_data = request.json
        success = data_manager.save_trail(trail_data)
        if success:
            return jsonify({"message": "Trail saved successfully"}), 200
        else:
            return jsonify({"error": "Failed to save trail"}), 500
    except Exception as e:
        logger.error(f"Error saving trail: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/trails/<trail_name>', methods=['GET'])
def get_trail(trail_name):
    """Get a specific trail by name"""
    try:
        trail = data_manager.get_trail_by_name(trail_name)
        if trail:
            return jsonify(trail)
        else:
            return jsonify({"error": "Trail not found"}), 404
    except Exception as e:
        logger.error(f"Error getting trail: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/trails/<trail_name>', methods=['DELETE'])
def delete_trail(trail_name):
    """Delete a trail"""
    try:
        success = data_manager.delete_trail(trail_name)
        if success:
            return jsonify({"message": "Trail deleted successfully"}), 200
        else:
            return jsonify({"error": "Trail not found"}), 404
    except Exception as e:
        logger.error(f"Error deleting trail: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    """Get trail statistics"""
    try:
        stats = data_manager.get_statistics()
        return jsonify(stats)
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/export', methods=['GET'])
def export_data():
    """Export all trail data"""
    try:
        export_file = data_manager.export_trail_data()
        return send_from_directory(
            data_manager.data_dir, 
            os.path.basename(export_file),
            as_attachment=True
        )
    except Exception as e:
        logger.error(f"Error exporting data: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/import', methods=['POST'])
def import_data():
    """Import trail data from file"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Save uploaded file temporarily
        temp_file = os.path.join(data_manager.data_dir, 'temp_import.geojson')
        file.save(temp_file)
        
        # Import the data
        success = data_manager.import_trail_data(temp_file)
        
        # Clean up temp file
        if os.path.exists(temp_file):
            os.remove(temp_file)
        
        if success:
            return jsonify({"message": "Data imported successfully"}), 200
        else:
            return jsonify({"error": "Failed to import data"}), 500
    except Exception as e:
        logger.error(f"Error importing data: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "Trail Blogger API is running"})

if __name__ == '__main__':
    # Create data directory if it doesn't exist
    if not os.path.exists('data'):
        os.makedirs('data')
    
    # Run the server
    print("Starting Trail Blogger Server...")
    print("Access the application at: http://localhost:5000")
    print("API documentation available at: http://localhost:5000/api/health")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
