#!/usr/bin/env python3
"""
Import OSM hiking trails and convert them to Trail Blogger format.
This script processes GeoJSON files exported from QGIS/QuickOSM and converts them
to match the existing trails.geojson schema with status='unhiked'.
"""

import json
import sys
from pathlib import Path
from datetime import datetime
import argparse

def calculate_length(coordinates):
    """Calculate trail length in miles from coordinates using Haversine formula."""
    from math import radians, sin, cos, sqrt, atan2
    
    total_miles = 0
    for i in range(len(coordinates) - 1):
        lat1, lon1 = radians(coordinates[i][1]), radians(coordinates[i][0])
        lat2, lon2 = radians(coordinates[i+1][1]), radians(coordinates[i+1][0])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        distance_miles = 3959 * c  # Earth radius in miles
        total_miles += distance_miles
    
    return round(total_miles, 2)

def map_difficulty(sac_scale, highway_type):
    """Map OSM difficulty ratings to our schema."""
    difficulty_map = {
        'hiking': 'easy',
        'mountain_hiking': 'moderate',
        'demanding_mountain_hiking': 'moderate',
        'alpine_hiking': 'hard',
        'demanding_alpine_hiking': 'hard',
        'difficult_alpine_hiking': 'hard'
    }
    
    if sac_scale and sac_scale.lower() in difficulty_map:
        return difficulty_map[sac_scale.lower()]
    
    # Default based on highway type
    if highway_type in ['footway', 'path']:
        return 'moderate'
    elif highway_type == 'track':
        return 'easy'
    
    return 'moderate'

def generate_trail_id():
    """Generate unique trail ID using timestamp."""
    return int(datetime.now().timestamp() * 1000)

def clean_trail_name(name, ref, osm_id):
    """Generate a clean trail name from OSM data."""
    if name:
        return name.strip()
    elif ref:
        return f"Trail {ref}"
    else:
        return f"Unnamed Trail {osm_id}"

def convert_osm_trail(feature, state_name):
    """Convert a single OSM trail feature to Trail Blogger format."""
    props = feature.get('properties', {})
    geom = feature.get('geometry', {})
    
    # Extract basic properties
    osm_id = props.get('osm_id', props.get('@id', generate_trail_id()))
    name = props.get('name', '')
    ref = props.get('ref', '')
    highway_type = props.get('highway', 'path')
    sac_scale = props.get('sac_scale', '')
    
    # Generate clean name
    trail_name = clean_trail_name(name, ref, osm_id)
    
    # Add state to name if not already present
    if state_name and state_name.lower() not in trail_name.lower():
        trail_name = f"{trail_name} ({state_name})"
    
    # Calculate or extract length
    if 'length_miles' in props:
        length = round(float(props['length_miles']), 2)
    elif geom.get('type') == 'LineString':
        length = calculate_length(geom['coordinates'])
    else:
        length = 0
    
    # Skip very short trails (less than 0.1 miles)
    if length < 0.1:
        return None
    
    # Map difficulty
    difficulty = map_difficulty(sac_scale, highway_type)
    
    # Handle geometry - properly convert MultiLineString to LineString
    coordinates = geom.get('coordinates', [])
    geom_type = geom.get('type', 'LineString')
    formatted_coords = []
    
    if geom_type == 'MultiLineString':
        # Flatten MultiLineString into single LineString by concatenating all segments
        for segment in coordinates:
            for coord in segment:
                if len(coord) == 2:
                    formatted_coords.append([coord[0], coord[1], 0])
                elif len(coord) >= 3:
                    formatted_coords.append([coord[0], coord[1], coord[2]])
                else:
                    formatted_coords.append(coord)
    else:
        # Handle regular LineString
        for coord in coordinates:
            if len(coord) == 2:
                formatted_coords.append([coord[0], coord[1], 0])
            elif len(coord) >= 3:
                formatted_coords.append([coord[0], coord[1], coord[2]])
            else:
                formatted_coords.append(coord)
    
    # Build new feature in Trail Blogger format
    new_feature = {
        "type": "Feature",
        "properties": {
            "name": trail_name,
            "length": length,
            "difficulty": difficulty,
            "status": "unhiked",
            "trail_id": int(osm_id) if str(osm_id).isdigit() else generate_trail_id(),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "source": "OpenStreetMap",
            "osm_id": osm_id,
            "state": state_name
        },
        "geometry": {
            "type": "LineString",
            "coordinates": formatted_coords
        }
    }
    
    return new_feature

