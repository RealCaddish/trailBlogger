#!/usr/bin/env python3
"""
Sync trail data from localhost:5000 to data/trails.geojson
This ensures all edits made on localhost are saved to the file for deployment
"""

import json
import urllib.request
import urllib.error
from datetime import datetime

def sync_from_localhost():
    print("=" * 70)
    print("SYNCING DATA FROM LOCALHOST:5000")
    print("=" * 70)
    
    # Step 1: Fetch data from Flask server
    print("\n[1/5] Fetching trail data from Flask server...")
    try:
        with urllib.request.urlopen('http://localhost:5000/api/trails') as response:
            server_data = json.loads(response.read().decode('utf-8'))
    except urllib.error.URLError as e:
        print(f"\n[ERROR] Could not connect to Flask server")
        print(f"Error: {e}")
        print("\nMake sure Flask server is running:")
        print("  python server.py")
        return False
    
    server_trails = server_data.get('features', [])
    print(f"   Found {len(server_trails)} trails from Flask server")
    
    # Step 2: Load current file data
    print("\n[2/5] Loading current trails.geojson...")
    with open('data/trails.geojson', 'r', encoding='utf-8') as f:
        file_data = json.load(f)
    
    file_trails = file_data.get('features', [])
    print(f"   Found {len(file_trails)} trails in file")
    
    # Step 3: Compare and identify differences
    print("\n[3/5] Comparing data...")
    
    differences = []
    
    for server_trail in server_trails:
        server_props = server_trail['properties']
        server_name = server_props.get('name', '')
        
        # Find matching trail in file
        file_trail = None
        for ft in file_trails:
            if ft['properties'].get('name', '') == server_name:
                file_trail = ft
                break
        
        if file_trail:
            file_props = file_trail['properties']
            
            # Check for differences
            diffs = []
            
            # Check date_hiked
            server_date = server_props.get('date_hiked') or server_props.get('dateHiked')
            file_date = file_props.get('date_hiked') or file_props.get('dateHiked')
            if server_date != file_date:
                diffs.append(f"date: '{file_date}' -> '{server_date}'")
            
            # Check blog_post
            server_blog = server_props.get('blog_post', '')
            file_blog = file_props.get('blog_post', '')
            if server_blog != file_blog:
                diffs.append(f"description: {len(file_blog)} chars -> {len(server_blog)} chars")
            
            # Check status
            server_status = server_props.get('status')
            file_status = file_props.get('status')
            if server_status != file_status:
                diffs.append(f"status: '{file_status}' -> '{server_status}'")
            
            if diffs:
                differences.append((server_name, diffs))
        else:
            differences.append((server_name, ['NEW TRAIL - not in file']))
    
    if differences:
        print(f"\n   Found differences in {len(differences)} trails:")
        for name, diffs in differences:
            print(f"\n   {name}:")
            for diff in diffs:
                print(f"     - {diff}")
    else:
        print("   No differences found - file is up to date!")
        return True
    
    # Step 4: Create backup before replacing
    print("\n[4/5] Creating backup of current file...")
    backup_file = f"data/trails_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.geojson"
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(file_data, f, indent=2)
    print(f"   Backup created: {backup_file}")
    
    # Step 5: Replace file with server data
    print("\n[5/5] Updating trails.geojson with server data...")
    with open('data/trails.geojson', 'w', encoding='utf-8') as f:
        json.dump(server_data, f, indent=2)
    
    print("   [OK] File updated!")
    
    # Summary
    print("\n" + "=" * 70)
    print("SYNC COMPLETE")
    print("=" * 70)
    
    print(f"\nUpdated trails.geojson with data from localhost:5000")
    print(f"Changes: {len(differences)} trails updated")
    
    # Show trail details
    print("\n" + "=" * 70)
    print("CURRENT TRAIL DATA (after sync)")
    print("=" * 70)
    
    for i, trail in enumerate(server_trails, 1):
        props = trail['properties']
        name = props.get('name', 'Unknown')
        status = props.get('status', 'unknown')
        date = props.get('date_hiked') or props.get('dateHiked', 'No date')
        blog = len(props.get('blog_post', ''))
        images = len(props.get('images', []))
        coords = len(trail['geometry'].get('coordinates', []))
        
        print(f"\n{i}. {name}")
        print(f"   Status: {status}")
        print(f"   Date: {date}")
        print(f"   Description: {blog} chars")
        print(f"   Images: {images}")
        print(f"   GPS points: {coords}")
    
    print("\n" + "=" * 70)
    print("NEXT STEP: Deploy to GitHub Pages")
    print("=" * 70)
    print("\n  python deploy.py")
    
    return True

if __name__ == '__main__':
    try:
        success = sync_from_localhost()
        if not success:
            print("\n[FAILED] Sync unsuccessful")
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()

