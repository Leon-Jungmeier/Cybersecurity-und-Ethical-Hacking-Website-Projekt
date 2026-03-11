/**
 * CYBERSHIELD COMMAND CENTER - 3D ENGINE
 */

let scene, camera, renderer, globe, stars, controls, glow;

function init() {
    // Scene & Camera
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05080a);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 15;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("globe-container").appendChild(renderer.domElement);

    // OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;

    // Licht
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    // Globus (Erde)
    const textureLoader = new THREE.TextureLoader();
    const earthMap = textureLoader.load("https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg");

    globe = new THREE.Mesh(
        new THREE.SphereGeometry(5, 64, 64),
        new THREE.MeshStandardMaterial({ map: earthMap, roughness: 0.7, metalness: 0.1 })
    );
    scene.add(globe);

    // Glow
    glow = new THREE.Mesh(
        new THREE.SphereGeometry(5.2, 40, 40),
        new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.15 })
    );
    scene.add(glow);

    createStars();
    window.addEventListener("resize", onWindowResize, false);
    animate();
    setInterval(createAttackLine, 800);
}

function createAttackLine() {
    // Wähle zufällige Start- und End-Städte aus unserem Array
    if (cityNodes.length < 2) return; // Nichts tun, wenn zu wenige Städte da sind

    const startNode = cityNodes[Math.floor(Math.random() * cityNodes.length)];
    let endNode = cityNodes[Math.floor(Math.random() * cityNodes.length)];
    
    // Stelle sicher, dass Start- und Endpunkt nicht gleich sind
    while (startNode === endNode) {
        endNode = cityNodes[Math.floor(Math.random() * cityNodes.length)];
    }

    // Die tatsächlichen 3D-Positionen der Punkte verwenden
    const start = startNode.position.clone();
    const end = endNode.position.clone();
    
    // Kurve nach außen wölben
    // Ein höherer Multiplikator (z.B. 1.25 bis 1.5) lässt die Kurve stärker ansteigen
    const mid = start.clone().lerp(end, 0.5).multiplyScalar(1.3); // Etwas weniger Wölbung
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)); // Mehr Punkte für glattere Linie

    const color = Math.random() > 0.5 ? 0xff0055 : 0x00d4ff;
    const material = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 1, linewidth: 2 }); // Linien etwas dicker
    const line = new THREE.Line(geometry, material);

    scene.add(line);
    
    // Log-Eintrag mit echten Städtenamen
    updateLog(color === 0xff0055 ? "CRITICAL INTRUSION" : "DATA PACKET", `${startNode.userData.name} to ${endNode.userData.name}`);
    
    fadeOutLine(line);
}

function fadeOutLine(line) {
    let opacity = 1;
    function animateFade() {
        opacity -= 0.02;
        line.material.opacity = opacity;
        if (opacity > 0) {
            requestAnimationFrame(animateFade);
        } else {
            scene.remove(line);
            line.geometry.dispose();
            line.material.dispose();
        }
    }
    animateFade();
}

function updateLog(type, src) {
    const log = document.getElementById("log-content");
    if (log) {
        const entry = document.createElement("div");
        entry.style.color = type === "CRITICAL INTRUSION" ? "#ff0055" : "#00d4ff";
        entry.innerHTML = `[${new Date().toLocaleTimeString()}] ${type} FROM ${src}`;
        log.prepend(entry);
        if (log.children.length > 15) log.removeChild(log.lastChild);
    }
}

function createStars() {
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 15000; i++) {
        starVertices.push((Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000, (Math.random() - 0.5) * -500);
    }
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starVertices, 3));
    stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 }));
    scene.add(stars);
}

function animate() {
    requestAnimationFrame(animate);
    
    if (controls) controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();








// Füge diese Zeile ganz oben bei deinen globalen Variablen hinzu:
let cityNodes = []; // Array, um die Stadt-Punkte zu speichern

// Füge diese Funktion hinzu:
function createCityNode(lat, lon, name = "City") {
    const geometry = new THREE.SphereGeometry(0.08, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff41 });
    const node = new THREE.Mesh(geometry, material);

    // 1. Konvertierung von Grad in Radiant
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    // 2. Umrechnung in kartesische Koordinaten (x, y, z)
    // WICHTIG: Die Formel für eine Kugel mit Radius 5
    const x = -5 * Math.sin(phi) * Math.cos(theta);
    const z = 5 * Math.sin(phi) * Math.sin(theta);
    const y = 5 * Math.cos(phi);

    node.position.set(x, y, z);
    
    node.userData = { name: name };
    
    // Füge den Node direkt zur Szene hinzu, NICHT zum Globe, 
    // damit die Rotation nicht die Punkte "verschluckt"
    scene.add(node);
    cityNodes.push(node);
}

// Rufe createCityNode in deiner init() Funktion auf, nachdem globe erstellt wurde:
// Beispielstädte:
// (Nachdem globe = new THREE.Mesh(...) erstellt wurde)
createCityNode(48.2, 16.3, "Wien");      // Wien
createCityNode(34.05, -118.25, "Los Angeles"); // Los Angeles
createCityNode(35.68, 139.69, "Tokio");   // Tokio
createCityNode(51.5, 0.12, "London");    // London
createCityNode(-33.86, 151.2, "Sydney"); // Sydney
createCityNode(40.71, -74.0, "New York"); // New York
createCityNode(52.52, 13.4, "Berlin"); // Berlin
createCityNode(39.9, 116.39, "Peking"); // Peking