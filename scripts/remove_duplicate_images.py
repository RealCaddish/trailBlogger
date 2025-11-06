#!/usr/bin/env python3
"""Remove duplicate images from all trails"""

import json
import os
from datetime import datetime

def remove_duplicate_images():
    trails_file = 'data/trails.geojson'
    
    with open(trails_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    features = data.get('features', [])
    print(f"Loaded {len(features)} trails")
    
    total_removed = 0
    
    for feature in features:
        props = feature.get('properties', {})
        name = props.get('name', 'Unnamed')
        images = props.get('images', [])
        
        if not images:
            continue
        
        original_count = len(images)
        # Remove duplicates while preserving order
        seen = set()
        unique_images = []
        for img in images:
            if img not in seen:
                seen.add(img)
                unique_images.append(img)
        
        removed = original_count - len(unique_images)
        if removed > 0:
            print(f"  {name}: Removed {removed} duplicate image(s) ({original_count} -> {len(unique_images)})")
            props['images'] = unique_images
            total_removed += removed
    
    if total_removed == 0:
        print("\nNo duplicate images found!")
        return
    
    # Create backup
    backup_file = f"{trails_file.replace('.geojson', '')}_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.geojson"
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"\nCreated backup: {backup_file}")
    
    # Save cleaned data
    with open(trails_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\n[SUCCESS] Removed {total_removed} duplicate images total!")

if __name__ == "__main__":
    remove_duplicate_images()

