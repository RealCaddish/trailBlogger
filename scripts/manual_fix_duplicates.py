#!/usr/bin/env python3
"""Manually fix specific duplicate trails"""

import json
import os
from datetime import datetime

def manual_fix_duplicates():
    trails_file = 'data/trails.geojson'
    
    with open(trails_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    features = data.get('features', [])
    print(f"Loaded {len(features)} trails")
    
    # Find duplicates to merge
    duplicates_to_merge = [
        ("Raven Run Red Trail", "Raven's Run Red Trail"),  # Keep first, merge second
    ]
    
    # Also remove Fagradsfjall Volcano if user wants
    remove_trails = ["Fagradsfjall Volcano  "]
    
    # First, find and merge duplicates
    merge_map = {}  # Maps merge_name -> keep_name
    for keep_name, merge_name in duplicates_to_merge:
        merge_map[merge_name] = keep_name
    
    # Find features to keep and features to merge
    keep_features = {}
    merge_features = {}
    
    for feature in features:
        name = feature.get('properties', {}).get('name', '').strip()
        
        # Skip trails to remove
        if name in remove_trails or name == "Fagradsfjall Volcano":
            print(f"Removing: {name}")
            continue
        
        if name in merge_map.values():
            # This is a trail to keep
            keep_features[name] = feature
        elif name in merge_map:
            # This is a trail to merge
            merge_features[name] = feature
    
    # Merge duplicates
    for merge_name, keep_name in merge_map.items():
        if merge_name in merge_features and keep_name in keep_features:
            print(f"Merging '{merge_name}' into '{keep_name}'")
            keep_feature = keep_features[keep_name]
            merge_feature = merge_features[merge_name]
            
            # Merge images
            keep_images = set(keep_feature.get('properties', {}).get('images', []))
            merge_images = set(merge_feature.get('properties', {}).get('images', []))
            all_images = list(keep_images | merge_images)
            keep_feature['properties']['images'] = all_images
            print(f"  Combined {len(keep_images)} + {len(merge_images)} = {len(all_images)} images")
            
            # Use better description if available
            if not keep_feature.get('properties', {}).get('description'):
                if merge_feature.get('properties', {}).get('description'):
                    keep_feature['properties']['description'] = merge_feature.get('properties', {}).get('description')
            
            # Use better geometry if available
            if not keep_feature.get('geometry', {}).get('coordinates'):
                if merge_feature.get('geometry', {}).get('coordinates'):
                    keep_feature['geometry'] = merge_feature.get('geometry', {}).copy()
    
    # Build final feature list
    new_features = []
    processed_names = set()
    
    for feature in features:
        name = feature.get('properties', {}).get('name', '').strip()
        
        # Skip removed trails
        if name in remove_trails or name == "Fagradsfjall Volcano":
            continue
        
        # Skip merged trails (use the kept version instead)
        if name in merge_map:
            continue
        
        # Add kept trails (including merged ones)
        if name not in processed_names:
            if name in keep_features:
                new_features.append(keep_features[name])
            else:
                new_features.append(feature)
            processed_names.add(name)
    
    # Create backup
    backup_file = f"{trails_file.replace('.geojson', '')}_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.geojson"
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"\nCreated backup: {backup_file}")
    
    # Save cleaned data
    data['features'] = new_features
    with open(trails_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\nFixed duplicates!")
    print(f"  Before: {len(features)} trails")
    print(f"  After: {len(new_features)} trails")
    print(f"  Removed: {len(features) - len(new_features)} duplicates")

if __name__ == "__main__":
    manual_fix_duplicates()

