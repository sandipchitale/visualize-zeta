import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

import { initPrimes } from './primes';
import { initZeta } from './zeta';

// --- Global Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// State
let cleanupCurrentScene: (() => void) | null = null;

function switchTab(tab: 'primes' | 'zeta') {
    // Cleanup
    if (cleanupCurrentScene) {
        cleanupCurrentScene();
        cleanupCurrentScene = null;
    }
    
    // Clear Scene Objects (except basic lights if we had global ones, but we reconstruct)
    while(scene.children.length > 0){ 
        scene.remove(scene.children[0]); 
    }
    
    // Reset helper nodes
    const grids = document.querySelectorAll('.label, .prime-label');
    grids.forEach(el => el.remove());

    if (tab === 'primes') {
        cleanupCurrentScene = initPrimes(scene, camera, controls, renderer, labelRenderer);
    } else {
        cleanupCurrentScene = initZeta(scene, camera, controls);
    }
}

// UI Tabs
const tabContainer = document.createElement('div');
tabContainer.style.position = 'absolute';
tabContainer.style.top = '10px';
tabContainer.style.right = '10px';
tabContainer.style.zIndex = '200';
tabContainer.style.display = 'flex';
tabContainer.style.gap = '10px';
document.body.appendChild(tabContainer);

function createButton(text: string, tabName: 'primes' | 'zeta') {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.padding = '8px 16px';
    btn.style.cursor = 'pointer';
    btn.style.background = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.onclick = () => switchTab(tabName);
    return btn;
}

tabContainer.appendChild(createButton('Primes', 'primes'));
tabContainer.appendChild(createButton('Zeta Function', 'zeta'));

// Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation Loop
const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
};
animate();

// Start
switchTab('primes');
