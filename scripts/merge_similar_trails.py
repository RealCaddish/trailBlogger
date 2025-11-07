#!/usr/bin/env python3
"""Merge similar trail names (duplicates with slight variations)"""

import json
from datetime import datetime
import re

def normalize_name(name):
    """Normalize trail name for comparison - remove apostrophes, extra spaces"""
    if not name:
        return ""
    # Remove apostrophes and quotes
    normalized = re.sub(r"['']", "", name.lower())
    # Normalize spaces
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    return normalized

def merge_trail_data(trail1, trail2):
    """Merge two trail features, keeping the best data from each"""
    props1 = trail1['properties']
    props2 = trail2['properties']
    
    # Choose the name (prefer the one without apostrophe if similar)
    name1 = props1.get('name', '').strip()
    name2 = props2.get('name', '').strip()
    # Prefer name without apostrophe, or longer name
    if "'" not in name1 and "'" in name2:
        final_name = name1
    elif "'" in name1 and "'" not in name2:
        final_name = name2
    elif len(name1) > len(name2):
        final_name = name1
    else:
        final_name = name2
    
    # Merge properties - keep the best data
    merged_props = {}
    
    # Name
    merged_props['name'] = final_name
    
    # Description - keep the longer one
    desc1 = props1.get('blog_post', '').strip()
    desc2 = props2.get('blog_post', '').strip()
    merged_props['blog_post'] = desc1 if len(desc1) > len(desc2) else desc2
    
    # Images - merge and deduplicate
    images1 = props1.get('images', [])
    images2 = props2.get('images', [])
    all_images = list(images1) + list(images2)
    seen = set()
    merged_images = []
    for img in all_images:
        img_normalized = img.strip()
        if img_normalized and img_normalized not in seen:
            seen.add(img_normalized)
            merged_images.append(img)
    merged_props['images'] = merged_images
    
    # Status - prefer "hiked" over "unhiked"
    status1 = props1.get('status', 'unhiked')
    status2 = props2.get('status', 'unhiked')
    merged_props['status'] = 'hiked' if status1 == 'hiked' or status2 == 'hiked' else 'unhiked'
    
    # Date - keep the most recent
    date1 = props1.get('date_hiked', '')
    date2 = props2.get('date_hiked', '')
    if date1 and date2:
        merged_props['date_hiked'] = max(date1, date2)
    else:
        merged_props['date_hiked'] = date1 or date2
    
    # Other fields - prefer non-empty values
    merged_props['park'] = props1.get('park', '') or props2.get('park', '')
    merged_props['length'] = props1.get('length', 0) or props2.get('length', 0)
    merged_props['difficulty'] = props1.get('difficulty', 'moderate') or props2.get('difficulty', 'moderate')
    
    # IDs and metadata
    merged_props['trail_id'] = props1.get('trail_id') or props2.get('trail_id')
    merged_props['created_at'] = props1.get('created_at') or props2.get('created_at') or datetime.now().isoformat()
    merged_props['updated_at'] = datetime.now().isoformat()
    
    # Geometry - prefer the one with more coordinates
    geom1 = trail1.get('geometry', {})
    geom2 = trail2.get('geometry', {})
    coords1 = geom1.get('coordinates', [])
    coords2 = geom2.get('coordinates', [])
    
    if len(coords1) > len(coords2):
        merged_geom = geom1
    else:
        merged_geom = geom2
    
    return {
        'type': 'Feature',
        'properties': merged_props,
        'geometry': merged_geom
    }

print("=" * 70)
print("MERGING SIMILAR TRAIL NAMES")
print("=" * 70)

# Load file
with open('data/trails.geojson', 'r', encoding='utf-8') as f:
    data = json.load(f)

features = data.get('features', [])

# Group by normalized name
name_groups = {}
for i, feature in enumerate(features):
    name = feature['properties'].get('name', '').strip()
    normalized = normalize_name(name)
    
    if normalized not in name_groups:
        name_groups[normalized] = []
    name_groups[normalized].append({
        'index': i,
        'name': name,
        'feature': feature
    })

# Find duplicates (same normalized name but different original names)
duplicates = {k: v for k, v in name_groups.items() if len(v) > 1}

if not duplicates:
    print("\nNo duplicates found!")
    exit(0)

print(f"\nFound {len(duplicates)} sets of duplicates to merge:\n")

# Create backup
backup_file = f"data/trails_backup_before_merge_{datetime.now().strftime('%Y%m%d_%H%M%S')}.geojson"
with open(backup_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
print(f"[BACKUP] Created backup: {backup_file}\n")

# Merge duplicates
indices_to_remove = set()
merged_features = []

for normalized, trails in duplicates.items():
    print(f"Merging '{trails[0]['name']}' variants:")
    for trail in trails:
        print(f"  - '{trail['name']}' (index {trail['index']})")
    
    # Merge all duplicates into one
    merged = trails[0]['feature']
    for trail in trails[1:]:
        merged = merge_trail_data(merged, trail['feature'])
        indices_to_remove.add(trail['index'])
    
    # Update the first one with merged data
    merged_features.append((trails[0]['index'], merged))
    print(f"  -> Merged into: '{merged['properties']['name']}'")
    print()

# Build new features list
new_features = []
for i, feature in enumerate(features):
    if i in indices_to_remove:
        continue  # Skip duplicates
    
    # Check if this is one we merged
    merged_index = None
    for idx, merged_feature in merged_features:
        if i == idx:
            merged_index = idx
            break
    
    if merged_index is not None:
        # Replace with merged version
        new_features.append(merged_features[merged_index][1])
    else:
        # Keep original
        new_features.append(feature)

data['features'] = new_features

# Save updated file
with open('data/trails.geojson', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"[SUCCESS] Merged {len(duplicates)} duplicate sets")
print(f"  Before: {len(features)} trails")
print(f"  After: {len(new_features)} trails")
print(f"  Removed: {len(indices_to_remove)} duplicates")

# Verify
print("\n[VERIFICATION]")
remaining_names = [f['properties'].get('name', '').strip() for f in new_features]
name_groups_after = {}
for name in remaining_names:
    normalized = normalize_name(name)
    if normalized not in name_groups_after:
        name_groups_after[normalized] = []
    name_groups_after[normalized].append(name)

remaining_duplicates = {k: v for k, v in name_groups_after.items() if len(v) > 1}
if remaining_duplicates:
    print(f"  [WARNING] Still found {len(remaining_duplicates)} duplicates!")
    for normalized, names in remaining_duplicates.items():
        print(f"    '{normalized}': {names}")
else:
    print("  [OK] No duplicates remaining!")

