#!/usr/bin/env python3
"""Check descriptions in trails.geojson file"""

import json

with open('data/trails.geojson', 'r', encoding='utf-8') as f:
    data = json.load(f)

features = data.get('features', [])
trails_with_desc = []
trails_without = []

for feature in features:
    props = feature.get('properties', {})
    name = props.get('name', '')
    blog_post = props.get('blog_post', '').strip()
    
    if blog_post:
        trails_with_desc.append((name, len(blog_post)))
    else:
        trails_without.append(name)

print(f"Total trails: {len(features)}")
print(f"Trails WITH descriptions: {len(trails_with_desc)}")
print(f"Trails WITHOUT descriptions: {len(trails_without)}")

if trails_with_desc:
    print("\nTrails with descriptions:")
    for name, length in trails_with_desc:
        print(f"  - {name}: {length} chars")

if trails_without:
    print(f"\nTrails without descriptions (first 10):")
    for name in trails_without[:10]:
        print(f"  - {name}")

