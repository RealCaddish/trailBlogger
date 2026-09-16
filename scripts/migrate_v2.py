#!/usr/bin/env python3
"""Migrate data/trails.geojson (v1) to the v2 data model.

v2 splits the single file into:
  data/hikes.geojson          hikes you have done, full-resolution tracks, journal, photos
  data/wishlist.geojson       trails you want to do (OSM + hand-added), simplified geometry
  data/parks_visited.geojson  outlines of the parks your hikes fall in (small)

Every feature gets a stable `id`. Name-variant duplicates are merged, OSM
segments that sit on top of a hike are dropped and linked to the hike, and
country/state/park are computed once here so the browser never needs the
12 MB parks file.

Usage:
  python scripts/migrate_v2.py            # dry run: prints the report only
  python scripts/migrate_v2.py --write    # writes the v2 files
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import geo  # noqa: E402

DATA = geo.DATA_DIR
SRC = os.path.join(DATA, "trails.geojson")
PHOTO_DIR = os.path.join(DATA, "trail_images")
HIKES_OUT = os.path.join(DATA, "hikes.geojson")
WISH_OUT = os.path.join(DATA, "wishlist.geojson")
PARKS_OUT = os.path.join(DATA, "parks_visited.geojson")

# Known misspellings to unify (old -> new). Same trail, different hikes.
NAME_FIXES = {
    "Graenidaulur Loop": "Graenidalur Loop",
}

report = []


def log(msg):
    report.append(msg)
    print(msg)


def short_id(seed):
    return hashlib.sha1(f"trailblogger:{seed}".encode()).hexdigest()[:12]


def stable_id(rec):
    """Deterministic id: OSM ways use their osm_id; everything else uses the
    v1 trail_id plus name (several v1 trails were imported with one shared id)."""
    if rec.get("osm_id"):
        return short_id(f"osm:{rec['osm_id']}")
    return short_id(f"{rec['legacy_id']}:{rec['name']}")


def norm_name(name):
    import unicodedata
    s = unicodedata.normalize("NFKD", name)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def strip_state_suffix(name):
    return re.sub(r"\s*\((Iceland|Kentucky|Tennessee|North Carolina|Colorado|Virginia)\)\s*$", "", name).strip()


# --------------------------------------------------------------------------
# Photos
# --------------------------------------------------------------------------

def folder_files():
    """Map folder -> sorted list of image files on disk."""
    out = {}
    if not os.path.isdir(PHOTO_DIR):
        return out
    for folder in os.listdir(PHOTO_DIR):
        fp = os.path.join(PHOTO_DIR, folder)
        if os.path.isdir(fp):
            out[folder] = sorted(
                f for f in os.listdir(fp) if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif"))
            )
    return out


def resolve_photos(legacy_id, refs, on_disk):
    """Normalise photo refs to 'trail-<legacy>/<file>' and verify they exist."""
    folder = f"trail-{legacy_id}"
    available = set(on_disk.get(folder, []))
    result, missing = [], []
    seen = set()
    for ref in refs or []:
        ref = ref.strip()
        if not ref:
            continue
        m = re.search(r"/api/trails/(\d+)/images/(.+)$", ref)
        if m:
            f_folder, fname = f"trail-{m.group(1)}", m.group(2)
        elif "/" in ref:
            parts = ref.rstrip("/").split("/")
            f_folder, fname = parts[-2], parts[-1]
        else:
            f_folder, fname = folder, ref
        # Bare filenames may live in another folder: search.
        if fname not in on_disk.get(f_folder, []):
            found = [fo for fo, files in on_disk.items() if fname in files]
            if found:
                f_folder = found[0]
            else:
                missing.append(ref)
                continue
        src = f"{f_folder}/{fname}"
        if src not in seen:
            seen.add(src)
            result.append({"src": src})
    # Files present in the trail's folder but not referenced: include them too
    # (the old app listed the folder as the source of truth locally).
    extras = []
    for fname in sorted(available):
        src = f"{folder}/{fname}"
        if src not in seen:
            seen.add(src)
            result.append({"src": src})
            extras.append(fname)
    return result, missing, extras


def date_from_photos(photos):
    """Infer a hike date from Pixel-style filenames (PXL_YYYYMMDD_...)."""
    dates = []
    for p in photos:
        m = re.search(r"PXL_(\d{4})(\d{2})(\d{2})_", p["src"])
        if m:
            dates.append(f"{m.group(1)}-{m.group(2)}-{m.group(3)}")
    return min(dates) if dates else None


# --------------------------------------------------------------------------
# Main migration
# --------------------------------------------------------------------------

def normalise(feature):
    p = feature["properties"]
    coords = feature["geometry"]["coordinates"]
    name = strip_state_suffix((p.get("name") or "").strip())
    name = NAME_FIXES.get(name, name)
    return {
        "legacy_id": p.get("trail_id"),
        "osm_id": p.get("osm_id"),
        "source": p.get("source") or "user",
        "name": name,
        "status": (p.get("status") or "unhiked").lower(),
        "date": p.get("date_hiked") or None,
        "length_mi": float(p.get("length") or 0) or geo.track_length_mi(coords),
        "journal": (p.get("blog_post") or p.get("description") or "").strip(),
        "photo_refs": p.get("images") or [],
        "created_at": p.get("created_at"),
        "updated_at": p.get("updated_at"),
        "coords": coords,
    }


def same_geometry(a, b):
    ca, cb = a["coords"], b["coords"]
    return (len(ca) == len(cb) and ca[0][:2] == cb[0][:2] and ca[-1][:2] == cb[-1][:2]
            and abs(a["length_mi"] - b["length_mi"]) < 0.05)


def merge_exact_duplicates(hikes):
    """Merge hiked trails whose geometry is identical (a rename created a copy)."""
    kept = []
    for h in hikes:
        twin = next((k for k in kept if same_geometry(k, h)), None)
        if twin is None:
            kept.append(h)
            continue
        # Prefer the earlier-created record; union the rest.
        primary, other = (twin, h) if (twin["created_at"] or "") <= (h["created_at"] or "") else (h, twin)
        if not primary["journal"] and other["journal"]:
            primary["journal"] = other["journal"]
        if not primary["date"] and other["date"]:
            primary["date"] = other["date"]
        primary["photo_refs"] = list(primary["photo_refs"]) + list(other["photo_refs"])
        primary.setdefault("merged_legacy_ids", []).append(other["legacy_id"])
        log(f"  merged duplicate hike '{other['name']}' into '{primary['name']}'")
        if primary is h:
            kept[kept.index(twin)] = h
    return kept


def dedupe_wishlist(wishlist, hikes, hike_threshold=0.9, twin_threshold=0.95):
    """Drop wishlist entries that duplicate a hike or another wishlist entry.

    A wishlist trail is "already hiked" when 90% of it lies within 40 m of a
    hike track. Two wishlist trails are twins when each lies 95% within the
    other, which merges OSM spelling variants but keeps routes that merely
    share a corridor (a peak spur vs. the loop it branches from).
    """
    corridors = {}

    def corridor(rec):
        key = id(rec)
        if key not in corridors:
            corridors[key] = geo.make_corridor(rec["coords"])
        return corridors[key]

    hike_boxes = [(h, geo.bbox(h["coords"])) for h in hikes]
    remaining = []
    for w in wishlist:
        wb = geo.bbox(w["coords"])
        covered_by = None
        for h, hb in hike_boxes:
            if not geo.bboxes_near(wb, hb):
                continue
            if geo.fraction_within(w["coords"], corridor(h)) >= hike_threshold:
                covered_by = h
                break
        if covered_by is not None:
            if w["osm_id"]:
                covered_by.setdefault("osm_ids", []).append(w["osm_id"])
            log(f"  dropped wishlist '{w['name']}' (already hiked as '{covered_by['name']}')")
        else:
            remaining.append(w)

    def preference(w):
        # Higher is better: user-added beats OSM, no '#' in name, longer route, accented (proper) spelling.
        return (
            w["source"] != "OpenStreetMap",
            "#" not in w["name"],
            len(w["coords"]),
            any(ord(ch) > 127 for ch in w["name"]),
        )

    remaining.sort(key=preference, reverse=True)
    kept = []
    boxes = {}
    for w in remaining:
        wb = geo.bbox(w["coords"])
        dup_of = None
        for k in kept:
            kb = boxes.setdefault(id(k), geo.bbox(k["coords"]))
            if not geo.bboxes_near(wb, kb, pad_deg=0.005):
                continue
            w_in_k = geo.fraction_within(w["coords"], corridor(k))
            if w_in_k < hike_threshold:
                continue
            # Same name (ignoring accents/case) and contained in the kept one: a variant of it.
            if norm_name(w["name"]) == norm_name(k["name"]):
                dup_of = k
                break
            if w_in_k >= twin_threshold and geo.fraction_within(k["coords"], corridor(w)) >= twin_threshold:
                dup_of = k
                break
        if dup_of is not None:
            if w["osm_id"]:
                dup_of.setdefault("osm_ids", []).append(w["osm_id"])
            log(f"  dropped wishlist '{w['name']}' (same route as '{dup_of['name']}')")
            # Keep the properly accented spelling when the variant has it and the kept one does not.
            if any(ord(ch) > 127 for ch in w["name"]) and not any(ord(ch) > 127 for ch in dup_of["name"]):
                dup_of["name"] = w["name"]
        else:
            kept.append(w)
    return kept


def build_hike_feature(h, loc):
    coords = geo.round_coords(h["coords"], places=6, keep_z=True)
    props = {
        "id": stable_id(h),
        "name": h["name"],
        "date": h["date"],
        "length_mi": round(h["length_mi"], 2),
        "elevation_gain_ft": geo.elevation_gain_ft(h["coords"]),
        "country": loc["country"],
        "state": loc["state"],
        "park": loc["park"],
        "park_type": loc["park_type"],
        "journal": h["journal"],
        "photos": h["photos"],
        "companions": [],
        "tags": [],
        "osm_ids": sorted(set(h.get("osm_ids", []))),
        "legacy_id": h["legacy_id"],
        "created_at": h["created_at"],
        "updated_at": h["updated_at"] or h["created_at"],
    }
    return {"type": "Feature", "properties": props, "geometry": {"type": "LineString", "coordinates": coords}}


def build_wish_feature(w, loc):
    coords = geo.round_coords(geo.simplify_coords(w["coords"]), places=5, keep_z=False)
    props = {
        "id": stable_id(w),
        "name": w["name"],
        "length_mi": round(w["length_mi"], 2),
        "country": loc["country"],
        "state": loc["state"],
        "park": loc["park"],
        "park_type": loc["park_type"],
        "note": "",
        "source": w["source"],
        "osm_id": w["osm_id"],
        "osm_ids": sorted(set(w.get("osm_ids", []))),
        "created_at": w["created_at"],
    }
    return {"type": "Feature", "properties": props, "geometry": {"type": "LineString", "coordinates": coords}}


def build_parks_visited(hike_features, loc):
    names = {}
    for f in hike_features:
        park = f["properties"].get("park")
        if park:
            names[park] = names.get(park, 0) + 1
    feats = []
    for name, count in sorted(names.items()):
        g, p = loc.park_geometry(name)
        if g is None:
            continue
        g = g.simplify(0.002, preserve_topology=True)
        feats.append({
            "type": "Feature",
            "properties": {"name": name, "type": p.get("FEATTYPE"), "state": p.get("state"), "hikes": count},
            "geometry": json.loads(json.dumps(g.__geo_interface__)),
        })
    return {"type": "FeatureCollection", "features": feats}


def write_json(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="write the v2 files (default is dry run)")
    ap.add_argument("--force", action="store_true", help="overwrite existing v2 files")
    args = ap.parse_args()

    if not os.path.exists(SRC):
        sys.exit(f"{SRC} not found")
    if args.write and os.path.exists(HIKES_OUT) and not args.force:
        sys.exit(f"{HIKES_OUT} already exists; pass --force to overwrite")

    with open(SRC, encoding="utf-8") as f:
        v1 = json.load(f)
    records = [normalise(ft) for ft in v1["features"] if ft.get("geometry") and ft["properties"].get("name")]
    log(f"Loaded {len(records)} v1 trails")

    hikes = [r for r in records if r["status"] == "hiked"]
    wishlist = [r for r in records if r["status"] != "hiked"]
    log(f"  {len(hikes)} hiked, {len(wishlist)} wishlist")

    log("Merging renamed duplicates among hikes")
    hikes = merge_exact_duplicates(hikes)

    log("Resolving photos")
    on_disk = folder_files()
    for h in hikes:
        photos, missing, extras = resolve_photos(h["legacy_id"], h["photo_refs"], on_disk)
        for m in h.get("merged_legacy_ids", []):
            more, _, _ = resolve_photos(m, [], on_disk)
            photos += [p for p in more if p not in photos]
        h["photos"] = photos
        if missing:
            log(f"  '{h['name']}': {len(missing)} referenced photo(s) not on disk, dropped: {missing}")
        if extras:
            log(f"  '{h['name']}': added {len(extras)} photo(s) found in folder but unreferenced")
        if not h["date"]:
            inferred = date_from_photos(photos)
            if inferred:
                h["date"] = inferred
                log(f"  '{h['name']}': date {inferred} inferred from photo filenames (please confirm)")
    for w in wishlist:
        w["photos"] = []

    log("Dropping wishlist entries that duplicate a hike or each other")
    wishlist = dedupe_wishlist(wishlist, hikes)

    log("Locating country / state / park")
    loc = geo.locator()
    hike_feats, wish_feats = [], []
    for h in hikes:
        l = loc.locate(h["coords"])
        hike_feats.append(build_hike_feature(h, l))
    for w in wishlist:
        l = loc.locate(w["coords"])
        wish_feats.append(build_wish_feature(w, l))

    hike_feats.sort(key=lambda f: (f["properties"]["date"] or "0000", f["properties"]["name"]), reverse=True)
    wish_feats.sort(key=lambda f: (f["properties"]["country"] or "", f["properties"]["state"] or "", f["properties"]["name"]))

    parks_visited = build_parks_visited(hike_feats, loc)

    log("")
    log("Summary")
    log(f"  hikes:    {len(hike_feats)}")
    for f in hike_feats:
        p = f["properties"]
        log(f"    {p['date'] or 'no date  '}  {p['name'][:40]:40} {p['length_mi']:>5} mi  gain {str(p['elevation_gain_ft']):>5} ft  "
            f"{len(p['photos']):>2} photos  {p['state'] or p['country'] or '?'} / {p['park'] or '-'}")
    log(f"  wishlist: {len(wish_feats)}")
    by_region = {}
    for f in wish_feats:
        key = f["properties"]["state"] or f["properties"]["country"] or "unknown"
        by_region[key] = by_region.get(key, 0) + 1
    for k, v in sorted(by_region.items()):
        log(f"    {k}: {v}")
    unparked = [f["properties"]["name"] for f in hike_feats if f["properties"]["country"] == "United States" and not f["properties"]["park"]]
    if unparked:
        log(f"  US hikes with no park match: {unparked}")
    log(f"  parks visited: {len(parks_visited['features'])} -> {[f['properties']['name'] for f in parks_visited['features']]}")

    if not args.write:
        log("\nDry run. Re-run with --write to produce the v2 files.")
        return

    backups = os.path.join(DATA, "backups")
    os.makedirs(backups, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    shutil.copy2(SRC, os.path.join(backups, f"trails_v1_{stamp}.geojson"))

    write_json(HIKES_OUT, {"type": "FeatureCollection", "schema": "trailblogger/v2", "features": hike_feats})
    write_json(WISH_OUT, {"type": "FeatureCollection", "schema": "trailblogger/v2", "features": wish_feats})
    write_json(PARKS_OUT, parks_visited)
    for path in (HIKES_OUT, WISH_OUT, PARKS_OUT):
        log(f"  wrote {os.path.relpath(path, geo.ROOT)}  ({os.path.getsize(path) / 1024:.0f} KB)")
    with open(os.path.join(backups, f"migration_report_{stamp}.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(report))


if __name__ == "__main__":
    main()
