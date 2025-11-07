#!/usr/bin/env python3
"""Fix duplicate trail names by merging them"""

import json
from datetime import datetime
import re

def normalize_name_for_matching(name):
    """Normalize trail name for matching - handle apostrophes, typos, etc."""
    if not name:
        return ""
    name = name.lower()
    # Remove apostrophes and quotes
    name = re.sub(r"['']", "", name)
    # Remove "s" after removing apostrophes (Raven's -> Raven)
    name = re.sub(r'\b(\w+)s\b', r'\1', name)
    # Normalize spaces
    name = re.sub(r'\s+', ' ', name).strip()
    return name

def are_similar_names(name1, name2):
    """Check if two names are similar enough to be duplicates"""
    n1 = normalize_name_for_matching(name1)
    n2 = normalize_name_for_matching(name2)
    
    # Exact match after normalization
    if n1 == n2:
        return True
    
    # Check if one is a substring of the other (allowing for small differences)
    # For typos like "Graenidalur" vs "Graenidaulur"
    if len(n1) > 10 and len(n2) > 10:
        # Calculate similarity (simple Levenshtein-like check)
        if abs(len(n1) - len(n2)) <= 2:
            # Check if they share most characters
            common_chars = sum(1 for a, b in zip(n1, n2) if a == b)
            similarity = common_chars / max(len(n1), len(n2))
            if similarity > 0.9:  # 90% similar
                return True
    
    return False

def merge_trail_features(feature1, feature2):
    """Merge two trail features, keeping the best data"""
    props1 = feature1['properties']
    props2 = feature2['properties']
    
    # Choose name (prefer without apostrophe, or correct spelling)
    name1 = props1.get('name', '').strip()
    name2 = props2.get('name', '').strip()
    
    # Prefer "Raven Run" over "Raven's Run"
    if "raven" in name1.lower() and "raven" in name2.lower():
        if "'" not in name1:
            final_name = name1
        else:
            final_name = name2
    # Prefer "Graenidalur" (correct spelling) over "Graenidaulur" (typo)
    elif "graenidalur" in name1.lower():
        final_name = name1
    elif "graenidaulur" in name1.lower():
        final_name = name2
    # Otherwise prefer longer name
    elif len(name1) > len(name2):
        final_name = name1
    else:
        final_name = name2
    
    # Merge properties
    merged_props = {}
    merged_props['name'] = final_name
    
    # Description - keep longer one
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
        img_norm = str(img).strip()
        if img_norm and img_norm not in seen:
            seen.add(img_norm)
            merged_images.append(img)
    merged_props['images'] = merged_images
    
    # Status - prefer "hiked"
    status1 = props1.get('status', 'unhiked')
    status2 = props2.get('status', 'unhiked')
    merged_props['status'] = 'hiked' if status1 == 'hiked' or status2 == 'hiked' else 'unhiked'
    
    # Date - keep most recent
    date1 = props1.get('date_hiked', '')
    date2 = props2.get('date_hiked', '')
    if date1 and date2:
        merged_props['date_hiked'] = max(date1, date2)
    else:
        merged_props['date_hiked'] = date1 or date2
    
    # Other fields
    merged_props['park'] = props1.get('park', '') or props2.get('park', '')
    merged_props['length'] = props1.get('length', 0) or props2.get('length', 0)
    merged_props['difficulty'] = props1.get('difficulty', 'moderate') or props2.get('difficulty', 'moderate')
    merged_props['trail_id'] = props1.get('trail_id') or props2.get('trail_id')
    merged_props['created_at'] = props1.get('created_at') or props2.get('created_at') or datetime.now().isoformat()
    merged_props['updated_at'] = datetime.now().isoformat()
    
    # Geometry - prefer more coordinates
    geom1 = feature1.get('geometry', {})
    geom2 = feature2.get('geometry', {})
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
print("FIXING DUPLICATE TRAIL NAMES")
print("=" * 70)

# Load file
with open('data/trails.geojson', 'r', encoding='utf-8') as f:
    data = json.load(f)

features = data.get('features', [])

# Find similar names
print("\nChecking for similar trail names...\n")
duplicate_pairs = []

for i in range(len(features)):
    name1 = features[i]['properties'].get('name', '').strip()
    for j in range(i + 1, len(features)):
        name2 = features[j]['properties'].get('name', '').strip()
        if are_similar_names(name1, name2) and name1 != name2:
            duplicate_pairs.append((i, j, name1, name2))
            print(f"Found similar names:")
            print(f"  [{i}] '{name1}'")
            print(f"  [{j}] '{name2}'")
            print(f"  Normalized: '{normalize_name_for_matching(name1)}'")
            print()

if not duplicate_pairs:
    print("No duplicate pairs found!")
    exit(0)

# Create backup
backup_file = f"data/trails_backup_before_fix_{datetime.now().strftime('%Y%m%d_%H%M%S')}.geojson"
with open(backup_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
print(f"[BACKUP] Created backup: {backup_file}\n")

# Merge duplicates
# Sort pairs by index (process from end to start to preserve indices)
duplicate_pairs.sort(key=lambda x: x[1], reverse=True)

indices_to_remove = set()
for i, j, name1, name2 in duplicate_pairs:
    if i in indices_to_remove or j in indices_to_remove:
        continue  # Already processed
    
    # Merge j into i, then remove j
    print(f"Merging '{name2}' into '{name1}'...")
    features[i] = merge_trail_features(features[i], features[j])
    indices_to_remove.add(j)
    print(f"  -> Result: '{features[i]['properties']['name']}'")
    print()

# Remove duplicates
new_features = [f for i, f in enumerate(features) if i not in indices_to_remove]
data['features'] = new_features

# Save
with open('data/trails.geojson', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"\n[SUCCESS] Fixed duplicates")
print(f"  Before: {len(features)} trails")
print(f"  After: {len(new_features)} trails")
print(f"  Removed: {len(indices_to_remove)} duplicates")

# Verify
print("\n[VERIFICATION]")
remaining_names = [f['properties'].get('name', '').strip() for f in new_features]
print(f"Remaining trails: {len(remaining_names)}")
for name in sorted(remaining_names):
    print(f"  - {name}")

