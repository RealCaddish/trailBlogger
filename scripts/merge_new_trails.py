#!/usr/bin/env python3
"""
Merge new individual trail GeoJSON files from current_trails/ into trails.geojson
"""

import json
import os
from pathlib import Path

def merge_new_trails():
    """Merge individual trail files from current_trails/ into main trails.geojson"""
    
    print("=" * 70)
    print("MERGING NEW TRAIL FILES INTO trails.geojson")
    print("=" * 70)
    
    # 1. Load existing trails.geojson
    print("\n[1/3] Loading existing trails.geojson...")
    trails_file = Path('data/trails.geojson')
    
    if not trails_file.exists():
        print("   ERROR: trails.geojson not found!")
        return
    
    with open(trails_file, 'r', encoding='utf-8') as f:
        trails_data = json.load(f)
    
    existing_features = trails_data.get('features', [])
    existing_names = {f['properties'].get('name') or f['properties'].get('Name', ''): f 
                      for f in existing_features}
    
    print(f"   Found {len(existing_features)} existing trails")
    
    # 2. Load new individual trail files
    print("\n[2/3] Loading new trail files from current_trails/...")
    current_trails_dir = Path('data/current_trails')
    
    new_trails = []
    trail_files = list(current_trails_dir.glob('*.geojson'))
    
    # Exclude current_trails.geojson itself
    trail_files = [f for f in trail_files if f.name != 'current_trails.geojson']
    
    print(f"   Found {len(trail_files)} individual trail files:")
    
    for trail_file in trail_files:
        print(f"   - {trail_file.name}")
        with open(trail_file, 'r', encoding='utf-8') as f:
            trail_data = json.load(f)
        
        features = trail_data.get('features', [])
        for feature in features:
            props = feature.get('properties', {})
            trail_name = props.get('Name') or props.get('name', '')
            
            if trail_name:
                # Check if already exists
                if trail_name in existing_names:
                    print(f"     [!] {trail_name} already exists, skipping...")
                else:
                    # Ensure status is unhiked if not set
                    if 'status' not in props:
                        props['status'] = 'unhiked'
                    
                    new_trails.append(feature)
                    print(f"     [+] Adding {trail_name}")
    
    # 3. Merge and save
    print(f"\n[3/3] Merging {len(new_trails)} new trails...")
    
    if new_trails:
        trails_data['features'].extend(new_trails)
        
        # Save backup first
        backup_file = f"data/trails_backup_before_merge_{Path(trails_file).stat().st_mtime}.geojson"
        print(f"   Creating backup: {backup_file}")
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump({'features': existing_features}, f, indent=2)
        
        # Save merged file
        with open(trails_file, 'w', encoding='utf-8') as f:
            json.dump(trails_data, f, indent=2)
        
        print(f"\n   SUCCESS! Added {len(new_trails)} new trails")
        print(f"   Total trails now: {len(trails_data['features'])}")
        print(f"\n   Next steps:")
        print(f"   1. Test on localhost:5000")
        print(f"   2. Deploy: python scripts/deploy.py")
    else:
        print("\n   No new trails to merge (all already exist)")
    
    print("\n" + "=" * 70)

if __name__ == '__main__':
    merge_new_trails()

