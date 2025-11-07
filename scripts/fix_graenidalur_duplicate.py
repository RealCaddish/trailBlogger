#!/usr/bin/env python3
"""Fix Graenidalur/Graenidaulur duplicate"""

import json
from datetime import datetime

print("=" * 70)
print("FIXING GRAENIDALUR DUPLICATE")
print("=" * 70)

# Load file
with open('data/trails.geojson', 'r', encoding='utf-8') as f:
    data = json.load(f)

features = data.get('features', [])

# Find both trails
graenidalur_idx = None
graenidaulur_idx = None

for i, feature in enumerate(features):
    name = feature['properties'].get('name', '').strip()
    if name == 'Graenidalur Loop':
        graenidalur_idx = i
    elif name == 'Graenidaulur Loop':
        graenidaulur_idx = i

if graenidalur_idx is None or graenidaulur_idx is None:
    print("Could not find both trails!")
    exit(1)

print(f"\nFound trails:")
print(f"  [{graenidalur_idx}] Graenidalur Loop (correct spelling)")
print(f"  [{graenidaulur_idx}] Graenidaulur Loop (typo)")

# Create backup
backup_file = f"data/trails_backup_before_graenidalur_fix_{datetime.now().strftime('%Y%m%d_%H%M%S')}.geojson"
with open(backup_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
print(f"\n[BACKUP] Created backup: {backup_file}")

# Merge: Keep Graenidalur (correct spelling), merge data from Graenidaulur
graenidalur = features[graenidalur_idx]
graenidaulur = features[graenidaulur_idx]

props1 = graenidalur['properties']
props2 = graenidaulur['properties']

# Merge properties - keep best data
# Name: Keep "Graenidalur Loop" (correct spelling)
merged_props = props1.copy()
merged_props['name'] = 'Graenidalur Loop'

# Description - keep longer one
desc1 = props1.get('blog_post', '').strip()
desc2 = props2.get('blog_post', '').strip()
if len(desc2) > len(desc1):
    merged_props['blog_post'] = desc2
    print(f"  Using description from Graenidaulur ({len(desc2)} chars)")

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
print(f"  Merged images: {len(images1)} + {len(images2)} -> {len(merged_images)} unique")

# Status - prefer "hiked"
if props2.get('status') == 'hiked' or props1.get('status') == 'hiked':
    merged_props['status'] = 'hiked'
    print(f"  Status: hiked")

# Date - keep most recent
date1 = props1.get('date_hiked', '')
date2 = props2.get('date_hiked', '')
if date2 and (not date1 or date2 > date1):
    merged_props['date_hiked'] = date2
    print(f"  Using date from Graenidaulur: {date2}")

# Update timestamp
merged_props['updated_at'] = datetime.now().isoformat()

# Geometry - prefer more coordinates
geom1 = graenidalur.get('geometry', {})
geom2 = graenidaulur.get('geometry', {})
coords1 = geom1.get('coordinates', [])
coords2 = geom2.get('coordinates', [])

if len(coords2) > len(coords1):
    merged_geom = geom2
    print(f"  Using geometry from Graenidaulur ({len(coords2)} coordinates)")
else:
    merged_geom = geom1
    print(f"  Using geometry from Graenidalur ({len(coords1)} coordinates)")

# Update the feature
features[graenidalur_idx] = {
    'type': 'Feature',
    'properties': merged_props,
    'geometry': merged_geom
}

# Remove the duplicate
features.pop(graenidaulur_idx)

data['features'] = features

# Save
with open('data/trails.geojson', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"\n[SUCCESS] Merged Graenidaulur Loop into Graenidalur Loop")
print(f"  Before: {len(data.get('features', [])) + 1} trails")
print(f"  After: {len(data.get('features', []))} trails")

# Verify
print("\n[VERIFICATION]")
remaining_names = [f['properties'].get('name', '').strip() for f in features]
graenidalur_count = sum(1 for name in remaining_names if 'graenidal' in name.lower())
print(f"  Graenidalur trails remaining: {graenidalur_count}")
if graenidalur_count == 1:
    print("  [OK] Only one Graenidalur trail remains!")
else:
    print(f"  [WARNING] Found {graenidalur_count} Graenidalur trails")

