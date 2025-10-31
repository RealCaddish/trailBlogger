#!/usr/bin/env python3
"""Check detailed properties of current_trails.geojson"""

import json

# Load the file
with open('data/current_trails/current_trails.geojson', 'r', encoding='utf-8') as f:
    data = json.load(f)

features = data.get('features', [])

print("=" * 70)
print("CURRENT_TRAILS DETAILED ANALYSIS")
print("=" * 70)

# Show first trail in detail
if features:
    print("\n[FIRST TRAIL - Full Properties]")
    first = features[0]
    props = first['properties']
    
    print(f"Properties keys: {list(props.keys())}")
    print(f"\nAll properties:")
    for key, value in props.items():
        if isinstance(value, str) and len(str(value)) > 100:
            print(f"  {key}: {str(value)[:100]}... ({len(str(value))} chars)")
        else:
            print(f"  {key}: {value}")
    
    print(f"\nGeometry:")
    geom = first['geometry']
    print(f"  Type: {geom.get('type')}")
    coords = geom.get('coordinates', [])
    print(f"  Coordinates: {len(coords)} points")
    if coords and len(coords) > 0:
        print(f"  First coord: {coords[0]}")
        if len(coords) > 1:
            print(f"  Last coord: {coords[-1]}")

# Check if any trail has data
print("\n" + "=" * 70)
print("SEARCHING FOR TRAILS WITH DATA")
print("=" * 70)

trails_with_coords = []
trails_with_names = []
trails_with_length = []

for i, feature in enumerate(features, 1):
    props = feature['properties']
    geom = feature['geometry']
    
    coords = geom.get('coordinates', [])
    name = props.get('name', '') or props.get('trailName', '') or props.get('trail_name', '')
    length = props.get('length', 0) or props.get('trail_length', 0)
    
    if coords and len(coords) > 1:
        trails_with_coords.append((i, name or f"Trail {i}", len(coords)))
    
    if name:
        trails_with_names.append((i, name))
    
    if length and length > 0:
        trails_with_length.append((i, name or f"Trail {i}", length))

if trails_with_coords:
    print(f"\n[OK] Trails with coordinate paths ({len(trails_with_coords)}):")
    for idx, name, count in trails_with_coords:
        print(f"  {idx}. {name} - {count} coordinate points")
else:
    print("\n[!] No trails have coordinate paths")

if trails_with_names:
    print(f"\n[OK] Trails with names ({len(trails_with_names)}):")
    for idx, name in trails_with_names:
        print(f"  {idx}. {name}")
else:
    print("\n[!] No trails have names")

if trails_with_length:
    print(f"\n[OK] Trails with lengths ({len(trails_with_length)}):")
    for idx, name, length in trails_with_length:
        print(f"  {idx}. {name} - {length} miles")
else:
    print("\n[!] No trails have length data")

