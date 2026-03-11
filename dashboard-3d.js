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
    controls.autoRotate = true;
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
    const start = new THREE.Vector3().setFromSphericalCoords(5, Math.random() * Math.PI, Math.random() * Math.PI * 2);
    const end = new THREE.Vector3().setFromSphericalCoords(5, Math.random() * Math.PI, Math.random() * Math.PI * 2);
    
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
    for (let i = 0; i < 15000; i++) {
        starVertices.push((Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000, (Math.random() - 0.5) * -500);
    }
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starVertices, 3));
    stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 }));
    scene.add(stars);
}

function animate() {
    requestAnimationFrame(animate);
    if (globe) globe.rotation.y += 0.002;
    if (glow) glow.rotation.y += 0.002;
    if (controls) controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();