#!/usr/bin/env python3
"""Check what descriptions are actually on the live site"""

import json
import urllib.request

print("=" * 70)
print("CHECKING LIVE SITE DESCRIPTIONS")
print("=" * 70)

# Load from live site
print("\n[1/2] Loading from live site...")
try:
    url = "https://realcaddish.github.io/trailBlogger/data/trails.geojson"
    with urllib.request.urlopen(url) as response:
        live_data = json.load(response)
    
    live_features = live_data.get('features', [])
    live_descriptions = []
    
    for feature in live_features:
        props = feature.get('properties', {})
        name = props.get('name', '')
        desc = props.get('blog_post', '').strip()
        if desc:
            live_descriptions.append((name, len(desc)))
    
    print(f"  Live trails: {len(live_features)}")
    print(f"  Live trails with descriptions: {len(live_descriptions)}")
    
    if live_descriptions:
        print("\n  Trails with descriptions on LIVE site:")
        for name, length in live_descriptions:
            print(f"    - {name}: {length} chars")
    else:
        print("\n  [WARNING] No descriptions found on live site!")
        
        # Show sample trail to see what fields exist
        if live_features:
            sample = live_features[0]
            props = sample.get('properties', {})
            print(f"\n  Sample trail: {props.get('name', 'N/A')}")
            print(f"  Property keys: {list(props.keys())}")
            print(f"  blog_post value: '{props.get('blog_post', '')}'")
            print(f"  description value: '{props.get('description', '')}'")
        
except Exception as e:
    print(f"  [ERROR] Could not load from live site: {e}")
    import traceback
    traceback.print_exc()

# Compare with local
print("\n[2/2] Loading local file...")
try:
    with open('data/trails.geojson', 'r', encoding='utf-8') as f:
        local_data = json.load(f)
    
    local_features = local_data.get('features', [])
    local_descriptions = []
    
    for feature in local_features:
        props = feature.get('properties', {})
        name = props.get('name', '')
        desc = props.get('blog_post', '').strip()
        if desc:
            local_descriptions.append((name, len(desc)))
    
    print(f"  Local trails: {len(local_features)}")
    print(f"  Local trails with descriptions: {len(local_descriptions)}")
    
    if local_descriptions:
        print("\n  Trails with descriptions in LOCAL file:")
        for name, length in local_descriptions[:5]:
            print(f"    - {name}: {length} chars")
    
    # Compare
    print("\n" + "=" * 70)
    print("COMPARISON")
    print("=" * 70)
    
    if len(local_descriptions) > len(live_descriptions):
        print(f"\n[ISSUE] Local file has {len(local_descriptions)} descriptions, but live site has {len(live_descriptions)}")
        print("  The file might not have been pushed to GitHub, or GitHub hasn't updated yet.")
        
        # Check which descriptions are missing
        local_names = {name for name, _ in local_descriptions}
        live_names = {name for name, _ in live_descriptions}
        missing = local_names - live_names
        if missing:
            print(f"\n  Missing descriptions on live site:")
            for name in missing:
                print(f"    - {name}")
    elif len(live_descriptions) == len(local_descriptions):
        print(f"\n[OK] Both have {len(live_descriptions)} descriptions")
    else:
        print(f"\n[INFO] Live site has more descriptions than local")
        
except Exception as e:
    print(f"  [ERROR] Could not load local file: {e}")

