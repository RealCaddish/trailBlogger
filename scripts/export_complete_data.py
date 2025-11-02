#!/usr/bin/env python3
"""
Export complete trail data from Flask server and merge with backup
"""

import json
from datetime import datetime
import os
import urllib.request
import urllib.error

def export_complete_data():
    """Export all trail data from Flask server"""
    
    print("=" * 70)
    print("EXPORTING COMPLETE TRAIL DATA")
    print("=" * 70)
    
    # 1. Get current data from Flask API
    print("\n[1/5] Fetching trail data from Flask server...")
    try:
        with urllib.request.urlopen('http://localhost:5000/api/trails') as response:
            flask_data = json.loads(response.read().decode('utf-8'))
        print(f"   Found {len(flask_data.get('features', []))} trails from Flask API")
    except Exception as e:
        print(f"   [ERROR] Could not connect to Flask server: {e}")
        print("   Make sure Flask server is running: python server.py")
        return False
    
    # 2. Load backup file if it exists
    backup_file = r'C:\Users\Nate\Downloads\trailblogger_images_backup_2025-10-31.json'
    backup_trails = {}
    
    if os.path.exists(backup_file):
        print(f"\n[2/5] Loading backup file...")
        with open(backup_file, 'r', encoding='utf-8') as f:
            backup_data = json.load(f)
            for trail in backup_data.get('trails', []):
                trail_id = str(trail.get('trailId'))
                backup_trails[trail_id] = {
                    'name': trail.get('trailName', ''),
                    'images': trail.get('images', [])
                }
        print(f"   Found {len(backup_trails)} trails in backup with real names")
    else:
        print(f"\n[2/5] No backup file found at {backup_file}")
    
    # 3. Merge data - use real names from backup
    print("\n[3/5] Merging data...")
    merged_count = 0
    updated_trails = []
    
    for feature in flask_data.get('features', []):
        props = feature['properties']
        trail_id = str(props.get('trail_id', ''))
        
        # If we have better data in backup, use it
        if trail_id in backup_trails:
            backup_info = backup_trails[trail_id]
            real_name = backup_info['name']
            
            if real_name and real_name != props.get('name', ''):
                print(f"   [+] {trail_id}: '{props.get('name')}' -> '{real_name}'")
                props['name'] = real_name
                props['updated_at'] = datetime.now().isoformat()
                merged_count += 1
        
        updated_trails.append(feature)
    
    # 4. Create the complete GeoJSON
    complete_data = {
        "type": "FeatureCollection",
        "features": updated_trails
    }
    
    print(f"\n   Merged {merged_count} trail names from backup")
    
    # 5. Save multiple backups
    print("\n[4/5] Creating backups...")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Full backup
    full_backup = f"data/trails_complete_backup_{timestamp}.geojson"
    with open(full_backup, 'w', encoding='utf-8') as f:
        json.dump(complete_data, f, indent=2)
    print(f"   [OK] Complete backup: {full_backup}")
    
    # Also save as current trails.geojson
    print("\n[5/5] Updating trails.geojson...")
    with open('data/trails.geojson', 'w', encoding='utf-8') as f:
        json.dump(complete_data, f, indent=2)
    print(f"   [OK] Updated: data/trails.geojson")
    
    # Print summary
    print("\n" + "=" * 70)
    print("EXPORT COMPLETE!")
    print("=" * 70)
    
    print(f"\nTotal trails: {len(updated_trails)}")
    print(f"Trails with real names: {merged_count}")
    
    missing_data = []
    for feature in updated_trails:
        props = feature['properties']
        issues = []
        if props.get('length', 0) == 0:
            issues.append('no length')
        if not feature['geometry'].get('coordinates'):
            issues.append('no coordinates')
        if not props.get('blog_post', ''):
            issues.append('no description')
        if issues:
            missing_data.append(f"   - {props.get('name', 'Unknown')}: {', '.join(issues)}")
    
    if missing_data:
        print(f"\n[!] Trails still missing data:")
        for item in missing_data[:10]:  # Show first 10
            print(item)
        if len(missing_data) > 10:
            print(f"   ... and {len(missing_data) - 10} more")
    
    print("\n" + "=" * 70)
    print("NEXT STEPS:")
    print("=" * 70)
    print("""
1. CHECK your data at http://localhost:5000
   - Trail names should now be correct!
   
2. ADD missing information:
   - If you remember trail lengths, descriptions, dates:
     * Use the web interface to edit each trail
     * OR use the CSV template method
   
   - If you have GPX files with coordinates:
     * Import them through the web interface
   
3. DEPLOY to GitHub Pages:
   git add data/trails.geojson
   git commit -m "Update trail data with real names and complete information"
   git push origin main
   
4. Your backup is saved at: {full_backup}
""")
    
    return True

if __name__ == '__main__':
    try:
        export_complete_data()
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()

