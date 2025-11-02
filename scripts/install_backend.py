#!/usr/bin/env python3
"""
Installation script for Trail Blogger backend image storage
"""

import subprocess
import sys
import os

def install_requirements():
    """Install required Python packages"""
    print("Installing Python requirements...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Requirements installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing requirements: {e}")
        return False

def create_directories():
    """Create necessary directories"""
    print("Creating directories...")
    directories = [
        'data',
        'data/trail_images'
    ]
    
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory)
            print(f"✅ Created directory: {directory}")
        else:
            print(f"📁 Directory already exists: {directory}")

def main():
    print("🚀 Trail Blogger Backend Setup")
    print("=" * 40)
    
    # Create directories
    create_directories()
    
    # Install requirements
    if install_requirements():
        print("\n🎉 Setup complete!")
        print("\nTo start the server:")
        print("  python server.py")
        print("\nThe server will be available at: http://localhost:5000")
        print("\nImage storage structure:")
        print("  data/trail_images/trail-{trailId}/")
        print("    ├── image1.jpg")
        print("    ├── image2.jpg")
        print("    └── ...")
    else:
        print("\n❌ Setup failed. Please check the error messages above.")

if __name__ == "__main__":
    main()







