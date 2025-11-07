#!/usr/bin/env python3
"""Restore descriptions from a backup file"""

import json
import sys
from datetime import datetime

if len(sys.argv) < 2:
    print("Usage: python restore_descriptions.py <backup_file>")
    sys.exit(1)

backup_file = sys.argv[1]

print("=" * 70)
print("RESTORING DESCRIPTIONS FROM BACKUP")
print("=" * 70)

# Load backup
print(f"\n[1/3] Loading backup: {backup_file}")
with open(backup_file, 'r', encoding='utf-8') as f:
    backup_data = json.load(f)

backup_features = backup_data.get('features', [])
backup_descriptions = {}
for feature in backup_features:
    props = feature.get('properties', {})
    name = props.get('name', '').strip()
    desc = props.get('blog_post', '').strip()
    if name and desc:
        backup_descriptions[name] = desc

print(f"  Found {len(backup_descriptions)} trails with descriptions in backup")

# Load current file
print("\n[2/3] Loading current trails.geojson...")
with open('data/trails.geojson', 'r', encoding='utf-8') as f:
    current_data = json.load(f)

current_features = current_data.get('features', [])

# Create backup of current file
backup_current = f"data/trails_backup_before_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}.geojson"
with open(backup_current, 'w', encoding='utf-8') as f:
    json.dump(current_data, f, indent=2, ensure_ascii=False)
print(f"  Created backup: {backup_current}")

# Restore descriptions
print("\n[3/3] Restoring descriptions...")
restored_count = 0
for feature in current_features:
    props = feature.get('properties', {})
    name = props.get('name', '').strip()
    
    if name in backup_descriptions:
        current_desc = props.get('blog_post', '').strip()
        if not current_desc:
            props['blog_post'] = backup_descriptions[name]
            restored_count += 1
            print(f"  [RESTORED] {name}: {len(backup_descriptions[name])} chars")

# Save updated file
print(f"\n[4/4] Saving updated trails.geojson...")
with open('data/trails.geojson', 'w', encoding='utf-8') as f:
    json.dump(current_data, f, indent=2, ensure_ascii=False)

print(f"\n[SUCCESS] Restored {restored_count} descriptions")
print(f"  Total trails: {len(current_features)}")
print(f"  Trails with descriptions now: {sum(1 for f in current_features if f.get('properties', {}).get('blog_post', '').strip())}")

