#!/usr/bin/env python3
"""Rebuild wishlist geometries from the original QGIS/OSM export.

The first OSM import flattened multi-part trails (OSM relations made of
several ways) into single lines, which drew straight "jumps" between the
pieces and inflated the lengths. This script matches each wishlist trail to
its source feature by osm_id, re-joins pieces that actually touch, keeps real
gaps as separate parts (MultiLineString), simplifies, and recomputes length.

    python scripts/fix_wishlist_geometry.py data/current_trails/new_unhiked_trails_batch.geojson
    python scripts/fix_wishlist_geometry.py data/current_trails/new_unhiked_trails_batch.geojson --write
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import geo  # noqa: E402

WISH = os.path.join(geo.DATA_DIR, "wishlist.geojson")


def max_hop_m(parts):
    worst = 0.0
    for p in parts:
        for i in range(len(p) - 1):
            worst = max(worst, geo.haversine_m(p[i], p[i + 1]))
    return worst


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sources", nargs="+", help="GeoJSON export(s) with osm_id and MultiLineString geometry")
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()

    by_osm = {}
    for path in args.sources:
        with open(path, encoding="utf-8") as f:
            for feat in json.load(f)["features"]:
                oid = str(feat.get("properties", {}).get("osm_id") or "")
                if oid and feat.get("geometry"):
                    by_osm[oid] = feat
    print(f"source features with osm_id: {len(by_osm)}")

    with open(WISH, encoding="utf-8") as f:
        wishlist = json.load(f)

    fixed, unmatched, still_single, multi = 0, [], 0, 0
    length_changes = []
    for feat in wishlist["features"]:
        p = feat["properties"]
        src = by_osm.get(str(p.get("osm_id") or ""))
        if not src:
            unmatched.append(p["name"])
            continue
        parts = geo.merge_parts(geo.parts_of(src["geometry"]))
        if not parts:
            unmatched.append(p["name"])
            continue
        before = max_hop_m(geo.parts_of(feat["geometry"]))
        new_geom = geo.to_geometry(parts)
        new_len = geo.geom_length_mi(parts)
        length_changes.append((p["name"], p["length_mi"], new_len))
        feat["geometry"] = new_geom
        p["length_mi"] = new_len
        fixed += 1
        if new_geom["type"] == "MultiLineString":
            multi += 1
        else:
            still_single += 1
        after = max_hop_m(geo.parts_of(new_geom))
        if before > 500:
            old_len = length_changes[-1][1]
            print(f"  {p['name'][:42]:42} hop {before/1000:5.1f} km -> {after:4.0f} m  parts {len(parts):>2}  {old_len:7.1f} -> {new_len:6.1f} mi")

    print(f"\nrebuilt {fixed}: {still_single} single-part, {multi} multi-part; unmatched {len(unmatched)}: {unmatched}")
    biggest = sorted(length_changes, key=lambda t: -abs(t[1] - t[2]))[:8]
    print("largest length corrections:")
    for name, old, new in biggest:
        print(f"  {name[:42]:42} {old:7.1f} -> {new:6.1f} mi")

    if not args.write:
        print("\nPreview only. Re-run with --write to save.")
        return
    tmp = WISH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(wishlist, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, WISH)
    print(f"wrote {WISH} ({os.path.getsize(WISH) // 1024} KB)")


if __name__ == "__main__":
    main()
