// Lädt die im JSON-Server (db.json) gespeicherten Daten und gibt sie live auf der Seite aus.
// Server starten mit:  npm run server   ->   http://localhost:3001
const DB_API = 'http://localhost:3001';

// Schützt vor HTML-Injection, falls in db.json mal Sonderzeichen stehen.
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
}

function difficultyClass(difficulty) {
    switch (String(difficulty).toLowerCase()) {
        case 'leicht': return 'diff-easy';
        case 'mittel': return 'diff-medium';
        case 'schwer': return 'diff-hard';
        default:       return 'diff-medium';
    }
}

function renderTopics(topics, container) {
    if (!topics.length) {
        container.innerHTML = '<p class="db-empty">Keine Themen in der Datenbank.</p>';
        return;
    }
    container.innerHTML = topics.map(topic => `
        <article class="db-card">
            <div class="db-card-top">
                <span class="db-badge">${escapeHtml(topic.category)}</span>
                <span class="db-diff ${difficultyClass(topic.difficulty)}">${escapeHtml(topic.difficulty)}</span>
            </div>
            <h4 class="db-card-title">${escapeHtml(topic.title)}</h4>
        </article>
    `).join('');
}

function renderTools(tools, container) {
    if (!tools.length) {
        container.innerHTML = '<p class="db-empty">Keine Tools in der Datenbank.</p>';
        return;
    }
    container.innerHTML = tools.map(tool => `
        <article class="db-card">
            <h4 class="db-card-title db-tool-name">${escapeHtml(tool.name)}</h4>
            <p class="db-card-desc">${escapeHtml(tool.description)}</p>
        </article>
    `).join('');
}

function setStatus(state, text) {
    const status = document.getElementById('db-status');
    const label  = document.getElementById('db-status-text');
    if (!status || !label) return;
    status.dataset.state = state;
    label.textContent = text;
}

async function loadDatabaseData() {
    const topicsGrid = document.getElementById('topics-grid');
    const toolsGrid  = document.getElementById('tools-grid');
    if (!topicsGrid || !toolsGrid) return; // Abschnitt ist nicht auf dieser Seite

    try {
        const [topicsRes, toolsRes] = await Promise.all([
            fetch(`${DB_API}/topics`),
            fetch(`${DB_API}/tools`),
        ]);
        if (!topicsRes.ok || !toolsRes.ok) throw new Error('HTTP-Fehler vom JSON-Server');

        const topics = await topicsRes.json();
        const tools  = await toolsRes.json();

        renderTopics(topics, topicsGrid);
        renderTools(tools, toolsGrid);
        setStatus('online', `Verbunden · ${topics.length} Themen und ${tools.length} Tools geladen`);
    } catch (err) {
        console.error('JSON-Server nicht erreichbar:', err);
        setStatus('offline', 'JSON-Server offline – bitte mit "npm run server" auf Port 3001 starten.');
        topicsGrid.innerHTML = '';
        toolsGrid.innerHTML  = '';
    }
}

document.addEventListener('DOMContentLoaded', loadDatabaseData);
