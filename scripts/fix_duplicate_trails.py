#!/usr/bin/env python3
"""
Fix duplicate trails in trails.geojson
- Merges trails with similar names (case-insensitive, ignoring punctuation/spaces)
- Removes empty trails (like Fagradsfjall Volcano)
- Cleans up trailing spaces
- Merges images from duplicates
"""

import json
import os
import re
from collections import defaultdict
from datetime import datetime

def normalize_name(name):
    """Normalize trail name for comparison"""
    if not name:
        return ""
    # Remove trailing/leading spaces, convert to lowercase
    name = name.strip().lower()
    # Remove all apostrophes and similar characters (handles "Raven's Run" vs "Raven Run")
    name = re.sub(r"[''`]", "", name)
    # Remove extra spaces
    name = re.sub(r'\s+', ' ', name)
    return name.strip()

def is_empty_trail(feature):
    """Check if trail is essentially empty (no meaningful data)"""
    props = feature.get('properties', {})
    geom = feature.get('geometry', {})
    
    # Check if has coordinates
    has_coords = False
    if geom.get('type') == 'LineString' and geom.get('coordinates'):
        has_coords = len(geom['coordinates']) > 0
    elif geom.get('type') == 'MultiLineString' and geom.get('coordinates'):
        has_coords = any(len(line) > 0 for line in geom['coordinates'])
    
    # Check if has description
    has_desc = bool(props.get('description') or props.get('blog_post') or props.get('blogPost'))
    
    # Check if has images
    has_images = bool(props.get('images') and len(props.get('images', [])) > 0)
    
    # Check if has meaningful length
    has_length = bool(props.get('length') and float(props.get('length', 0)) > 0)
    
    # Trail is empty if it has no coordinates, no description, no images, and no length
    return not (has_coords or has_desc or has_images or has_length)

def merge_trails(trails):
    """Merge multiple trail features into one, keeping the best data"""
    if not trails:
        return None
    
    if len(trails) == 1:
        return trails[0]
    
    print(f"  Merging {len(trails)} duplicate trails...")
    
    # Find the "best" trail (one with most data)
    best_trail = None
    best_score = -1
    
    for trail in trails:
        props = trail.get('properties', {})
        geom = trail.get('geometry', {})
        score = 0
        
        # Score based on data completeness
        if geom.get('coordinates'):
            score += 10
        if props.get('description') or props.get('blog_post') or props.get('blogPost'):
            score += 5
        if props.get('images') and len(props.get('images', [])) > 0:
            score += len(props.get('images', []))
        if props.get('length') and float(props.get('length', 0)) > 0:
            score += 2
        if props.get('date_hiked') or props.get('dateHiked'):
            score += 1
        
        if score > best_score:
            best_score = score
            best_trail = trail
    
    if not best_trail:
        best_trail = trails[0]
    
    # Merge data from all trails
    merged_props = best_trail.get('properties', {}).copy()
    merged_geom = best_trail.get('geometry', {}).copy()
    
    # Collect all unique images
    all_images = set()
    if merged_props.get('images'):
        all_images.update(merged_props['images'])
    
    for trail in trails:
        if trail == best_trail:
            continue
        
        props = trail.get('properties', {})
        geom = trail.get('geometry', {})
        
        # Merge images
        if props.get('images'):
            all_images.update(props['images'])
        
        # Use better geometry if available
        if not merged_geom.get('coordinates') and geom.get('coordinates'):
            merged_geom = geom.copy()
        
        # Use better description if available
        if not (merged_props.get('description') or merged_props.get('blog_post')):
            if props.get('description'):
                merged_props['description'] = props['description']
            elif props.get('blog_post'):
                merged_props['blog_post'] = props['blog_post']
        
        # Use better length if available
        if not merged_props.get('length') or float(merged_props.get('length', 0)) == 0:
            if props.get('length') and float(props.get('length', 0)) > 0:
                merged_props['length'] = props['length']
        
        # Use better date if available
        if not (merged_props.get('date_hiked') or merged_props.get('dateHiked')):
            if props.get('date_hiked'):
                merged_props['date_hiked'] = props['date_hiked']
            elif props.get('dateHiked'):
                merged_props['dateHiked'] = props['dateHiked']
    
    # Update merged properties
    merged_props['images'] = list(all_images)
    # Clean up name (remove trailing spaces)
    if merged_props.get('name'):
        merged_props['name'] = merged_props['name'].strip()
    
    # Create merged feature
    merged_feature = {
        "type": "Feature",
        "properties": merged_props,
        "geometry": merged_geom
    }
    
    return merged_feature

def fix_duplicate_trails():
    """Main function to fix duplicate trails"""
    print("=" * 70)
    print("FIXING DUPLICATE TRAILS IN trails.geojson")
    print("=" * 70)
    
    trails_file = 'data/trails.geojson'
    
    if not os.path.exists(trails_file):
        print(f"Error: {trails_file} not found!")
        return
    
    # Load trails
    with open(trails_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    features = data.get('features', [])
    print(f"\n[1/4] Loaded {len(features)} trails from {trails_file}")
    
    # Group trails by normalized name
    trails_by_name = defaultdict(list)
    empty_trails = []
    
    for feature in features:
        props = feature.get('properties', {})
        name = props.get('name', '').strip()
        
        # Check if empty
        if is_empty_trail(feature):
            empty_trails.append((name, feature))
            continue
        
        if not name:
            empty_trails.append(('(unnamed)', feature))
            continue
        
        normalized = normalize_name(name)
        trails_by_name[normalized].append(feature)
    
    print(f"[2/4] Found {len(empty_trails)} empty trails to remove")
    for name, _ in empty_trails:
        print(f"  - Removing empty trail: '{name}'")
    
    # Find duplicates
    duplicates = {k: v for k, v in trails_by_name.items() if len(v) > 1}
    print(f"\n[3/4] Found {len(duplicates)} sets of duplicate trails:")
    for norm_name, trails in duplicates.items():
        names = [t.get('properties', {}).get('name', 'unnamed') for t in trails]
        print(f"  - '{norm_name}': {names}")
    
    # Merge duplicates and keep unique trails
    merged_features = []
    processed_names = set()
    
    for normalized, trails in trails_by_name.items():
        if normalized in processed_names:
            continue
        
        if normalized in duplicates:
            # Merge duplicates
            merged = merge_trails(trails)
            if merged:
                merged_features.append(merged)
                processed_names.add(normalized)
        else:
            # Single trail, just clean up name
            trail = trails[0]
            props = trail.get('properties', {})
            if props.get('name'):
                props['name'] = props['name'].strip()
            merged_features.append(trail)
            processed_names.add(normalized)
    
    print(f"\n[4/4] Merged to {len(merged_features)} unique trails")
    
    # Create backup
    backup_file = f"{trails_file.replace('.geojson', '')}_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.geojson"
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"\nCreated backup: {backup_file}")
    
    # Save cleaned data
    data['features'] = merged_features
    with open(trails_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\n[SUCCESS] Successfully fixed duplicates!")
    print(f"   Removed: {len(features) - len(merged_features)} duplicate/empty trails")
    print(f"   Kept: {len(merged_features)} unique trails")
    print("=" * 70)

if __name__ == "__main__":
    fix_duplicate_trails()

