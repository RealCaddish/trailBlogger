"""Shared geospatial helpers for Trail Blogger.

Used by the migration and import scripts and by server.py (for the
/api/locate endpoint). Everything heavy (the 12 MB parks file) is loaded
lazily and only on the Python side, never shipped to the browser.
"""

import json
import math
import os
from functools import lru_cache

import shapely
from shapely.geometry import LineString, Point, shape
from shapely.strtree import STRtree

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, "data")
PARKS_FILE = os.path.join(DATA_DIR, "parks_simplified.json")
STATES_FILE = os.path.join(DATA_DIR, "us_states.geojson")

M_PER_DEG_LAT = 110_540.0
M_PER_DEG_LON_EQ = 111_320.0
FT_PER_M = 3.28084


# --------------------------------------------------------------------------
# Distance / elevation
# --------------------------------------------------------------------------

def haversine_m(a, b):
    """Great-circle distance in meters between two [lon, lat, ...] points."""
    lon1, lat1 = math.radians(a[0]), math.radians(a[1])
    lon2, lat2 = math.radians(b[0]), math.radians(b[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * 6_371_000 * math.atan2(math.sqrt(h), math.sqrt(1 - h))


def track_length_mi(coords):
    """Length of a coordinate list in miles."""
    meters = sum(haversine_m(coords[i], coords[i + 1]) for i in range(len(coords) - 1))
    return round(meters / 1609.344, 2)


def elevation_gain_ft(coords, threshold_m=3.0):
    """Cumulative ascent in feet from the Z values of a track.

    Uses a hysteresis threshold so GPS altitude jitter does not inflate the
    number. Returns None when the track has no usable elevation.
    """
    zs = [c[2] for c in coords if len(c) > 2 and c[2] is not None]
    if len(zs) < 2 or all(z == 0 for z in zs):
        return None
    gain = 0.0
    ref = zs[0]
    for z in zs[1:]:
        if z - ref >= threshold_m:
            gain += z - ref
            ref = z
        elif z < ref:
            ref = z
    return int(round(gain * FT_PER_M))


def round_coords(coords, places=6, keep_z=True):
    out = []
    for c in coords:
        pt = [round(c[0], places), round(c[1], places)]
        if keep_z and len(c) > 2 and c[2] not in (None, 0):
            pt.append(round(c[2], 1))
        out.append(pt)
    return out


def simplify_coords(coords, tolerance_deg=0.00007):
    """Douglas-Peucker simplification (2D). ~0.00007 deg is about 8 m."""
    if len(coords) < 3:
        return [list(c[:2]) for c in coords]
    line = LineString([c[:2] for c in coords])
    simplified = line.simplify(tolerance_deg, preserve_topology=False)
    return [list(c) for c in simplified.coords]


# --------------------------------------------------------------------------
# Overlap detection (for de-duplication)
# --------------------------------------------------------------------------

def _sample(coords, n=25):
    if len(coords) <= n:
        return coords
    step = len(coords) / n
    return [coords[int(i * step)] for i in range(n)]


def _to_local_meters(coords, lat0):
    k = math.cos(math.radians(lat0)) * M_PER_DEG_LON_EQ
    return [(c[0] * k, c[1] * M_PER_DEG_LAT) for c in coords]


def make_corridor(coords, threshold_m=40.0):
    """Buffer a track into a corridor polygon (in a local metric frame).

    Build this once per track and reuse it with fraction_within(); buffering
    is the expensive part of overlap detection.
    """
    lat0 = coords[0][1]
    line = LineString(_to_local_meters(coords, lat0))
    return line.buffer(threshold_m), lat0


def fraction_within(a_coords, corridor, max_samples=250):
    """Fraction of A's vertices (sampled) that lie inside a corridor."""
    poly, lat0 = corridor
    pts = _to_local_meters(_sample(a_coords, max_samples), lat0)
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    inside = shapely.contains_xy(poly, xs, ys)
    return float(inside.sum()) / len(pts)


def overlap_fraction(a_coords, b_coords, threshold_m=40.0):
    """Fraction of A's vertices that lie within threshold_m of line B."""
    if len(a_coords) < 2 or len(b_coords) < 2:
        return 0.0
    return fraction_within(a_coords, make_corridor(b_coords, threshold_m))


def bbox(coords):
    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    return (min(xs), min(ys), max(xs), max(ys))


def bboxes_near(b1, b2, pad_deg=0.01):
    return not (b2[0] > b1[2] + pad_deg or b2[2] < b1[0] - pad_deg
                or b2[1] > b1[3] + pad_deg or b2[3] < b1[1] - pad_deg)


# --------------------------------------------------------------------------
# Location lookup (country / state / park)
# --------------------------------------------------------------------------

def country_for(lon, lat):
    if -26 <= lon <= -12 and 62.5 <= lat <= 67:
        return "Iceland"
    if -170 <= lon <= -50 and 17 <= lat <= 72:
        return "United States"
    return None


class Locator:
    """Point-in-polygon lookup for states and parks, built once per process."""

    def __init__(self):
        self._states = None
        self._parks = None

    def _load_states(self):
        if self._states is None:
            with open(STATES_FILE, encoding="utf-8") as f:
                data = json.load(f)
            geoms, names = [], []
            for feat in data["features"]:
                geoms.append(shape(feat["geometry"]))
                names.append(feat["properties"]["name"])
            self._states = (STRtree(geoms), geoms, names)
        return self._states

    def _load_parks(self):
        if self._parks is None:
            with open(PARKS_FILE, encoding="utf-8") as f:
                data = json.load(f)
            geoms, props = [], []
            for feat in data["features"]:
                if not feat.get("geometry"):
                    continue
                try:
                    g = shape(feat["geometry"])
                except Exception:
                    continue
                if g.is_empty:
                    continue
                geoms.append(g)
                props.append(feat["properties"])
            self._parks = (STRtree(geoms), geoms, props)
        return self._parks

    def _majority(self, coords, tree, geoms, labels):
        votes = {}
        for c in _sample(coords):
            p = Point(c[0], c[1])
            for idx in tree.query(p, predicate="within"):
                key = labels[idx]
                votes[key] = votes.get(key, 0) + 1
        if not votes:
            return None, 0.0
        best = max(votes, key=votes.get)
        return best, votes[best] / len(_sample(coords))

    def state_for(self, coords):
        tree, geoms, names = self._load_states()
        name, frac = self._majority(coords, tree, geoms, names)
        return name if frac >= 0.3 else None

    def park_for(self, coords):
        """Returns (name, feature_type) of the park most of the track lies in."""
        tree, geoms, props = self._load_parks()
        labels = list(range(len(props)))
        idx, frac = self._majority(coords, tree, geoms, labels)
        if idx is None or frac < 0.3:
            return None, None
        p = props[idx]
        return p.get("NAME"), p.get("FEATTYPE")

    def park_geometry(self, name):
        tree, geoms, props = self._load_parks()
        for g, p in zip(geoms, props):
            if p.get("NAME") == name:
                return g, p
        return None, None

    def locate(self, coords):
        """Country, state and park for a track. Parks only exist for US states."""
        mid = coords[len(coords) // 2]
        country = country_for(mid[0], mid[1])
        state = None
        park = None
        park_type = None
        if country == "United States":
            state = self.state_for(coords)
            park, park_type = self.park_for(coords)
        return {"country": country, "state": state, "park": park, "park_type": park_type}


@lru_cache(maxsize=1)
def locator():
    return Locator()
