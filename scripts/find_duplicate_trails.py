#!/usr/bin/env python3
"""Find and report duplicate trails in trails.geojson"""

import json
from collections import defaultdict

with open('data/trails.geojson', 'r', encoding='utf-8') as f:
    data = json.load(f)

features = data.get('features', [])

# Group by normalized trail name
trails_by_name = defaultdict(list)

for i, feature in enumerate(features):
    name = feature['properties'].get('name', '').strip()
    # Normalize name for comparison (remove apostrophes, extra spaces, lowercase)
    import re
    normalized = re.sub(r"['']", "", name.lower())
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    
    trails_by_name[normalized].append({
        'index': i,
        'name': name,
        'original_name': name,
        'feature': feature
    })

# Find duplicates
duplicates = {k: v for k, v in trails_by_name.items() if len(v) > 1}

print("=" * 70)
print("DUPLICATE TRAILS FOUND")
print("=" * 70)

if duplicates:
    print(f"\nFound {len(duplicates)} sets of duplicate trails:\n")
    
    for normalized, trails in duplicates.items():
        print(f"Duplicate group: '{trails[0]['original_name']}'")
        print(f"  Normalized name: '{normalized}'")
        print(f"  Found {len(trails)} copies:\n")
        
        for trail in trails:
            props = trail['feature']['properties']
            desc_len = len(props.get('blog_post', ''))
            images_count = len(props.get('images', []))
            status = props.get('status', 'unknown')
            date = props.get('date_hiked', '')
            
            print(f"    - Index {trail['index']}: '{trail['name']}'")
            print(f"      Status: {status}, Date: {date}")
            print(f"      Description: {desc_len} chars, Images: {images_count}")
        print()
else:
    print("\nNo duplicates found!")

