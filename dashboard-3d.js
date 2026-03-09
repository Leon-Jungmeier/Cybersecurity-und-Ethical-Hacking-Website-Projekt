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

    // Licht
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    // ------------------------------------------------
    // Globus (Cyber Kugel)
    // ------------------------------------------------
    const globeGeom = new THREE.SphereGeometry(5, 40, 40);
    const globeMat = new THREE.MeshPhongMaterial({
        color: 0x001a24, // dunkelblau
        wireframe: true, 
        transparent: true,
        opacity: 0.5
    });
    globe = new THREE.Mesh(globeGeom, globeMat);
    scene.add(globe);

    // ------------------------------------------------
    // Kontinent-Umrisse (Neon-Linien)
    // ------------------------------------------------
    const textureLoader = new THREE.TextureLoader();
    const bordersTexture = textureLoader.load(
        "https://raw.githubusercontent.com/creativetimofficial/public-assets/master/argon-dashboard-pro/assets/img/earthmap1k.jpg"
    );

    const bordersGeom = new THREE.SphereGeometry(5.02, 40, 40);
    const bordersMat = new THREE.MeshBasicMaterial({
        map: bordersTexture,
        transparent: true,
        opacity: 0.6
    });
    const borders = new THREE.Mesh(bordersGeom, bordersMat);
    scene.add(borders);

    // ------------------------------------------------
    // Glow
    // ------------------------------------------------
    const glowGeom = new THREE.SphereGeometry(5.3, 40, 40);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.12
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
    const start = new THREE.Vector3().setFromSphericalCoords(
        5, Math.random() * Math.PI, Math.random() * Math.PI * 2
    );
    const end = new THREE.Vector3().setFromSphericalCoords(
        5, Math.random() * Math.PI, Math.random() * Math.PI * 2
    );
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

/* ------------------------------------------------ */
/* Linien Fade */
/* ------------------------------------------------ */
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

/* ------------------------------------------------ */
/* Städte */
/* ------------------------------------------------ */
function createCityNode(lat, lon) {
    const geometry = new THREE.SphereGeometry(0.15, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff41 });
    const node = new THREE.Mesh(geometry, material);

    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    node.position.setFromSphericalCoords(5, phi, theta);

    scene.add(node);
}

/* ------------------------------------------------ */
/* Log */
/* ------------------------------------------------ */
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

/* ------------------------------------------------ */
/* Sterne */
/* ------------------------------------------------ */
function createStars() {
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 5000; i++) {
        starVertices.push(
            (Math.random() - 0.5) * 1000,
            (Math.random() - 0.5) * 1000,
            (Math.random() - 0.5) * -500
        );
    }
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starVertices, 3));

    stars = new THREE.Points(
        starGeometry,
        new THREE.PointsMaterial({ color: 0xffffff, size: 0.05 })
    );

    scene.add(stars);
}

/* ------------------------------------------------ */
/* Animation */
/* ------------------------------------------------ */
function animate() {
    requestAnimationFrame(animate);

    if (globe) {
        globe.rotation.y += 0.001;
        globe.rotation.x += 0.0005;
    }

    renderer.render(scene, camera);
}

/* ------------------------------------------------ */
/* Resize */
/* ------------------------------------------------ */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/* ------------------------------------------------ */
/* Start */
/* ------------------------------------------------ */
init();