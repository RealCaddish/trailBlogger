# Trail Blogger

A personal hiking journal that lives in a git repository. Every hike is a GPS
track, a date, a journal entry and some photos. The site is static, works on a
phone, and can record a track while you walk.

Live site: https://realcaddish.github.io/trailBlogger/

## How it fits together

```
index.html, app.js, styles.css   the whole app, no build step
sw.js, manifest.webmanifest      installable / offline (PWA)
server.py                        local editing API (only on your machine)
geo.py                           shared geo helpers (length, gain, park/state lookup, de-dupe)
data/hikes.geojson               hikes you have done: full tracks, journal, photos
data/wishlist.geojson            trails you want to do (simplified geometry)
data/parks_visited.geojson       outlines of parks your hikes fall in
data/us_states.geojson           state outlines (for the "states hiked" layer)
data/parks_simplified.json       park polygons, used only by Python scripts
data/trail_images/<hike id>/     photos, compressed on upload
scripts/deploy.py                check, commit and push
scripts/import_osm.py            add OpenStreetMap trails to the wishlist
scripts/migrate_v2.py            one-time migration from the old trails.geojson
```

The browser loads about 1.5 MB of data in total. The public site never
talks to a server; it reads the GeoJSON files straight from GitHub Pages.
When `server.py` is running, the same page turns on editing.

## Day to day

### Record a hike on your phone

Open the site on your phone and tap **Record**. Keep the screen on. When you
tap **Finish**:

- on the public site, a GPX file is saved or shared, and you import it at home;
- on your local server (same Wi-Fi, `http://<your-pc>:5000`), it opens the
  editor so you can name it, write the journal and add photos right away.

Add the site to your home screen for a full-screen app.

### Add or edit a hike at home

```
pip install -r requirements.txt
python server.py          # http://localhost:5000
```

Click **Add hike**, drop a GPX, GeoJSON or KML file, and fill in the rest.
Park, state and country are detected from the track. Photos are compressed
to 1600 px, and their EXIF date and GPS position are kept alongside them.
Everything is written to `data/hikes.geojson` and `data/trail_images/`.

Wishlist trails can be edited the same way, and **Mark hiked** turns one into
a hike using its geometry.

### Publish

```
python scripts/deploy.py
```

It validates the data files, shows what changed, commits and pushes. GitHub
Pages updates in a minute or two. Git history is the backup; `server.py` also
keeps the last 20 versions of each file in `data/backups/` (ignored by git).

### Add trails to the wishlist from OpenStreetMap

See [docs/OSM_IMPORT.md](docs/OSM_IMPORT.md).

## Data model

See [docs/DATA_MODEL.md](docs/DATA_MODEL.md). Short version: every feature has
a stable `id` that never changes, hikes and wishlist are separate files, and
location fields are computed once at import time.

## Journal formatting

Journal text is plain text with a little Markdown: blank lines separate
paragraphs, `**bold**`, `*italic*`, and `[link text](https://...)`.

## Running your own

Fork the repo, delete the contents of `data/hikes.geojson`,
`data/wishlist.geojson` and `data/trail_images/`, update the About and Contact
text in `index.html`, and enable GitHub Pages on the `main` branch.
