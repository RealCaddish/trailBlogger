#!/usr/bin/env python3
"""Compare descriptions between live site and local file"""

import json
import urllib.request

print("=" * 70)
print("COMPARING LIVE SITE vs LOCAL FILE")
print("=" * 70)

# Load local file
print("\n[1/2] Loading local trails.geojson...")
with open('data/trails.geojson', 'r', encoding='utf-8') as f:
    local_data = json.load(f)

local_features = local_data.get('features', [])
local_descriptions = sum(1 for f in local_features if f.get('properties', {}).get('blog_post', '').strip())

print(f"  Local trails: {len(local_features)}")
print(f"  Local trails with descriptions: {local_descriptions}")

# Load live site
print("\n[2/2] Loading from live site...")
try:
    url = "https://realcaddish.github.io/trailBlogger/data/trails.geojson"
    with urllib.request.urlopen(url) as response:
        live_data = json.load(response)
    
    live_features = live_data.get('features', [])
    live_descriptions = sum(1 for f in live_features if f.get('properties', {}).get('blog_post', '').strip())
    
    print(f"  Live trails: {len(live_features)}")
    print(f"  Live trails with descriptions: {live_descriptions}")
    
    # Compare
    print("\n" + "=" * 70)
    print("COMPARISON")
    print("=" * 70)
    
    if live_descriptions > local_descriptions:
        print(f"\n[WARNING] Live site has {live_descriptions} descriptions, but local has {local_descriptions}")
        print("  The local file is missing descriptions!")
        
        # Show which trails have descriptions on live but not local
        print("\nTrails with descriptions on LIVE but missing on LOCAL:")
        for live_feature in live_features:
            live_props = live_feature.get('properties', {})
            live_name = live_props.get('name', '')
            live_desc = live_props.get('blog_post', '').strip()
            
            if live_desc:
                # Check if local has it
                local_feature = next((f for f in local_features if f.get('properties', {}).get('name') == live_name), None)
                if local_feature:
                    local_desc = local_feature.get('properties', {}).get('blog_post', '').strip()
                    if not local_desc:
                        print(f"  - {live_name}: {len(live_desc)} chars (missing locally)")
    elif local_descriptions > live_descriptions:
        print(f"\n[INFO] Local has {local_descriptions} descriptions, but live has {live_descriptions}")
        print("  Local file has more descriptions - need to push to GitHub")
    else:
        print(f"\n[OK] Both have {local_descriptions} descriptions")
        
except Exception as e:
    print(f"  [ERROR] Could not load from live site: {e}")

