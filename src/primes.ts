import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export function initPrimes(
    scene: THREE.Scene, 
    camera: THREE.PerspectiveCamera, 
    controls: any,
    renderer: THREE.WebGLRenderer,
    labelRenderer: any
) {
    // --- Scene Setup ---
    // Camera defaults for Primes
    // Zoomed out to show more context initially
    camera.position.set(50, 80, 120); 
    camera.lookAt(50, 0, 0);
    controls.target.set(50, 0, 0);

    // --- Helpers ---
    const majorColor = 0xAAAAAA; // Brighter to pop out
    const minorColor = 0x1A1A1A; // Faint against #111

    // Common size for the "Positive Box" (0 to 120)
    const size = 120;
    const halfSize = size / 2;

    // 1. Floor Grid (XZ plane)
    // Minor FIRST (Background)
    const gridXZ_Minor = new THREE.GridHelper(size, size, minorColor, minorColor);
    gridXZ_Minor.position.set(halfSize, 0, halfSize);
    scene.add(gridXZ_Minor);
    // Major SECOND (Foreground)
    const gridXZ = new THREE.GridHelper(size, 12, majorColor, majorColor);
    gridXZ.position.set(halfSize, 0, halfSize); 
    scene.add(gridXZ);

    // 2. Back Grid (XY plane)
    // Minor
    const gridXY_Minor = new THREE.GridHelper(size, size, minorColor, minorColor);
    gridXY_Minor.position.set(halfSize, halfSize, 0);
    gridXY_Minor.rotation.x = Math.PI / 2;
    scene.add(gridXY_Minor);
    // Major
    const gridXY = new THREE.GridHelper(size, 12, majorColor, majorColor);
    gridXY.position.set(halfSize, halfSize, 0);
    gridXY.rotation.x = Math.PI / 2;
    scene.add(gridXY);

    // 3. Side Grid (YZ plane)
    // Minor
    const gridYZ_Minor = new THREE.GridHelper(size, size, minorColor, minorColor);
    gridYZ_Minor.position.set(0, halfSize, halfSize);
    gridYZ_Minor.rotation.z = Math.PI / 2;
    scene.add(gridYZ_Minor);
    // Major
    const gridYZ = new THREE.GridHelper(size, 12, majorColor, majorColor);
    gridYZ.position.set(0, halfSize, halfSize); 
    gridYZ.rotation.z = Math.PI / 2;
    scene.add(gridYZ);

    // --- Data Generation ---
    const maxN = 100;
    const primes: number[] = [];
    const isPrime = (num: number) => {
        if (num < 2) return false;
        for (let i = 2; i <= Math.sqrt(num); i++) {
            if (num % i === 0) return false;
        }
        return true;
    };

    for (let i = 0; i <= maxN; i++) {
        if (isPrime(i)) primes.push(i);
    }

    // --- Axes ---
    const axisMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    
    // X-Axis (White - Number Line)
    const xPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(size, 0, 0)];
    const xGeometry = new THREE.BufferGeometry().setFromPoints(xPoints);
    const xAxis = new THREE.Line(xGeometry, axisMaterial);
    scene.add(xAxis);

    // Y-Axis (Green - π(x))
    const yMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const yPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, size, 0)];
    const yGeometry = new THREE.BufferGeometry().setFromPoints(yPoints);
    const yAxis = new THREE.Line(yGeometry, yMaterial);
    scene.add(yAxis);

    // Z-Axis (Blue)
    const zMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
    const zPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, size)];
    const zGeometry = new THREE.BufferGeometry().setFromPoints(zPoints);
    const zAxis = new THREE.Line(zGeometry, zMaterial);
    scene.add(zAxis);


    // --- 2. Primes on X-Axis ---
    const createdObjects: THREE.Object3D[] = [];

    // Create a single Points object for all primes
    const primePositions: number[] = [];
    primes.forEach(p => {
        primePositions.push(p, 0, 0);

        // Label
        const div = document.createElement('div');
        div.className = 'prime-label';
        div.textContent = p.toString();
        div.style.color = '#ff4444';
        div.style.fontSize = '12px';
        div.style.fontWeight = 'bold';
        
        const label = new CSS2DObject(div);
        label.position.set(p, 1, 0); 
        scene.add(label);
        createdObjects.push(label);
    });

    const primePointsGeo = new THREE.BufferGeometry();
    primePointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(primePositions, 3));
    const primePointsMat = new THREE.PointsMaterial({ color: 0xff0000, size: 4, sizeAttenuation: false });
    const primePoints = new THREE.Points(primePointsGeo, primePointsMat);
    scene.add(primePoints);


    // Grid/Axis Labels (every 10 units)
    for (let i = 0; i <= maxN; i += 10) {
        const div = document.createElement('div');
        div.className = 'label';
        div.textContent = i.toString();
        const label = new CSS2DObject(div);
        label.position.set(i, -2, 0);
        scene.add(label);
        createdObjects.push(label);
    }

    // --- 3. Prime Counting Function π(x) (Cyan) ---
    const stepPoints: THREE.Vector3[] = [];
    stepPoints.push(new THREE.Vector3(0, 0, 0));
    let count = 0;

    for (let i = 0; i < primes.length; i++) {
        const p = primes[i];
        const lastX = stepPoints[stepPoints.length - 1].x;
        
        // Horizontal move to current prime
        if (p > lastX) {
            stepPoints.push(new THREE.Vector3(p, count, 0));
        }
        // Jump up
        count++;
        stepPoints.push(new THREE.Vector3(p, count, 0));
    }
    // Finish line to maxN
    stepPoints.push(new THREE.Vector3(maxN, count, 0));

    const piGeometry = new THREE.BufferGeometry().setFromPoints(stepPoints);
    const piMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 });
    const piLine = new THREE.Line(piGeometry, piMaterial);
    scene.add(piLine);

    // --- 4. Smooth Approximating Function x / ln(x) (Magenta) ---
    const approxPoints: THREE.Vector3[] = [];
    for (let x = 2; x <= maxN; x += 0.5) {
        const y = x / Math.log(x);
        approxPoints.push(new THREE.Vector3(x, y, 0));
    }
    const approxGeometry = new THREE.BufferGeometry().setFromPoints(approxPoints);
    const approxMaterial = new THREE.LineBasicMaterial({ color: 0xff00ff });
    const approxLine = new THREE.Line(approxGeometry, approxMaterial);
    scene.add(approxLine);

    // --- 5. Dirichlet L-function (Visualized as Li(x)) (Orange) ---
    // Note: In examining prime distribution, Li(x) is the primary "L-function" related integral.
    const liPoints: THREE.Vector3[] = [];
    const dt = 0.1;
    let integral = 0; // Starting from 2
    // We'll approximate Li(x) = integral_2^x dt/ln(t) + Li(2). Li(2) ~ 1.045, often ignored or set to 0 for offset.
    // For visualization, starting at 0 is fine, or we can just integrate from 2.
    // Let's integrate carefully.
    
    liPoints.push(new THREE.Vector3(2, 0, 0)); 
    
    for (let x = 2; x <= maxN; x += dt) {
        // Simpson's rule or trapezoidal for step
        const mid = x + dt / 2;
        const val = 1 / Math.log(mid);
        integral += val * dt;
        liPoints.push(new THREE.Vector3(x + dt, integral, 0));
    }

    const liGeometry = new THREE.BufferGeometry().setFromPoints(liPoints);
    const liMaterial = new THREE.LineBasicMaterial({ color: 0xFFA500 }); // Orange
    const liLine = new THREE.Line(liGeometry, liMaterial);
    scene.add(liLine);
    

    // --- UI: Legend ---
    const legend = document.createElement('div');
    legend.className = 'legend-box';
    legend.innerHTML = `
        <h1>Prime Number Distribution</h1>
        <div class="legend-item"><div class="color-dot" style="background:#ff0000"></div>Primes (Points)</div>
        <div class="legend-item"><div class="color-dot" style="background:cyan"></div>Prime Counting Function π(x)</div>
        <div class="legend-item"><div class="color-dot" style="background:magenta"></div>Approximation x / ln(x)</div>
        <div class="legend-item"><div class="color-dot" style="background:orange"></div>Logarithmic Integral Li(x)</div>
    `;
    document.body.appendChild(legend);

    // Return cleanup function
    return () => {
        // Objects are cleared by the main switcher, but if we had events or specific DOM elements we'd clear them.
        // The main switcher clears scene.children, so we just need to ensure no lingering DOM.
        const labels = document.querySelectorAll('.prime-label, .label');
        labels.forEach(e => e.remove());
        legend.remove();
    };
}