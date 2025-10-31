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
from werkzeug.utils import secure_filename
import uuid
from PIL import Image, ImageOps
import io

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration for file uploads
UPLOAD_FOLDER = 'data/trail_images'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB max file size

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize data manager
data_manager = TrailDataManager()

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def compress_image(image_path, max_width=1200, quality=85):
    """Compress image to reduce file size"""
    try:
        with Image.open(image_path) as img:
            # Apply EXIF orientation to fix sideways images
            img = ImageOps.exif_transpose(img)
            
            # Convert to RGB if necessary (for JPEG)
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Resize if too large
            if img.width > max_width:
                ratio = max_width / img.width
                new_height = int(img.height * ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
            
            # Save with compression
            img.save(image_path, 'JPEG', quality=quality, optimize=True)
            return True
    except Exception as e:
        logger.error(f"Error compressing image: {e}")
        return False

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

@app.route('/api/trails/<trail_id>/images', methods=['POST', 'OPTIONS'])
def upload_trail_images(trail_id):
    """Upload images for a specific trail"""
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({"status": "ok"})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response, 200
    
    try:
        if 'images' not in request.files:
            return jsonify({"error": "No images provided"}), 400
        
        files = request.files.getlist('images')
        if not files or files[0].filename == '':
            return jsonify({"error": "No files selected"}), 400
        
        # Create trail-specific directory
        trail_dir = os.path.join(UPLOAD_FOLDER, f'trail-{trail_id}')
        os.makedirs(trail_dir, exist_ok=True)
        
        uploaded_files = []
        
        for file in files:
            if file and allowed_file(file.filename):
                # Generate unique filename
                filename = secure_filename(file.filename)
                name, ext = os.path.splitext(filename)
                unique_filename = f"{name}_{uuid.uuid4().hex[:8]}{ext}"
                file_path = os.path.join(trail_dir, unique_filename)
                
                # Check file size
                file.seek(0, 2)  # Seek to end
                file_size = file.tell()
                file.seek(0)  # Reset to beginning
                
                if file_size > MAX_FILE_SIZE:
                    return jsonify({"error": f"File {filename} is too large. Maximum size is 10MB."}), 400
                
                # Save file
                file.save(file_path)
                
                # Compress image
                if compress_image(file_path):
                    uploaded_files.append({
                        'filename': unique_filename,
                        'original_name': filename,
                        'size': os.path.getsize(file_path),
                        'url': f'/api/trails/{trail_id}/images/{unique_filename}'
                    })
                else:
                    # If compression fails, still keep the file
                    uploaded_files.append({
                        'filename': unique_filename,
                        'original_name': filename,
                        'size': os.path.getsize(file_path),
                        'url': f'/api/trails/{trail_id}/images/{unique_filename}'
                    })
            else:
                return jsonify({"error": f"File {file.filename} has an invalid extension"}), 400
        
        return jsonify({
            "message": f"Successfully uploaded {len(uploaded_files)} images",
            "images": uploaded_files
        }), 200
        
    except Exception as e:
        logger.error(f"Error uploading images: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/trails/<trail_id>/images/<filename>')
def get_trail_image(trail_id, filename):
    """Serve trail images"""
    try:
        trail_dir = os.path.join(UPLOAD_FOLDER, f'trail-{trail_id}')
        return send_from_directory(trail_dir, filename)
    except Exception as e:
        logger.error(f"Error serving image: {e}")
        return jsonify({"error": "Image not found"}), 404

@app.route('/api/trails/<trail_id>/images', methods=['GET'])
def get_trail_images(trail_id):
    """Get all images for a specific trail"""
    try:
        trail_dir = os.path.join(UPLOAD_FOLDER, f'trail-{trail_id}')
        
        if not os.path.exists(trail_dir):
            return jsonify({"images": []}), 200
        
        images = []
        for filename in os.listdir(trail_dir):
            if allowed_file(filename):
                file_path = os.path.join(trail_dir, filename)
                images.append({
                    'filename': filename,
                    'size': os.path.getsize(file_path),
                    'url': f'/api/trails/{trail_id}/images/{filename}'
                })
        
        return jsonify({"images": images}), 200
        
    except Exception as e:
        logger.error(f"Error getting trail images: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/trails/<trail_id>/images/<filename>', methods=['DELETE'])
def delete_trail_image(trail_id, filename):
    """Delete a specific trail image"""
    try:
        trail_dir = os.path.join(UPLOAD_FOLDER, f'trail-{trail_id}')
        file_path = os.path.join(trail_dir, filename)
        
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({"message": "Image deleted successfully"}), 200
        else:
            return jsonify({"error": "Image not found"}), 404
            
    except Exception as e:
        logger.error(f"Error deleting image: {e}")
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
