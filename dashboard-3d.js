/**
 * CYBERSHIELD COMMAND CENTER - 3D ENGINE
 */

let isWhiteMode = false;
let scene, camera, renderer, globe, stars, controls, glow;
let cityNodes = []; 

function init() {
    // 1. Scene & Camera
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05080a);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 15;

    // 2. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("globe-container").appendChild(renderer.domElement);

    // 3. OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 7;
    controls.maxDistance = 200;

    // 4. Licht & Sonne
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    createSun();

    // 5. Globus
    const textureLoader = new THREE.TextureLoader();
    const earthMap = textureLoader.load("https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg");

    globe = new THREE.Mesh(
        new THREE.SphereGeometry(5, 64, 64),
        new THREE.MeshStandardMaterial({ map: earthMap, roughness: 0.7, metalness: 0.1 })
    );
    scene.add(globe);

    // 6. Atmosphäre Glow
    glow = new THREE.Mesh(
        new THREE.SphereGeometry(5.2, 40, 40),
        new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.15 })
    );
    scene.add(glow);

    // 7. Städte erstellen
    createCityNodes();

    createStars();
    window.addEventListener("resize", onWindowResize, false);
    animate();
    
    // Angriffsschleife
    setInterval(createAttackLine, 800);
}


function fadeOutLine(line) {
    let opacity = 1;
    function animateFade() {
        opacity -= 0.015;
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

function createCityNode(lat, lon, name) {
    const geometry = new THREE.SphereGeometry(0.08, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff41 });
    const node = new THREE.Mesh(geometry, material);

    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -5 * Math.sin(phi) * Math.cos(theta);
    const z = 5 * Math.sin(phi) * Math.sin(theta);
    const y = 5 * Math.cos(phi);

    node.position.set(x, y, z);
    
    const label = document.createElement('div');
    label.className = 'city-label';
    label.textContent = name;
    label.style.position = 'absolute';
    label.style.color = '#00ff41';
    label.style.fontSize = '10px';
    label.style.fontFamily = 'monospace';
    label.style.pointerEvents = 'none';
    label.style.textShadow = '0 0 5px #000';
    document.getElementById("globe-container").appendChild(label);
    
    node.userData = { name: name, label: label }; 
    scene.add(node);
    cityNodes.push(node);
}

function createCityNodes() {
    const cities = [
        [48.2, 16.3, "Wien"], [34.05, -118.25, "Los Angeles"], [35.68, 139.69, "Tokio"],
        [51.5, 0.12, "London"], [-33.86, 151.2, "Sydney"], [40.71, -74.0, "New York"],
        [52.52, 13.4, "Berlin"], [39.9, 116.39, "Peking"], [48.85, 2.35, "Paris"],
        [25.20, 55.27, "Dubai"], [1.35, 103.81, "Singapur"], [-23.55, -46.63, "São Paulo"]
    ];
    cities.forEach(c => createCityNode(c[0], c[1], c[2]));
}

function createSun() {
    const sunGroup = new THREE.Group();
    const sunGeometry = new THREE.SphereGeometry(4, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sunGroup.add(sun);

    const sunLight = new THREE.PointLight(0xffffeb, 3, 500);
    sunGroup.add(sunLight);
    sunGroup.position.set(100, 50, -150);
    scene.add(sunGroup);
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
    
    cityNodes.forEach(node => {
        const vector = node.position.clone();
        vector.project(camera);
        const x = (vector.x * .5 + .5) * window.innerWidth;
        const y = (-(vector.y * .5) + .5) * window.innerHeight;
        node.userData.label.style.left = `${x}px`;
        node.userData.label.style.top = `${y}px`;

        const meshDistance = camera.position.distanceTo(node.position);
        const globeDistance = camera.position.distanceTo(globe.position);
        node.userData.label.style.display = meshDistance < globeDistance ? 'block' : 'none';
    });

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();

// Theme Toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
    isWhiteMode = !isWhiteMode;
    document.body.classList.toggle('white-mode');
    updateThreeJSTheme();
});

function updateThreeJSTheme() {
    if (isWhiteMode) {
        scene.background = new THREE.Color(0xf0f2f5);
        glow.material.color.setHex(0x0055ff);
        glow.material.opacity = 0.05;
        stars.visible = false;
        
        cityNodes.forEach(node => {
            node.userData.label.style.color = '#1a1a1a';
            node.userData.label.style.textShadow = 'none';
        });
    } else {
        scene.background = new THREE.Color(0x05080a);
        glow.material.color.setHex(0x00d4ff);
        glow.material.opacity = 0.15;
        stars.visible = true;
        
        cityNodes.forEach(node => {
            node.userData.label.style.color = '#00ff41';
            node.userData.label.style.textShadow = '0 0 5px #000';
        });
    }
}

// Neue Funktion zum Updaten der HTML-Elemente
function updateStatsAndLog(isCritical, from, to) {
    const totalEl = document.getElementById("total-attacks");
    const critEl = document.getElementById("critical-attacks");
    const log = document.getElementById("log-content");

    // Zähler erhöhen
    attackCounter++;
    if (totalEl) totalEl.innerText = attackCounter;

    if (isCritical) {
        criticalCounter++;
        if (critEl) critEl.innerText = criticalCounter;
    }

    // Log-Eintrag hinzufügen
    if (log) {
        const entry = document.createElement("div");
        entry.style.color = isCritical ? "#ff0055" : "#00d4ff";
        entry.style.fontSize = "11px";
        entry.style.marginBottom = "4px";
        entry.innerHTML = `> ${isCritical ? 'CRITICAL' : 'DATA'}: ${from} -> ${to}`;
        log.prepend(entry); // Neueste oben

        // Damit das Log nicht unendlich lang wird
        if (log.children.length > 10) log.removeChild(log.lastChild);
    }
}

// Ändere deine createAttackLine Funktion ab, damit sie die Stats aufruft:
function createAttackLine() {
    if (cityNodes.length < 2) return;

    const startNode = cityNodes[Math.floor(Math.random() * cityNodes.length)];
    let endNode = cityNodes[Math.floor(Math.random() * cityNodes.length)];
    while (startNode === endNode) {
        endNode = cityNodes[Math.floor(Math.random() * cityNodes.length)];
    }

    const start = startNode.position.clone();
    const end = endNode.position.clone();
    const mid = start.clone().lerp(end, 0.5).multiplyScalar(1.3); 
    
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)); 

    const isCritical = Math.random() > 0.8; 
    const color = isCritical ? 0xff0055 : 0x00d4ff;
    const material = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 1 });
    const line = new THREE.Line(geometry, material);

    scene.add(line);
    
    // HIER: Das Update für das HTML-Panel aufrufen!
    updateStatsAndLog(isCritical, startNode.userData.name, endNode.userData.name);
    
    fadeOutLine(line);
}