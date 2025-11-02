#!/usr/bin/env python3
"""
Import current_trails.geojson and merge with existing trail data
"""

import json
from datetime import datetime

def import_current_trails():
    """Import trails with GPS data from current_trails folder"""
    
    print("=" * 70)
    print("IMPORTING CURRENT_TRAILS.GEOJSON")
    print("=" * 70)
    
    # 1. Load current_trails with GPS data
    print("\n[1/4] Loading current_trails.geojson...")
    with open('data/current_trails/current_trails.geojson', 'r', encoding='utf-8') as f:
        current_trails_data = json.load(f)
    
    current_features = current_trails_data.get('features', [])
    print(f"   Found {len(current_features)} trails with GPS data")
    
    # Extract trail names and coordinates from current_trails
    trails_by_name = {}
    for feature in current_features:
        props = feature['properties']
        geom = feature['geometry']
        
        # Property might be "Name" (capital N)
        trail_name = props.get('Name') or props.get('name') or props.get('trailName', '')
        
        if trail_name:
            # Handle MultiLineString - extract coordinates
            coords = geom.get('coordinates', [])
            geom_type = geom.get('type', 'LineString')
            
            # If MultiLineString, take first line segment
            if geom_type == 'MultiLineString' and coords and len(coords) > 0:
                coords = coords[0]  # Take first segment
            
            trails_by_name[trail_name] = {
                'coordinates': coords,
                'geometry_type': geom_type,
                'properties': props
            }
            print(f"   [+] {trail_name}: {len(coords)} GPS points")
    
    # 2. Load existing trails.geojson (with names and images)
    print("\n[2/4] Loading existing trails.geojson...")
    with open('data/trails.geojson', 'r', encoding='utf-8') as f:
        existing_data = json.load(f)
    
    existing_features = existing_data.get('features', [])
    print(f"   Found {len(existing_features)} existing trails")
    
    # 3. Try to match and merge
    print("\n[3/4] Matching and merging trails...")
    
    matched = 0
    updated_features = []
    
    for feature in existing_features:
        props = feature['properties']
        trail_name = props.get('name', '')
        trail_id = props.get('trail_id', '')
        
        # Try to find a match in current_trails by name
        matched_trail = None
        for ct_name, ct_data in trails_by_name.items():
            # Fuzzy matching - check if names are similar
            if ct_name.lower() in trail_name.lower() or trail_name.lower() in ct_name.lower():
                matched_trail = ct_data
                print(f"   [+] MATCH: '{trail_name}' <-> '{ct_name}'")
                matched += 1
                break
        
        if matched_trail:
            # Update with GPS coordinates
            feature['geometry']['coordinates'] = matched_trail['coordinates']
            props['updated_at'] = datetime.now().isoformat()
            print(f"       Added {len(matched_trail['coordinates'])} GPS coordinates")
        
        updated_features.append(feature)
    
    # Add any unmatched trails from current_trails
    unmatched_names = set(trails_by_name.keys())
    for feature in existing_features:
        trail_name = feature['properties'].get('name', '')
        for ct_name in list(unmatched_names):
            if ct_name.lower() in trail_name.lower() or trail_name.lower() in ct_name.lower():
                unmatched_names.discard(ct_name)
                break
    
    if unmatched_names:
        print(f"\n   [!] {len(unmatched_names)} trails in current_trails.geojson not matched:")
        for name in sorted(unmatched_names):
            print(f"       - {name}")
            # Add as new trail
            trail_data = trails_by_name[name]
            new_feature = {
                "type": "Feature",
                "properties": {
                    "name": name,
                    "length": 0,  # Calculate from coords or add manually later
                    "difficulty": "moderate",
                    "status": "hiked",
                    "date_hiked": None,
                    "blog_post": "",
                    "images": [],
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                    "trail_id": str(int(datetime.now().timestamp() * 1000))
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": trail_data['coordinates']
                }
            }
            updated_features.append(new_feature)
            print(f"         [+] Added as new trail")
    
    # 4. Save updated trails.geojson
    print("\n[4/4] Saving updated trails.geojson...")
    
    # Create backup first
    backup_file = f"data/trails_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.geojson"
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, indent=2)
    print(f"   [OK] Backup: {backup_file}")
    
    # Save updated data
    updated_data = {
        "type": "FeatureCollection",
        "features": updated_features
    }
    
    with open('data/trails.geojson', 'w', encoding='utf-8') as f:
        json.dump(updated_data, f, indent=2)
    print(f"   [OK] Updated: data/trails.geojson")
    
    # Summary
    print("\n" + "=" * 70)
    print("IMPORT COMPLETE!")
    print("=" * 70)
    
    print(f"\nTotal trails: {len(updated_features)}")
    print(f"Trails with GPS coordinates: {matched + len(unmatched_names)}")
    print(f"Matched with existing: {matched}")
    print(f"New trails added: {len(unmatched_names)}")
    
    # Check what's still missing
    trails_with_coords = sum(1 for f in updated_features if f['geometry'].get('coordinates'))
    trails_with_images = sum(1 for f in updated_features if f['properties'].get('images'))
    
    print(f"\nData status:")
    print(f"  - With GPS coordinates: {trails_with_coords}/{len(updated_features)}")
    print(f"  - With images: {trails_with_images}/{len(updated_features)}")
    
    print("\n" + "=" * 70)
    print("NEXT STEPS:")
    print("=" * 70)
    print("""
1. CHECK your data at http://localhost:5000
   - Trails should now show on the map!
   - Map should zoom to trail paths

2. ADD any missing information:
   - Trail lengths (can be calculated from GPS data)
   - Descriptions/blog posts
   - Dates hiked
   - Any trails still missing names

3. DEPLOY to GitHub Pages:
   git add data/trails.geojson
   git commit -m "Add GPS coordinates and complete trail data"
   git push origin main
   
   Wait 1-2 minutes, then visit:
   https://realcaddish.github.io/trailBlogger/
""")

if __name__ == '__main__':
    try:
        import_current_trails()
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()

