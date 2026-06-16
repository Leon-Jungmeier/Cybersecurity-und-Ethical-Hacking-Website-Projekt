const passwordInput = document.getElementById('pw-input');
const strengthBar = document.getElementById('strength-bar');
const strengthGlow = document.getElementById('strength-bar-glow');
const statusVal = document.getElementById('status-val');
const statusIndicator = document.getElementById('status-indicator');

function calcBruteForceTime(password) {
    if (!password || password.length === 0) return null;

    let charset = 0;
    if (/[a-z]/.test(password)) charset += 26;
    if (/[A-Z]/.test(password)) charset += 26;
    if (/[0-9]/.test(password)) charset += 10;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) charset += 32;
    if (/[äöüÄÖÜß€£¥©®™°µ¶]/.test(password)) charset += 20; // Sondergewichtung

    const attemptsPerSecond = 1e11;
    const combinations = Math.pow(charset, password.length);
    const secondsMax = combinations / attemptsPerSecond;

    return { time: formatTime(secondsMax), charset, combinations };
}

function formatTime(seconds) {
    if (seconds < 1) return "< 1 Sekunde";
    if (seconds < 60) return `${Math.round(seconds)} Sekunden`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} Minuten`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} Stunden`;
    if (seconds < 2592000) return `${Math.round(seconds / 86400)} Tage`;
    if (seconds < 31536000) return `${Math.round(seconds / 2592000)} Monate`;

    const years = seconds / 31536000;
    if (years < 1e3) return `${Math.round(years)} Jahre`;
    if (years < 1e6) return `${(years / 1e3).toFixed(1)} Tausend Jahre`;
    if (years < 1e9) return `${(years / 1e6).toFixed(1)} Millionen Jahre`;
    if (years < 1e12) return `${(years / 1e9).toFixed(1)} Milliarden Jahre`;
    if (years < 1e15) return `${(years / 1e12).toFixed(1)} Billionen Jahre`;
    return `${years.toExponential(2)} Jahre`;
}

function getTimeColor(timeStr) {
    if (timeStr.includes("Sekunde") || timeStr.includes("Minuten")) return "#e63946";
    if (timeStr.includes("Stunden") || timeStr.includes("Tage") || timeStr.includes("Monate")) return "#ffb703";
    return "#00d4ff";
}

function updateBruteForceDisplay(password) {
    let display = document.getElementById('brute-force-display');

    if (!display) {
        display = document.createElement('div');
        display.id = 'brute-force-display';
        display.style.cssText = `
            margin-top: 16px;
            padding: 12px 16px;
            background: rgba(0, 212, 255, 0.05);
            border: 1px solid rgba(0, 212, 255, 0.2);
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.78rem;
            color: rgba(255,255,255,0.6);
            letter-spacing: 0.05em;
        `;
        const inputContainer = document.querySelector('.input-container');
        if (inputContainer) inputContainer.appendChild(display);
    }

    if (!password) {
        display.innerHTML = '';
        return;
    }

    const result = calcBruteForceTime(password);
    if (!result) return;

    const { time, charset, combinations } = result;
    const color = getTimeColor(time);

    // Zeige welche Zeichenklassen aktiv sind
    const activeClasses = [];
    if (/[a-z]/.test(password)) activeClasses.push('<span style="color:#aaa">a–z</span> <span style="color:rgba(255,255,255,0.3)">(+26)</span>');
    if (/[A-Z]/.test(password)) activeClasses.push('<span style="color:#fff">A–Z</span> <span style="color:rgba(255,255,255,0.3)">(+26)</span>');
    if (/[0-9]/.test(password)) activeClasses.push('<span style="color:#ffb703">0–9</span> <span style="color:rgba(255,255,255,0.3)">(+10)</span>');
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) activeClasses.push('<span style="color:#00d4ff">!@#…</span> <span style="color:rgba(255,255,255,0.3)">(+32)</span>');
    if (/[äöüÄÖÜß€£¥©®™°µ¶]/.test(password)) activeClasses.push('<span style="color:#c77dff">äöü€…</span> <span style="color:rgba(255,255,255,0.3)">(+20)</span>');

    display.innerHTML = `
        <div style="color:rgba(0,212,255,0.5);margin-bottom:8px;font-size:0.7rem;letter-spacing:0.1em;">
            ⚡ BRUTE-FORCE KNACKZEIT
        </div>
        <div style="margin-bottom:8px;line-height:1.8;">
            ${activeClasses.join(' &nbsp;·&nbsp; ')}
        </div>
        <div style="margin-bottom:4px;">
            ZEICHENSATZ: <span style="color:#00d4ff">${charset} mögliche Zeichen</span>
        </div>
        <div style="margin-bottom:10px;">
            KOMBINATIONEN: <span style="color:#00d4ff">${combinations.toExponential(2)}</span>
        </div>
        <div style="padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);font-size:0.95rem;">
            KNACKZEIT: <span style="color:${color};font-weight:bold;font-size:1.05rem;">${time}</span>
        </div>
    `;
}

