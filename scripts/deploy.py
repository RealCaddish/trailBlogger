#!/usr/bin/env python3
"""Publish your latest hikes to GitHub Pages.

Checks the data files, shows what changed, then commits and pushes.
Backups are not written into data/ any more: git history is the backup,
and server.py keeps rolling copies in data/backups/ (ignored by git).

    python scripts/deploy.py                 # interactive
    python scripts/deploy.py -m "Add hike"   # with a commit message
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
DATA_FILES = ["data/hikes.geojson", "data/wishlist.geojson", "data/parks_visited.geojson"]
PHOTO_DIR = "data/trail_images"


def fail(msg):
    print(f"[ERROR] {msg}")
    sys.exit(1)


def check_data():
    print("Checking data files")
    for path in DATA_FILES:
        if not os.path.exists(path):
            fail(f"{path} is missing. Run scripts/migrate_v2.py --write first.")
        with open(path, encoding="utf-8") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError as e:
                fail(f"{path} is not valid JSON: {e}")
        feats = data.get("features", [])
        ids = [ft["properties"].get("id") for ft in feats]
        if len(ids) != len(set(ids)):
            fail(f"{path} has duplicate ids")
        print(f"  {path}: {len(feats)} features")

    with open("data/hikes.geojson", encoding="utf-8") as f:
        hikes = json.load(f)["features"]
    missing = []
    total = 0
    for ft in hikes:
        for ph in ft["properties"].get("photos", []):
            total += 1
            if not os.path.exists(os.path.join(PHOTO_DIR, ph["src"])):
                missing.append(ph["src"])
    if missing:
        print(f"  [!] {len(missing)} photo(s) referenced but not on disk:")
        for m in missing[:8]:
            print(f"      {m}")
    else:
        print(f"  all {total} photos present")


def git(*args, check=True, capture=True):
    return subprocess.run(["git", *args], check=check, capture_output=capture, text=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-m", "--message", help="commit message")
    ap.add_argument("-y", "--yes", action="store_true", help="do not ask for confirmation")
    args = ap.parse_args()

    check_data()

    status = git("status", "--porcelain", "--", "data", "index.html", "app.js", "styles.css", "sw.js").stdout.strip()
    if not status:
        print("Nothing to deploy.")
        return
    print("\nChanges:")
    for line in status.splitlines():
        print(f"  {line}")

    if not args.yes:
        answer = input("\nCommit and push these to GitHub Pages? (yes/no): ").strip().lower()
        if answer not in ("y", "yes"):
            print("Cancelled.")
            return

    message = args.message or input("Commit message (Enter for default): ").strip() or f"Update hikes {datetime.now():%Y-%m-%d %H:%M}"
    git("add", "--", "data/hikes.geojson", "data/wishlist.geojson", "data/parks_visited.geojson", PHOTO_DIR,
        "index.html", "app.js", "styles.css", "sw.js", "manifest.webmanifest")
    git("commit", "-m", message, capture=False)
    git("push", "origin", "main", capture=False)
    print("\nPushed. GitHub Pages usually updates within a minute or two:")
    print("  https://realcaddish.github.io/trailBlogger/")


if __name__ == "__main__":
    main()
