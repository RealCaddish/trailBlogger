#!/usr/bin/env python3
"""Inspect what fields are actually in the trails.geojson file"""

import json

with open('data/trails.geojson', 'r', encoding='utf-8') as f:
    data = json.load(f)

features = data.get('features', [])

print("=" * 70)
print("INSPECTING TRAIL FIELDS")
print("=" * 70)

# Check first few trails for all their properties
for i, feature in enumerate(features[:3]):
    props = feature.get('properties', {})
    print(f"\nTrail {i+1}: {props.get('name', 'N/A')}")
    print("  All property keys:", list(props.keys()))
    
    # Check for description-related fields
    desc_fields = ['blog_post', 'description', 'blogPost', 'Description', 'BLOG_POST']
    for field in desc_fields:
        value = props.get(field, '')
        if value:
            print(f"  {field}: {len(str(value))} chars - {str(value)[:50]}...")
        else:
            print(f"  {field}: (empty)")

# Count trails with any description field
print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)

desc_count = 0
for feature in features:
    props = feature.get('properties', {})
    has_desc = any(props.get(field, '').strip() for field in ['blog_post', 'description', 'blogPost', 'Description', 'BLOG_POST'])
    if has_desc:
        desc_count += 1
        name = props.get('name', 'N/A')
        print(f"  {name} has a description")

print(f"\nTotal trails with descriptions: {desc_count}")

