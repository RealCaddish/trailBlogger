#!/usr/bin/env python3
"""Check image paths in trails.geojson"""

import json

with open('data/trails.geojson', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=" * 70)
print("IMAGE PATH CHECKER")
print("=" * 70)

for i, feature in enumerate(data['features'][:5], 1):  # First 5 trails
    props = feature['properties']
    name = props.get('name', 'Unknown')
    images = props.get('images', [])
    
    print(f"\n{i}. {name}")
    print(f"   Images: {len(images)}")
    if images:
        print(f"   First image path: {images[0]}")
        
        # Check if path is correct
        if images[0].startswith('data/'):
            print(f"   [!] Path includes 'data/' - WRONG for GitHub Pages")
        elif images[0].startswith('trail-'):
            print(f"   [!] Path is relative, missing 'data/trail_images/' prefix")
        elif images[0].startswith('./'):
            print(f"   [OK] Path is relative with './' prefix")
        else:
            print(f"   [?] Path format unclear")