// Berechnet Score (0–100), Label und erfüllte Kriterien eines Passworts.
// Wiederverwendbar – wird auch von register.js für die Registrier-Demo genutzt.
function scorePassword(val) {
    const criteria = {
        length: val.length >= 12,
        upper: /[A-Z]/.test(val) && /[a-z]/.test(val),
        number: /[0-9]/.test(val),
        special: /[^A-Za-z0-9]/.test(val)
    };

    let score = 0;
    if (criteria.length) score += 25;
    if (criteria.upper) score += 25;
    if (criteria.number) score += 25;
    if (criteria.special) score += 25;

    let label;
    if (val === "") label = "UNSICHER";
    else if (score <= 25) label = "WENIG SICHER";
    else if (score <= 75) label = "SICHER";
    else label = "SEHR SICHER";

    return { score, label, criteria };
}

if (passwordInput) {
    passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        const { score, label, criteria } = scorePassword(val);

        updateCriterion('crit-length', criteria.length);
        updateCriterion('crit-upper', criteria.upper);
        updateCriterion('crit-number', criteria.number);
        updateCriterion('crit-special', criteria.special);

        if (strengthBar) strengthBar.style.width = score + "%";
        if (strengthGlow) strengthGlow.style.width = score + "%";

        statusVal.innerText = label;

        if (val === "") {
            statusIndicator.style.background = "rgba(255, 255, 255, 0.1)";
            statusIndicator.style.boxShadow = "none";
            if (strengthBar) strengthBar.style.background = "rgba(255, 255, 255, 0.05)";
        } else if (score <= 25) {
            const color = "#e63946";
            statusIndicator.style.background = color;
            statusIndicator.style.boxShadow = `0 0 10px ${color}44`;
            if (strengthBar) strengthBar.style.background = color;
        } else if (score <= 75) {
            const color = "#ffb703";
            statusIndicator.style.background = color;
            statusIndicator.style.boxShadow = `0 0 10px ${color}44`;
            if (strengthBar) strengthBar.style.background = color;
        } else {
            const color = "#00d4ff";
            statusIndicator.style.background = color;
            statusIndicator.style.boxShadow = `0 0 15px ${color}66`;
            if (strengthBar) strengthBar.style.background = color;
        }

        updateBruteForceDisplay(val);
    });
}

function updateCriterion(id, isValid) {
    const el = document.getElementById(id);
    if (el) {
        if (isValid) {
            el.classList.add('valid');
            el.classList.remove('invalid');
        } else {
            el.classList.add('invalid');
            el.classList.remove('valid');
        }
    }
}

// Theme
const themeBtn = document.getElementById('theme-toggle');
const body = document.body;

if (localStorage.getItem('theme') === 'light') {
    body.classList.add('light-mode');
}

if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        localStorage.setItem('theme', body.classList.contains('light-mode') ? 'light' : 'dark');
    });
}