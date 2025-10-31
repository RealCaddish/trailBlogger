#!/usr/bin/env python3
"""
Verify that GitHub Pages deployment matches local data
"""

import json
import urllib.request
import sys

def compare_trail_counts():
    """Compare trail counts between local and live"""
    print("=" * 70)
    print("COMPARING LOCAL VS LIVE")
    print("=" * 70)
    
    # Load local data
    with open('data/trails.geojson', 'r', encoding='utf-8') as f:
        local_data = json.load(f)
    
    local_trails = local_data.get('features', [])
    local_count = len(local_trails)
    
    print(f"\nLocal (localhost:5000): {local_count} trails")
    
    # Try to load live data
    try:
        url = 'https://realcaddish.github.io/trailBlogger/data/trails.geojson'
        with urllib.request.urlopen(url) as response:
            live_data = json.loads(response.read().decode('utf-8'))
        
        live_trails = live_data.get('features', [])
        live_count = len(live_trails)
        
        print(f"Live (GitHub Pages):    {live_count} trails")
        
        if local_count == live_count:
            print("\n[OK] Trail counts match!")
            return True
        else:
            print(f"\n[!] WARNING: Counts differ by {abs(local_count - live_count)} trails")
            print("    This is normal if you just deployed (wait 2 minutes)")
            return False
            
    except Exception as e:
        print(f"[!] Could not fetch live data: {e}")
        print("    Site might still be deploying. Wait 2 minutes and try again.")
        return False

def list_trail_names():
    """Show trail names from local data"""
    print("\n" + "=" * 70)
    print("YOUR TRAILS (LOCAL)")
    print("=" * 70 + "\n")
    
    with open('data/trails.geojson', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    for i, feature in enumerate(data['features'], 1):
        props = feature['properties']
        name = props.get('name', 'Unnamed')
        status = props.get('status', 'unknown')
        length = props.get('length', 0)
        images = len(props.get('images', []))
        coords = len(feature['geometry'].get('coordinates', []))
        
        status_icon = "✓" if status == 'hiked' else "○"
        gps_icon = "📍" if coords > 1 else "  "
        img_icon = "📷" if images > 0 else "  "
        
        print(f"{i:2}. {status_icon} {gps_icon} {img_icon} {name}")
        print(f"     {length} mi | {images} images | {coords} GPS points")

def main():
    """Main verification"""
    try:
        compare_trail_counts()
        list_trail_names()
        
        print("\n" + "=" * 70)
        print("NEXT STEPS")
        print("=" * 70)
        print("\n1. Visit: https://realcaddish.github.io/trailBlogger/")
        print("2. Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)")
        print("3. Verify your trails appear correctly")
        print("\nIf counts don't match yet, wait 2 minutes and run:")
        print("  python verify_deployment.py")
        
    except FileNotFoundError:
        print("[ERROR] data/trails.geojson not found!")
        print("Run this script from the trailBlogger directory")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

