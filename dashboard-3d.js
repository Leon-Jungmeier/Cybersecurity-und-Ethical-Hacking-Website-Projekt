const ATTACK_TYPES = ['DDoS', 'Phishing', 'Malware', 'Ransomware', 'MITM'];

const COLORS = {
  DDoS:       '#378add',
  Phishing:   '#e24b4a',
  Malware:    '#ef9f27',
  Ransomware: '#d4537e',
  MITM:       '#1d9e75',
};

const CITIES = [
  { n: 'Berlin',       lat:  52.5, lng:  13.4 },
  { n: 'London',       lat:  51.5, lng:  -0.1 },
  { n: 'Paris',        lat:  48.9, lng:   2.3 },
  { n: 'Moskau',       lat:  55.7, lng:  37.6 },
  { n: 'Peking',       lat:  39.9, lng: 116.4 },
  { n: 'Tokio',        lat:  35.7, lng: 139.7 },
  { n: 'New York',     lat:  40.7, lng: -74.0 },
  { n: 'São Paulo',    lat: -23.5, lng: -46.6 },
  { n: 'Mumbai',       lat:  19.1, lng:  72.9 },
  { n: 'Lagos',        lat:   6.5, lng:   3.4 },
  { n: 'Sydney',       lat: -33.9, lng: 151.2 },
  { n: 'Seoul',        lat:  37.6, lng: 127.0 },
  { n: 'Singapur',     lat:   1.3, lng: 103.8 },
  { n: 'Toronto',      lat:  43.7, lng: -79.4 },
  { n: 'Dubai',        lat:  25.2, lng:  55.3 },
  { n: 'Johannesburg', lat: -26.2, lng:  28.0 },
  { n: 'Mexiko-Stadt', lat:  19.4, lng: -99.1 },
  { n: 'Istanbul',     lat:  41.0, lng:  28.9 },
  { n: 'Buenos Aires', lat: -34.6, lng: -58.4 },
  { n: 'Kairo',        lat:  30.1, lng:  31.2 },
];

const globeWrap = document.getElementById('globe-container');
const canvas    = document.createElement('canvas');
canvas.style.position = 'absolute';
canvas.style.top      = '0';
canvas.style.left     = '0';
globeWrap.appendChild(canvas);
const ctx = canvas.getContext('2d');
let W, H;

function resize() {
  W = canvas.width  = globeWrap.clientWidth;
  H = canvas.height = globeWrap.clientHeight;
}
resize();
new ResizeObserver(resize).observe(globeWrap);

/* === Theme-Helfer: Karte funktioniert jetzt auch im Hellmodus === */
function isLightMode() {
  return document.body.classList.contains('light-mode');
}

function mapPalette() {
  return isLightMode()
    ? {
        ocean1: '#eef3fb', ocean2: '#dde6f3',
        grid: 'rgba(20,70,140,0.10)',
        land: 'rgba(170,195,225,0.95)',
        landStroke: 'rgba(40,100,180,0.45)',
        cityDot: 'rgba(25,90,180,0.85)',
        cityLabel: 'rgba(30,70,130,0.65)',
        loading: 'rgba(40,100,180,0.55)',
        starColor: 0x9fb6d9, starOpacity: 0.35,
        cityMarkerColor: 0x1e5ab4,
        atmosphereColor: 0x3a7fd9, atmosphereOpacity: 0.14,
      }
    : {
        ocean1: '#060e1f', ocean2: '#050a14',
        grid: 'rgba(55,138,221,0.06)',
        land: 'rgba(25,52,95,0.75)',
        landStroke: 'rgba(55,138,221,0.35)',
        cityDot: 'rgba(120,190,255,0.7)',
        cityLabel: 'rgba(160,200,255,0.5)',
        loading: 'rgba(100,160,255,0.3)',
        starColor: 0xbfd4ff, starOpacity: 0.7,
        cityMarkerColor: 0x78bcff,
        atmosphereColor: 0x4fb6ff, atmosphereOpacity: 0.10,
      };
}

function project(lat, lng) {
  return {
    x: ((lng + 180) / 360) * W,
    y: ((90  - lat)  / 180) * H,
  };
}

