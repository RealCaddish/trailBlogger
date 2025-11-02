#!/usr/bin/env python3
"""Fix image paths for GitHub Pages"""

import json
from datetime import datetime

def fix_image_paths():
    """Fix all image paths to include data/trail_images/ prefix"""
    
    print("=" * 70)
    print("FIXING IMAGE PATHS FOR GITHUB PAGES")
    print("=" * 70)
    
    # Load trails
    with open('data/trails.geojson', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    fixed_count = 0
    total_images = 0
    
    for feature in data['features']:
        props = feature['properties']
        images = props.get('images', [])
        
        if images:
            fixed_images = []
            for img_path in images:
                total_images += 1
                
                # Check if path needs fixing
                if img_path.startswith('trail-'):
                    # Add data/trail_images/ prefix
                    fixed_path = f"data/trail_images/{img_path}"
                    fixed_images.append(fixed_path)
                    fixed_count += 1
                elif img_path.startswith('data/trail_images/'):
                    # Already correct
                    fixed_images.append(img_path)
                else:
                    # Unknown format, keep as is
                    fixed_images.append(img_path)
                    print(f"   [?] Unknown path format: {img_path}")
            
            props['images'] = fixed_images
            props['updated_at'] = datetime.now().isoformat()
    
    print(f"\n[OK] Fixed {fixed_count}/{total_images} image paths")
    
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
    
    # Show examples
    print("\n" + "=" * 70)
    print("EXAMPLES OF FIXED PATHS:")
    print("=" * 70)
    
    shown = 0
    for feature in data['features']:
        props = feature['properties']
        images = props.get('images', [])
        name = props.get('name', 'Unknown')
        
        if images and shown < 3:
            print(f"\n{name}:")
            print(f"  {images[0]}")
            shown += 1
    
    print("\n" + "=" * 70)
    print("NEXT STEPS:")
    print("=" * 70)
    print("""
1. DEPLOY to GitHub Pages:
   git add data/trails.geojson
   git commit -m "Fix image paths for GitHub Pages"
   git push origin main

2. Wait 1-2 minutes for deployment

3. Hard refresh your site:
   - Windows: Ctrl+F5
   - Mac: Cmd+Shift+R
   
4. Images should now display correctly!
""")

if __name__ == '__main__':
    try:
        fix_image_paths()
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()

