#!/usr/bin/env python3
"""Check what data is currently in trails.geojson"""

import json

with open('data/trails.geojson', 'r', encoding='utf-8') as f:
    data = json.load(f)

trails = data['features']

print("=" * 70)
print("CURRENT DATA IN trails.geojson")
print("=" * 70)

for i, trail in enumerate(trails, 1):
    props = trail['properties']
    
    name = props.get('name', 'Unknown')
    date = props.get('date_hiked') or props.get('dateHiked') or 'NO DATE'
    status = props.get('status', 'unknown')
    desc_len = len(props.get('blog_post', ''))
    images = len(props.get('images', []))
    
    print(f"\n{i}. {name}")
    print(f"   Date: {date}")
    print(f"   Status: {status}")
    print(f"   Description: {desc_len} chars")
    print(f"   Images: {images}")

print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)

trails_with_dates = sum(1 for t in trails if t['properties'].get('date_hiked') or t['properties'].get('dateHiked'))
trails_with_desc = sum(1 for t in trails if t['properties'].get('blog_post'))

print(f"\nTrails with dates: {trails_with_dates} out of {len(trails)}")
print(f"Trails with descriptions: {trails_with_desc} out of {len(trails)}")

