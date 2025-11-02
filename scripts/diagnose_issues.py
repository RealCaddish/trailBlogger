#!/usr/bin/env python3
"""Diagnose image path and GPS line issues"""

import json

with open('data/trails.geojson', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=" * 70)
print("DIAGNOSING ISSUES")
print("=" * 70)

# Check a few trails
for i, feature in enumerate(data['features'][:3], 1):
    props = feature['properties']
    geom = feature['geometry']
    
    name = props.get('name', 'Unknown')
    images = props.get('images', [])
    coords = geom.get('coordinates', [])
    geom_type = geom.get('type', 'Unknown')
    
    print(f"\n{i}. {name}")
    
    # Check images
    if images:
        print(f"   Images: {len(images)}")
        print(f"   First image: {images[0]}")
        
        # Check if path has trail- prefix
        if 'trail_images/' in images[0]:
            # Extract folder part
            parts = images[0].split('trail_images/')[1].split('/')[0]
            if parts.startswith('trail-'):
                print(f"   [OK] Has 'trail-' prefix")
            else:
                print(f"   [!] MISSING 'trail-' prefix! Found: {parts}")
    else:
        print(f"   Images: 0")
    
    # Check coordinates
    print(f"   Geometry type: {geom_type}")
    if coords:
        if geom_type == 'MultiLineString':
            print(f"   [!] Using MultiLineString - need to convert to LineString")
            if isinstance(coords[0], list) and isinstance(coords[0][0], list):
                print(f"   Structure: [[coords]] - nested array")
                print(f"   First segment has {len(coords[0])} points")
        elif geom_type == 'LineString':
            print(f"   [OK] Using LineString")
            if isinstance(coords[0], list) and isinstance(coords[0][0], (int, float)):
                print(f"   Structure: [coords] - flat array of points")
                print(f"   Total: {len(coords)} points")
    else:
        print(f"   Coordinates: 0")

