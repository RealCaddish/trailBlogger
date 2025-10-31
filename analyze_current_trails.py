#!/usr/bin/env python3
"""Analyze the current_trails.geojson file"""

import json

# Load the file
with open('data/current_trails/current_trails.geojson', 'r', encoding='utf-8') as f:
    data = json.load(f)

features = data.get('features', [])

print("=" * 70)
print("CURRENT_TRAILS.GEOJSON ANALYSIS")
print("=" * 70)

print(f"\nTotal trails: {len(features)}")
print("\nTrail Summary:")

for i, feature in enumerate(features, 1):
    props = feature['properties']
    geom = feature['geometry']
    
    name = props.get('name', 'Unknown')
    length = props.get('length', 0)
    coords_count = len(geom.get('coordinates', []))
    blog_post = props.get('blog_post', '')
    has_blog = "YES" if blog_post else "NO"
    date_hiked = props.get('date_hiked', 'N/A')
    
    print(f"{i}. {name}")
    print(f"   Length: {length} miles")
    print(f"   Coordinates: {coords_count} points")
    print(f"   Description: {has_blog}")
    print(f"   Date: {date_hiked}")
    print()

