/* ---------- Konfiguration ---------- */
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

/* ---------- Canvas ---------- */
const globeWrap = document.getElementById('globe-container');
const canvas    = document.createElement('canvas');
globeWrap.appendChild(canvas);
const ctx = canvas.getContext('2d');
let W, H;

function resize() {
  W = canvas.width  = globeWrap.clientWidth;
  H = canvas.height = globeWrap.clientHeight;
}
resize();
new ResizeObserver(resize).observe(globeWrap);

/* ---------- Projektion ---------- */
function project(lat, lng) {
  return {
    x: ((lng + 180) / 360) * W,
    y: ((90  - lat)  / 180) * H,
  };
}

/* ---------- GeoJSON laden & zeichnen ---------- */
let geoReady = false;
let geoData  = null;

fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
  .then(r => r.json())
  .then(topo => {
    // TopoJSON → GeoJSON mit inline-Decoder (kein extra lib nötig)
    geoData  = topoToFeatures(topo);
    geoReady = true;
  });

/* ---- Minimaler TopoJSON-Decoder ---- */
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
  ctx.clearRect(0, 0, W, H);

  // Ozean
  const ocean = ctx.createLinearGradient(0, 0, 0, H);
  ocean.addColorStop(0, '#060e1f');
  ocean.addColorStop(1, '#050a14');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, W, H);

  // Gitter
  ctx.strokeStyle = 'rgba(55,138,221,0.06)';
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
    ctx.fillStyle = 'rgba(100,160,255,0.3)';
    ctx.font = '14px Courier New';
    ctx.fillText('Karte wird geladen…', W / 2 - 80, H / 2);
    return;
  }

  // Länder
  ctx.fillStyle   = 'rgba(25, 52, 95, 0.75)';
  ctx.strokeStyle = 'rgba(55, 138, 221, 0.35)';
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

  // Stadtpunkte + Labels
  CITIES.forEach(c => {
    const p = project(c.lat, c.lng);
    ctx.fillStyle = 'rgba(120,190,255,0.7)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,200,255,0.5)';
    ctx.font = '8px Courier New';
    ctx.fillText(c.n, p.x + 4, p.y + 3);
  });
}

/* ---------- Bögen ---------- */
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

/* ---------- Zustand ---------- */
let arcs         = [];
let activeFilter = 'all';
let speed        = 2;
let stats        = { total: 0, crit: 0, ddos: 0, phish: 0 };
let sourceCount  = {};

/* ---------- Angriff spawnen ---------- */
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

  // Vorschau (nur letzte Zeile)
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

/* ---------- Events ---------- */
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

/* ---------- Loop ---------- */
let lastSpawn = 0;
function loop(ts) {
  if (ts - lastSpawn > 1600 / speed) { spawnAttack(); lastSpawn = ts; }
  arcs.forEach(a => {
    if (a.progress < 1) a.progress = Math.min(1, a.progress + 0.006 * speed);
    else { a.fade -= 0.007 * speed; if (a.fade <= 0) a.done = true; }
  });
  arcs = arcs.filter(a => !a.done);
  drawMap();
  drawArcs();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
// Log-Card aufklappen/zuklappen
const logCard = document.getElementById('log-card');
if (logCard) {
  logCard.addEventListener('click', () => {
    logCard.classList.toggle('open');
  });
}