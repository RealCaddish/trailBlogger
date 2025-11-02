#!/usr/bin/env python3
"""
Final cleanup - merge remaining duplicates and clean up data
"""

import json
from datetime import datetime

def final_cleanup():
    """Clean up remaining duplicates and data issues"""
    
    print("=" * 70)
    print("FINAL CLEANUP AND MERGE")
    print("=" * 70)
    
    # Load trails
    with open('data/trails.geojson', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    features = data['features']
    
    # Manual mappings for remaining matches
    # Format: (trail_with_images_name, trail_with_gps_name)
    manual_matches = [
        ("Mineral Belt Loop Trail ", "Mineral Belt Trail"),  # Note the trailing space
        ("Mineral Belt Loop Trail", "Mineral Belt Trail"),   # Without space too
    ]
    
    print("\n[1/3] Merging remaining duplicates...")
    
    merged = 0
    indices_to_remove = []
    
    for img_name, gps_name in manual_matches:
        img_feature = None
        gps_feature = None
        img_idx = None
        gps_idx = None
        
        # Find features
        for i, f in enumerate(features):
            name = f['properties'].get('name', '').strip()
            if name == img_name.strip():
                if len(f['properties'].get('images', [])) > 0:
                    img_feature = f
                    img_idx = i
                elif len(f['geometry'].get('coordinates', [])) > 1:
                    gps_feature = f
                    gps_idx = i
            elif name == gps_name.strip():
                if len(f['geometry'].get('coordinates', [])) > 1 and len(f['properties'].get('images', [])) == 0:
                    gps_feature = f
                    gps_idx = i
        
        if img_feature and gps_feature:
            # Merge
            img_feature['geometry']['coordinates'] = gps_feature['geometry']['coordinates']
            img_feature['properties']['name'] = img_feature['properties']['name'].strip()  # Clean name
            img_feature['properties']['updated_at'] = datetime.now().isoformat()
            indices_to_remove.append(gps_idx)
            print(f"  [+] Merged '{img_name.strip()}' with GPS")
            merged += 1
    
    # Remove merged GPS-only trails
    indices_to_remove.sort(reverse=True)
    for idx in indices_to_remove:
        del features[idx]
    
    print(f"  [OK] Merged {merged} trails")
    
    # Clean up all trail names (remove trailing spaces)
    print("\n[2/3] Cleaning up trail names...")
    cleaned = 0
    for feature in features:
        props = feature['properties']
        old_name = props.get('name', '')
        new_name = old_name.strip()
        if old_name != new_name:
            props['name'] = new_name
            cleaned += 1
            print(f"  [+] Cleaned: '{old_name}' -> '{new_name}'")
    
    if cleaned == 0:
        print("  [OK] No names needed cleaning")
    
    # Save
    print("\n[3/3] Saving...")
    backup_file = f"data/trails_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.geojson"
    with open(backup_file, 'w', encoding='utf-8') as f:
        with open('data/trails.geojson', 'r') as orig:
            json.dump(json.load(orig), f, indent=2)
    print(f"  [OK] Backup: {backup_file}")
    
    with open('data/trails.geojson', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print(f"  [OK] Saved: data/trails.geojson")
    
    # Final summary
    print("\n" + "=" * 70)
    print("FINAL STATUS")
    print("=" * 70)
    
    trails_complete = []
    trails_missing_gps = []
    trails_missing_images = []
    trails_missing_name = []
    
    for feature in features:
        props = feature['properties']
        geom = feature['geometry']
        
        name = props.get('name', '')
        images = props.get('images', [])
        coords = geom.get('coordinates', [])
        
        has_name = name and name not in ['Unknown', ''] and not name.startswith('Trail ')
        has_images = len(images) > 0
        has_gps = len(coords) > 1
        
        trail_info = {
            'name': name,
            'images': len(images),
            'gps_points': len(coords)
        }
        
        if has_name and has_images and has_gps:
            trails_complete.append(trail_info)
        else:
            if not has_gps:
                trails_missing_gps.append(trail_info)
            if not has_images:
                trails_missing_images.append(trail_info)
            if not has_name:
                trails_missing_name.append(trail_info)
    
    print(f"\nTotal trails: {len(features)}")
    print(f"\n[COMPLETE] Trails with name + images + GPS: {len(trails_complete)}")
    for trail in trails_complete:
        print(f"  - {trail['name']} ({trail['images']} imgs, {trail['gps_points']} GPS pts)")
    
    if trails_missing_gps:
        print(f"\n[!] Trails missing GPS ({len(trails_missing_gps)}):")
        for trail in trails_missing_gps:
            print(f"  - {trail['name']} ({trail['images']} imgs)")
    
    if trails_missing_images:
        print(f"\n[!] Trails missing images ({len(trails_missing_images)}):")
        for trail in trails_missing_images:
            print(f"  - {trail['name']} ({trail['gps_points']} GPS pts)")
    
    if trails_missing_name:
        print(f"\n[!] Trails missing name ({len(trails_missing_name)}):")
        for trail in trails_missing_name:
            print(f"  - {trail['name']} ({trail['images']} imgs, {trail['gps_points']} GPS pts)")

if __name__ == '__main__':
    try:
        final_cleanup()
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()

