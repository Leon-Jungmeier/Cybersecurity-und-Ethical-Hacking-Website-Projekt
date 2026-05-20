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
    if (/[^A-Za-z0-9]/.test(password)) charset += 32;

    // Modernes Brute-Force: ~100 Milliarden Versuche/Sekunde (High-End GPU Cluster)
    const attemptsPerSecond = 1e11;
    const combinations = Math.pow(charset, password.length);
    const secondsMax = combinations / attemptsPerSecond;

    return formatTime(secondsMax);
}
unction updateBruteForceDisplay(password) {
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
        // Nach dem criteria-display einfügen
        const auditGrid = document.querySelector('.audit-main-grid');
        if (auditGrid) auditGrid.appendChild(display);
    }

    if (!password) {
        display.innerHTML = '';
        return;
    }
if (passwordInput) {
    passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        let score = 0;

        const criteria = {
            length: val.length >= 12,
            upper: /[A-Z]/.test(val) && /[a-z]/.test(val),
            number: /[0-9]/.test(val),
            special: /[^A-Za-z0-9]/.test(val)
        };

        // UI Updates für die Kriterien-Liste
        updateCriterion('crit-length', criteria.length);
        updateCriterion('crit-upper', criteria.upper);
        updateCriterion('crit-number', criteria.number);
        updateCriterion('crit-special', criteria.special);

        // Score berechnen
        if (criteria.length) score += 25;
        if (criteria.upper) score += 25;
        if (criteria.number) score += 25;
        if (criteria.special) score += 25;

        // Balken-Breite aktualisieren
        if (strengthBar) strengthBar.style.width = score + "%";
        if (strengthGlow) strengthGlow.style.width = score + "%";

        // Status-Logik mit edlen, gedeckten Farben
        if (val === "") {
            statusVal.innerText = "UNSICHER";
            statusIndicator.style.background = "rgba(255, 255, 255, 0.1)";
            statusIndicator.style.boxShadow = "none";
            if (strengthBar) strengthBar.style.background = "rgba(255, 255, 255, 0.05)";
        } else if (score <= 25) {
            statusVal.innerText = "WENIG SICHER";
            const color = "#e63946"; // Das edle Rubinrot
            statusIndicator.style.background = color;
            statusIndicator.style.boxShadow = `0 0 10px ${color}44`; // Dezenter Glow
            if (strengthBar) strengthBar.style.background = color;
        } else if (score <= 75) {
            statusVal.innerText = "SICHER";
            const color = "#ffb703";
            statusIndicator.style.background = color;
            statusIndicator.style.boxShadow = `0 0 10px ${color}44`;
            if (strengthBar) strengthBar.style.background = color;
        } else {
            statusVal.innerText = "SEHR SICHER";
            const color = "#00d4ff";
            statusIndicator.style.background = color;
            statusIndicator.style.boxShadow = `0 0 15px ${color}66`;
            if (strengthBar) strengthBar.style.background = color;
        }
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
function initTheme() {
    const themeBtn = document.getElementById('theme-toggle');
    const body = document.body;
    const currentTheme = localStorage.getItem('theme');

    if (currentTheme === 'light') {
        body.classList.add('light-mode');
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            body.classList.toggle('light-mode');
            localStorage.setItem('theme', body.classList.contains('light-mode') ? 'light' : 'dark');
        });
    }
}
const themeBtn = document.getElementById('theme-toggle');
const body = document.body;

// Beim Laden prüfen
if (localStorage.getItem('theme') === 'light') {
    body.classList.add('light-mode');
}

if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        body.classList.toggle('light-mode');
            
        // Speichern
        if (body.classList.contains('light-mode')) {
            localStorage.setItem('theme', 'light');
        } else {
            localStorage.setItem('theme', 'dark');
        }
    });
}