// Registrier-Demo: legt einen "Account" im JSON-Server an.
// WICHTIG: Es wird NIE das Passwort gespeichert – nur Username, Passwort-Stärke und Datum.
// Nutzt scorePassword() und calcBruteForceTime() aus script.js (dort global definiert).
const REG_API = 'http://localhost:3001';
const MIN_SCORE = 50; // mindestens "SICHER" – schwächere Passwörter werden abgelehnt

function regEscapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
}

function strengthColor(score) {
    if (score <= 0)  return 'rgba(255,255,255,0.1)';
    if (score <= 25) return '#e63946';
    if (score <= 75) return '#ffb703';
    return '#00d4ff';
}

function strengthBadgeClass(label) {
    return label === 'SEHR SICHER' ? 'diff-easy' : 'diff-medium';
}

function formatDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

function setRegFeedback(message, type) {
    const el = document.getElementById('reg-feedback');
    if (!el) return;
    el.textContent = message;
    el.dataset.type = type; // 'ok' | 'error'
}

function setUsersStatus(state, text) {
    const status = document.getElementById('users-status');
    const label  = document.getElementById('users-status-text');
    if (!status || !label) return;
    status.dataset.state = state;
    label.textContent = text;
}

function renderUsers(users, container) {
    if (!users.length) {
        container.innerHTML = '<p class="db-empty">Noch keine Accounts registriert.</p>';
        return;
    }
    // Neueste zuerst
    const sorted = [...users].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    container.innerHTML = sorted.map(user => `
        <article class="db-card">
            <div class="db-card-top">
                <span class="db-badge">@${regEscapeHtml(user.username)}</span>
                <span class="db-diff ${strengthBadgeClass(user.strengthLabel)}">${regEscapeHtml(user.strengthLabel)}</span>
            </div>
            <p class="db-card-desc">
                Registriert: ${formatDate(user.createdAt)}<br>
                Geschätzte Knackzeit: ${regEscapeHtml(user.crackTime)}
            </p>
        </article>
    `).join('');
}

async function loadUsers() {
    const grid = document.getElementById('users-grid');
    if (!grid) return; // nicht auf dieser Seite
    try {
        const res = await fetch(`${REG_API}/users`);
        if (!res.ok) throw new Error('HTTP-Fehler');
        const users = await res.json();
        renderUsers(users, grid);
        setUsersStatus('online', `Verbunden · ${users.length} Account(s) gespeichert`);
    } catch (err) {
        console.error('JSON-Server nicht erreichbar:', err);
        setUsersStatus('offline', 'JSON-Server offline – mit "npm run server" auf Port 3001 starten.');
        grid.innerHTML = '';
    }
}

// Live-Stärkeanzeige im Formular
const regPassword = document.getElementById('reg-password');
if (regPassword) {
    regPassword.addEventListener('input', () => {
        const { score, label } = scorePassword(regPassword.value);
        const fill = document.getElementById('reg-strength-fill');
        const lbl  = document.getElementById('reg-strength-label');
        if (fill) { fill.style.width = score + '%'; fill.style.background = strengthColor(score); }
        if (lbl)  lbl.textContent = regPassword.value ? label : '—';
    });
}

// Registrierung absenden
const regForm = document.getElementById('register-form');
if (regForm) {
    regForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('reg-username').value.trim();
        const password = regPassword.value;
        const { score, label } = scorePassword(password);

        if (!username) {
            setRegFeedback('Bitte einen Username eingeben.', 'error');
            return;
        }
        if (score < MIN_SCORE) {
            setRegFeedback(`Passwort zu schwach (${label}). Mindestens "SICHER" ist erforderlich.`, 'error');
            return;
        }

        const crack = calcBruteForceTime(password);
        const payload = {
            username,
            strengthLabel: label,
            strengthScore: score,
            crackTime: crack ? crack.time : '—',
            createdAt: new Date().toISOString()
            // Bewusst KEIN Passwort-Feld – es wird nie gespeichert.
        };

        try {
            const res = await fetch(`${REG_API}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('POST fehlgeschlagen');

            setRegFeedback(`✓ Account "${username}" angelegt – gespeichert wurde nur die Stärke, nicht das Passwort.`, 'ok');
            regForm.reset();
            const fill = document.getElementById('reg-strength-fill');
            const lbl  = document.getElementById('reg-strength-label');
            if (fill) fill.style.width = '0%';
            if (lbl)  lbl.textContent = '—';
            loadUsers();
        } catch (err) {
            console.error('Registrierung fehlgeschlagen:', err);
            setRegFeedback('JSON-Server offline – starte ihn mit "npm run server" und versuche es erneut.', 'error');
        }
    });
}

document.addEventListener('DOMContentLoaded', loadUsers);