let geoReady = false;
let geoData  = null;

fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
  .then(r => r.json())
  .then(topo => {
    // TopoJSON → GeoJSON mit inline-Decoder (kein extra lib nötig)
    geoData  = topoToFeatures(topo);
    geoReady = true;
  });

function topoToFeatures(topo) {
  const land = topo.objects.countries;
  const arcs = topo.arcs;

  function decodeArc(i) {
    let reversed = false;
    if (i < 0) { i = ~i; reversed = true; }
    let pts = [];
    let x = 0, y = 0;
    for (const [dx, dy] of arcs[i]) {
      x += dx; y += dy;
      pts.push([x, y]);
    }
    if (reversed) pts.reverse();
    return pts;
  }

  function scalePoint([px, py]) {
    const [sx, sy] = topo.transform.scale;
    const [tx, ty] = topo.transform.translate;
    return [px * sx + tx, py * sy + ty]; // [lng, lat]
  }

  const features = [];
  for (const geom of land.geometries) {
    const polys = [];
    const type  = geom.type;

    const rawArcs = type === 'Polygon'      ? [geom.arcs]
                  : type === 'MultiPolygon' ?  geom.arcs
                  : [];

    for (const polygon of rawArcs) {
      const rings = polygon.map(ring =>
        ring.flatMap(i => decodeArc(i)).map(scalePoint)
      );
      polys.push(rings);
    }
    features.push({ type, polys });
  }
  return features;
}

function drawMap() {
  const pal = mapPalette();
  ctx.clearRect(0, 0, W, H);

  const ocean = ctx.createLinearGradient(0, 0, 0, H);
  ocean.addColorStop(0, pal.ocean1);
  ocean.addColorStop(1, pal.ocean2);
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = pal.grid;
  ctx.lineWidth   = 0.5;
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * H;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  for (let lng = -150; lng <= 180; lng += 30) {
    const x = ((lng + 180) / 360) * W;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }

  if (!geoReady) {
    ctx.fillStyle = pal.loading;
    ctx.font = '14px Courier New';
    ctx.fillText('Karte wird geladen…', W / 2 - 80, H / 2);
    return;
  }

  ctx.fillStyle   = pal.land;
  ctx.strokeStyle = pal.landStroke;
  ctx.lineWidth   = 0.5;

  for (const feat of geoData) {
    for (const rings of feat.polys) {
      ctx.beginPath();
      for (let r = 0; r < rings.length; r++) {
        const ring = rings[r];
        for (let i = 0; i < ring.length; i++) {
          const [lng, lat] = ring[i];
          const p = project(lat, lng);
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();
    }
  }

  CITIES.forEach(c => {
    const p = project(c.lat, c.lng);
    ctx.fillStyle = pal.cityDot;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.cityLabel;
    ctx.font = '8px Courier New';
    ctx.fillText(c.n, p.x + 4, p.y + 3);
  });
}

function drawArcs() {
  arcs.forEach(a => {
    if (activeFilter !== 'all' && a.type !== activeFilter) return;
    const pF  = project(a.from.lat, a.from.lng);
    const pT  = project(a.to.lat,   a.to.lng);
    const midX = (pF.x + pT.x) / 2;
    const midY = (pF.y + pT.y) / 2 - Math.hypot(pT.x - pF.x, pT.y - pF.y) * 0.35;
    const col  = COLORS[a.type];

    ctx.save();
    ctx.globalAlpha = a.fade * (a.isCrit ? 0.95 : 0.6);
    ctx.strokeStyle = col;
    ctx.lineWidth   = a.isCrit ? 1.6 : 0.8;
    ctx.shadowColor = col;
    ctx.shadowBlur  = a.isCrit ? 10 : 4;

    ctx.beginPath();
    for (let i = 0; i <= 60 * a.progress; i++) {
      const s  = i / 60;
      const bx = (1-s)*(1-s)*pF.x + 2*(1-s)*s*midX + s*s*pT.x;
      const by = (1-s)*(1-s)*pF.y + 2*(1-s)*s*midY + s*s*pT.y;
      i === 0 ? ctx.moveTo(bx, by) : ctx.lineTo(bx, by);
    }
    ctx.stroke();

    if (a.progress > 0.88) {
      const t  = a.progress;
      const hx = (1-t)*(1-t)*pF.x + 2*(1-t)*t*midX + t*t*pT.x;
      const hy = (1-t)*(1-t)*pF.y + 2*(1-t)*t*midY + t*t*pT.y;
      ctx.fillStyle = col; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(hx, hy, a.isCrit ? 5 : 3, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  });
}

let arcs         = [];
let activeFilter = 'all';
let speed        = 2;
let stats        = { total: 0, crit: 0, ddos: 0, phish: 0 };
let sourceCount  = {};

function spawnAttack() {
  const from = CITIES[Math.floor(Math.random() * CITIES.length)];
  let to;
  do { to = CITIES[Math.floor(Math.random() * CITIES.length)]; } while (to === from);
  const type   = ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)];
  const isCrit = Math.random() < 0.18;
  arcs.push({ from, to, type, isCrit, progress: 0, fade: 1, done: false });
  stats.total++;
  if (isCrit)              stats.crit++;
  if (type === 'DDoS')     stats.ddos++;
  if (type === 'Phishing') stats.phish++;
  sourceCount[from.n] = (sourceCount[from.n] || 0) + 1;
  addLog(type, from.n, to.n, isCrit);
  updateStats();
  updateSources();
}

function updateStats() {
  const bump = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val;
    el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 200);
  };
  bump('total-attacks',    stats.total);
  bump('critical-attacks', stats.crit);
  bump('ddos-count',       stats.ddos);
  bump('phish-count',      stats.phish);
}

