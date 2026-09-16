#!/usr/bin/env python3
"""Trail Blogger local editing server (v2).

Run this on your own machine to add and edit hikes. The public site on
GitHub Pages is the same HTML/JS served statically; it detects that this
API is absent and runs read-only.

    python server.py            ->  http://localhost:5000

Data lives in plain files that you commit to git:
    data/hikes.geojson          your hikes (tracks, journal, photos)
    data/wishlist.geojson       trails you want to do
    data/trail_images/<id>/     photos, compressed on upload
"""

import io
import json
import os
import re
import shutil
import uuid
from datetime import datetime

from flask import Flask, abort, jsonify, request, send_from_directory
from PIL import Image, ImageOps
from werkzeug.utils import secure_filename

import geo

ROOT = geo.ROOT
DATA = geo.DATA_DIR
PHOTOS = os.path.join(DATA, "trail_images")
BACKUPS = os.path.join(DATA, "backups")
COLLECTIONS = {"hikes", "wishlist"}
ID_RE = re.compile(r"^[A-Za-z0-9_-]{4,64}$")
PHOTO_MAX_EDGE = 1600
PHOTO_QUALITY = 85

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 300 * 1024 * 1024  # a phone's worth of photos


# --------------------------------------------------------------------------
# Static site
# --------------------------------------------------------------------------

def _no_cache(resp):
    resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return resp


@app.route("/")
def index():
    return _no_cache(send_from_directory(ROOT, "index.html"))


@app.route("/<path:filename>")
def static_file(filename):
    if filename.startswith(("api/", ".git")):
        abort(404)
    resp = send_from_directory(ROOT, filename)
    if filename.endswith((".js", ".css", ".html", ".geojson", ".json", ".webmanifest")):
        _no_cache(resp)
    return resp


# --------------------------------------------------------------------------
# Collections
# --------------------------------------------------------------------------

def _path(name):
    return os.path.join(DATA, f"{name}.geojson")


def read_collection(name):
    path = _path(name)
    if not os.path.exists(path):
        return {"type": "FeatureCollection", "schema": "trailblogger/v2", "features": []}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def validate_collection(data):
    if not isinstance(data, dict) or data.get("type") != "FeatureCollection":
        return "body must be a GeoJSON FeatureCollection"
    feats = data.get("features")
    if not isinstance(feats, list):
        return "features must be a list"
    seen = set()
    for f in feats:
        props = f.get("properties") or {}
        fid = props.get("id")
        if not fid or not ID_RE.match(str(fid)):
            return f"feature is missing a valid id: {props.get('name')!r}"
        if fid in seen:
            return f"duplicate id {fid}"
        seen.add(fid)
        if not props.get("name"):
            return f"feature {fid} has no name"
        geom = f.get("geometry") or {}
        if geom.get("type") != "LineString" or len(geom.get("coordinates") or []) < 2:
            return f"feature {fid} needs a LineString with at least 2 points"
    return None


def write_collection(name, data):
    path = _path(name)
    os.makedirs(BACKUPS, exist_ok=True)
    if os.path.exists(path):
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        shutil.copy2(path, os.path.join(BACKUPS, f"{name}_{stamp}.geojson"))
        old = sorted(p for p in os.listdir(BACKUPS) if p.startswith(f"{name}_"))
        for stale in old[:-20]:
            os.remove(os.path.join(BACKUPS, stale))
    data["schema"] = "trailblogger/v2"
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path)


@app.route("/api/health")
def health():
    return jsonify({"ok": True, "version": 2, "editable": True})


@app.route("/api/<name>", methods=["GET"])
def get_collection(name):
    if name not in COLLECTIONS:
        abort(404)
    return _no_cache(jsonify(read_collection(name)))


@app.route("/api/<name>", methods=["PUT"])
def put_collection(name):
    if name not in COLLECTIONS:
        abort(404)
    data = request.get_json(force=True, silent=True)
    err = validate_collection(data)
    if err:
        return jsonify({"error": err}), 400
    write_collection(name, data)
    return jsonify({"ok": True, "count": len(data["features"])})


# --------------------------------------------------------------------------
# Location + stats for a track (keeps the 12 MB parks file on this side)
# --------------------------------------------------------------------------

@app.route("/api/locate", methods=["POST"])
def locate():
    body = request.get_json(force=True, silent=True) or {}
    coords = body.get("coordinates") or []
    if len(coords) < 2:
        return jsonify({"error": "coordinates required"}), 400
    info = geo.locator().locate(coords)
    info["length_mi"] = geo.track_length_mi(coords)
    info["elevation_gain_ft"] = geo.elevation_gain_ft(coords)
    return jsonify(info)


# --------------------------------------------------------------------------
# Photos
# --------------------------------------------------------------------------

def _dms_to_deg(dms, ref):
    deg = float(dms[0]) + float(dms[1]) / 60 + float(dms[2]) / 3600
    return -deg if ref in ("S", "W") else deg


def read_exif(img):
    """Return {taken, lat, lon} from EXIF, with None where absent."""
    out = {"taken": None, "lat": None, "lon": None}
    try:
        exif = img.getexif()
        sub = exif.get_ifd(0x8769)
        raw = sub.get(36867) or exif.get(306)
        if raw:
            out["taken"] = datetime.strptime(str(raw)[:19], "%Y:%m:%d %H:%M:%S").isoformat()
        gps = exif.get_ifd(0x8825)
        if gps and 2 in gps and 4 in gps:
            out["lat"] = round(_dms_to_deg(gps[2], gps.get(1, "N")), 6)
            out["lon"] = round(_dms_to_deg(gps[4], gps.get(3, "E")), 6)
    except Exception:
        pass
    return out


def compress_to_jpeg(img):
    img = ImageOps.exif_transpose(img)
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    img.thumbnail((PHOTO_MAX_EDGE, PHOTO_MAX_EDGE), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=PHOTO_QUALITY, optimize=True, progressive=True)
    return buf.getvalue()


@app.route("/api/photos/<hike_id>", methods=["POST"])
def upload_photos(hike_id):
    if not ID_RE.match(hike_id):
        abort(400)
    files = request.files.getlist("photos")
    if not files:
        return jsonify({"error": "no photos in request"}), 400
    folder = os.path.join(PHOTOS, hike_id)
    os.makedirs(folder, exist_ok=True)
    saved = []
    for f in files:
        try:
            img = Image.open(f.stream)
        except Exception:
            return jsonify({"error": f"{f.filename} is not an image"}), 400
        meta = read_exif(img)
        stem = os.path.splitext(secure_filename(f.filename) or "photo")[0][:40]
        name = f"{stem}_{uuid.uuid4().hex[:8]}.jpg"
        with open(os.path.join(folder, name), "wb") as out:
            out.write(compress_to_jpeg(img))
        saved.append({"src": f"{hike_id}/{name}", **meta})
    return jsonify({"photos": saved})


@app.route("/api/photos/<hike_id>/<filename>", methods=["DELETE"])
def delete_photo(hike_id, filename):
    if not ID_RE.match(hike_id) or filename != secure_filename(filename):
        abort(400)
    path = os.path.join(PHOTOS, hike_id, filename)
    if os.path.exists(path):
        os.remove(path)
        return jsonify({"ok": True})
    return jsonify({"error": "not found"}), 404


if __name__ == "__main__":
    os.makedirs(PHOTOS, exist_ok=True)
    print("Trail Blogger editing server: http://localhost:5000")
    app.run(host="127.0.0.1", port=5000, debug=False)
