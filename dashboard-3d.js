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