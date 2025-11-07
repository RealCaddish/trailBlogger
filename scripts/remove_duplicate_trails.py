#!/usr/bin/env python3
"""Remove duplicate trails, keeping the one with the most data"""

import json
from datetime import datetime
from collections import defaultdict
import re

def normalize_name(name):
    """Normalize trail name for comparison"""
    if not name:
        return ""
    normalized = re.sub(r"['']", "", name.lower())
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    return normalized

def get_trail_score(feature):
    """Calculate a score for a trail based on data completeness"""
    props = feature['properties']
    score = 0
    
    # Higher score = more complete data
    if props.get('blog_post', '').strip():
        score += 100
    if props.get('images', []):
        score += len(props.get('images', [])) * 10
    if props.get('date_hiked'):
        score += 20
    if props.get('status') == 'hiked':
        score += 10
    if props.get('length', 0) > 0:
        score += 5
    if props.get('coordinates', []):
        score += 50
    
    return score

print("=" * 70)
print("REMOVING DUPLICATE TRAILS")
print("=" * 70)

# Load file
with open('data/trails.geojson', 'r', encoding='utf-8') as f:
    data = json.load(f)

features = data.get('features', [])

# Group by normalized name
trails_by_name = defaultdict(list)

for i, feature in enumerate(features):
    name = feature['properties'].get('name', '').strip()
    normalized = normalize_name(name)
    trails_by_name[normalized].append({
        'index': i,
        'name': name,
        'feature': feature,
        'score': get_trail_score(feature)
    })

# Find duplicates and decide which to keep
indices_to_remove = set()
kept_trails = {}

for normalized, trails in trails_by_name.items():
    if len(trails) > 1:
        # Sort by score (highest first), then by index (lowest first)
        trails.sort(key=lambda x: (-x['score'], x['index']))
        
        # Keep the first one (highest score)
        kept = trails[0]
        kept_trails[normalized] = kept
        
        # Mark others for removal
        for trail in trails[1:]:
            indices_to_remove.add(trail['index'])
            print(f"Removing duplicate: '{trail['name']}' (index {trail['index']}, score {trail['score']})")
            print(f"  Keeping: '{kept['name']}' (index {kept['index']}, score {kept['score']})")
            print()

if not indices_to_remove:
    print("\nNo duplicates found to remove!")
    exit(0)

# Create backup
backup_file = f"data/trails_backup_before_dedup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.geojson"
with open(backup_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
print(f"\n[BACKUP] Created backup: {backup_file}")

# Remove duplicates (iterate in reverse to preserve indices)
new_features = [f for i, f in enumerate(features) if i not in indices_to_remove]

data['features'] = new_features

# Save updated file
with open('data/trails.geojson', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"\n[SUCCESS] Removed {len(indices_to_remove)} duplicate trails")
print(f"  Before: {len(features)} trails")
print(f"  After: {len(new_features)} trails")
print(f"  Removed: {len(indices_to_remove)} duplicates")

# Verify no duplicates remain
trails_by_name_after = defaultdict(list)
for i, feature in enumerate(new_features):
    name = feature['properties'].get('name', '').strip()
    normalized = normalize_name(name)
    trails_by_name_after[normalized].append(i)

remaining_duplicates = {k: v for k, v in trails_by_name_after.items() if len(v) > 1}
if remaining_duplicates:
    print(f"\n[WARNING] Still found {len(remaining_duplicates)} duplicates after removal!")
    for normalized, indices in remaining_duplicates.items():
        print(f"  '{normalized}': {len(indices)} copies at indices {indices}")
else:
    print("\n[VERIFIED] No duplicates remaining!")