const BAR_COLORS = ['#378add','#e24b4a','#ef9f27','#1d9e75','#d4537e'];

function updateSources() {
  const sorted = Object.entries(sourceCount).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const max = sorted[0]?.[1] || 1;
  const el  = document.getElementById('top-sources');
  if (!el) return;
  el.innerHTML = sorted.map(([city,cnt],i) => `
    <div class="bar-row">
      <span class="bar-label">${city}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width:${Math.round(cnt/max*100)}%;background:${BAR_COLORS[i%5]}"></div>
      </div>
      <span class="bar-count">${cnt}</span>
    </div>`).join('');
}

let logs = [];
function addLog(type, from, to, isCrit) {
  const now  = new Date();
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':');
  logs.unshift({ time, type, from, to, isCrit });
  if (logs.length > 20) logs.pop();

  const html = logs.map(l => `
    <div class="log-entry">
      <span class="log-time">${l.time}</span>
      <span class="log-tag ${l.isCrit ? 'crit' : 'info'}">[${l.type}]</span>
      <span class="log-text">${l.from} → ${l.to}</span>
    </div>`).join('');

  const preview = document.getElementById('log-content');
  if (preview) preview.innerHTML = logs.slice(0, 1).map(l => `
    <div class="log-entry" style="opacity:1">
      <span class="log-time">${l.time}</span>
      <span class="log-tag ${l.isCrit ? 'crit' : 'info'}">[${l.type}]</span>
      <span class="log-text">${l.from} → ${l.to}</span>
    </div>`).join('');

  // Ausgeklappter Log
  const expanded = document.getElementById('log-content-expanded');
  if (expanded) expanded.innerHTML = html;
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.type;
  });
});

const speedSlider = document.getElementById('speed-slider');
const speedLabel  = document.getElementById('speed-label');
if (speedSlider) {
  speedSlider.addEventListener('input', () => {
    speed = Number(speedSlider.value);
    if (speedLabel) speedLabel.textContent = `×${speed}`;
  });
}

