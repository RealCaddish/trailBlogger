#!/usr/bin/env python3
"""Check trails with GPS coordinates"""

import json

with open('data/trails.geojson', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=" * 70)
print("TRAILS WITH GPS COORDINATES")
print("=" * 70)

for i, feature in enumerate(data['features'], 1):
    props = feature['properties']
    geom = feature['geometry']
    
    name = props.get('name', 'Unknown')
    coords = geom.get('coordinates', [])
    
    if coords and len(coords) > 1:
        geom_type = geom.get('type', 'Unknown')
        
        print(f"\n{i}. {name}")
        print(f"   Geometry type: {geom_type}")
        print(f"   Coordinates: {len(coords)} points")
        
        # Check structure
        if geom_type == 'MultiLineString':
            print(f"   [!] MultiLineString detected - needs conversion")
            print(f"   Structure check:")
            if isinstance(coords, list) and len(coords) > 0:
                if isinstance(coords[0], list) and len(coords[0]) > 0:
                    if isinstance(coords[0][0], list):
                        print(f"      - Nested array detected (correct for MultiLineString)")
                        print(f"      - First segment: {len(coords[0])} points")
                        print(f"      - First point: {coords[0][0]}")
        elif geom_type == 'LineString':
            print(f"   [OK] LineString format")
            if isinstance(coords[0], list) and len(coords[0]) in [2, 3]:
                print(f"   [OK] Correct structure [lon, lat] or [lon, lat, elev]")
                print(f"   First point: {coords[0]}")
            else:
                print(f"   [!] Unexpected structure")
                print(f"   First element: {coords[0]}")

