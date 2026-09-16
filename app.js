/* Trail Blogger v2
 *
 * One responsive app, no build step. Reads data/hikes.geojson and
 * data/wishlist.geojson. If the local editing server (server.py) answers
 * on api/health, editing is enabled; otherwise the site is read-only.
 */
(() => {
  'use strict';

  // ------------------------------------------------------------------
  // Constants and small helpers
  // ------------------------------------------------------------------
  const DATA = 'data/';
  const PHOTO_BASE = 'data/trail_images/';
  const MOBILE_BP = 900;
  const STYLE = {
    hike: { color: '#1f6fb5', weight: 4, opacity: 0.9 },
    hikeSel: { color: '#0d2f57', weight: 6, opacity: 1 },
    wish: { color: '#e39b00', weight: 3, opacity: 0.85 },
    wishSel: { color: '#7a4f00', weight: 5, opacity: 1 },
    park: { color: '#2f8f4e', weight: 1.5, fillColor: '#2f8f4e', fillOpacity: 0.12 },
    state: { color: '#7b5ea7', weight: 1.5, fillColor: '#7b5ea7', fillOpacity: 0.1 },
    rec: { color: '#d7263d', weight: 5, opacity: 0.95 },
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const isMobile = () => window.innerWidth < MOBILE_BP;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtNum = (n, d = 0) => Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
  const fmtDate = (iso, opts = { year: 'numeric', month: 'short', day: 'numeric' }) => {
    if (!iso) return 'Date unknown';
    const d = new Date(`${iso}T12:00:00`);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, opts);
  };
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const randomId = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 12) : Math.random().toString(16).slice(2, 14));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const regionOf = (p) => p.state || p.country || 'Unknown';
  const abbrPark = (name) => name.replace('National Forest', 'NF').replace('National Park', 'NP').replace('State Park', 'SP').replace('State Forest', 'SF');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function haversineM(a, b) {
    const r = Math.PI / 180;
    const dLat = (b[1] - a[1]) * r;
    const dLon = (b[0] - a[0]) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371000 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
  function trackLengthMi(coords) {
    let m = 0;
    for (let i = 1; i < coords.length; i++) m += haversineM(coords[i - 1], coords[i]);
    return Math.round((m / 1609.344) * 100) / 100;
  }
  function elevationGainFt(coords, threshold = 3) {
    const zs = coords.filter((c) => c.length > 2 && c[2] != null).map((c) => c[2]);
    if (zs.length < 2 || zs.every((z) => z === 0)) return null;
    let gain = 0;
    let ref = zs[0];
    for (const z of zs.slice(1)) {
      if (z - ref >= threshold) { gain += z - ref; ref = z; } else if (z < ref) ref = z;
    }
    return Math.round(gain * 3.28084);
  }
  function roundCoords(coords) {
    return coords.map((c) => {
      const out = [Math.round(c[0] * 1e6) / 1e6, Math.round(c[1] * 1e6) / 1e6];
      if (c.length > 2 && c[2] != null && c[2] !== 0) out.push(Math.round(c[2] * 10) / 10);
      return out;
    });
  }

  // ------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------
  const state = {
    hikes: [],
    wishlist: [],
    wishlistLoaded: false,
    wishlistLoading: null,
    tab: 'hikes',
    query: '',
    selected: null, // { kind: 'hike' | 'wish', id }
    editable: false,
  };
  const layers = { hikes: null, wish: null, parks: null, states: null, rec: null, me: null };
  const index = { hike: new Map(), wish: new Map() }; // id -> leaflet layer
  let map;
  let baseLayers = {};
  let lastFeatureClick = 0;

  const findFeature = (kind, id) => (kind === 'hike' ? state.hikes : state.wishlist).find((f) => f.properties.id === id);

  async function loadJSON(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${url} (${r.status})`);
    return r.json();
  }

  function sortHikes() {
    state.hikes.sort((a, b) => (b.properties.date || '0000').localeCompare(a.properties.date || '0000') || a.properties.name.localeCompare(b.properties.name));
  }

  function ensureWishlist() {
    if (state.wishlistLoaded) return Promise.resolve();
    if (!state.wishlistLoading) {
      state.wishlistLoading = loadJSON(`${DATA}wishlist.geojson`).then((fc) => {
        state.wishlist = fc.features;
        state.wishlistLoaded = true;
        renderWishLayer();
        updateCounts();
      }).catch((e) => { toast(`Could not load wishlist: ${e.message}`); state.wishlistLoading = null; });
    }
    return state.wishlistLoading;
  }

  // ------------------------------------------------------------------
  // Map
  // ------------------------------------------------------------------
  function initMap() {
    map = L.map('map', { zoomControl: false, attributionControl: false, preferCanvas: true, worldCopyJump: true }).setView([40, -60], 3);
    baseLayers = {
      osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }),
      topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '&copy; OpenTopoMap, OpenStreetMap contributors' }),
      sat: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: '&copy; Esri' }),
    };
    baseLayers.osm.addTo(map);
    L.control.attribution({ position: isMobile() ? 'topleft' : 'bottomright', prefix: false }).addTo(map);
    if (!isMobile()) L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.on('click', () => {
      if (Date.now() - lastFeatureClick < 400) return;
      if (isMobile()) setSheet('peek');
    });
    map.on('locationfound', (e) => {
      if (!layers.me) layers.me = L.marker(e.latlng, { icon: L.divIcon({ className: 'leaflet-marker-me', iconSize: [16, 16] }), interactive: false }).addTo(map);
      else layers.me.setLatLng(e.latlng);
    });
    map.on('locationerror', () => toast('Could not get your location.'));
    map.on('dragstart', () => { rec.follow = false; });
  }

  function buildTrailLayer(features, kind) {
    index[kind].clear();
    return L.geoJSON({ type: 'FeatureCollection', features }, {
      style: () => STYLE[kind],
      onEachFeature: (f, layer) => {
        index[kind].set(f.properties.id, layer);
        layer.on('click', (e) => {
          lastFeatureClick = Date.now();
          L.DomEvent.stopPropagation(e);
          navigate(`#/${kind}/${f.properties.id}`);
        });
      },
    });
  }

  function renderHikeLayer() {
    if (layers.hikes) map.removeLayer(layers.hikes);
    layers.hikes = buildTrailLayer(state.hikes, 'hike');
    if ($('#layerHikes').checked) layers.hikes.addTo(map);
    applySelection();
  }

  function renderWishLayer() {
    if (layers.wish) map.removeLayer(layers.wish);
    layers.wish = buildTrailLayer(state.wishlist, 'wish');
    if ($('#layerWish').checked) {
      layers.wish.addTo(map);
      if (layers.hikes && map.hasLayer(layers.hikes)) layers.hikes.bringToFront();
    }
    applySelection();
  }

  function applySelection() {
    for (const kind of ['hike', 'wish']) {
      for (const [id, layer] of index[kind]) {
        const sel = state.selected && state.selected.kind === kind && state.selected.id === id;
        layer.setStyle(sel ? STYLE[`${kind}Sel`] : STYLE[kind]);
        if (sel && layer.bringToFront) layer.bringToFront();
      }
    }
  }

  function fitOptions(animate = true) {
    const opts = { maxZoom: 15, animate };
    if (isMobile()) {
      const h = $('#stage').clientHeight;
      const sheet = $('#panel').dataset.sheet;
      const covered = sheet === 'peek' ? 96 : sheet === 'half' ? Math.round(h * 0.5) : Math.round(h * 0.5);
      opts.paddingTopLeft = [24, 24];
      opts.paddingBottomRight = [24, covered + 12];
    } else {
      opts.padding = [48, 48];
    }
    return opts;
  }

  function focusFeature(f, animate = true) {
    const b = L.geoJSON(f).getBounds();
    if (!b.isValid()) return;
    map.fitBounds(b, fitOptions(animate));
  }

  function fitAll(animate = false) {
    if (!layers.hikes) return;
    const b = layers.hikes.getBounds();
    if (b.isValid()) map.fitBounds(b, { ...fitOptions(animate), maxZoom: 12 });
  }

  async function toggleOverlay(name, on) {
    if (name === 'parks' && !layers.parks) {
      const fc = await loadJSON(`${DATA}parks_visited.geojson`);
      layers.parks = L.geoJSON(fc, { style: () => STYLE.park, interactive: false });
    }
    if (name === 'states' && !layers.states) {
      const fc = await loadJSON(`${DATA}us_states.geojson`);
      const visited = new Set(state.hikes.map((f) => f.properties.state).filter(Boolean));
      fc.features = fc.features.filter((f) => visited.has(f.properties.name));
      layers.states = L.geoJSON(fc, { style: () => STYLE.state, interactive: false });
    }
    const layer = layers[name];
    if (!layer) return;
    if (on) { layer.addTo(map); layer.bringToBack(); } else map.removeLayer(layer);
  }

  // ------------------------------------------------------------------
  // Panel: sheet, views, list, detail
  // ------------------------------------------------------------------
  const SHEET_ORDER = ['peek', 'half', 'full'];
  function setSheet(s) { $('#panel').dataset.sheet = s; }

  function initSheet() {
    const handle = $('#sheetHandle');
    let y0 = null;
    const step = (dir) => {
      const cur = SHEET_ORDER.indexOf($('#panel').dataset.sheet);
      if (dir === 0) setSheet(cur === 2 ? 'half' : SHEET_ORDER[cur + 1]);
      else setSheet(SHEET_ORDER[Math.max(0, Math.min(2, cur + dir))]);
    };
    handle.addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true });
    handle.addEventListener('touchend', (e) => {
      if (y0 == null) return;
      const dy = e.changedTouches[0].clientY - y0;
      y0 = null;
      e.preventDefault();
      step(dy < -30 ? 1 : dy > 30 ? -1 : 0);
    });
    handle.addEventListener('click', () => step(0));
  }

  function showView(name) {
    for (const v of ['list', 'detail', 'record']) $(`#view${cap(v)}`).hidden = v !== name;
    const view = $(`#view${cap(name)}`);
    view.scrollTop = 0;
  }

  function updateCounts() {
    $('#countHikes').textContent = state.hikes.length;
    $('#countWish').textContent = state.wishlistLoaded ? state.wishlist.length : '…';
  }

  function filtered(list) {
    const q = state.query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((f) => {
      const p = f.properties;
      return [p.name, p.park, p.state, p.country, ...(p.companions || [])].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }

  function statTiles(tiles) {
    return tiles.map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
  }

  function hikeStats(hikes) {
    const miles = hikes.reduce((s, f) => s + (f.properties.length_mi || 0), 0);
    const gain = hikes.reduce((s, f) => s + (f.properties.elevation_gain_ft || 0), 0);
    const regions = new Set(hikes.map((f) => regionOf(f.properties)));
    const parks = new Set(hikes.map((f) => f.properties.park).filter(Boolean));
    const photos = hikes.reduce((s, f) => s + (f.properties.photos || []).length, 0);
    return statTiles([
      [hikes.length, 'hikes'], [fmtNum(miles, 0), 'miles'], [fmtNum(gain), 'ft climbed'],
      [regions.size, 'states & countries'], [parks.size, 'parks'], [photos, 'photos'],
    ]);
  }

  function wishStats(list) {
    const miles = list.reduce((s, f) => s + (f.properties.length_mi || 0), 0);
    const regions = new Set(list.map((f) => regionOf(f.properties)));
    return statTiles([[list.length, 'trails to do'], [fmtNum(miles, 0), 'miles'], [regions.size, 'regions']]);
  }

  function hikeCard(f) {
    const p = f.properties;
    const sel = state.selected && state.selected.kind === 'hike' && state.selected.id === p.id;
    const thumb = p.photos && p.photos.length
      ? `<div class="thumb" style="background-image:url('${PHOTO_BASE}${esc(p.photos[0].src)}')"></div>`
      : '<div class="thumb"><svg class="icon"><use href="#i-pin"/></svg></div>';
    const bits = [
      p.date ? fmtDate(p.date, { month: 'short', day: 'numeric' }) : 'Undated',
      `${fmtNum(p.length_mi, 1)} mi`,
      p.elevation_gain_ft ? `${fmtNum(p.elevation_gain_ft)} ft` : null,
      p.park ? abbrPark(p.park) : regionOf(p),
    ].filter(Boolean);
    const photos = p.photos && p.photos.length ? `<div class="card-photos"><svg class="icon"><use href="#i-photo"/></svg>${p.photos.length}</div>` : '';
    return `<a class="card hike${sel ? ' selected' : ''}" href="#/hike/${esc(p.id)}">${thumb}<div class="card-body"><div class="card-title">${esc(p.name)}</div><div class="card-sub">${bits.map(esc).join(' · ')}</div>${photos}</div></a>`;
  }

  function wishCard(f) {
    const p = f.properties;
    const sel = state.selected && state.selected.kind === 'wish' && state.selected.id === p.id;
    const bits = [`${fmtNum(p.length_mi, 1)} mi`, p.park ? abbrPark(p.park) : null, p.note ? 'has notes' : null].filter(Boolean);
    return `<a class="card wish${sel ? ' selected' : ''}" href="#/wish/${esc(p.id)}"><div class="thumb"></div><div class="card-body"><div class="card-title">${esc(p.name)}</div><div class="card-sub">${bits.map(esc).join(' · ')}</div></div></a>`;
  }

  function renderList() {
    const isHikes = state.tab === 'hikes';
    const source = isHikes ? state.hikes : state.wishlist;
    const items = filtered(source);
    $('#stats').innerHTML = isHikes ? hikeStats(state.hikes) : wishStats(state.wishlist);

    if (!isHikes && !state.wishlistLoaded) {
      $('#list').innerHTML = '<p class="empty">Loading wishlist…</p>';
      return;
    }
    const groups = new Map();
    for (const f of items) {
      const key = isHikes ? (f.properties.date ? f.properties.date.slice(0, 4) : 'Undated') : regionOf(f.properties);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(f);
    }
    const keys = [...groups.keys()].sort((a, b) => {
      if (isHikes) {
        if (a === 'Undated') return 1;
        if (b === 'Undated') return -1;
        return b.localeCompare(a);
      }
      return a.localeCompare(b);
    });
    const html = keys.map((k) => {
      const list = groups.get(k);
      const sub = isHikes
        ? `${list.length} hike${list.length === 1 ? '' : 's'} · ${fmtNum(list.reduce((s, f) => s + (f.properties.length_mi || 0), 0), 0)} mi`
        : `${list.length}`;
      return `<h3 class="group">${esc(k)}<span>${sub}</span></h3>${list.map(isHikes ? hikeCard : wishCard).join('')}`;
    }).join('');
    $('#list').innerHTML = html || `<p class="empty">${state.query ? `Nothing matches "${esc(state.query)}".` : (isHikes ? 'No hikes yet. Record one or add a GPX file.' : 'Nothing on the wishlist yet.')}</p>`;
  }

  function renderMarkdown(text) {
    if (!text || !text.trim()) return '';
    return text.trim().split(/\n\s*\n/).map((par) => {
      let h = esc(par.trim()).replace(/\n/g, '<br>');
      h = h.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
      h = h.replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\w)/g, '$1<i>$2</i>');
      h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      return `<p>${h}</p>`;
    }).join('');
  }

  function detailActions(kind, f) {
    const btn = (id, icon, label, cls = 'btn-ghost') => `<button class="btn ${cls} btn-sm" data-act="${id}" title="${esc(label)}"><svg class="icon"><use href="#i-${icon}"/></svg><span>${esc(label)}</span></button>`;
    const out = [btn('gpx', 'download', 'GPX')];
    if (state.editable) {
      out.push(btn('edit', 'edit', 'Edit'));
      if (kind === 'wish') out.push(btn('hiked', 'check', 'Mark hiked', 'btn-primary'));
    }
    return out.join('');
  }

  function showDetail(kind, f) {
    const p = f.properties;
    const isHike = kind === 'hike';
    state.selected = { kind, id: p.id };
    applySelection();

    $('#backLabel').textContent = isHike ? 'All hikes' : 'Wishlist';
    $('#dName').textContent = p.name;
    const chips = isHike
      ? [[fmtDate(p.date), 'hiked'], [`${fmtNum(p.length_mi, 1)} mi`], p.elevation_gain_ft ? [`${fmtNum(p.elevation_gain_ft)} ft gain`] : null, p.park ? [p.park] : null, [regionOf(p)]]
      : [['Wishlist', 'wish'], [`${fmtNum(p.length_mi, 1)} mi`], p.park ? [p.park] : null, [regionOf(p)]];
    $('#dMeta').innerHTML = chips.filter(Boolean).map(([t, c]) => `<span class="chip${c ? ` ${c}` : ''}">${esc(t)}</span>`).join('');
    $('#dCompanions').innerHTML = isHike && p.companions && p.companions.length ? `With ${esc(p.companions.join(', '))}` : '';
    const text = isHike ? p.journal : p.note;
    $('#dJournal').innerHTML = renderMarkdown(text) || `<p class="muted">${isHike ? 'No journal entry yet.' : 'No notes yet.'}</p>`;
    const photos = isHike ? (p.photos || []) : [];
    $('#dPhotos').innerHTML = photos.map((ph, i) => `<button class="ph" data-i="${i}"><img loading="lazy" src="${PHOTO_BASE}${esc(ph.src)}" alt=""></button>`).join('');
    $('#detailActions').innerHTML = detailActions(kind, f);

    showView('detail');
    if (isMobile() && $('#panel').dataset.sheet === 'peek') setSheet('half');
    focusFeature(f);
    const card = $(`.card[href="#/${kind}/${p.id}"]`);
    $$('.card.selected').forEach((c) => c.classList.remove('selected'));
    if (card) card.classList.add('selected');
  }

  function refreshDetail() {
    if (!state.selected || $('#viewDetail').hidden) return;
    const f = findFeature(state.selected.kind, state.selected.id);
    if (f) $('#detailActions').innerHTML = detailActions(state.selected.kind, f);
  }

  function clearSelection() {
    if (!state.selected) return;
    state.selected = null;
    applySelection();
    $$('.card.selected').forEach((c) => c.classList.remove('selected'));
  }

  function renderAll() {
    updateCounts();
    renderList();
    renderHikeLayer();
    if (state.wishlistLoaded) renderWishLayer();
  }

  // ------------------------------------------------------------------
  // Routing
  // ------------------------------------------------------------------
  function navigate(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  async function route() {
    const h = location.hash || '#/';
    closePopovers();
    if (h.startsWith('#/record')) {
      clearSelection();
      showView('record');
      recordViewOpened();
      if (isMobile()) setSheet('half');
      return;
    }
    const m = h.match(/^#\/(hike|wish)\/([A-Za-z0-9_-]+)/);
    if (m) {
      const kind = m[1];
      if (kind === 'wish') await ensureWishlist();
      const f = findFeature(kind, m[2]);
      if (f) {
        if (state.tab !== (kind === 'hike' ? 'hikes' : 'wishlist')) setTab(kind === 'hike' ? 'hikes' : 'wishlist', false);
        showDetail(kind, f);
        return;
      }
      toast('That trail is not here any more.');
    }
    clearSelection();
    showView('list');
  }

  function setTab(tab, render = true) {
    state.tab = tab;
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
    if (tab === 'wishlist') ensureWishlist().then(() => { if (state.tab === 'wishlist') renderList(); });
    if (render) renderList();
  }

  // ------------------------------------------------------------------
  // UI wiring
  // ------------------------------------------------------------------
  function closePopovers() {
    $('#menu').hidden = true;
    $('#layersPop').hidden = true;
    $('#toolLayers').classList.remove('active');
  }

  function initUI() {
    $$('.tab').forEach((t) => t.addEventListener('click', () => setTab(t.dataset.tab)));
    $('#search').addEventListener('input', debounce((e) => { state.query = e.target.value; renderList(); }, 120));
    $('#btnBack').addEventListener('click', () => navigate('#/'));
    $('#btnRecordBack').addEventListener('click', () => navigate('#/'));
    $('#btnAdd').addEventListener('click', () => openEditor({ kind: 'hike' }));

    $('#btnMenu').addEventListener('click', (e) => { e.stopPropagation(); const m = $('#menu'); const open = m.hidden; closePopovers(); m.hidden = !open; });
    $$('[data-menu]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); closePopovers(); $$('dialog[open]').forEach((d) => d.close()); $(`#${b.dataset.menu}`).showModal(); }));
    document.addEventListener('click', (e) => { if (!e.target.closest('#menu, #btnMenu, #layersPop, #toolLayers')) closePopovers(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopovers(); });

    $('#toolLayers').addEventListener('click', (e) => { e.stopPropagation(); const p = $('#layersPop'); const open = p.hidden; closePopovers(); p.hidden = !open; $('#toolLayers').classList.toggle('active', open); });
    $('#toolLocate').addEventListener('click', () => { rec.follow = true; map.locate({ setView: true, maxZoom: 15, enableHighAccuracy: true }); });
    $('#toolFit').addEventListener('click', () => fitAll(true));

    $('#layerHikes').addEventListener('change', (e) => { if (!layers.hikes) return; if (e.target.checked) layers.hikes.addTo(map); else map.removeLayer(layers.hikes); });
    $('#layerWish').addEventListener('change', async (e) => { await ensureWishlist(); if (!layers.wish) return; if (e.target.checked) { layers.wish.addTo(map); layers.hikes && layers.hikes.bringToFront(); } else map.removeLayer(layers.wish); });
    $('#layerParks').addEventListener('change', (e) => toggleOverlay('parks', e.target.checked));
    $('#layerStates').addEventListener('change', (e) => toggleOverlay('states', e.target.checked));
    $$('input[name="base"]').forEach((r) => r.addEventListener('change', () => {
      Object.values(baseLayers).forEach((l) => map.removeLayer(l));
      baseLayers[r.value].addTo(map);
      baseLayers[r.value].bringToBack();
    }));

    $('#detailActions').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || !state.selected) return;
      const f = findFeature(state.selected.kind, state.selected.id);
      if (!f) return;
      if (b.dataset.act === 'gpx') exportGPX(f);
      if (b.dataset.act === 'edit') openEditor({ kind: state.selected.kind, feature: f });
      if (b.dataset.act === 'hiked') openEditor({ kind: 'hike', coords: f.geometry.coordinates, fromWish: f, prefill: { name: f.properties.name, date: todayISO(), park: f.properties.park, state: f.properties.state, country: f.properties.country } });
    });
    $('#dPhotos').addEventListener('click', (e) => {
      const b = e.target.closest('.ph');
      if (!b || !state.selected) return;
      const f = findFeature(state.selected.kind, state.selected.id);
      openLightbox(f, Number(b.dataset.i));
    });

    $$('dialog').forEach((d) => {
      $$('[data-close]', d).forEach((b) => b.addEventListener('click', () => d.close()));
      if (d.id !== 'editor') d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    });

    window.addEventListener('hashchange', route);
    window.addEventListener('resize', debounce(() => map.invalidateSize(), 150));
    initEditor();
    initRecorder();
  }

  let toastTimer;
  function toast(msg, ms = 2800) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  async function detectEditable() {
    try {
      const c = new AbortController();
      const timer = setTimeout(() => c.abort(), 2000);
      const r = await fetch('api/health', { signal: c.signal, cache: 'no-store' });
      clearTimeout(timer);
      const j = await r.json();
      state.editable = !!j.editable;
    } catch {
      state.editable = false;
    }
    document.body.classList.toggle('editable', state.editable);
    $('#menuMode').textContent = state.editable ? 'Editing on (local server)' : 'Read-only copy';
    refreshDetail();
  }

  // ------------------------------------------------------------------
  // Lightbox
  // ------------------------------------------------------------------
  let lb = { f: null, i: 0 };
  function openLightbox(f, i) {
    lb = { f, i };
    renderLightbox();
    $('#lightbox').showModal();
  }
  function renderLightbox() {
    const photos = lb.f.properties.photos || [];
    const ph = photos[lb.i];
    if (!ph) return;
    $('#lbImg').src = `${PHOTO_BASE}${ph.src}`;
    $('#lbCaption').textContent = `${lb.f.properties.name} · ${lb.i + 1} / ${photos.length}${ph.taken ? ` · ${fmtDate(ph.taken.slice(0, 10))}` : ''}`;
  }
  function initLightbox() {
    const d = $('#lightbox');
    const step = (n) => { const len = (lb.f?.properties.photos || []).length; if (!len) return; lb.i = (lb.i + n + len) % len; renderLightbox(); };
    d.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });
    let x0 = null;
    d.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    d.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1); });
    $('#lbImg').addEventListener('click', () => step(1));
  }

  // ------------------------------------------------------------------
  // Track files: GPX / GeoJSON / KML in, GPX out
  // ------------------------------------------------------------------
  function parseTrackFile(text, filename) {
    const lower = (filename || '').toLowerCase();
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || lower.endsWith('.geojson') || lower.endsWith('.json')) return parseGeoJSON(JSON.parse(trimmed));
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('That file is not valid GPX or KML.');
    if (doc.documentElement.localName === 'gpx') return parseGPX(doc);
    if (doc.documentElement.localName === 'kml') return parseKML(doc);
    throw new Error('Unsupported file type. Use GPX, GeoJSON or KML.');
  }

  function parseGPX(doc) {
    const pts = Array.from(doc.getElementsByTagName('trkpt'));
    const source = pts.length ? pts : Array.from(doc.getElementsByTagName('rtept'));
    const coords = source.map((pt) => {
      const ele = pt.getElementsByTagName('ele')[0];
      const c = [parseFloat(pt.getAttribute('lon')), parseFloat(pt.getAttribute('lat'))];
      if (ele && ele.textContent) c.push(parseFloat(ele.textContent));
      return c;
    }).filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1]));
    const timeEl = source.map((pt) => pt.getElementsByTagName('time')[0]).find(Boolean);
    const nameEl = doc.querySelector('trk > name') || doc.querySelector('metadata > name');
    return { coords, name: nameEl ? nameEl.textContent.trim() : '', date: timeEl ? timeEl.textContent.trim().slice(0, 10) : null };
  }

  function parseKML(doc) {
    let best = [];
    for (const el of doc.getElementsByTagName('coordinates')) {
      const coords = el.textContent.trim().split(/\s+/).map((t) => t.split(',').map(Number)).filter((c) => c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]));
      if (coords.length > best.length) best = coords;
    }
    const nameEl = doc.querySelector('Placemark > name') || doc.querySelector('Document > name');
    return { coords: best, name: nameEl ? nameEl.textContent.trim() : '', date: null };
  }

  function parseGeoJSON(obj) {
    const feats = obj.type === 'FeatureCollection' ? obj.features : obj.type === 'Feature' ? [obj] : [{ type: 'Feature', properties: {}, geometry: obj }];
    let best = null;
    let bestCoords = [];
    for (const f of feats) {
      const g = f.geometry;
      if (!g) continue;
      let coords = [];
      if (g.type === 'LineString') coords = g.coordinates;
      else if (g.type === 'MultiLineString') coords = g.coordinates.flat();
      else if (g.type === 'Polygon') coords = g.coordinates[0];
      if (coords.length > bestCoords.length) { best = f; bestCoords = coords; }
    }
    if (!best) throw new Error('No line geometry found in that GeoJSON.');
    const p = best.properties || {};
    return { coords: bestCoords, name: p.name || '', date: p.date || p.date_hiked || null };
  }

  function toGPX(f) {
    const p = f.properties;
    const pts = f.geometry.coordinates.map((c) => `<trkpt lat="${c[1]}" lon="${c[0]}">${c.length > 2 && c[2] != null ? `<ele>${c[2]}</ele>` : ''}</trkpt>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Trail Blogger" xmlns="http://www.topografix.com/GPX/1/1">\n<metadata><name>${esc(p.name)}</name>${p.date ? `<time>${p.date}T00:00:00Z</time>` : ''}</metadata>\n<trk><name>${esc(p.name)}</name><trkseg>\n${pts}\n</trkseg></trk>\n</gpx>`;
  }

  async function exportGPX(f) {
    const name = `${(f.properties.name || 'track').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'track'}.gpx`;
    const blob = new Blob([toGPX(f)], { type: 'application/gpx+xml' });
    const file = new File([blob], name, { type: 'application/gpx+xml' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: f.properties.name }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ------------------------------------------------------------------
  // Editor (add / edit hike or wishlist trail)
  // ------------------------------------------------------------------
  const ed = { kind: 'hike', feature: null, coords: null, photos: [], newFiles: [], removed: [], fromWish: null, fromRecording: false };

  function openEditor(opts) {
    ed.kind = opts.kind || 'hike';
    ed.feature = opts.feature || null;
    ed.coords = opts.coords || (ed.feature ? ed.feature.geometry.coordinates : null);
    ed.photos = ed.feature ? [...(ed.feature.properties.photos || [])] : [];
    ed.newFiles = [];
    ed.removed = [];
    ed.fromWish = opts.fromWish || null;
    ed.fromRecording = !!opts.fromRecording;
    const p = ed.feature ? ed.feature.properties : (opts.prefill || {});
    const isHike = ed.kind === 'hike';

    $('#editorTitle').textContent = ed.feature ? (isHike ? 'Edit hike' : 'Edit wishlist trail') : (isHike ? 'Add hike' : 'Add to wishlist');
    $('#fName').value = p.name || '';
    $('#fDate').value = p.date || '';
    $('#fPark').value = p.park || '';
    $('#fState').value = p.state || '';
    $('#fCountry').value = p.country || '';
    $('#fCompanions').value = (p.companions || []).join(', ');
    $('#fJournal').value = (isHike ? p.journal : p.note) || '';
    $('#fJournalLabel').textContent = isHike ? 'Journal' : 'Notes (why this one?)';
    $('#fDateWrap').hidden = !isHike;
    $('#fCompanionsWrap').hidden = !isHike;
    $('#fPhotosWrap').hidden = !isHike;
    $('#btnDelete').hidden = !ed.feature;
    $('#editorStatus').textContent = '';
    $('#trackFile').value = '';
    updateDropSummary();
    renderPhotoGrid();
    $('#editor').showModal();
  }

  function updateDropSummary() {
    const s = $('#dropSummary');
    if (!ed.coords || ed.coords.length < 2) { s.hidden = true; $('#dropText').hidden = false; return; }
    const gain = elevationGainFt(ed.coords);
    s.textContent = `${fmtNum(ed.coords.length)} points · ${fmtNum(trackLengthMi(ed.coords), 1)} mi${gain ? ` · ${fmtNum(gain)} ft gain` : ''}`;
    s.hidden = false;
    $('#dropText').innerHTML = '<span>Drop another file to replace the track</span>';
    $('#dropText').hidden = false;
  }

  async function handleTrackFile(file) {
    if (!file) return;
    try {
      const parsed = parseTrackFile(await file.text(), file.name);
      if (!parsed.coords || parsed.coords.length < 2) throw new Error('No track points found in that file.');
      ed.coords = roundCoords(parsed.coords);
      if (!$('#fName').value.trim()) $('#fName').value = parsed.name || file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
      if (!$('#fDate').value && parsed.date) $('#fDate').value = parsed.date;
      updateDropSummary();
      await locateInto(ed.coords);
    } catch (e) {
      $('#editorStatus').textContent = e.message;
    }
  }

  async function locateInto(coords) {
    if (!state.editable) return;
    try {
      const r = await fetch('api/locate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coordinates: coords.filter((_, i) => i % Math.max(1, Math.floor(coords.length / 60)) === 0) }) });
      if (!r.ok) return;
      const j = await r.json();
      if (!$('#fPark').value && j.park) $('#fPark').value = j.park;
      if (!$('#fState').value && j.state) $('#fState').value = j.state;
      if (!$('#fCountry').value && j.country) $('#fCountry').value = j.country;
      ed.parkType = j.park_type || null;
    } catch { /* offline or read-only: fields stay editable by hand */ }
  }

  function renderPhotoGrid() {
    const g = $('#photoGrid');
    const existing = ed.photos.map((ph) => `<div class="pg${ed.removed.includes(ph.src) ? ' removed' : ''}" data-src="${esc(ph.src)}"><img src="${PHOTO_BASE}${esc(ph.src)}" alt=""><button type="button" title="Remove"><svg class="icon"><use href="#i-close"/></svg></button></div>`);
    const fresh = ed.newFiles.map((f, i) => `<div class="pg" data-new="${i}"><img src="${f._url}" alt=""><button type="button" title="Remove"><svg class="icon"><use href="#i-close"/></svg></button></div>`);
    g.innerHTML = existing.concat(fresh).join('');
  }

  function initEditor() {
    const drop = $('#drop');
    drop.addEventListener('click', (e) => { if (!e.target.closest('input')) $('#trackFile').click(); });
    $('#trackFile').addEventListener('change', (e) => handleTrackFile(e.target.files[0]));
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => handleTrackFile(e.dataTransfer.files[0]));

    $('#fPhotos').addEventListener('change', (e) => {
      for (const f of e.target.files) { f._url = URL.createObjectURL(f); ed.newFiles.push(f); }
      e.target.value = '';
      renderPhotoGrid();
    });
    $('#photoGrid').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const tile = b.closest('.pg');
      if (tile.dataset.new != null) {
        const f = ed.newFiles.splice(Number(tile.dataset.new), 1)[0];
        if (f) URL.revokeObjectURL(f._url);
      } else {
        const src = tile.dataset.src;
        if (ed.removed.includes(src)) ed.removed = ed.removed.filter((s) => s !== src); else ed.removed.push(src);
      }
      renderPhotoGrid();
    });

    $('#editorForm').addEventListener('submit', saveEditor);
    $('#btnDelete').addEventListener('click', deleteFromEditor);
    $('#editor').addEventListener('close', () => { ed.newFiles.forEach((f) => URL.revokeObjectURL(f._url)); ed.newFiles = []; });
  }

  async function putCollection(name, features) {
    const r = await fetch(`api/${name}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'FeatureCollection', schema: 'trailblogger/v2', features }) });
    if (!r.ok) {
      let msg = `Save failed (${r.status})`;
      try { msg = (await r.json()).error || msg; } catch { /* ignore */ }
      throw new Error(msg);
    }
  }

  function upsert(list, feature) {
    const i = list.findIndex((f) => f.properties.id === feature.properties.id);
    if (i >= 0) list[i] = feature; else list.push(feature);
  }

  async function saveEditor(e) {
    e.preventDefault();
    const status = (m) => { $('#editorStatus').textContent = m; };
    const name = $('#fName').value.trim();
    if (!name) { status('Give it a name.'); return; }
    if (!ed.coords || ed.coords.length < 2) { status('Add a track file first (GPX, GeoJSON or KML).'); return; }
    if (!state.editable) { status('Editing needs the local server. Run: python server.py'); return; }
    const isHike = ed.kind === 'hike';
    $('#btnSave').disabled = true;
    status('Saving…');
    try {
      const id = ed.feature ? ed.feature.properties.id : randomId();
      let photos = ed.photos.filter((ph) => !ed.removed.includes(ph.src));
      if (isHike && ed.newFiles.length) {
        status(`Uploading ${ed.newFiles.length} photo${ed.newFiles.length === 1 ? '' : 's'}…`);
        const fd = new FormData();
        ed.newFiles.forEach((f) => fd.append('photos', f, f.name));
        const r = await fetch(`api/photos/${id}`, { method: 'POST', body: fd });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Photo upload failed');
        photos = photos.concat((await r.json()).photos);
      }
      for (const src of ed.removed) {
        const [folder, file] = src.split('/');
        await fetch(`api/photos/${folder}/${file}`, { method: 'DELETE' }).catch(() => {});
      }
      let date = $('#fDate').value || null;
      if (isHike && !date) {
        const taken = photos.map((p) => p.taken).filter(Boolean).sort()[0];
        if (taken) date = taken.slice(0, 10);
      }
      const now = new Date().toISOString();
      const old = ed.feature ? ed.feature.properties : {};
      const common = {
        id, name,
        length_mi: trackLengthMi(ed.coords),
        country: $('#fCountry').value.trim() || null,
        state: $('#fState').value.trim() || null,
        park: $('#fPark').value.trim() || null,
        park_type: ed.parkType || old.park_type || null,
        created_at: old.created_at || now,
      };
      const props = isHike ? {
        ...common, date,
        elevation_gain_ft: elevationGainFt(ed.coords),
        journal: $('#fJournal').value.trim(),
        photos,
        companions: $('#fCompanions').value.split(',').map((s) => s.trim()).filter(Boolean),
        tags: old.tags || [],
        osm_ids: ed.fromWish ? [ed.fromWish.properties.osm_id, ...(ed.fromWish.properties.osm_ids || [])].filter(Boolean) : (old.osm_ids || []),
        legacy_id: old.legacy_id ?? null,
        updated_at: now,
      } : {
        ...common,
        note: $('#fJournal').value.trim(),
        source: old.source || 'user',
        osm_id: old.osm_id ?? null,
        osm_ids: old.osm_ids || [],
      };
      const feature = { type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: roundCoords(ed.coords) } };

      if (isHike) {
        upsert(state.hikes, feature);
        sortHikes();
        await putCollection('hikes', state.hikes);
        if (ed.fromWish) {
          await ensureWishlist();
          state.wishlist = state.wishlist.filter((f) => f.properties.id !== ed.fromWish.properties.id);
          await putCollection('wishlist', state.wishlist);
        }
      } else {
        await ensureWishlist();
        upsert(state.wishlist, feature);
        state.wishlist.sort((a, b) => regionOf(a.properties).localeCompare(regionOf(b.properties)) || a.properties.name.localeCompare(b.properties.name));
        await putCollection('wishlist', state.wishlist);
      }
      if (ed.fromRecording) clearRecording();
      ed.parkType = null;
      $('#editor').close();
      renderAll();
      navigate(`#/${isHike ? 'hike' : 'wish'}/${id}`);
      toast('Saved. Run scripts/deploy.py when you want it on the live site.');
    } catch (err) {
      status(err.message);
    } finally {
      $('#btnSave').disabled = false;
    }
  }

  async function deleteFromEditor() {
    if (!ed.feature) return;
    const p = ed.feature.properties;
    if (!confirm(`Delete "${p.name}"? Photos stay on disk until you remove the folder.`)) return;
    try {
      if (ed.kind === 'hike') {
        state.hikes = state.hikes.filter((f) => f.properties.id !== p.id);
        await putCollection('hikes', state.hikes);
      } else {
        state.wishlist = state.wishlist.filter((f) => f.properties.id !== p.id);
        await putCollection('wishlist', state.wishlist);
      }
      $('#editor').close();
      renderAll();
      navigate('#/');
      toast('Deleted.');
    } catch (err) {
      $('#editorStatus').textContent = err.message;
    }
  }

  // ------------------------------------------------------------------
  // Recorder: phone GPS -> track (saved as a hike, or exported as GPX)
  // ------------------------------------------------------------------
  const REC_KEY = 'tb_recording';
  const rec = { active: false, paused: false, watchId: null, points: [], startedAt: null, elapsedBefore: 0, resumedAt: null, timer: null, wakeLock: null, follow: true, lastAcc: null };

  function recSave() {
    try { localStorage.setItem(REC_KEY, JSON.stringify({ points: rec.points, startedAt: rec.startedAt, elapsedBefore: rec.elapsedBefore, resumedAt: rec.paused ? null : rec.resumedAt, paused: rec.paused })); } catch { /* storage full or blocked */ }
  }
  function recLoad() {
    try { const raw = localStorage.getItem(REC_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  function clearRecording() {
    stopWatch();
    rec.active = false; rec.paused = false; rec.points = []; rec.startedAt = null; rec.elapsedBefore = 0; rec.resumedAt = null;
    try { localStorage.removeItem(REC_KEY); } catch { /* ignore */ }
    if (layers.rec) { map.removeLayer(layers.rec); layers.rec = null; }
    renderRecorder();
  }

  function recElapsedMs() {
    return rec.elapsedBefore + (rec.active && !rec.paused && rec.resumedAt ? Date.now() - rec.resumedAt : 0);
  }
  function recDistanceMi() {
    return trackLengthMi(rec.points);
  }

  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        rec.wakeLock = await navigator.wakeLock.request('screen');
        rec.wakeLock.addEventListener('release', () => { rec.wakeLock = null; });
      }
    } catch { /* not allowed; recording continues while the screen is on */ }
  }
  function releaseWakeLock() { if (rec.wakeLock) { rec.wakeLock.release().catch(() => {}); rec.wakeLock = null; } }

  function startWatch() {
    if (!('geolocation' in navigator)) { toast('This device has no location support.'); return false; }
    if (!layers.rec) layers.rec = L.polyline(rec.points.map((p) => [p[1], p[0]]), STYLE.rec).addTo(map);
    rec.watchId = navigator.geolocation.watchPosition(onPosition, (err) => {
      $('#recStatus').textContent = err.code === 1 ? 'Location permission was denied. Allow location for this site and try again.' : `GPS problem: ${err.message}`;
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
    requestWakeLock();
    if (!rec.timer) rec.timer = setInterval(renderRecorder, 1000);
    return true;
  }
  function stopWatch() {
    if (rec.watchId != null) { navigator.geolocation.clearWatch(rec.watchId); rec.watchId = null; }
    if (rec.timer) { clearInterval(rec.timer); rec.timer = null; }
    releaseWakeLock();
  }

  function onPosition(pos) {
    const { longitude: lon, latitude: lat, altitude: alt, accuracy } = pos.coords;
    rec.lastAcc = accuracy;
    if (rec.paused || !rec.active) { renderRecorder(); return; }
    if (accuracy > 50) { renderRecorder(); return; }
    const pt = [Math.round(lon * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6, alt != null ? Math.round(alt * 10) / 10 : 0, new Date(pos.timestamp).toISOString()];
    const last = rec.points[rec.points.length - 1];
    if (last && haversineM(last, pt) < 2) { renderRecorder(); return; }
    rec.points.push(pt);
    layers.rec.addLatLng([lat, lon]);
    if (rec.follow) {
      if (rec.points.length === 1) map.setView([lat, lon], Math.max(map.getZoom(), 16));
      else map.panTo([lat, lon], { animate: true, duration: 0.5 });
    }
    if (rec.points.length % 5 === 0) recSave();
    renderRecorder();
  }

  function recordViewOpened() {
    if (!rec.active) {
      const saved = recLoad();
      if (saved && saved.points && saved.points.length) {
        rec.points = saved.points;
        rec.startedAt = saved.startedAt;
        rec.elapsedBefore = saved.elapsedBefore || 0;
        rec.active = true;
        rec.paused = true;
        if (!layers.rec) layers.rec = L.polyline(rec.points.map((p) => [p[1], p[0]]), STYLE.rec).addTo(map);
        if (rec.points.length > 1) map.fitBounds(layers.rec.getBounds(), fitOptions(false));
        $('#recStatus').textContent = `Resumed an unfinished recording from ${new Date(rec.startedAt).toLocaleString()}. Press Resume to keep going or Finish to save it.`;
        if (!rec.timer) rec.timer = setInterval(renderRecorder, 1000);
      }
    }
    renderRecorder();
  }

  function renderRecorder() {
    const ms = recElapsedMs();
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    $('#recTime').textContent = h ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`;
    $('#recDist').textContent = fmtNum(recDistanceMi(), 2);
    $('#recPts').textContent = rec.points.length;
    $('#recAcc').textContent = rec.lastAcc != null ? `${Math.round(rec.lastAcc)} m` : '–';
    $('#recStart').hidden = rec.active;
    $('#recPause').hidden = !rec.active || rec.paused;
    $('#recResume').hidden = !rec.active || !rec.paused;
    $('#recFinish').hidden = !rec.active;
    $('#recDiscard').hidden = !rec.active;
    $('.btn-record').classList.toggle('recording', rec.active && !rec.paused);
  }

  function initRecorder() {
    $('#recStart').addEventListener('click', () => {
      rec.points = []; rec.startedAt = new Date().toISOString(); rec.elapsedBefore = 0; rec.resumedAt = Date.now();
      rec.active = true; rec.paused = false; rec.follow = true; rec.lastAcc = null;
      $('#recStatus').textContent = 'Waiting for a GPS fix…';
      if (!startWatch()) { rec.active = false; }
      recSave();
      renderRecorder();
      if (isMobile()) setSheet('peek');
    });
    $('#recPause').addEventListener('click', () => {
      rec.elapsedBefore = recElapsedMs(); rec.paused = true; rec.resumedAt = null;
      stopWatch(); recSave(); renderRecorder();
      $('#recStatus').textContent = 'Paused.';
    });
    $('#recResume').addEventListener('click', () => {
      rec.paused = false; rec.resumedAt = Date.now(); rec.follow = true;
      startWatch(); recSave(); renderRecorder();
      $('#recStatus').textContent = 'Recording…';
      if (isMobile()) setSheet('peek');
    });
    $('#recDiscard').addEventListener('click', () => {
      if (confirm('Discard this recording?')) { clearRecording(); $('#recStatus').textContent = ''; }
    });
    $('#recFinish').addEventListener('click', finishRecording);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && rec.active && !rec.paused && !rec.wakeLock) requestWakeLock(); });
    window.addEventListener('pagehide', () => { if (rec.active) recSave(); });
  }

  async function finishRecording() {
    rec.elapsedBefore = recElapsedMs();
    rec.paused = true; rec.resumedAt = null;
    stopWatch();
    recSave();
    if (rec.points.length < 2) { toast('Not enough GPS points yet to save a track.'); renderRecorder(); return; }
    const coords = rec.points.map((p) => [p[0], p[1], p[2]]);
    const date = (rec.startedAt || new Date().toISOString()).slice(0, 10);
    const name = `Hike on ${fmtDate(date)}`;
    if (state.editable) {
      openEditor({ kind: 'hike', coords, prefill: { name, date }, fromRecording: true });
      locateInto(coords);
    } else {
      await exportGPX({ properties: { name, date }, geometry: { coordinates: coords } });
      toast('GPX exported. On your computer, run server.py and use "Add hike" to import it.', 5000);
      clearRecording();
    }
  }

  // ------------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------------
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  async function init() {
    initMap();
    initUI();
    initSheet();
    initLightbox();
    detectEditable();
    try {
      const fc = await loadJSON(`${DATA}hikes.geojson`);
      state.hikes = fc.features;
    } catch (e) {
      $('#list').innerHTML = `<p class="empty">Could not load hikes: ${esc(e.message)}</p>`;
    }
    sortHikes();
    renderAll();
    fitAll(false);
    await route();
    ensureWishlist();
    registerSW();
  }

  window.tb = { state, map: () => map, layers };
  document.addEventListener('DOMContentLoaded', init);
})();
