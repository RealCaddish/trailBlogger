#!/usr/bin/env python3
"""Add the day's weather to every hike that has a date but no weather yet.

Uses Open-Meteo's free history API (no key). The app does the same lookup
when a hike is saved; this script fills in hikes recorded before that existed.

    python scripts/backfill_weather.py           # preview
    python scripts/backfill_weather.py --write
"""

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import date, datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import geo  # noqa: E402

HIKES = os.path.join(geo.DATA_DIR, "hikes.geojson")
DAILY = "weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max"


def fetch(lat, lon, day):
    age = (date.today() - datetime.strptime(day, "%Y-%m-%d").date()).days
    base = "https://api.open-meteo.com/v1/forecast" if age < 7 else "https://archive-api.open-meteo.com/v1/archive"
    q = urllib.parse.urlencode({
        "latitude": f"{lat:.4f}", "longitude": f"{lon:.4f}", "start_date": day, "end_date": day, "daily": DAILY,
        "temperature_unit": "fahrenheit", "precipitation_unit": "inch", "windspeed_unit": "mph", "timezone": "auto",
    })
    with urllib.request.urlopen(f"{base}?{q}", timeout=30) as r:
        d = json.load(r).get("daily") or {}
    if not d.get("time") or d["time"][0] != day or d["temperature_2m_max"][0] is None:
        return None
    return {
        "code": d["weathercode"][0],
        "tmax": d["temperature_2m_max"][0],
        "tmin": d["temperature_2m_min"][0],
        "precip_in": d["precipitation_sum"][0],
        "wind_mph": d["windspeed_10m_max"][0],
        "source": "open-meteo",
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--force", action="store_true", help="refresh hikes that already have weather")
    args = ap.parse_args()

    with open(HIKES, encoding="utf-8") as f:
        data = json.load(f)
    changed = 0
    for ft in data["features"]:
        p = ft["properties"]
        if not p.get("date") or (p.get("weather") and not args.force):
            continue
        c = ft["geometry"]["coordinates"]
        mid = c[len(c) // 2]
        try:
            w = fetch(mid[1], mid[0], p["date"])
        except Exception as e:  # network or API hiccup: keep going
            print(f"  {p['name']}: lookup failed ({e})")
            continue
        if not w:
            print(f"  {p['name']}: no data for {p['date']}")
            continue
        p["weather"] = w
        changed += 1
        print(f"  {p['date']}  {p['name'][:40]:40} code {w['code']:>2}  {w['tmax']:>5}/{w['tmin']:<5} F  {w['precip_in']} in")
    print(f"{changed} hike(s) updated")
    if args.write and changed:
        tmp = HIKES + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        os.replace(tmp, HIKES)
        print(f"wrote {HIKES}")
    elif changed:
        print("Preview only. Re-run with --write to save.")


if __name__ == "__main__":
    main()
