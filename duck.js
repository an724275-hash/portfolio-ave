import * as THREE from 'three';
import { GLTFLoader } from './assets/vendor/loaders/GLTFLoader.js';

const stage = document.getElementById('duckStage');
const hint = document.getElementById('duckHint');
const hero = document.getElementById('hero');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

let renderer;
try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
} catch {
    hint.textContent = 'Фирменная утка ave dev';
    stage.removeAttribute('tabindex');
}

if (renderer) {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    stage.prepend(renderer.domElement);
    stage.setAttribute('aria-busy', 'true');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
    camera.position.set(0, 0.15, 6.6);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0xfff7df, 0x513815, 0.84));
    scene.add(new THREE.AmbientLight(0xffefd0, 0.12));
    const key = new THREE.DirectionalLight(0xffe2ad, 1.62);
    key.position.set(-7, 8, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc9dcff, 0.42);
    fill.position.set(4, 1.5, 4.5);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffb43b, 0.62);
    rim.position.set(4, 2, -4);
    scene.add(rim);

    const duck = new THREE.Group();
    scene.add(duck);

    const BASE_PITCH = -0.02;
    const BASE_YAW = -0.34;
    const POINTER_YAW = 0.34;
    const POINTER_PITCH = 0.12;
    let targetPitch = BASE_PITCH;
    let targetYaw = BASE_YAW;
    let visible = true;
    let frameActive = false;
    let previousTime = 0;
    let modelReady = false;
    const clamp = THREE.MathUtils.clamp;

    function draw() {
        renderer.render(scene, camera);
    }

    function stop() {
        renderer.setAnimationLoop(null);
        frameActive = false;
        previousTime = 0;
    }

    function animate(time) {
        const dt = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 1 / 60;
        previousTime = time;
        const easing = 1 - Math.exp(-6.2 * dt);
        duck.rotation.x += (targetPitch - duck.rotation.x) * easing;
        duck.rotation.y += (targetYaw - duck.rotation.y) * easing;
        draw();
        if (Math.abs(targetPitch - duck.rotation.x) + Math.abs(targetYaw - duck.rotation.y) < 0.0007) stop();
    }

    function requestRender() {
        if (!modelReady || !visible || document.hidden) return;
        if (reducedMotion.matches) {
            stop();
            duck.rotation.set(BASE_PITCH, BASE_YAW, 0);
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
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        if (modelReady) draw();
    }

    new GLTFLoader().load(
        './assets/models/ave-duck.glb',
        gltf => {
            const model = gltf.scene;
            const bounds = new THREE.Box3().setFromObject(model);
            const center = bounds.getCenter(new THREE.Vector3());
            const size = bounds.getSize(new THREE.Vector3());
            const scale = 2.65 / size.y;
            model.scale.setScalar(scale);
            model.position.set(-center.x * scale, -center.y * scale + 0.14, -center.z * scale);
            model.traverse(child => {
                if (!child.isMesh) return;
                child.frustumCulled = true;
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(material => {
                    material.envMapIntensity = 0.65;
                    ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'].forEach(key => {
                        if (material[key]) material[key].anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
                    });
                });
            });
            duck.add(model);
            duck.rotation.set(BASE_PITCH, BASE_YAW, 0);
            modelReady = true;
            stage.classList.add('duck-ready');
            stage.removeAttribute('aria-busy');
            resize();
            requestRender();
        },
        undefined,
        () => {
            stage.removeAttribute('aria-busy');
            stage.removeAttribute('tabindex');
            hint.textContent = 'Фирменная утка ave dev';
        }
    );

    new ResizeObserver(resize).observe(stage);
    new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (visible) requestRender();
        else stop();
    }).observe(stage);

    function updatePointer(event) {
        if (reducedMotion.matches || !visible) return;
        if (event.pointerType === 'touch' && !stage.contains(event.target)) return;
        const bounds = stage.getBoundingClientRect();
        const x = (event.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2);
        const y = (event.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2);
        targetYaw = BASE_YAW + clamp(x, -1, 1) * POINTER_YAW;
        targetPitch = BASE_PITCH + clamp(y, -1, 1) * POINTER_PITCH;
        requestRender();
    }

    hero.addEventListener('pointermove', updatePointer, { passive: true });
    hero.addEventListener('pointerleave', () => {
        targetPitch = BASE_PITCH;
        targetYaw = BASE_YAW;
        requestRender();
    });

    stage.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'ArrowLeft') targetYaw -= 0.16;
        if (event.key === 'ArrowRight') targetYaw += 0.16;
        if (event.key === 'ArrowUp') targetPitch -= 0.08;
        if (event.key === 'ArrowDown') targetPitch += 0.08;
        if (event.key === 'Home') {
            targetPitch = BASE_PITCH;
            targetYaw = BASE_YAW;
        }
        targetPitch = clamp(targetPitch, BASE_PITCH - 0.2, BASE_PITCH + 0.2);
        targetYaw = clamp(targetYaw, BASE_YAW - 0.5, BASE_YAW + 0.5);
        requestRender();
    });

    function updateHint() {
        hint.textContent = reducedMotion.matches
            ? 'Фирменная утка ave dev · движение отключено'
            : matchMedia('(pointer: coarse)').matches
                ? 'Проведите пальцем по утке'
                : 'Двигайте курсором, утка повернётся за ним';
        requestRender();
    }

    reducedMotion.addEventListener('change', updateHint);
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : requestRender());
    renderer.domElement.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        stop();
        stage.classList.remove('duck-ready');
        hint.textContent = 'Фирменная утка ave dev';
    });
    renderer.domElement.addEventListener('webglcontextrestored', () => {
        if (modelReady) stage.classList.add('duck-ready');
        resize();
        updateHint();
    });

    resize();
    updateHint();
}
