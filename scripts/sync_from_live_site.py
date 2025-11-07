#!/usr/bin/env python3
"""Download trails.geojson from live site and sync to local"""

import json
import urllib.request
from datetime import datetime
from pathlib import Path

print("=" * 70)
print("SYNCING FROM LIVE SITE TO LOCALHOST")
print("=" * 70)

# Download from live site
live_url = 'https://realcaddish.github.io/trailBlogger/data/trails.geojson'
print(f"\n[1/3] Downloading from live site: {live_url}")

try:
    with urllib.request.urlopen(live_url) as response:
        live_data = json.loads(response.read().decode('utf-8'))
    
    live_trails = live_data.get('features', [])
    print(f"   [OK] Downloaded {len(live_trails)} trails from live site")
    
    # Count descriptions
    live_with_desc = [f for f in live_trails if f['properties'].get('blog_post', '').strip()]
    print(f"   [OK] Found {len(live_with_desc)} trails with descriptions")
    
except Exception as e:
    print(f"   [ERROR] Error downloading from live site: {e}")
    exit(1)

# Load local file
print(f"\n[2/3] Loading local file...")
try:
    with open('data/trails.geojson', 'r', encoding='utf-8') as f:
        local_data = json.load(f)
    
    local_trails = local_data.get('features', [])
    local_with_desc = [f for f in local_trails if f['properties'].get('blog_post', '').strip()]
    
    print(f"   Local file has {len(local_trails)} trails")
    print(f"   Local file has {len(local_with_desc)} trails with descriptions")
    
except Exception as e:
    print(f"   ❌ Error loading local file: {e}")
    exit(1)

# Create backup of local file
backup_file = f"data/trails_backup_before_sync_{datetime.now().strftime('%Y%m%d_%H%M%S')}.geojson"
print(f"\n[3/3] Creating backup: {backup_file}")
with open(backup_file, 'w', encoding='utf-8') as f:
    json.dump(local_data, f, indent=2, ensure_ascii=False)
print(f"   [OK] Backup created")

# Update local file with live data
print(f"\n[4/4] Updating local file with live data...")
with open('data/trails.geojson', 'w', encoding='utf-8') as f:
    json.dump(live_data, f, indent=2, ensure_ascii=False)
print(f"   [OK] Local file updated")

# Verify
print("\n" + "=" * 70)
print("VERIFICATION")
print("=" * 70)
with open('data/trails.geojson', 'r', encoding='utf-8') as f:
    verify_data = json.load(f)

verify_trails = verify_data.get('features', [])
verify_with_desc = [f for f in verify_trails if f['properties'].get('blog_post', '').strip()]

print(f"\nLocal file now has:")
print(f"  Total trails: {len(verify_trails)}")
print(f"  Trails with descriptions: {len(verify_with_desc)}")

if verify_with_desc:
    print(f"\nTrails with descriptions:")
    for trail in verify_with_desc:
        name = trail['properties'].get('name', 'Unknown')
        desc_len = len(trail['properties'].get('blog_post', ''))
        print(f"  - {name}: {desc_len} chars")

print("\n[SUCCESS] Sync complete! Refresh your browser at localhost:5000 to see the descriptions.")

