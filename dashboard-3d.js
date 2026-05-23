/* ============================================================
   COMMIT 3 — dashboard-3d.js  (erste Hälfte)
   Komplett ersetzen. Enthält:
     - Städte & Angriffsdaten
     - Globus-Rendering (Canvas 2D, kein Three.js mehr nötig)
     - Bogen-Animationen (Angriffspfeile)
   ============================================================ */

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
  { n: 'Berlin',      lat: 52.5,  lng:  13.4 },
  { n: 'London',      lat: 51.5,  lng:  -0.1 },
  { n: 'Paris',       lat: 48.9,  lng:   2.3 },
  { n: 'Moskau',      lat: 55.7,  lng:  37.6 },
  { n: 'Peking',      lat: 39.9,  lng: 116.4 },
  { n: 'Tokio',       lat: 35.7,  lng: 139.7 },
  { n: 'New York',    lat: 40.7,  lng: -74.0 },
  { n: 'São Paulo',   lat: -23.5, lng: -46.6 },
  { n: 'Mumbai',      lat: 19.1,  lng:  72.9 },
  { n: 'Lagos',       lat:  6.5,  lng:   3.4 },
  { n: 'Sydney',      lat: -33.9, lng: 151.2 },
  { n: 'Seoul',       lat: 37.6,  lng: 127.0 },
  { n: 'Singapur',    lat:  1.3,  lng: 103.8 },
  { n: 'Toronto',     lat: 43.7,  lng: -79.4 },
  { n: 'Dubai',       lat: 25.2,  lng:  55.3 },
  { n: 'Johannesburg',lat: -26.2, lng:  28.0 },
  { n: 'Mexiko-Stadt',lat: 19.4,  lng: -99.1 },
  { n: 'Istanbul',    lat: 41.0,  lng:  28.9 },
];

/* ---------- Canvas-Setup ---------- */
const globeWrap  = document.getElementById('globe-container');
const canvas     = document.createElement('canvas');
globeWrap.appendChild(canvas);
const ctx        = canvas.getContext('2d');

let W, H, cx, cy, R;

function resize() {
  W  = canvas.width  = globeWrap.clientWidth;
  H  = canvas.height = globeWrap.clientHeight;
  cx = W / 2;
  cy = H / 2;
  R  = Math.min(W, H) * 0.42;
}
resize();
new ResizeObserver(resize).observe(globeWrap);

/* ---------- Zustand ---------- */
let rotAngle    = 0;
let arcs        = [];
let activeFilter = 'all';
let speed       = 2;
let stats       = { total: 0, crit: 0, ddos: 0, phish: 0 };
let sourceCount = {};

/* ---------- Projektion ---------- */
function latLngTo3D(lat, lng, r) {
  const phi   = (90 - lat)  * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;
  return {
    x: -r * Math.sin(phi) * Math.cos(theta),
    y:  r * Math.cos(phi),
    z:  r * Math.sin(phi) * Math.sin(theta),
  };
}

function project(lat, lng) {
  const pt = latLngTo3D(lat, lng + rotAngle * (180 / Math.PI), R);
  const p  = (R * 2.2) / (R * 2.2 + pt.z);
  return {
    x:   cx + pt.x * p,
    y:   cy - pt.y * p,
    vis: pt.z < R * 0.25,
  };
}

