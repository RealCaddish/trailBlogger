#!/usr/bin/env python3
"""
Trail Blogger Deployment Script
Automates the process of deploying localhost:5000 changes to GitHub Pages
"""

import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

def print_header(text):
    """Print a formatted header"""
    print("\n" + "=" * 70)
    print(text)
    print("=" * 70 + "\n")

def print_success(text):
    """Print success message"""
    print(f"[OK] {text}")

def print_error(text):
    """Print error message"""
    print(f"[ERROR] {text}")

def print_warning(text):
    """Print warning message"""
    print(f"[!] {text}")

def check_data_integrity():
    """Verify trail data is valid"""
    print_header("CHECKING DATA INTEGRITY")
    
    trails_file = 'data/trails.geojson'
    
    # Check if file exists
    if not os.path.exists(trails_file):
        print_error(f"{trails_file} not found!")
        return False
    
    # Check if valid JSON
    try:
        with open(trails_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print_success("trails.geojson is valid JSON")
    except json.JSONDecodeError as e:
        print_error(f"trails.geojson is not valid JSON: {e}")
        return False
    
    # Check structure
    if not isinstance(data, dict) or 'features' not in data:
        print_error("trails.geojson missing 'features' array")
        return False
    
    features = data.get('features', [])
    print_success(f"Found {len(features)} trails")
    
    # Check for trails without names
    empty_names = [f['properties'].get('trail_id', 'unknown') 
                   for f in features if not f['properties'].get('name')]
    
    if empty_names:
        print_warning(f"{len(empty_names)} trails have no name: {empty_names}")
    
    # Check for trails with images
    trails_with_images = sum(1 for f in features if f['properties'].get('images'))
    print_success(f"{trails_with_images} trails have images")
    
    # Check for trails with GPS
    trails_with_gps = sum(1 for f in features 
                          if f['geometry'].get('coordinates') and len(f['geometry']['coordinates']) > 1)
    print_success(f"{trails_with_gps} trails have GPS coordinates")
    
    return True

def check_image_files():
    """Verify image files exist"""
    print_header("CHECKING IMAGE FILES")
    
    trails_file = 'data/trails.geojson'
    with open(trails_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    missing_images = []
    total_images = 0
    
    for feature in data['features']:
        props = feature['properties']
        trail_id = props.get('trail_id')
        images = props.get('images', [])
        
        for img in images:
            total_images += 1
            # Images are stored as just filenames
            img_path = f"data/trail_images/trail-{trail_id}/{img}"
            
            if not os.path.exists(img_path):
                missing_images.append(img_path)
    
    if missing_images:
        print_warning(f"{len(missing_images)} images referenced but not found:")
        for img in missing_images[:5]:  # Show first 5
            print(f"  - {img}")
        if len(missing_images) > 5:
            print(f"  ... and {len(missing_images) - 5} more")
    else:
        print_success(f"All {total_images} images exist")
    
    return len(missing_images) == 0

def show_git_changes():
    """Show what changed in git"""
    print_header("GIT CHANGES")
    
    try:
        # Check if there are changes
        result = subprocess.run(['git', 'status', '--porcelain'], 
                              capture_output=True, text=True, check=True)
        
        if not result.stdout.strip():
            print_warning("No changes to commit")
            return False
        
        # Show changes
        print("Modified files:")
        for line in result.stdout.strip().split('\n'):
            print(f"  {line}")
        
        # Show trail data diff summary
        try:
            diff = subprocess.run(['git', 'diff', 'data/trails.geojson'], 
                                capture_output=True, text=True, check=True)
            if diff.stdout:
                added = diff.stdout.count('\n+')
                removed = diff.stdout.count('\n-')
                print(f"\ntrails.geojson: +{added} lines, -{removed} lines")
        except:
            pass
        
        return True
        
    except subprocess.CalledProcessError as e:
        print_error(f"Git error: {e}")
        return False

def create_backup():
    """Create backup before deploying"""
    print_header("CREATING BACKUP")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"data/trails_backup_{timestamp}.geojson"
    
    try:
        # Copy current trails.geojson to backup
        with open('data/trails.geojson', 'r', encoding='utf-8') as src:
            with open(backup_file, 'w', encoding='utf-8') as dst:
                dst.write(src.read())
        
        print_success(f"Backup created: {backup_file}")
        
        # Keep only last 10 backups
        backups = sorted(Path('data').glob('trails_backup_*.geojson'), 
                        key=lambda p: p.stat().st_mtime, reverse=True)
        
        if len(backups) > 10:
            for old_backup in backups[10:]:
                old_backup.unlink()
                print(f"  Removed old backup: {old_backup.name}")
        
        return True
        
    except Exception as e:
        print_error(f"Backup failed: {e}")
        return False

def commit_and_push(commit_message=None):
    """Commit and push changes to GitHub"""
    print_header("DEPLOYING TO GITHUB PAGES")
    
    try:
        # Add files
        print("Adding files to git...")
        subprocess.run(['git', 'add', 'data/trails.geojson'], check=True)
        subprocess.run(['git', 'add', 'data/trail_images/'], check=True)
        
        # Get commit message
        if not commit_message:
            commit_message = input("\nEnter commit message (or press Enter for default): ").strip()
            if not commit_message:
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
                commit_message = f"Update trails data - {timestamp}"
        
        # Commit
        print(f"\nCommitting with message: '{commit_message}'")
        subprocess.run(['git', 'commit', '-m', commit_message], check=True)
        
        # Push
        print("\nPushing to GitHub...")
        subprocess.run(['git', 'push', 'origin', 'main'], check=True)
        
        print_success("Deployed to GitHub!")
        return True
        
    except subprocess.CalledProcessError as e:
        print_error(f"Deployment failed: {e}")
        return False

def show_summary():
    """Show deployment summary"""
    print_header("DEPLOYMENT COMPLETE!")
    
    print("Your changes are now deploying to GitHub Pages.")
    print("\nWhat happens next:")
    print("  1. GitHub Actions builds your site (1-2 minutes)")
    print("  2. Changes go live at: https://realcaddish.github.io/trailBlogger/")
    print("\nVerification steps:")
    print("  1. Wait 2 minutes for deployment")
    print("  2. Visit your live site")
    print("  3. Hard refresh (Ctrl+F5 or Cmd+Shift+R)")
    print("  4. Verify your changes appear")
    print("\nCheck deployment status:")
    print("  https://github.com/RealCaddish/trailBlogger/actions")

def main():
    """Main deployment workflow"""
    print_header("TRAIL BLOGGER DEPLOYMENT TOOL")
    print("This will deploy your localhost:5000 changes to GitHub Pages\n")
    
    # Step 1: Check data integrity
    if not check_data_integrity():
        print_error("Data integrity check failed. Fix errors and try again.")
        sys.exit(1)
    
    # Step 2: Check image files
    check_image_files()  # Warning only, don't fail
    
    # Step 3: Show what changed
    has_changes = show_git_changes()
    
    if not has_changes:
        print("\nNothing to deploy. Make changes on localhost:5000 first.")
        sys.exit(0)
    
    # Step 4: Confirm deployment
    print("\n" + "=" * 70)
    response = input("Deploy these changes to GitHub Pages? (yes/no): ").strip().lower()
    
    if response not in ['yes', 'y']:
        print("\nDeployment cancelled.")
        sys.exit(0)
    
    # Step 5: Create backup
    if not create_backup():
        print_warning("Backup failed, but continuing...")
    
    # Step 6: Commit and push
    if not commit_and_push():
        print_error("Deployment failed!")
        sys.exit(1)
    
    # Step 7: Show summary
    show_summary()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nDeployment cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

