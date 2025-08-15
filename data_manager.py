#!/usr/bin/env python3
"""
Trail Blogger Data Manager
Handles saving and loading trail data as GeoJSON with custom properties
"""

import json
import os
import base64
from datetime import datetime
from typing import Dict, List, Optional, Any
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TrailDataManager:
    def __init__(self, data_dir: str = "data"):
        """
        Initialize the Trail Data Manager
        
        Args:
            data_dir: Directory to store trail data files
        """
        self.data_dir = data_dir
        self.trails_file = os.path.join(data_dir, "trails.geojson")
        self.ensure_data_directory()
    
    def ensure_data_directory(self):
        """Create data directory if it doesn't exist"""
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)
            logger.info(f"Created data directory: {self.data_dir}")
    
    def save_trail(self, trail_data: Dict[str, Any]) -> bool:
        """
        Save a single trail to the GeoJSON file
        
        Args:
            trail_data: Dictionary containing trail information
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Load existing trails
            trails = self.load_all_trails()
            
            # Check if trail already exists (by name)
            existing_trail = None
            for trail in trails.get('features', []):
                if trail['properties'].get('name') == trail_data.get('name'):
                    existing_trail = trail
                    break
            
            # Create GeoJSON feature
            feature = {
                "type": "Feature",
                "properties": {
                    "name": trail_data.get('name', ''),
                    "length": trail_data.get('length', 0),
                    "difficulty": trail_data.get('difficulty', 'moderate'),
                    "status": trail_data.get('status', 'unhiked'),
                    "date_hiked": trail_data.get('dateHiked'),
                    "blog_post": trail_data.get('blogPost', ''),
                    "images": trail_data.get('images', []),
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                    "trail_id": trail_data.get('id', str(datetime.now().timestamp()))
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": trail_data.get('coordinates', [])
                }
            }
            
            # Update existing trail or add new one
            if existing_trail:
                # Update existing trail
                for i, trail in enumerate(trails.get('features', [])):
                    if trail['properties'].get('name') == trail_data.get('name'):
                        trails['features'][i] = feature
                        trails['features'][i]['properties']['updated_at'] = datetime.now().isoformat()
                        break
                logger.info(f"Updated trail: {trail_data.get('name')}")
            else:
                # Add new trail
                if 'features' not in trails:
                    trails['features'] = []
                trails['features'].append(feature)
                logger.info(f"Added new trail: {trail_data.get('name')}")
            
            # Save to file
            self.save_geojson(trails)
            return True
            
        except Exception as e:
            logger.error(f"Error saving trail: {e}")
            return False
    
    def load_all_trails(self) -> Dict[str, Any]:
        """
        Load all trails from the GeoJSON file
        
        Returns:
            Dict containing GeoJSON FeatureCollection
        """
        try:
            if os.path.exists(self.trails_file):
                with open(self.trails_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                logger.info(f"Loaded {len(data.get('features', []))} trails")
                return data
            else:
                # Return empty FeatureCollection
                return {
                    "type": "FeatureCollection",
                    "features": []
                }
        except Exception as e:
            logger.error(f"Error loading trails: {e}")
            return {
                "type": "FeatureCollection",
                "features": []
            }
    
    def get_trail_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific trail by name
        
        Args:
            name: Trail name to search for
            
        Returns:
            Trail data dictionary or None if not found
        """
        trails = self.load_all_trails()
        for trail in trails.get('features', []):
            if trail['properties'].get('name') == name:
                return trail
        return None
    
    def delete_trail(self, name: str) -> bool:
        """
        Delete a trail by name
        
        Args:
            name: Trail name to delete
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            trails = self.load_all_trails()
            original_count = len(trails.get('features', []))
            
            # Remove trail
            trails['features'] = [
                trail for trail in trails.get('features', [])
                if trail['properties'].get('name') != name
            ]
            
            if len(trails['features']) < original_count:
                self.save_geojson(trails)
                logger.info(f"Deleted trail: {name}")
                return True
            else:
                logger.warning(f"Trail not found: {name}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting trail: {e}")
            return False
    
    def save_geojson(self, data: Dict[str, Any]):
        """
        Save GeoJSON data to file
        
        Args:
            data: GeoJSON data to save
        """
        try:
            with open(self.trails_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info(f"Saved GeoJSON to: {self.trails_file}")
        except Exception as e:
            logger.error(f"Error saving GeoJSON: {e}")
            raise
    
    def export_trail_data(self, output_file: str = None) -> str:
        """
        Export all trail data to a file
        
        Args:
            output_file: Output file path (optional)
            
        Returns:
            str: Path to exported file
        """
        if not output_file:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = os.path.join(self.data_dir, f"trails_export_{timestamp}.geojson")
        
        try:
            trails = self.load_all_trails()
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(trails, f, indent=2, ensure_ascii=False)
            logger.info(f"Exported trail data to: {output_file}")
            return output_file
        except Exception as e:
            logger.error(f"Error exporting trail data: {e}")
            raise
    
    def import_trail_data(self, import_file: str) -> bool:
        """
        Import trail data from a file
        
        Args:
            import_file: Path to import file
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            with open(import_file, 'r', encoding='utf-8') as f:
                import_data = json.load(f)
            
            # Validate GeoJSON structure
            if import_data.get('type') != 'FeatureCollection':
                logger.error("Invalid GeoJSON: must be FeatureCollection")
                return False
            
            # Merge with existing data
            existing_trails = self.load_all_trails()
            existing_names = {
                trail['properties'].get('name') 
                for trail in existing_trails.get('features', [])
            }
            
            imported_count = 0
            for feature in import_data.get('features', []):
                trail_name = feature['properties'].get('name')
                if trail_name and trail_name not in existing_names:
                    if 'features' not in existing_trails:
                        existing_trails['features'] = []
                    existing_trails['features'].append(feature)
                    imported_count += 1
            
            # Save merged data
            self.save_geojson(existing_trails)
            logger.info(f"Imported {imported_count} new trails from: {import_file}")
            return True
            
        except Exception as e:
            logger.error(f"Error importing trail data: {e}")
            return False
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about the trail data
        
        Returns:
            Dict containing statistics
        """
        trails = self.load_all_trails()
        features = trails.get('features', [])
        
        total_trails = len(features)
        hiked_trails = sum(1 for trail in features if trail['properties'].get('status') == 'hiked')
        total_miles = sum(
            trail['properties'].get('length', 0) 
            for trail in features 
            if trail['properties'].get('status') == 'hiked'
        )
        
        # Difficulty breakdown
        difficulties = {}
        for trail in features:
            difficulty = trail['properties'].get('difficulty', 'unknown')
            difficulties[difficulty] = difficulties.get(difficulty, 0) + 1
        
        return {
            'total_trails': total_trails,
            'hiked_trails': hiked_trails,
            'unhiked_trails': total_trails - hiked_trails,
            'total_miles': round(total_miles, 1),
            'difficulties': difficulties,
            'last_updated': datetime.now().isoformat()
        }

def main():
    """Example usage of the TrailDataManager"""
    # Initialize manager
    manager = TrailDataManager()
    
    # Example trail data
    sample_trail = {
        'name': 'Natural Bridge Trail',
        'length': 0.75,
        'difficulty': 'easy',
        'status': 'hiked',
        'dateHiked': '2024-01-15',
        'blogPost': 'Beautiful short trail leading to the iconic Natural Bridge. The views from the top were spectacular, especially during sunset.',
        'images': [],
        'coordinates': [
            [-83.6167, 37.8333],
            [-83.6100, 37.8300],
            [-83.6050, 37.8280],
            [-83.6000, 37.8250]
        ]
    }
    
    # Save trail
    success = manager.save_trail(sample_trail)
    print(f"Trail saved: {success}")
    
    # Get statistics
    stats = manager.get_statistics()
    print(f"Statistics: {stats}")
    
    # Export data
    export_file = manager.export_trail_data()
    print(f"Data exported to: {export_file}")

if __name__ == "__main__":
    main()
