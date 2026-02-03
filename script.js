const passwordInput = document.getElementById('pw-input');
const strengthBar = document.getElementById('strength-bar');
const strengthText = document.getElementById('strength-text');

// Falls das Element auf der aktuellen Seite nicht existiert, bricht das Script nicht ab
if (passwordInput) {
    passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        let score = 0;

        const criteria = {
            length: val.length >= 8,
            upper: /[A-Z]/.test(val) && /[a-z]/.test(val),
            number: /[0-9]/.test(val),
            special: /[^A-Za-z0-9]/.test(val)
        };

        // UI Updates für die Liste
        updateCriterion('crit-length', criteria.length);
        updateCriterion('crit-upper', criteria.upper);
        updateCriterion('crit-number', criteria.number);
        updateCriterion('crit-special', criteria.special);

        // Score berechnen
        if (criteria.length) score += 25;
        if (criteria.upper) score += 25;
        if (criteria.number) score += 25;
        if (criteria.special) score += 25;

        // Balken und Text anpassen
        strengthBar.style.width = score + "%";
        
        if (score <= 25) {
            strengthBar.style.backgroundColor = "#ff4b2b";
            strengthText.innerText = "Sehr unsicher ❌";
        } else if (score <= 75) {
            strengthBar.style.backgroundColor = "#ffa500";
            strengthText.innerText = "Mittelmäßig ⚠️";
        } else {
            strengthBar.style.backgroundColor = "#00f2ff";
            strengthText.innerText = "Sicherer Schutz! ✅";
        }

        if(val === "") {
            strengthText.innerText = "Warte auf Eingabe...";
            strengthBar.style.width = "0%";
        }
    });
}

// Hilfsfunktion um Code-Wiederholung zu vermeiden
function updateCriterion(id, isValid) {
    const el = document.getElementById(id);
    if (el) {
        el.className = isValid ? 'valid' : 'invalid';
        el.innerText = (isValid ? '✔ ' : '○ ') + el.innerText.substring(2);
    }
}