def process_osm_file(input_file, state_name):
    """Process an OSM GeoJSON file and convert all trails."""
    print(f"\nProcessing {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if data.get('type') != 'FeatureCollection':
        print(f"Error: {input_file} is not a FeatureCollection")
        return []
    
    converted_trails = []
    skipped = 0
    
    for feature in data.get('features', []):
        converted = convert_osm_trail(feature, state_name)
        if converted:
            converted_trails.append(converted)
        else:
            skipped += 1
    
    print(f"  Converted: {len(converted_trails)} trails")
    print(f"  Skipped: {skipped} trails (too short or invalid)")
    
    return converted_trails

def merge_with_existing(new_trails, existing_file):
    """Merge new OSM trails with existing trails, avoiding duplicates."""
    print(f"\nMerging with existing trails from {existing_file}...")
    
    # Load existing trails
    with open(existing_file, 'r', encoding='utf-8') as f:
        existing_data = json.load(f)
    
    existing_trails = existing_data.get('features', [])
    print(f"  Existing trails: {len(existing_trails)}")
    
    # Create set of existing trail names for duplicate detection
    existing_names = set()
    for trail in existing_trails:
        name = trail.get('properties', {}).get('name', '').lower().strip()
        existing_names.add(name)
    
    # Filter out duplicates from new trails
    unique_new_trails = []
    duplicates = 0
    
    for trail in new_trails:
        name = trail.get('properties', {}).get('name', '').lower().strip()
        if name not in existing_names:
            unique_new_trails.append(trail)
            existing_names.add(name)
        else:
            duplicates += 1
    
    print(f"  New unique trails: {len(unique_new_trails)}")
    print(f"  Duplicates skipped: {duplicates}")
    
    # Combine all trails
    all_trails = existing_trails + unique_new_trails
    
    return {
        "type": "FeatureCollection",
        "features": all_trails
    }

def main():
    parser = argparse.ArgumentParser(
        description='Import OSM hiking trails into Trail Blogger format'
    )
    parser.add_argument(
        'input_files',
        nargs='+',
        help='OSM GeoJSON files to import (e.g., kentucky_osm_trails.geojson)'
    )
    parser.add_argument(
        '--state',
        required=True,
        help='State name (e.g., "Kentucky", "Tennessee", "North Carolina", "Colorado")'
    )
    parser.add_argument(
        '--output',
        default='data/osm_trails_import.geojson',
        help='Output file path (default: data/osm_trails_import.geojson)'
    )
    parser.add_argument(
        '--merge',
        action='store_true',
        help='Merge with existing trails.geojson instead of creating separate file'
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("OSM Trail Importer for Trail Blogger")
    print("=" * 60)
    
    # Process all input files
    all_converted_trails = []
    for input_file in args.input_files:
        if not Path(input_file).exists():
            print(f"Error: File not found: {input_file}")
            continue
        
        converted = process_osm_file(input_file, args.state)
        all_converted_trails.extend(converted)
    
    if not all_converted_trails:
        print("\nNo trails to import!")
        return 1
    
    print(f"\nTotal trails converted: {len(all_converted_trails)}")
    
    # Merge or save separately
    if args.merge:
        existing_file = Path('data/trails.geojson')
        if not existing_file.exists():
            print(f"Error: Existing trails file not found: {existing_file}")
            return 1
        
        # Create backup
        backup_file = f"data/trails_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.geojson"
        print(f"\nCreating backup: {backup_file}")
        with open(existing_file, 'r', encoding='utf-8') as f:
            backup_data = f.read()
        with open(backup_file, 'w', encoding='utf-8') as f:
            f.write(backup_data)
        
        # Merge
        merged_data = merge_with_existing(all_converted_trails, existing_file)
        output_file = existing_file
    else:
        merged_data = {
            "type": "FeatureCollection",
            "features": all_converted_trails
        }
        output_file = Path(args.output)
    
    # Write output
    print(f"\nWriting to {output_file}...")
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(merged_data, f, indent=2)
    
    print(f"\nSuccess! Wrote {len(merged_data['features'])} trails to {output_file}")
    print("\n" + "=" * 60)
    print("NEXT STEPS:")
    print("=" * 60)
    if args.merge:
        print("1. Reload your browser to see the new unhiked trails")
        print("2. Check the map for yellow trail markers (unhiked)")
        print("3. Use the 'Show Unhiked' filter to view only new trails")
    else:
        print(f"1. Review the output file: {output_file}")
        print("2. If satisfied, run again with --merge flag to add to main trails.geojson")
        print(f"   Example: python scripts/import_osm_trails.py {' '.join(args.input_files)} --state \"{args.state}\" --merge")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())

