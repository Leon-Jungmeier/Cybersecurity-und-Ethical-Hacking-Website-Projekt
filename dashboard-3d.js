/**
 * CYBERSHIELD COMMAND CENTER - 3D ENGINE
 */

let scene, camera, renderer, globe, stars;

function init() {

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05080a);

    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 15;

    // Renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("globe-container").appendChild(renderer.domElement);

    // ------------------------------------------------
    // Licht
    // ------------------------------------------------
    scene.add(new THREE.AmbientLight(0xffffff, 0.3)); // Grundhelligkeit
    
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    // ------------------------------------------------
    // Globus (Realistische Erde)
    // ------------------------------------------------
    const textureLoader = new THREE.TextureLoader();
    
    // Die Textur wird hier geladen
    const earthMap = textureLoader.load(
        "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg"
    );

    const globeGeom = new THREE.SphereGeometry(5, 64, 64);
    const globeMat = new THREE.MeshStandardMaterial({
        map: earthMap,
        roughness: 0.7,
        metalness: 0.1
    });
    
    globe = new THREE.Mesh(globeGeom, globeMat);
    scene.add(globe);

    // HINWEIS: Den Teil mit "borders" habe ich entfernt, 
    // da die Erde jetzt ein echtes Bild ist und keine Neon-Linien mehr braucht.

    // ------------------------------------------------
    // Glow (Atmosphären-Effekt)
    // ------------------------------------------------
    const glowGeom = new THREE.SphereGeometry(5.2, 40, 40);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.15
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    scene.add(glow);

    // ------------------------------------------------
    // Sterne
    // ------------------------------------------------
    createStars();

    window.addEventListener("resize", onWindowResize, false);
    animate();

    // Angriffslinien erzeugen
    setInterval(createAttackLine, 300);
}

/* ------------------------------------------------ */
/* Angriffslinien */
/* ------------------------------------------------ */
function createAttackLine() {
    // Start- und Endpunkt auf der Kugeloberfläche (Radius 5)
    const start = new THREE.Vector3().setFromSphericalCoords(
        5, Math.random() * Math.PI, Math.random() * Math.PI * 2
    );
    const end = new THREE.Vector3().setFromSphericalCoords(
        5, Math.random() * Math.PI, Math.random() * Math.PI * 2
    );
    
    // Kurve nach außen wölben
    const mid = start.clone().lerp(end, 0.5).multiplyScalar(1.4);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));

    const color = Math.random() > 0.5 ? 0xff0055 : 0x00d4ff;
    const material = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 1 });
    const line = new THREE.Line(geometry, material);

    scene.add(line);
    updateLog(color === 0xff0055 ? "CRITICAL INTRUSION" : "DATA PACKET", "UNKNOWN");
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
    for (let i = 0; i < 15000; i++) { // Etwas weniger Sterne für bessere Performance
        starVertices.push(
            (Math.random() - 0.5) * 1000,
            (Math.random() - 0.5) * 1000,
            (Math.random() - 0.5) * -500
        );
    }
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starVertices, 3));

    stars = new THREE.Points(
        starGeometry,
        new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 })
    );
    scene.add(stars);
}

function animate() {
    requestAnimationFrame(animate);
    if (globe) {
        globe.rotation.y += 0.002; // Rotation etwas langsamer für Realismus
    }
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();