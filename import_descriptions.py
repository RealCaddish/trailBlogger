#!/usr/bin/env python3
"""Import descriptions from current_trails.geojson"""

import json
from datetime import datetime

def import_descriptions():
    """Import descriptions and other properties from current_trails"""
    
    print("=" * 70)
    print("IMPORTING DESCRIPTIONS FROM CURRENT_TRAILS.GEOJSON")
    print("=" * 70)
    
    # Load current_trails with descriptions
    print("\n[1/3] Loading current_trails.geojson...")
    with open('data/current_trails/current_trails.geojson', 'r', encoding='utf-8') as f:
        current_data = json.load(f)
    
    current_features = current_data.get('features', [])
    
    # Build lookup by trail name
    trails_with_data = {}
    for feature in current_features:
        props = feature['properties']
        name = props.get('Name') or props.get('name', '')
        
        if name:
            # Extract all useful properties
            trails_with_data[name] = {
                'description': props.get('Description') or props.get('description') or props.get('blog_post', ''),
                'length': props.get('Length') or props.get('length', 0),
                'difficulty': props.get('Difficulty') or props.get('difficulty', 'moderate'),
                'date': props.get('Date') or props.get('date_hiked') or props.get('dateHiked', ''),
                'all_props': props
            }
            
            if trails_with_data[name]['description']:
                print(f"   [+] {name}: Has description ({len(trails_with_data[name]['description'])} chars)")
    
    print(f"\n   Found {len(trails_with_data)} trails with potential data")
    
    # Load existing trails.geojson
    print("\n[2/3] Loading and updating trails.geojson...")
    with open('data/trails.geojson', 'r', encoding='utf-8') as f:
        existing_data = json.load(f)
    
    updated_count = 0
    desc_added = 0
    length_added = 0
    
    for feature in existing_data['features']:
        props = feature['properties']
        name = props.get('name', '')
        
        # Try to find match
        matched_data = None
        for ct_name, ct_data in trails_with_data.items():
            if ct_name.lower() == name.lower() or ct_name.lower() in name.lower() or name.lower() in ct_name.lower():
                matched_data = ct_data
                break
        
        if matched_data:
            changed = False
            
            # Add description if missing
            if matched_data['description'] and not props.get('blog_post'):
                props['blog_post'] = matched_data['description']
                desc_added += 1
                changed = True
                print(f"   [+] Added description to: {name}")
            
            # Add length if missing or zero
            if matched_data['length'] and matched_data['length'] > 0 and props.get('length', 0) == 0:
                props['length'] = matched_data['length']
                length_added += 1
                changed = True
                print(f"   [+] Added length to: {name} ({matched_data['length']} miles)")
            
            # Add difficulty if different
            if matched_data['difficulty'] and matched_data['difficulty'] != 'moderate':
                props['difficulty'] = matched_data['difficulty']
                changed = True
            
            # Add date if missing
            if matched_data['date'] and not props.get('date_hiked'):
                props['date_hiked'] = matched_data['date']
                changed = True
            
            if changed:
                props['updated_at'] = datetime.now().isoformat()
                updated_count += 1
    
    # Save
    print("\n[3/3] Saving...")
    backup_file = f"data/trails_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.geojson"
    with open(backup_file, 'w', encoding='utf-8') as f:
        with open('data/trails.geojson', 'r') as orig:
            json.dump(json.load(orig), f, indent=2)
    print(f"   [OK] Backup: {backup_file}")
    
    with open('data/trails.geojson', 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, indent=2)
    print(f"   [OK] Saved: data/trails.geojson")
    
    # Summary
    print("\n" + "=" * 70)
    print("IMPORT COMPLETE!")
    print("=" * 70)
    
    print(f"\nUpdated {updated_count} trails:")
    print(f"  - Added descriptions: {desc_added}")
    print(f"  - Added lengths: {length_added}")

if __name__ == '__main__':
    try:
        import_descriptions()
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()

