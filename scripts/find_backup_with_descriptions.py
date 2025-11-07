#!/usr/bin/env python3
"""Find the most recent backup that has descriptions"""

import json
import glob
import os
from datetime import datetime

backup_files = sorted(glob.glob('data/trails_backup*.geojson'), reverse=True)

print("=" * 70)
print("FINDING BACKUP WITH DESCRIPTIONS")
print("=" * 70)

best_backup = None
best_count = 0

for backup_file in backup_files:
    try:
        with open(backup_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        features = data.get('features', [])
        desc_count = sum(1 for f in features if f.get('properties', {}).get('blog_post', '').strip())
        
        if desc_count > best_count:
            best_count = desc_count
            best_backup = backup_file
            print(f"\n[FOUND] {os.path.basename(backup_file)}")
            print(f"  Trails with descriptions: {desc_count}")
            
            # Show sample
            for feature in features[:3]:
                props = feature.get('properties', {})
                desc = props.get('blog_post', '').strip()
                if desc:
                    print(f"  - {props.get('name', 'N/A')}: {len(desc)} chars")
    except Exception as e:
        print(f"  [ERROR] Could not read {backup_file}: {e}")

if best_backup:
    print(f"\n" + "=" * 70)
    print(f"BEST BACKUP: {os.path.basename(best_backup)}")
    print(f"  Has {best_count} trails with descriptions")
    print("=" * 70)
else:
    print("\n[WARNING] No backup found with descriptions!")

