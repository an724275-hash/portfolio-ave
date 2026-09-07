import * as THREE from './assets/vendor/three.module.min.js';

const stage = document.getElementById('duckStage');
const hint = document.getElementById('duckHint');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let renderer;
try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
} catch {
    hint.textContent = 'Фирменная утка ave dev';
    stage.removeAttribute('tabindex');
}

if (renderer) {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    stage.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 30);
    camera.position.set(0, 1.1, 7.8);
    camera.lookAt(0, .2, 0);
    scene.add(new THREE.HemisphereLight(0xfff7df, 0x80602a, 2.4));
    const key = new THREE.DirectionalLight(0xffffff, 4);
    key.position.set(-3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffdc79, 2.5);
    rim.position.set(4, 3, -3);
    scene.add(rim);

    const duck = new THREE.Group();
    scene.add(duck);
    const yellow = new THREE.MeshStandardMaterial({ color: 0xffc928, roughness: .29, metalness: .03 });
    const wingMaterial = new THREE.MeshStandardMaterial({ color: 0xf2b51b, roughness: .38 });
    const orange = new THREE.MeshStandardMaterial({ color: 0xf17d16, roughness: .36 });
    const black = new THREE.MeshStandardMaterial({ color: 0x17120a, roughness: .18 });
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sphere = new THREE.SphereGeometry(1, 40, 28);
    function part(material, position, scale) {
        const mesh = new THREE.Mesh(sphere, material);
        mesh.position.set(...position);
        mesh.scale.set(...scale);
        duck.add(mesh);
        return mesh;
    }
    part(yellow, [0, -.35, 0], [1.18, .87, .9]);
    part(yellow, [0, .4, .2], [.66, .78, .62]);
    part(yellow, [0, 1.04, .37], [.78, .77, .73]);
    part(orange, [0, .88, 1.02], [.46, .13, .49]);
    part(orange, [0, .76, 1.04], [.42, .085, .42]);
    const billLine = part(black, [0, .807, 1.27], [.34, .012, .18]);
    billLine.material = black.clone();
    billLine.material.color.setHex(0x9e4a11);
    [-1, 1].forEach(side => {
        part(black, [side * .43, 1.23, .942], [.094, .12, .065]);
        part(white, [side * .43 - .018, 1.267, .997], [.025, .03, .012]);
        const wing = part(wingMaterial, [side * 1.03, -.25, .14], [.22, .46, .58]);
        wing.rotation.x = -.25;
        wing.rotation.z = side * -.25;
    });
    const tail = part(yellow, [0, -.03, -.86], [.37, .46, .59]);
    tail.rotation.x = -.55;
    duck.rotation.set(-.07, -.45, 0);

    let targetX = -.07;
    let targetY = -.45;
    let visible = true;
    let frameActive = false;
    let previousTime = 0;
    const clamp = THREE.MathUtils.clamp;
    function draw() {
        renderer.render(scene, camera);
        stage.classList.add('duck-ready');
    }
    function stop() {
        renderer.setAnimationLoop(null);
        frameActive = false;
        previousTime = 0;
    }
    function animate(time) {
        const dt = previousTime ? Math.min((time - previousTime) / 1000, .05) : 1 / 60;
        previousTime = time;
        const smoothing = 1 - Math.exp(-9 * dt);
        duck.rotation.x += (targetX - duck.rotation.x) * smoothing;
        duck.rotation.y += (targetY - duck.rotation.y) * smoothing;
        draw();
        if (Math.abs(targetX - duck.rotation.x) + Math.abs(targetY - duck.rotation.y) < .001) stop();
    }
    function requestRender() {
        if (!visible || document.hidden) return;
        if (reducedMotion.matches) {
            stop();
            duck.rotation.set(-.07, -.45, 0);
            draw();
        } else if (!frameActive) {
            frameActive = true;
            renderer.setAnimationLoop(animate);
        }
    }
    function resize() {
        const width = stage.clientWidth;
        const height = stage.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        draw();
    }
    new ResizeObserver(resize).observe(stage);
    new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (visible) requestRender();
        else stop();
    }).observe(stage);
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : requestRender());
    function updatePointer(event) {
        if (reducedMotion.matches || !visible) return;
        if (event.pointerType === 'touch' && !stage.contains(event.target)) return;
        const bounds = stage.getBoundingClientRect();
        const x = (event.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2);
        const y = (event.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2);
        targetY = clamp(x, -1.5, 1.5) * .85;
        targetX = clamp(y, -1, 1) * .28 - .07;
        requestRender();
    }
    document.getElementById('hero').addEventListener('pointermove', updatePointer, { passive: true });
    document.getElementById('hero').addEventListener('pointerleave', () => {
        targetX = -.07; targetY = -.45; requestRender();
    });
    stage.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'ArrowLeft') targetY -= .25;
        if (event.key === 'ArrowRight') targetY += .25;
        if (event.key === 'ArrowUp') targetX -= .15;
        if (event.key === 'ArrowDown') targetX += .15;
        if (event.key === 'Home') { targetX = -.07; targetY = -.45; }
        targetX = clamp(targetX, -.5, .5);
        targetY = clamp(targetY, -1.5, 1.5);
        requestRender();
    });
    function updateHint() {
        hint.textContent = reducedMotion.matches ? 'Фирменная утка ave dev · движение отключено' : matchMedia('(pointer: coarse)').matches ? 'Проведите пальцем по утке' : 'Поведите курсором — я слежу за вами';
        requestRender();
    }
    reducedMotion.addEventListener('change', updateHint);
    renderer.domElement.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        stop();
        stage.classList.remove('duck-ready');
        hint.textContent = 'Фирменная утка ave dev';
    });
    renderer.domElement.addEventListener('webglcontextrestored', () => { resize(); updateHint(); });
    resize();
    updateHint();
}
