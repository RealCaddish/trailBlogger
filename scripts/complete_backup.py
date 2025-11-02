#!/usr/bin/env python3
"""
Complete backup system for Trail Blogger
Creates a comprehensive backup of both data and images
"""

import json
import os
import shutil
import zipfile
from datetime import datetime

def create_complete_backup():
    """Create a complete backup of trails and images"""
    
    print("=" * 70)
    print("CREATING COMPLETE BACKUP")
    print("=" * 70)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_dir = f"backups/backup_{timestamp}"
    os.makedirs(backup_dir, exist_ok=True)
    
    # Step 1: Backup trails.geojson with metadata
    print("\n[1/3] Backing up trail data...")
    if not os.path.exists('data/trails.geojson'):
        print("   [ERROR] trails.geojson not found!")
        return False
    
    with open('data/trails.geojson', 'r', encoding='utf-8') as f:
        geojson_data = json.load(f)
    
    trails = geojson_data.get('features', [])
    total_images = sum(len(t['properties'].get('images', [])) for t in trails)
    
    backup_data = {
        'timestamp': datetime.now().isoformat(),
        'version': '2.0',
        'metadata': {
            'totalTrails': len(trails),
            'hikedTrails': sum(1 for t in trails if t['properties'].get('status') == 'hiked'),
            'totalMiles': sum(t['properties'].get('length', 0) for t in trails),
            'totalImages': total_images,
            'backupCreated': datetime.now().isoformat()
        },
        'geojson': geojson_data
    }
    
    backup_file = os.path.join(backup_dir, 'trails_backup.geojson')
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(backup_data, f, indent=2)
    
    print(f"   [OK] Saved trail data: {backup_file}")
    print(f"   - Trails: {backup_data['metadata']['totalTrails']}")
    print(f"   - Images: {total_images}")
    
    # Step 2: Backup images
    print("\n[2/3] Backing up images...")
    if os.path.exists('data/trail_images'):
        images_zip = os.path.join(backup_dir, 'trail_images.zip')
        
        with zipfile.ZipFile(images_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            image_count = 0
            for root, dirs, files in os.walk('data/trail_images'):
                for file in files:
                    if file.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
                        file_path = os.path.join(root, file)
                        # Store with relative path from data/
                        arcname = os.path.relpath(file_path, 'data')
                        zipf.write(file_path, arcname)
                        image_count += 1
        
        zip_size_mb = os.path.getsize(images_zip) / (1024 * 1024)
        print(f"   [OK] Created images ZIP: {images_zip}")
        print(f"   - Images: {image_count}")
        print(f"   - Size: {zip_size_mb:.2f} MB")
    else:
        print("   [WARNING] No trail_images directory found")
    
    # Step 3: Create README
    print("\n[3/3] Creating README...")
    readme_content = f"""# Trail Blogger Backup
Created: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Contents
- `trails_backup.geojson`: All trail data (coordinates, descriptions, metadata)
- `trail_images.zip`: All trail images

## Statistics
- Total Trails: {backup_data['metadata']['totalTrails']}
- Hiked Trails: {backup_data['metadata']['hikedTrails']}
- Total Miles: {backup_data['metadata']['totalMiles']:.2f}
- Total Images: {total_images}

## Restore Instructions

### For Local Development (localhost:5000)
1. Stop the Flask server if running
2. Replace `data/trails.geojson` with `trails_backup.geojson`
3. Extract `trail_images.zip` to `data/` (this will create `data/trail_images/`)
4. Restart Flask server: `python server.py`

### For GitHub Pages
1. Replace `data/trails.geojson` with `trails_backup.geojson`
2. Extract `trail_images.zip` to `data/` (preserves folder structure)
3. Commit and push:
   ```bash
   git add data/trails.geojson data/trail_images/
   git commit -m "Restore from backup"
   git push origin main
   ```
4. Wait 2 minutes for GitHub Pages to rebuild

## Image Path Format
Images are referenced by filename only in trails.geojson:
- In GeoJSON: `"images": ["image1.jpg", "image2.jpg"]`
- Directory structure: `data/trail_images/trail-<id>/<filename>`
- Frontend constructs full path automatically

## Notes
- This backup includes ALL data from localhost:5000
- Image paths are relative and will work on both local and GitHub Pages
- The GeoJSON includes GPS coordinates, descriptions, dates, and all metadata
"""
    
    readme_file = os.path.join(backup_dir, 'README.md')
    with open(readme_file, 'w', encoding='utf-8') as f:
        f.write(readme_content)
    
    print(f"   [OK] Created README: {readme_file}")
    
    # Summary
    print("\n" + "=" * 70)
    print("BACKUP COMPLETE!")
    print("=" * 70)
    print(f"\nBackup location: {backup_dir}")
    print("\nContents:")
    for item in os.listdir(backup_dir):
        item_path = os.path.join(backup_dir, item)
        if os.path.isfile(item_path):
            size_mb = os.path.getsize(item_path) / (1024 * 1024)
            print(f"  - {item} ({size_mb:.2f} MB)")
    
    total_size = sum(
        os.path.getsize(os.path.join(backup_dir, f)) 
        for f in os.listdir(backup_dir) 
        if os.path.isfile(os.path.join(backup_dir, f))
    ) / (1024 * 1024)
    
    print(f"\nTotal backup size: {total_size:.2f} MB")
    
    return True

if __name__ == '__main__':
    try:
        success = create_complete_backup()
        if success:
            print("\n" + "=" * 70)
            print("Next steps:")
            print("1. Keep this backup safe!")
            print("2. To deploy to GitHub Pages: python deploy.py")
            print("3. To restore: follow README.md in backup folder")
            print("=" * 70)
        else:
            print("\n[ERROR] Backup failed")
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()

