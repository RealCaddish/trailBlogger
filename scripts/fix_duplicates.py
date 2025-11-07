#!/usr/bin/env python3
"""
Fix duplicate trails and images in trails.geojson
- Removes duplicate trails (case-insensitive, trimmed names)
- Removes duplicate images within each trail
"""

import json
from datetime import datetime
from collections import defaultdict

def fix_duplicates():
    """Fix duplicate trails and images"""
    
    print("=" * 70)
    print("FIXING DUPLICATES IN TRAILS.GEOJSON")
    print("=" * 70)
    
    # Load trails.geojson
    print("\n[1/3] Loading trails.geojson...")
    with open('data/trails.geojson', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    features = data.get('features', [])
    print(f"   Found {len(features)} trails")
    
    # Group trails by normalized name
    print("\n[2/3] Identifying duplicates...")
    trails_by_name = defaultdict(list)
    for i, feature in enumerate(features):
        name = feature['properties'].get('name', '').strip()
        if name:
            trails_by_name[name.lower()].append((i, feature))
    
    # Find duplicates
    duplicates = {k: v for k, v in trails_by_name.items() if len(v) > 1}
    if duplicates:
        print(f"   Found {len(duplicates)} duplicate trail names:")
        for name, instances in duplicates.items():
            print(f"      - {name}: {len(instances)} instances")
    else:
        print("   No duplicate trail names found")
    
    # Merge duplicates and deduplicate images
    print("\n[3/3] Merging duplicates and fixing images...")
    unique_features = []
    processed_names = set()
    merged_count = 0
    image_fixes = 0
    
    for i, feature in enumerate(features):
        name = feature['properties'].get('name', '').strip()
        name_lower = name.lower()
        
        if name_lower in processed_names:
            # Skip duplicate
            merged_count += 1
            continue
        
        processed_names.add(name_lower)
        
        # If this is a duplicate, merge with the first instance
        if name_lower in duplicates:
            instances = duplicates[name_lower]
            # Use the first instance as base, merge others into it
            base_feature = instances[0][1]
            
            # Merge images from all instances
            all_images = []
            for idx, feat in instances:
                all_images.extend(feat['properties'].get('images', []))
            
            # Deduplicate images
            seen_images = set()
            unique_images = []
            for img in all_images:
                img_norm = img.strip()
                if img_norm and img_norm not in seen_images:
                    seen_images.add(img_norm)
                    unique_images.append(img)
            
            # Merge other properties (use most recent updated_at)
            latest_updated = base_feature['properties'].get('updated_at', '')
            latest_created = base_feature['properties'].get('created_at', '')
            
            for idx, feat in instances[1:]:
                # Merge descriptions (use longest)
                other_desc = feat['properties'].get('blog_post', '')
                base_desc = base_feature['properties'].get('blog_post', '')
                if len(other_desc) > len(base_desc):
                    base_feature['properties']['blog_post'] = other_desc
                
                # Merge geometry (use longest)
                other_coords = feat.get('geometry', {}).get('coordinates', [])
                base_coords = base_feature.get('geometry', {}).get('coordinates', [])
                if len(other_coords) > len(base_coords):
                    base_feature['geometry'] = feat['geometry']
                
                # Track latest dates
                other_updated = feat['properties'].get('updated_at', '')
                other_created = feat['properties'].get('created_at', '')
                if other_updated > latest_updated:
                    latest_updated = other_updated
                if other_created < latest_created:  # Created should be earliest
                    latest_created = other_created
            
            base_feature['properties']['images'] = unique_images
            base_feature['properties']['updated_at'] = latest_updated
            base_feature['properties']['created_at'] = latest_created
            base_feature['properties']['name'] = name  # Use trimmed name
            
            if len(all_images) != len(unique_images):
                image_fixes += 1
            
            unique_features.append(base_feature)
        else:
            # Not a duplicate, but still deduplicate images
            images = feature['properties'].get('images', [])
            seen_images = set()
            unique_images = []
            for img in images:
                img_norm = img.strip()
                if img_norm and img_norm not in seen_images:
                    seen_images.add(img_norm)
                    unique_images.append(img)
            
            if len(images) != len(unique_images):
                image_fixes += 1
                feature['properties']['images'] = unique_images
            
            # Normalize name
            feature['properties']['name'] = name
            
            unique_features.append(feature)
    
    # Create backup
    backup_file = f"data/trails_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.geojson"
    print(f"\n   Creating backup: {backup_file}")
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    # Save fixed data
    fixed_data = {
        "type": "FeatureCollection",
        "features": unique_features
    }
    
    print(f"   Saving fixed trails.geojson...")
    with open('data/trails.geojson', 'w', encoding='utf-8') as f:
        json.dump(fixed_data, f, indent=2, ensure_ascii=False)
    
    # Summary
    print("\n" + "=" * 70)
    print("FIX COMPLETE!")
    print("=" * 70)
    print(f"\nOriginal trails: {len(features)}")
    print(f"After merge: {len(unique_features)}")
    print(f"Trails merged: {merged_count}")
    print(f"Trails with duplicate images fixed: {image_fixes}")
    print(f"\nBackup saved to: {backup_file}")

if __name__ == '__main__':
    fix_duplicates()

