#!/usr/bin/env python3
"""
Setup script for Trail Blogger personal data directory
This script helps you set up your personal data directory safely.
"""

import os
import json
import shutil
from pathlib import Path

def setup_personal_data():
    """Set up the personal data directory structure"""
    
    print("🔒 Trail Blogger - Personal Data Setup")
    print("=" * 50)
    print()
    print("This script will help you set up your personal data directory.")
    print("Your trail data, photos, and journal entries will be stored locally.")
    print()
    
    # Get the current directory
    current_dir = Path.cwd()
    data_dir = current_dir / "data"
    
    print(f"📁 Data directory: {data_dir}")
    print()
    
    # Check if data directory already exists
    if data_dir.exists():
        print("⚠️  Data directory already exists!")
        response = input("Do you want to continue? This will preserve existing data. (y/N): ")
        if response.lower() != 'y':
            print("Setup cancelled.")
            return
    else:
        print("✅ Creating data directory...")
        data_dir.mkdir(exist_ok=True)
    
    # Create subdirectories
    images_dir = data_dir / "images"
    backups_dir = data_dir / "backups"
    
    print("📂 Creating subdirectories...")
    images_dir.mkdir(exist_ok=True)
    backups_dir.mkdir(exist_ok=True)
    
    # Create initial trails.geojson file if it doesn't exist
    trails_file = data_dir / "trails.geojson"
    if not trails_file.exists():
        print("📄 Creating initial trails.geojson file...")
        initial_data = {
            "type": "FeatureCollection",
            "features": []
        }
        with open(trails_file, 'w', encoding='utf-8') as f:
            json.dump(initial_data, f, indent=2)
    
    # Create .gitignore in data directory for extra safety
    gitignore_file = data_dir / ".gitignore"
    if not gitignore_file.exists():
        print("🔒 Creating .gitignore in data directory...")
        gitignore_content = """# Personal Data - DO NOT COMMIT
# This directory contains your personal trail data
*
!.gitignore
"""
        with open(gitignore_file, 'w', encoding='utf-8') as f:
            f.write(gitignore_content)
    
    # Create README for data directory
    readme_file = data_dir / "README.md"
    if not readme_file.exists():
        print("📖 Creating data directory README...")
        readme_content = """# Personal Trail Data

This directory contains your personal trail data, including:
- `trails.geojson` - Your trail coordinates and information
- `images/` - Your trail photos
- `backups/` - Backup files created by the application

## 🔒 Privacy Notice

- This directory is excluded from version control
- Your data stays on your local machine only
- No personal information is shared or uploaded
- Regular backups are recommended

## 📁 File Structure

```
data/
├── trails.geojson          # Your trail data
├── images/                 # Your photos
│   └── [trail_name]/       # Photos organized by trail
├── backups/                # Backup files
│   └── backup_YYYYMMDD_HHMMSS/
└── README.md               # This file
```

## 💾 Backup Recommendations

1. **Regular backups**: Use the backup feature in the application
2. **External storage**: Copy backups to external drives or cloud storage
3. **Version control**: Consider using git for your personal data (separate from the application)
4. **Multiple locations**: Keep backups in different physical locations

## 🚨 Important

- Never commit this directory to version control
- Keep backups of your data
- This is your personal information - protect it accordingly
"""
        with open(readme_file, 'w', encoding='utf-8') as f:
            f.write(readme_content)
    
    print()
    print("✅ Personal data setup complete!")
    print()
    print("📋 Summary:")
    print(f"   Data directory: {data_dir}")
    print(f"   Images directory: {images_dir}")
    print(f"   Backups directory: {backups_dir}")
    print(f"   Trails file: {trails_file}")
    print()
    print("🔒 Privacy features:")
    print("   ✓ Data directory excluded from git")
    print("   ✓ Local storage only")
    print("   ✓ No external data transmission")
    print()
    print("🚀 Next steps:")
    print("   1. Start the application: python server.py")
    print("   2. Import your first trail using the 'Import Trail' button")
    print("   3. Add photos and descriptions to your trails")
    print("   4. Create regular backups using the 'Backup' button")
    print()
    print("💡 Tips:")
    print("   - Your data is automatically saved locally")
    print("   - Use the backup feature regularly")
    print("   - Keep backups in multiple locations")
    print("   - This directory is safe to share (it's excluded from git)")

if __name__ == "__main__":
    setup_personal_data()
