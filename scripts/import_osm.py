#!/usr/bin/env python3
"""Import OpenStreetMap trails (exported from QGIS / QuickOSM as GeoJSON)
into data/wishlist.geojson.

Each imported way gets a stable id from its OSM id, a state/country/park
computed by point-in-polygon (no "(Iceland)" suffixes), simplified geometry,
and is skipped when it is already on the wishlist, already hiked, or shorter
than --min-miles.

    python scripts/import_osm.py data/kentucky_osm.geojson            # preview
    python scripts/import_osm.py data/kentucky_osm.geojson --write    # merge
"""

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import geo  # noqa: E402

WISH = os.path.join(geo.DATA_DIR, "wishlist.geojson")
HIKES = os.path.join(geo.DATA_DIR, "hikes.geojson")


def short_id(seed):
    return hashlib.sha1(f"trailblogger:{seed}".encode()).hexdigest()[:12]


def load(path):
    if not os.path.exists(path):
        return {"type": "FeatureCollection", "schema": "trailblogger/v2", "features": []}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def line_coords(geom):
    if not geom:
        return []
    if geom["type"] == "LineString":
        return geom["coordinates"]
    if geom["type"] == "MultiLineString":
        return [c for part in geom["coordinates"] for c in part]
    return []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+", help="GeoJSON exports from QGIS/QuickOSM")
    ap.add_argument("--write", action="store_true", help="merge into data/wishlist.geojson")
    ap.add_argument("--min-miles", type=float, default=0.5)
    args = ap.parse_args()

    wishlist = load(WISH)
    hikes = load(HIKES)
    existing_ids = {f["properties"]["id"] for f in wishlist["features"]}
    hike_corridors = [(geo.bbox(f["geometry"]["coordinates"]), geo.make_corridor(f["geometry"]["coordinates"]), f["properties"]["name"])
                      for f in hikes["features"]]
    wish_corridors = [(geo.bbox(f["geometry"]["coordinates"]), geo.make_corridor(f["geometry"]["coordinates"]), f["properties"]["name"])
                      for f in wishlist["features"]]
    loc = geo.locator()

    added, skipped = [], {"no name": 0, "short": 0, "already listed": 0, "already hiked": 0, "duplicate route": 0}
    for path in args.files:
        with open(path, encoding="utf-8") as f:
            src = json.load(f)
        for feat in src.get("features", []):
            p = feat.get("properties") or {}
            name = (p.get("name") or "").strip()
            if not name:
                skipped["no name"] += 1
                continue
            coords = line_coords(feat.get("geometry"))
            if len(coords) < 2:
                continue
            length = geo.track_length_mi(coords)
            if length < args.min_miles:
                skipped["short"] += 1
                continue
            osm_id = str(p.get("osm_id") or p.get("@id") or p.get("full_id") or "").replace("way/", "")
            fid = short_id(f"osm:{osm_id}") if osm_id else short_id(f"osmname:{name}:{coords[0]}")
            if fid in existing_ids:
                skipped["already listed"] += 1
                continue
            box = geo.bbox(coords)
            if any(geo.bboxes_near(box, hb) and geo.fraction_within(coords, corr) >= 0.9 for hb, corr, _ in hike_corridors):
                skipped["already hiked"] += 1
                continue
            twin = False
            for wb, corr, _ in wish_corridors:
                if geo.bboxes_near(box, wb, 0.005) and geo.fraction_within(coords, corr) >= 0.95:
                    twin = True
                    break
            if twin:
                skipped["duplicate route"] += 1
                continue

            where = loc.locate(coords)
            simplified = geo.round_coords(geo.simplify_coords(coords), places=5, keep_z=False)
            feature = {
                "type": "Feature",
                "properties": {
                    "id": fid,
                    "name": name,
                    "length_mi": length,
                    "country": where["country"],
                    "state": where["state"],
                    "park": where["park"],
                    "park_type": where["park_type"],
                    "note": "",
                    "source": "OpenStreetMap",
                    "osm_id": osm_id or None,
                    "osm_ids": [],
                    "created_at": datetime.now().isoformat(timespec="seconds"),
                },
                "geometry": {"type": "LineString", "coordinates": simplified},
            }
            added.append(feature)
            existing_ids.add(fid)
            wish_corridors.append((box, geo.make_corridor(coords), name))

    print(f"Would add {len(added)} trails; skipped: {skipped}")
    by_region = {}
    for f in added:
        key = f["properties"]["state"] or f["properties"]["country"] or "unknown"
        by_region[key] = by_region.get(key, 0) + 1
    for k, v in sorted(by_region.items()):
        print(f"  {k}: {v}")
    for f in added[:15]:
        p = f["properties"]
        print(f"    {p['name'][:45]:45} {p['length_mi']:>5} mi  {p['state'] or p['country'] or '?'} / {p['park'] or '-'}")
    if len(added) > 15:
        print(f"    ... and {len(added) - 15} more")

    if not args.write:
        print("\nPreview only. Re-run with --write to merge into data/wishlist.geojson.")
        return
    wishlist["features"].extend(added)
    wishlist["features"].sort(key=lambda f: (f["properties"]["country"] or "", f["properties"]["state"] or "", f["properties"]["name"]))
    tmp = WISH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(wishlist, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, WISH)
    print(f"Wrote {WISH} ({len(wishlist['features'])} trails)")


if __name__ == "__main__":
    main()
