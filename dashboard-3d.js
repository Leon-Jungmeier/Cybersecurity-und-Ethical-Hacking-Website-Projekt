/**
 * CYBERSHIELD COMMAND CENTER - 3D ENGINE
 */

// Globale Variablen für die Three.js Kernkomponenten
let scene, camera, renderer, globe, stars, controls, glow;
let cityNodes = []; // Speicher für die Stadt-Objekte (Punkte auf der Erde)

/**
 * Initialisiert die gesamte 3D-Umgebung
 */
function init() {

    // 1. Die Szene: Der Container für alle 3D-Objekte
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05080a); // Dunkler, technischer Hintergrund
    
    // 2. Die Kamera: Definiert den Blickwinkel (Sichtfeld, Seitenverhältnis, Nah- & Fernlimit)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 15; // Startposition der Kamera (etwas entfernt von der Erde)

    // 3. Der Renderer: Zeichnet die Szene in das HTML-Dokument
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Fügt das 3D-Canvas dem Container im HTML hinzu
    document.getElementById("globe-container").appendChild(renderer.domElement);

    // 4. OrbitControls: Ermöglicht das Drehen und Zoomen mit der Maus
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Macht die Bewegung weicher
    
    // Zoom-Limits, um nicht "in" die Erde oder zu weit weg zu fliegen
    controls.minDistance = 7;    
    controls.maxDistance = 200;  
    
    controls.autoRotate = false; // Manuelle Kontrolle bevorzugt
    controls.autoRotateSpeed = 0.5;

    // 5. Beleuchtung: Damit die Objekte sichtbar und räumlich wirken
    scene.add(new THREE.AmbientLight(0xffffff, 0.3)); // Grundhelligkeit
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2); // Gezieltes Licht (wie die Sonne)
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    // 6. Der Globus: Erstellung der Erdkugel
    const textureLoader = new THREE.TextureLoader();
    const earthMap = textureLoader.load("https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg");

    globe = new THREE.Mesh(
        new THREE.SphereGeometry(5, 64, 64), // Geometrie (Radius 5)
        new THREE.MeshStandardMaterial({ map: earthMap, roughness: 0.7, metalness: 0.1 }) // Material mit Textur
    );
    scene.add(globe);

    // 7. Glow-Effekt: Ein leicht größerer, transparenter Layer für die Atmosphäre
    glow = new THREE.Mesh(
        new THREE.SphereGeometry(5.2, 40, 40),
        new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.15 })
    );
    scene.add(glow);

    // Initialisierung von Zusatzfunktionen
    createStars(); // Sternenhintergrund
    window.addEventListener("resize", onWindowResize, false); // Reaktionsfähigkeit bei Fenstergröße
    animate(); // Startet die Render-Schleife
    
    // Beispielstädte erstellen
    createCityNode(48.2, 16.3, "Wien");
    createCityNode(34.05, -118.25, "Los Angeles");
    createCityNode(35.68, 139.69, "Tokio");
    createCityNode(51.5, 0.12, "London");
    createCityNode(-33.86, 151.2, "Sydney");
    createCityNode(40.71, -74.0, "New York");
    createCityNode(52.52, 13.4, "Berlin");
    createCityNode(39.9, 116.39, "Peking");

    // Startet das automatische Generieren von "Angriffslinien" alle 800ms
    setInterval(createAttackLine, 800);
}

/**
 * Erstellt eine animierte Fluglinie zwischen zwei zufälligen Städten
 */
function createAttackLine() {
    if (cityNodes.length < 2) return; // Abbruch, falls nicht genug Ziele vorhanden

    // Wählt zwei zufällige Städte aus
    const startNode = cityNodes[Math.floor(Math.random() * cityNodes.length)];
    let endNode = cityNodes[Math.floor(Math.random() * cityNodes.length)];
    
    while (startNode === endNode) {
        endNode = cityNodes[Math.floor(Math.random() * cityNodes.length)];
    }

    const start = startNode.position.clone();
    const end = endNode.position.clone();
    
    // Berechnet einen Mittelpunkt weit über der Erdoberfläche für die Kurve
    const mid = start.clone().lerp(end, 0.5).multiplyScalar(1.3); 
    
    // Erstellt eine mathematische Kurve (Bezier)
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)); 

    // Zufällige Farbe für den Effekt (Rot für Angriff, Blau für Daten)
    const color = Math.random() > 0.5 ? 0xff0055 : 0x00d4ff;
    const material = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 1 });
    const line = new THREE.Line(geometry, material);

    scene.add(line);
    
    // Log-Eintrag im UI aktualisieren
    updateLog(color === 0xff0055 ? "CRITICAL INTRUSION" : "DATA PACKET", `${startNode.userData.name} to ${endNode.userData.name}`);
    
    // Startet das Ausfaden der Linie
    fadeOutLine(line);
}

/**
 * Lässt eine Linie langsam verschwinden und löscht sie dann aus dem Speicher
 */
function fadeOutLine(line) {
    let opacity = 1;
    function animateFade() {
        opacity -= 0.02; // Geschwindigkeit des Verschwindens
        line.material.opacity = opacity;
        if (opacity > 0) {
            requestAnimationFrame(animateFade);
        } else {
            // Speicher bereinigen (Wichtig für Performance!)
            scene.remove(line);
            line.geometry.dispose();
            line.material.dispose();
        }
    }
    animateFade();
}

/**
 * Schreibt Ereignisse in die HTML-Log-Konsole
 */
function updateLog(type, src) {
    const log = document.getElementById("log-content");
    if (log) {
        const entry = document.createElement("div");
        entry.style.color = type === "CRITICAL INTRUSION" ? "#ff0055" : "#00d4ff";
        entry.innerHTML = `[${new Date().toLocaleTimeString()}] ${type} FROM ${src}`;
        log.prepend(entry); // Neueste Meldung nach oben
        // Limitiert die Anzahl der Log-Einträge auf 15
        if (log.children.length > 15) log.removeChild(log.lastChild);
    }
}

/**
 * Erstellt ein zufälliges Sternenfeld im Hintergrund
 */
function createStars() {
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 15000; i++) {
        // Erzeugt zufällige Positionen in einem großen Raum
        starVertices.push((Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000, (Math.random() - 0.5) * -500);
    }
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starVertices, 3));
    stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 }));
    scene.add(stars);
}

/**
 * Die Haupt-Animationsschleife (wird ca. 60x pro Sekunde aufgerufen)
 */
function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update(); // Nötig für das sanfte Damping der Kamera
    renderer.render(scene, camera); // Zeichnet das Bild neu
}

/**
 * Passt die Kamera und den Renderer an, wenn das Browserfenster skaliert wird
 */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Erstellt einen kleinen Punkt auf der Weltkugel basierend auf Koordinaten
 */
function createCityNode(lat, lon, name = "City") {
    const geometry = new THREE.SphereGeometry(0.08, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff41 }); // "Hacker-Grün"
    const node = new THREE.Mesh(geometry, material);

    // Umrechnung: Geographische Koordinaten (Lat/Lon) -> Sphärische Radiant
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    // Umrechnung: Sphärische Radiant -> Kartesische 3D-Koordinaten (x, y, z)
    const x = -5 * Math.sin(phi) * Math.cos(theta);
    const z = 5 * Math.sin(phi) * Math.sin(theta);
    const y = 5 * Math.cos(phi);

    node.position.set(x, y, z);
    node.userData = { name: name }; // Speichert den Namen im Objekt für den Log
    
    scene.add(node);
    cityNodes.push(node);
}

// Startet die Engine
init();