/* ---------- Globus zeichnen ---------- */
function drawGlobe() {
  ctx.clearRect(0, 0, W, H);

  /* Hintergrund */
  const grad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R);
  grad.addColorStop(0, '#12213a');
  grad.addColorStop(1, '#050a15');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  /* Gitterlinien */
  ctx.strokeStyle = 'rgba(55, 138, 221, 0.1)';
  ctx.lineWidth   = 0.5;

  for (let lat = -75; lat <= 75; lat += 15) {
    ctx.beginPath();
    let first = true;
    for (let lng = -180; lng <= 180; lng += 4) {
      const p = project(lat, lng);
      if (!p.vis) { first = true; continue; }
      first ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      first = false;
    }
    ctx.stroke();
  }

  for (let lng = -165; lng <= 180; lng += 15) {
    ctx.beginPath();
    let first = true;
    for (let lat = -85; lat <= 85; lat += 4) {
      const p = project(lat, lng);
      if (!p.vis) { first = true; continue; }
      first ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      first = false;
    }
    ctx.stroke();
  }

  /* Stadtpunkte */
  CITIES.forEach(c => {
    const p = project(c.lat, c.lng);
    if (!p.vis) return;
    ctx.fillStyle = 'rgba(100, 180, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  });
}

/* ---------- Bögen zeichnen ---------- */
function drawArcs() {
  arcs.forEach(a => {
    if (activeFilter !== 'all' && a.type !== activeFilter) return;

    const pF  = project(a.from.lat, a.from.lng);
    const pT  = project(a.to.lat,   a.to.lng);
    if (!pF.vis && !pT.vis) return;

    const midY = Math.min(pF.y, pT.y) - 50 - Math.abs(pF.x - pT.x) * 0.2;
    const mid  = { x: (pF.x + pT.x) / 2, y: midY };
    const col  = COLORS[a.type];

    ctx.save();
    ctx.globalAlpha = a.fade * (a.isCrit ? 0.95 : 0.65);
    ctx.strokeStyle = col;
    ctx.lineWidth   = a.isCrit ? 1.8 : 0.9;
    ctx.shadowColor = col;
    ctx.shadowBlur  = a.isCrit ? 10 : 4;

    /* Bogen bis zum aktuellen Fortschritt */
    ctx.beginPath();
    const steps = 50;
    for (let i = 0; i <= steps * a.progress; i++) {
      const s  = i / steps;
      const bx = (1 - s) * (1 - s) * pF.x + 2 * (1 - s) * s * mid.x + s * s * pT.x;
      const by = (1 - s) * (1 - s) * pF.y + 2 * (1 - s) * s * mid.y + s * s * pT.y;
      i === 0 ? ctx.moveTo(bx, by) : ctx.lineTo(bx, by);
    }
    ctx.stroke();

    /* Leuchtpunkt am Einschlag */
    if (a.progress > 0.88) {
      const t  = a.progress;
      const hx = (1 - t) * (1 - t) * pF.x + 2 * (1 - t) * t * mid.x + t * t * pT.x;
      const hy = (1 - t) * (1 - t) * pF.y + 2 * (1 - t) * t * mid.y + t * t * pT.y;
      ctx.fillStyle  = col;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(hx, hy, a.isCrit ? 5.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}
/* ============================================================
   COMMIT 4 — dashboard-3d.js  (zweite Hälfte)
   Direkt unter den Code aus Commit 3 anhängen. Enthält:
     - Angriff spawnen + Statistiken updaten
     - Log-Stream
     - Top-Quellen Balkendiagramm
     - Event Listener (Filter, Speed, Theme)
     - Animations-Loop
   ============================================================ */

/* ---------- Angriff spawnen ---------- */
function spawnAttack() {
  const from = CITIES[Math.floor(Math.random() * CITIES.length)];
  let to;
  do { to = CITIES[Math.floor(Math.random() * CITIES.length)]; } while (to === from);

  const type   = ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)];
  const isCrit = Math.random() < 0.18;

  arcs.push({ from, to, type, isCrit, progress: 0, fade: 1, done: false });

  stats.total++;
  if (isCrit)          stats.crit++;
  if (type === 'DDoS') stats.ddos++;
  if (type === 'Phishing') stats.phish++;

  sourceCount[from.n] = (sourceCount[from.n] || 0) + 1;

  addLog(type, from.n, to.n, isCrit);
  updateStats();
  updateSources();
}

/* ---------- Statistik-Zahlen ---------- */
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

/* ---------- Top-Quellen Balken ---------- */
const BAR_COLORS = ['#378add', '#e24b4a', '#ef9f27', '#1d9e75', '#d4537e'];

function updateSources() {
  const sorted = Object.entries(sourceCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const max = sorted[0]?.[1] || 1;

  const container = document.getElementById('top-sources');
  if (!container) return;

  container.innerHTML = sorted.map(([city, cnt], i) => `
    <div class="bar-row">
      <span class="bar-label">${city}</span>
      <div class="bar-track">
        <div class="bar-fill"
             style="width:${Math.round((cnt / max) * 100)}%;
                    background:${BAR_COLORS[i % BAR_COLORS.length]}">
        </div>
      </div>
      <span class="bar-count">${cnt}</span>
    </div>`
  ).join('');
}

/* ---------- System-Log ---------- */
const LOG_MAX = 8;
let logs = [];

function addLog(type, from, to, isCrit) {
  const now  = new Date();
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join(':');

  logs.unshift({ time, type, from, to, isCrit });
  if (logs.length > LOG_MAX) logs.pop();

  const container = document.getElementById('log-content');
  if (!container) return;

  container.innerHTML = logs.map(l => `
    <div class="log-entry">
      <span class="log-time">${l.time}</span>
      <span class="log-tag ${l.isCrit ? 'crit' : 'info'}">[${l.type}]</span>
      <span class="log-text">${l.from} → ${l.to}</span>
    </div>`
  ).join('');
}

/* ---------- Filter-Buttons ---------- */
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.type;
  });
});

/* ---------- Speed-Slider ---------- */
const speedSlider = document.getElementById('speed-slider');
const speedLabel  = document.getElementById('speed-label');

if (speedSlider) {
  speedSlider.addEventListener('input', () => {
    speed = Number(speedSlider.value);
    if (speedLabel) speedLabel.textContent = `×${speed}`;
  });
}

/* ---------- Animations-Loop ---------- */
let lastSpawn = 0;

function loop(ts) {
  rotAngle += 0.0003 * speed;

  /* Neuen Angriff spawnen */
  if (ts - lastSpawn > 1800 / speed) {
    spawnAttack();
    lastSpawn = ts;
  }

  /* Bögen animieren */
  arcs.forEach(a => {
    if (a.progress < 1) {
      a.progress = Math.min(1, a.progress + 0.007 * speed);
    } else {
      a.fade -= 0.008 * speed;
      if (a.fade <= 0) a.done = true;
    }
  });
  arcs = arcs.filter(a => !a.done);

  drawGlobe();
  drawArcs();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);