let lastSpawn = 0;
function loop(ts) {
  if (ts - lastSpawn > 1600 / speed) { spawnAttack(); lastSpawn = ts; }
  arcs.forEach(a => {
    if (a.progress < 1) a.progress = Math.min(1, a.progress + 0.006 * speed);
    else { a.fade -= 0.007 * speed; if (a.fade <= 0) a.done = true; }
  });
  arcs = arcs.filter(a => !a.done);

  if (viewMode === '3d') {
    renderGlobe3D();
  } else {
    drawMap();
    drawArcs();
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
const logCard = document.getElementById('log-card');
if (logCard) {
  logCard.addEventListener('click', () => {
    logCard.classList.toggle('open');
  });
}

/* =========================================================
   2D / 3D – UMSCHALTER
   Alle Daten (Angriffe, Statistik, Filter, Tempo, Log) bleiben
   exakt gleich – nur die Darstellung (Canvas-Karte vs. Three.js-
   Globus) wird getauscht.
   ========================================================= */

let viewMode = '2d'; // '2d' | '3d'
const viewToggleBtn = document.getElementById('view-toggle-btn');

function updateToggleLabel(loadingLabel) {
  if (!viewToggleBtn) return;
  const icon  = viewToggleBtn.querySelector('.vt-icon');
  const label = viewToggleBtn.querySelector('.vt-label');
  if (loadingLabel) {
    if (label) label.textContent = loadingLabel;
    return;
  }
  if (viewMode === '2d') {
    if (icon)  icon.textContent  = '🌐';
    if (label) label.textContent = '3D-Globus';
  } else {
    if (icon)  icon.textContent  = '🗺️';
    if (label) label.textContent = '2D-Karte';
  }
  viewToggleBtn.setAttribute('aria-pressed', viewMode === '3d' ? 'true' : 'false');
}

function setViewMode(mode) {
  if (mode === viewMode) return;

  if (mode === '2d') {
    viewMode = '2d';
    canvas.style.display = 'block';
    if (canvas3d) canvas3d.style.display = 'none';
    updateToggleLabel();
    return;
  }

  if (viewToggleBtn) {
    viewToggleBtn.disabled = true;
    updateToggleLabel('Lädt 3D…');
  }

  initGlobe3D()
    .then(() => {
      viewMode = '3d';
      canvas.style.display = 'none';
      canvas3d.style.display = 'block';
      resize3D();
    })
    .catch(err => {
      console.error('3D-Globus konnte nicht geladen werden:', err);
      viewMode = '2d';
      canvas.style.display = 'block';
    })
    .finally(() => {
      if (viewToggleBtn) viewToggleBtn.disabled = false;
      updateToggleLabel();
    });
}

if (viewToggleBtn) {
  updateToggleLabel();
  viewToggleBtn.addEventListener('click', () => {
    setViewMode(viewMode === '2d' ? '3d' : '2d');
  });
}

/* =========================================================
   3D-GLOBUS (Three.js, wird erst beim ersten Umschalten
   dynamisch nachgeladen)
   ========================================================= */

const THREE_CDN_URL = 'https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js';
const GLOBE_R = 5;

let THREE = null;
let threeLoadPromise = null;

let globe3dInited = false;
let canvas3d, renderer3d, scene3d, camera3d, globeGroup;
let earthMesh, atmosphereMesh, arcsGroup, starPoints, starMat;
let cityMarkers = [];
let globeTexture = null;
let texturedWithCountries = false;
let lastThemeForTexture = null;

let isDragging3d = false, lastPX = 0, lastPY = 0;
let targetRotY = 0.4, targetRotX = -0.18;

function ensureThree() {
  if (!threeLoadPromise) {
    threeLoadPromise = import(THREE_CDN_URL).then(mod => { THREE = mod; });
  }
  return threeLoadPromise;
}

function latLngToVec3(lat, lng, r) {
  const phi   = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

function buildArcCurve(from, to) {
  const start = latLngToVec3(from.lat, from.lng, GLOBE_R * 1.002);
  const end   = latLngToVec3(to.lat,   to.lng,   GLOBE_R * 1.002);
  const dist  = start.distanceTo(end);
  const mid   = start.clone().add(end).multiplyScalar(0.5);
  mid.setLength(GLOBE_R + dist * 0.55);
  return new THREE.QuadraticBezierCurve3(start, mid, end);
}

const TEX_W = 2048, TEX_H = 1024;

function buildGlobeTextureCanvas() {
  const pal = mapPalette();
  const c   = document.createElement('canvas');
  c.width   = TEX_W;
  c.height  = TEX_H;
  const g   = c.getContext('2d');

  const ocean = g.createLinearGradient(0, 0, 0, TEX_H);
  ocean.addColorStop(0, pal.ocean1);
  ocean.addColorStop(1, pal.ocean2);
  g.fillStyle = ocean;
  g.fillRect(0, 0, TEX_W, TEX_H);

  g.strokeStyle = pal.grid;
  g.lineWidth   = 1;
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * TEX_H;
    g.beginPath(); g.moveTo(0, y); g.lineTo(TEX_W, y); g.stroke();
  }
  for (let lng = -150; lng <= 180; lng += 30) {
    const x = ((lng + 180) / 360) * TEX_W;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, TEX_H); g.stroke();
  }

  if (geoReady && geoData) {
    g.fillStyle   = pal.land;
    g.strokeStyle = pal.landStroke;
    g.lineWidth   = 1;
    for (const feat of geoData) {
      for (const rings of feat.polys) {
        g.beginPath();
        for (const ring of rings) {
          for (let i = 0; i < ring.length; i++) {
            const [lng, lat] = ring[i];
            const x = ((lng + 180) / 360) * TEX_W;
            const y = ((90  - lat) / 180) * TEX_H;
            i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
          }
          g.closePath();
        }
        g.fill();
        g.stroke();
      }
    }
  }

  return c;
}

function rebuildGlobeTexture() {
  const cnv = buildGlobeTextureCanvas();
  if (globeTexture) globeTexture.dispose();
  globeTexture = new THREE.CanvasTexture(cnv);
  if (THREE.SRGBColorSpace) globeTexture.colorSpace = THREE.SRGBColorSpace;
  earthMesh.material.map = globeTexture;
  earthMesh.material.needsUpdate = true;
  texturedWithCountries = geoReady;
  lastThemeForTexture   = isLightMode();
}

function buildCityMarkers() {
  const pal = mapPalette();
  cityMarkers.forEach(m => { m.geometry.dispose(); m.material.dispose(); });
  cityMarkers = [];
  CITIES.forEach(c => {
    const pos = latLngToVec3(c.lat, c.lng, GLOBE_R * 1.006);
    const geo = new THREE.SphereGeometry(0.045, 10, 10);
    const mat = new THREE.MeshBasicMaterial({
      color: pal.cityMarkerColor, transparent: true, opacity: 0.85,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    globeGroup.add(mesh);
    cityMarkers.push(mesh);
  });
}

function buildStarfield() {
  const pal   = mapPalette();
  const count = 600;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r     = 40 + Math.random() * 40;
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos((Math.random() * 2) - 1);
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starMat = new THREE.PointsMaterial({
    color: pal.starColor, size: 0.12, transparent: true, opacity: pal.starOpacity,
  });
  starPoints = new THREE.Points(geo, starMat);
  scene3d.add(starPoints);
}

function setupDragControls() {
  canvas3d.addEventListener('pointerdown', e => {
    isDragging3d = true;
    lastPX = e.clientX; lastPY = e.clientY;
    canvas3d.style.cursor = 'grabbing';
    canvas3d.setPointerCapture(e.pointerId);
  });
  canvas3d.addEventListener('pointermove', e => {
    if (!isDragging3d) return;
    const dx = e.clientX - lastPX, dy = e.clientY - lastPY;
    lastPX = e.clientX; lastPY = e.clientY;
    targetRotY += dx * 0.006;
    targetRotX = Math.max(-1.1, Math.min(1.1, targetRotX + dy * 0.006));
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt =>
    canvas3d.addEventListener(evt, () => {
      isDragging3d = false;
      canvas3d.style.cursor = 'grab';
    })
  );
}

function resize3D() {
  if (!renderer3d) return;
  const w = Math.max(1, globeWrap.clientWidth);
  const h = Math.max(1, globeWrap.clientHeight);
  renderer3d.setSize(w, h, false);
  camera3d.aspect = w / h;

  const fovRad = camera3d.fov * Math.PI / 180;
  const distH  = (GLOBE_R * 1.15) / Math.tan(fovRad / 2);
  const distW  = (GLOBE_R * 1.15) / (Math.tan(fovRad / 2) * camera3d.aspect);
  camera3d.position.z = Math.max(distH, distW);
  camera3d.updateProjectionMatrix();
}

function initGlobe3D() {
  if (globe3dInited) return Promise.resolve();

  return ensureThree().then(() => {
    canvas3d = document.createElement('canvas');
    canvas3d.id = 'globe-3d-canvas';
    canvas3d.style.position = 'absolute';
    canvas3d.style.top      = '0';
    canvas3d.style.left     = '0';
    canvas3d.style.cursor   = 'grab';
    canvas3d.style.display  = 'none';
    globeWrap.appendChild(canvas3d);

    scene3d  = new THREE.Scene();
    camera3d = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    camera3d.position.set(0, 0, 14);

    renderer3d = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true, alpha: true });
    renderer3d.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    scene3d.add(new THREE.AmbientLight(0xffffff, 0.65));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(6, 4, 8);
    scene3d.add(dirLight);

    globeGroup = new THREE.Group();
    scene3d.add(globeGroup);

    const texCanvas = buildGlobeTextureCanvas();
    globeTexture = new THREE.CanvasTexture(texCanvas);
    if (THREE.SRGBColorSpace) globeTexture.colorSpace = THREE.SRGBColorSpace;
    texturedWithCountries = geoReady;
    lastThemeForTexture   = isLightMode();

    const earthGeo = new THREE.SphereGeometry(GLOBE_R, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({ map: globeTexture, shininess: 8 });
    earthMesh = new THREE.Mesh(earthGeo, earthMat);
    globeGroup.add(earthMesh);

    const pal = mapPalette();
    const atmoGeo = new THREE.SphereGeometry(GLOBE_R * 1.035, 64, 64);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: pal.atmosphereColor, transparent: true,
      opacity: pal.atmosphereOpacity, side: THREE.BackSide,
    });
    atmosphereMesh = new THREE.Mesh(atmoGeo, atmoMat);
    globeGroup.add(atmosphereMesh);

    arcsGroup = new THREE.Group();
    globeGroup.add(arcsGroup);

    buildCityMarkers();
    buildStarfield();
    setupDragControls();
    resize3D();

    new ResizeObserver(() => resize3D()).observe(globeWrap);

    globe3dInited = true;
  });
}

function clearGroup(group) {
  for (let i = group.children.length - 1; i >= 0; i--) {
    const obj = group.children[i];
    group.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  }
}

function refreshGlobeThemeIfNeeded() {
  const light = isLightMode();
  if (light === lastThemeForTexture) return;

  rebuildGlobeTexture();
  const pal = mapPalette();

  if (starMat) {
    starMat.color.set(pal.starColor);
    starMat.opacity = pal.starOpacity;
  }
  if (atmosphereMesh) {
    atmosphereMesh.material.color.set(pal.atmosphereColor);
    atmosphereMesh.material.opacity = pal.atmosphereOpacity;
  }
  cityMarkers.forEach(m => m.material.color.set(pal.cityMarkerColor));
}

function renderGlobe3D() {
  if (!globe3dInited) return;

  if (!texturedWithCountries && geoReady) rebuildGlobeTexture();
  refreshGlobeThemeIfNeeded();

  if (!isDragging3d) targetRotY += 0.0008 * speed;
  globeGroup.rotation.y = targetRotY;
  globeGroup.rotation.x = targetRotX;

  clearGroup(arcsGroup);
  const totalPts = 48;

  arcs.forEach(a => {
    if (activeFilter !== 'all' && a.type !== activeFilter) return;
    if (!a._curve3d) a._curve3d = buildArcCurve(a.from, a.to);

    const col = COLORS[a.type];
    const n   = Math.max(2, Math.round(totalPts * a.progress));
    const pts = a._curve3d.getPoints(totalPts).slice(0, n + 1);

    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: col, transparent: true,
      opacity: a.fade * (a.isCrit ? 0.95 : 0.6),
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    arcsGroup.add(new THREE.Line(geo, mat));

    if (a.progress > 0.88) {
      const headGeo = new THREE.SphereGeometry(a.isCrit ? 0.09 : 0.05, 8, 8);
      const headMat = new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: a.fade,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.position.copy(pts[pts.length - 1]);
      arcsGroup.add(headMesh);
    }
  });

  renderer3d.render(scene3d, camera3d);
}