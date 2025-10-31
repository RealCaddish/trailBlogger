#!/usr/bin/env python3
"""Fix image paths to store only filenames (not full paths)"""

import json
from datetime import datetime

def fix_image_paths():
    """Convert full image paths to just filenames"""
    
    print("=" * 70)
    print("FIXING IMAGE PATHS - FILENAMES ONLY")
    print("=" * 70)
    
    # Load trails
    with open('data/trails.geojson', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    fixed_count = 0
    
    for feature in data['features']:
        props = feature['properties']
        images = props.get('images', [])
        
        if images:
            fixed_images = []
            for img_path in images:
                # Extract just the filename from the full path
                # E.g., "data/trail_images/trail-1756842136230/image.jpg" -> "image.jpg"
                if '/' in img_path:
                    filename = img_path.split('/')[-1]  # Get last part
                    fixed_images.append(filename)
                    fixed_count += 1
                else:
                    # Already just a filename
                    fixed_images.append(img_path)
            
            if fixed_images != images:
                props['images'] = fixed_images
                props['updated_at'] = datetime.now().isoformat()
                
                trail_name = props.get('name', 'Unknown')
                print(f"   [+] {trail_name}")
                print(f"       Before: {images[0]}")
                print(f"       After:  {fixed_images[0]}")
    
    print(f"\n[OK] Fixed {fixed_count} image paths")
    
    # Create backup
    backup_file = f"data/trails_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.geojson"
    with open(backup_file, 'w', encoding='utf-8') as f:
        with open('data/trails.geojson', 'r') as orig:
            json.dump(json.load(orig), f, indent=2)
    print(f"[OK] Backup: {backup_file}")
    
    # Save fixed data
    with open('data/trails.geojson', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print(f"[OK] Saved: data/trails.geojson")
    
    print("\n" + "=" * 70)
    print("IMAGE PATHS NOW STORE ONLY FILENAMES")
    print("=" * 70)
    print("""
The app.js will construct full URLs like:
  imageBaseUrl + trail.id + filename
  = ./data/trail_images/1761919613592/image.jpg

But wait... the folders are named "trail-1761919613592" not "1761919613592"!
We need to check if app.js handles this correctly...
""")

if __name__ == '__main__':
    try:
        fix_image_paths()
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()

