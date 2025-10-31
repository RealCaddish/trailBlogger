#!/usr/bin/env python3
"""
Complete restore system for Trail Blogger
Restores both data and images from a backup
"""

import json
import os
import shutil
import zipfile
from datetime import datetime

def list_available_backups():
    """List all available backups"""
    if not os.path.exists('backups'):
        return []
    
    backups = []
    for item in os.listdir('backups'):
        backup_path = os.path.join('backups', item)
        if os.path.isdir(backup_path):
            # Check if it has the required files
            geojson_file = os.path.join(backup_path, 'trails_backup.geojson')
            if os.path.exists(geojson_file):
                # Get backup metadata
                try:
                    with open(geojson_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    backups.append({
                        'path': backup_path,
                        'name': item,
                        'timestamp': data.get('timestamp'),
                        'metadata': data.get('metadata', {})
                    })
                except:
                    pass
    
    return sorted(backups, key=lambda x: x['timestamp'], reverse=True)

def restore_from_backup(backup_path):
    """Restore trail data and images from a backup"""
    
    print("=" * 70)
    print("RESTORING FROM BACKUP")
    print("=" * 70)
    
    # Verify backup exists
    if not os.path.exists(backup_path):
        print(f"[ERROR] Backup not found: {backup_path}")
        return False
    
    geojson_file = os.path.join(backup_path, 'trails_backup.geojson')
    images_zip = os.path.join(backup_path, 'trail_images.zip')
    
    if not os.path.exists(geojson_file):
        print(f"[ERROR] trails_backup.geojson not found in backup")
        return False
    
    # Load backup data
    print("\n[1/4] Loading backup data...")
    with open(geojson_file, 'r', encoding='utf-8') as f:
        backup_data = json.load(f)
    
    print(f"   Backup created: {backup_data.get('timestamp')}")
    print(f"   Total trails: {backup_data.get('metadata', {}).get('totalTrails', 0)}")
    print(f"   Total images: {backup_data.get('metadata', {}).get('totalImages', 0)}")
    
    # Create backup of current data
    print("\n[2/4] Creating safety backup of current data...")
    if os.path.exists('data/trails.geojson'):
        safety_backup = f"data/trails_before_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}.geojson"
        shutil.copy2('data/trails.geojson', safety_backup)
        print(f"   [OK] Current data backed up to: {safety_backup}")
    
    # Restore trail data
    print("\n[3/4] Restoring trail data...")
    geojson_data = backup_data.get('geojson', {})
    
    # Ensure data directory exists
    os.makedirs('data', exist_ok=True)
    
    with open('data/trails.geojson', 'w', encoding='utf-8') as f:
        json.dump(geojson_data, f, indent=2)
    
    print(f"   [OK] Restored trails.geojson")
    print(f"   - Trails: {len(geojson_data.get('features', []))}")
    
    # Restore images
    print("\n[4/4] Restoring images...")
    if os.path.exists(images_zip):
        # Create safety backup of current images
        if os.path.exists('data/trail_images'):
            safety_images = f"data/trail_images_before_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            if os.path.exists(safety_images):
                shutil.rmtree(safety_images)
            shutil.copytree('data/trail_images', safety_images)
            print(f"   [OK] Current images backed up to: {safety_images}")
            
            # Clear current images
            shutil.rmtree('data/trail_images')
        
        # Extract images
        with zipfile.ZipFile(images_zip, 'r') as zipf:
            zipf.extractall('data')
        
        # Count restored images
        image_count = 0
        for root, dirs, files in os.walk('data/trail_images'):
            for file in files:
                if file.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
                    image_count += 1
        
        print(f"   [OK] Restored images: {image_count}")
    else:
        print("   [WARNING] No images ZIP found in backup")
    
    # Summary
    print("\n" + "=" * 70)
    print("RESTORE COMPLETE!")
    print("=" * 70)
    
    # Verify restoration
    print("\nVerifying restoration...")
    with open('data/trails.geojson', 'r', encoding='utf-8') as f:
        restored = json.load(f)
    
    trails = restored.get('features', [])
    print(f"  - Total trails: {len(trails)}")
    print(f"  - Hiked trails: {sum(1 for t in trails if t['properties'].get('status') == 'hiked')}")
    print(f"  - Total miles: {sum(t['properties'].get('length', 0) for t in trails):.2f}")
    
    # Check for images
    for trail in trails[:5]:  # Check first 5
        props = trail['properties']
        trail_id = props.get('trail_id')
        images = props.get('images', [])
        
        if images:
            trail_dir = f"data/trail_images/trail-{trail_id}"
            missing = []
            for img in images:
                if not os.path.exists(os.path.join(trail_dir, img)):
                    missing.append(img)
            
            if missing:
                print(f"  [WARNING] Trail '{props.get('name')}' missing {len(missing)} images")
            else:
                print(f"  [OK] Trail '{props.get('name')}' - all {len(images)} images present")
    
    return True

def main():
    """Interactive restore"""
    print("=" * 70)
    print("TRAIL BLOGGER - RESTORE FROM BACKUP")
    print("=" * 70)
    
    # List available backups
    backups = list_available_backups()
    
    if not backups:
        print("\n[ERROR] No backups found in 'backups/' directory")
        print("\nTo create a backup, run: python complete_backup.py")
        return
    
    print(f"\nFound {len(backups)} backup(s):\n")
    
    for i, backup in enumerate(backups, 1):
        meta = backup['metadata']
        print(f"{i}. {backup['name']}")
        print(f"   Created: {backup['timestamp']}")
        print(f"   Trails: {meta.get('totalTrails', 0)} ({meta.get('hikedTrails', 0)} hiked)")
        print(f"   Miles: {meta.get('totalMiles', 0):.2f}")
        print(f"   Images: {meta.get('totalImages', 0)}")
        print()
    
    # Auto-select most recent backup
    selected = backups[0]
    print(f"Using most recent backup: {selected['name']}")
    print("\nThis will:")
    print("  1. Create a safety backup of your current data")
    print("  2. Replace data/trails.geojson with backup")
    print("  3. Replace data/trail_images/ with backup images")
    print()
    
    proceed = input("Continue? (yes/no): ").strip().lower()
    
    if proceed == 'yes':
        success = restore_from_backup(selected['path'])
        if success:
            print("\n" + "=" * 70)
            print("Next steps:")
            print("1. Test locally: python server.py")
            print("2. Deploy to GitHub Pages: python deploy.py")
            print("=" * 70)
    else:
        print("\nRestore cancelled")

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()

