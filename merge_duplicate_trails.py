#!/usr/bin/env python3
"""
Merge duplicate trails manually
"""

import json
from datetime import datetime

def merge_duplicates():
    """Interactively merge duplicate trails"""
    
    # Load trails
    with open('data/trails.geojson', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    features = data['features']
    
    print("=" * 70)
    print("TRAIL MERGER - Match Trails with Images to Trails with GPS")
    print("=" * 70)
    
    # Separate trails with images vs trails with GPS
    trails_with_images = []
    trails_with_gps = []
    
    for i, feature in enumerate(features):
        props = feature['properties']
        geom = feature['geometry']
        
        has_images = len(props.get('images', [])) > 0
        has_coords = len(geom.get('coordinates', [])) > 1
        
        if has_images and not has_coords:
            trails_with_images.append((i, feature))
        elif has_coords and not has_images:
            trails_with_gps.append((i, feature))
    
    print(f"\nTrails WITH IMAGES but NO GPS ({len(trails_with_images)}):")
    for idx, (i, f) in enumerate(trails_with_images, 1):
        props = f['properties']
        print(f"  {idx}. {props.get('name', 'Unknown')} - {len(props.get('images', []))} images")
    
    print(f"\nTrails WITH GPS but NO IMAGES ({len(trails_with_gps)}):")
    for idx, (i, f) in enumerate(trails_with_gps, 1):
        props = f['properties']
        coords = f['geometry'].get('coordinates', [])
        print(f"  {idx}. {props.get('name', 'Unknown')} - {len(coords)} GPS points")
    
    # Manual merge mappings
    print("\n" + "=" * 70)
    print("SUGGESTED MERGES (based on similar names):")
    print("=" * 70)
    
    merges = [
        # (trail_with_images_index, trail_with_gps_index, confidence)
        ("Mineral Belt Loop Trail", "Mineral Belt Trail", "HIGH"),
        ("MST: Soco Gap to Waterrock Knob", "Afternoon hike at MST Soco Gap to Waterrock Knob", "HIGH"),
        ("North Oak Creek Trail", "North Oak Creek Trail", "EXACT"),
    ]
    
    print("\nSuggested matches:")
    for img_trail, gps_trail, confidence in merges:
        print(f"  [{confidence}] '{img_trail}' <-> '{gps_trail}'")
    
    print("\n" + "=" * 70)
    print("AUTO-MERGE")
    print("=" * 70)
    print("\nMerging matched trails...")
    
    # Find and merge
    merged_count = 0
    indices_to_remove = []
    
    for img_name, gps_name, confidence in merges:
        # Find features
        img_feature = None
        gps_feature = None
        img_idx = None
        gps_idx = None
        
        for idx, (i, f) in enumerate(trails_with_images):
            if f['properties'].get('name', '') == img_name:
                img_feature = f
                img_idx = i
                break
        
        for idx, (i, f) in enumerate(trails_with_gps):
            if f['properties'].get('name', '') == gps_name:
                gps_feature = f
                gps_idx = i
                break
        
        if img_feature and gps_feature:
            # Merge: add GPS coords to trail with images
            img_feature['geometry']['coordinates'] = gps_feature['geometry']['coordinates']
            img_feature['properties']['updated_at'] = datetime.now().isoformat()
            
            # Mark GPS-only trail for removal
            indices_to_remove.append(gps_idx)
            
            print(f"  [+] Merged '{img_name}' with GPS from '{gps_name}'")
            merged_count += 1
    
    # Remove GPS-only trails that were merged
    indices_to_remove.sort(reverse=True)  # Remove from end first
    for idx in indices_to_remove:
        del features[idx]
        print(f"  [-] Removed duplicate GPS-only trail (index {idx})")
    
    # Save
    if merged_count > 0:
        backup_file = f"data/trails_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.geojson"
        with open(backup_file, 'w', encoding='utf-8') as f:
            with open('data/trails.geojson', 'r') as orig:
                json.dump(json.load(orig), f, indent=2)
        print(f"\n[OK] Backup: {backup_file}")
        
        with open('data/trails.geojson', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"[OK] Saved: data/trails.geojson")
        
        print(f"\n[OK] Merged {merged_count} trails")
        print(f"[OK] Total trails now: {len(features)}")
    
    # Show what's left
    print("\n" + "=" * 70)
    print("REMAINING TRAILS:")
    print("=" * 70)
    
    for i, feature in enumerate(features, 1):
        props = feature['properties']
        geom = feature['geometry']
        name = props.get('name', 'Unknown')
        images = len(props.get('images', []))
        coords = len(geom.get('coordinates', []))
        
        status = []
        if images > 0:
            status.append(f"{images} images")
        if coords > 1:
            status.append(f"{coords} GPS pts")
        
        status_str = ", ".join(status) if status else "NO DATA"
        print(f"{i}. {name} - {status_str}")

if __name__ == '__main__':
    try:
        merge_duplicates()
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()

