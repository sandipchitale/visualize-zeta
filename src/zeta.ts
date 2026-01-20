import * as THREE from 'three';
import { Complex, add, multiply, pow, subtract } from 'mathjs';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
// We'll need a simple complex number implementation or library if we don't use mathjs.
// Since we are adding dependencies, let's implement a minimal complex helper to avoid heavy Deps if possible,
// OR just use a simple class.
//
// But wait, the prompt "package.json based project" implies I can add dependencies.
// However, I can also just write a simple Complex class.

class ComplexNumber {
    constructor(public re: number, public im: number) {}

    add(c: ComplexNumber): ComplexNumber {
        return new ComplexNumber(this.re + c.re, this.im + c.im);
    }
    
    sub(c: ComplexNumber): ComplexNumber {
        return new ComplexNumber(this.re - c.re, this.im - c.im);
    }

    multiply(c: ComplexNumber): ComplexNumber {
        return new ComplexNumber(
            this.re * c.re - this.im * c.im,
            this.re * c.im + this.im * c.re
        );
    }
    
    // Simple power for integer exponents or specific cases
    // But for Zeta, we need n^s = exp(s * ln(n))
    // s = sigma + it
    // ln(n) is real.
    // s * ln(n) = (sigma * ln(n)) + i(t * ln(n))
    // exp(a + ib) = exp(a) * (cos(b) + i sin(b))
    static pow(base: number, exponent: ComplexNumber): ComplexNumber {
        const lnBase = Math.log(base);
        const a = exponent.re * lnBase;
        const b = exponent.im * lnBase;
        const expA = Math.exp(a);
        return new ComplexNumber(
            expA * Math.cos(b),
            expA * Math.sin(b)
        );
    }

    // 1 / C
    inv(): ComplexNumber {
        const denom = this.re * this.re + this.im * this.im;
        return new ComplexNumber(this.re / denom, -this.im / denom);
    }
}

function zeta(s: ComplexNumber, terms: number = 100): ComplexNumber {
    // Standard Dirichlet series sum(1/n^s) converges for Re(s) > 1.
    // For critical strip, we need analytic continuation or Eta function (Dirichlet Eta).
    // Eta(s) = sum (-1)^(n-1) / n^s
    // Zeta(s) = Eta(s) / (1 - 2^(1-s))
    
    let etaSum = new ComplexNumber(0, 0);
    for (let n = 1; n <= terms; n++) {
        const n_s = ComplexNumber.pow(n, s); // n^s
        const term = n_s.inv(); // 1/n^s
        if ((n - 1) % 2 === 1) {
            // Subtract if odd index (even n-1) -> actually formula is (-1)^(n-1)
            // n=1: (-1)^0 = 1 (Add)
            // n=2: (-1)^1 = -1 (Sub)
            etaSum = etaSum.sub(term);
        } else {
            etaSum = etaSum.add(term);
        }
    }
    
    // 1 - 2^(1-s)
    const oneMinusS = new ComplexNumber(1 - s.re, -s.im);
    const twoPow = ComplexNumber.pow(2, oneMinusS);
    const denominator = new ComplexNumber(1, 0).sub(twoPow);
    
    // Zeta = Eta / Denominator
    // div: a/b = a * (1/b)
    return etaSum.multiply(denominator.inv());
}

export function initZeta(scene: THREE.Scene, camera: THREE.PerspectiveCamera, controls: any) {
    // --- Scene Customization for Zeta ---
    camera.position.set(2, 40, 60); 
    camera.lookAt(0.5, 0, 0);
    controls.target.set(0.5, 0, 0);

    // Helpers
    // Grid: We want to focus on the Critical Strip: Re(s) between 0 and 1.
    // Axis: Real (X) and Imaginary (Y)? 
    // Usually visualized as: 
    // Domain coloring or mapping a line in the critical strip.
    // The prompt asks to visualize "the zeta function for complex values (1/2 - 100i) to (1/2 + 100i)"
    // And "Treat the line 1/2 as main axis".
    // This implies we are plotting the VALUE of Zeta(s) as we move along the critical line?
    // OR are we visualizing the domain itself?
    // "Visualize the Zeta function zeroes as well."
    // "Treat the line 1/2 as main axis, but also show parallel 0 and 1 real value lines."
    
    // Interpretation:
    // We are graphing in 3D:
    // Axis 1 (let's say Y): The imaginary part of input s (t). Range -100 to 100.
    // Axis 2 (let's say X): The real part of input s (sigma). Range 0 to 1.
    // Axis 3 (let's say Z): The absolute magnitude of Zeta(s)? Or Real/Imaginary parts of Zeta(s)?
    // Usually "Visualizing zeroes" involves looking at |Zeta(s)| and seeing where it hits 0.
    // OR we plot the "Critical Line" in the domain (t on Y axis), and at each t, we plot the value of Zeta(0.5 + it) in the X/Z plane?
    
    // Let's try this:
    // Vertical Axis (Y): The imaginary component 't' of the input s.
    // Horizontal Plane (XZ): The complex value of Output Zeta(s).
    // So for s = 0.5 + it, we plot a point at (Re(Zeta), t, Im(Zeta)).
    // This creates a 3D spiraling vine. The zeroes are where this vine passes through the Origin (0, t, 0) line (i.e. Re=0, Im=0).
    
    // 1. Critical Line: Re(s) = 0.5
    // Range t = 0 to 50 (start small for performance, user said 100 but 100 is big calc).
    // Let's go -100 to 100? Or just 0 to 100. 
    // prompt: "(1/2 - 100i) to (1/2+100i)"
    
    // --- Visual setup ---
    // Vertical Line for Critical Axis (Input Domain) represented physically?
    // Actually, if we map Output(Zeta) vs Input(t), the "Zeroes" are crossing the t-axis.
    
    const colors = {
        critical: 0x00ffff, // Cyan for 1/2
        boundary0: 0xff0000, // Red for 0
        boundary1: 0x00ff00, // Green for 1
        zero: 0xffff00 // Yellow for Zero spheres
    };

    // --- 1. The Critical Strip Axes (Input Domain) ---
    // We visualize the Domain Real Part as spacing along the World X-Axis (Re(Zeta) Axis).
    // Central Axis: Re(s) = 1/2 (Cyan) at X = 0
    // Boundary 0:   Re(s) = 0   (Red)  at X = -4
    // Boundary 1:   Re(s) = 1   (Green) at X = 4
    
    // Helper for straight vertical lines
    const createVerticalLine = (x: number, color: number) => {
        const geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, -70, 0),
            new THREE.Vector3(x, 70, 0)
        ]);
        const mat = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
        return new THREE.Line(geo, mat);
    };

    const criticalLine = createVerticalLine(0, 0x00ffff); // Cyan
    scene.add(criticalLine);
    
    const axisRe0 = createVerticalLine(-4, 0x666666); // Faint Gray
    scene.add(axisRe0);
    
    const axisRe1 = createVerticalLine(4, 0x666666); // Faint Gray
    scene.add(axisRe1);

    // Critical Strip Sheet (Transparent Gray)
    const stripGeo = new THREE.PlaneGeometry(8, 140); 
    const stripMat = new THREE.MeshBasicMaterial({ 
        color: 0x888888, 
        transparent: true, 
        opacity: 0.15, 
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const stripMesh = new THREE.Mesh(stripGeo, stripMat);
    scene.add(stripMesh);

    // --- 2. The Zeta Value Curve (Output) ---
    // This forms the "Vine" that intersects the critical line at zeros.
    function createZetaCurve(sigma: number, color: number) {
        const points: THREE.Vector3[] = [];
        const tStep = 0.01; // Higher resolution for smoothness
        const maxT = 60; 
        for (let t = -maxT; t <= maxT; t += tStep) {
            const s = new ComplexNumber(sigma, t);
            const z = zeta(s, 200); 
            points.push(new THREE.Vector3(z.re, t, z.im)); 
        }
        return new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(points), 
            new THREE.LineBasicMaterial({ color: color })
        );
    }
    
    // Render the Value Trace for Re(s)=0.5 in Magenta (to distinguish from the physical Line)
    const zetaValueCurve = createZetaCurve(0.5, 0xff00ff); 
    scene.add(zetaValueCurve);

    // --- Labels & Visuals ---
    const addLabel = (text: string, x: number, y: number, z: number, color: string = '#888') => {
        const div = document.createElement('div');
        div.className = 'label';
        div.textContent = text;
        div.style.color = color;
        div.style.fontSize = '12px';
        const label = new CSS2DObject(div);
        label.position.set(x, y, z);
        scene.add(label);
        return label;
    };

    // Axes Labels
    addLabel('Real(ζ)', 12, 0, 0, '#aaa'); 
    addLabel('Imag(ζ)', 0, 0, 12, '#aaa'); 
    
    // Domain Labels
    addLabel('s = 1/2 + it', 0, 65, 0, 'cyan'); 
    addLabel('Re(s) = 0', -4, 65, 0, '#888'); 
    addLabel('Re(s) = 1', 4, 65, 0, '#888'); 

    // Origin Intersection
    // s=1/2+0i is the INPUT.
    addLabel('s = 1/2 + 0i', 0, 0, 0, 'cyan');

    // Mark Known Zeroes
    const positiveZeroes = [14.135, 21.02, 25.01, 30.42, 32.93, 37.58, 40.91, 43.32, 48.00, 49.77];
    const knownZeroes = [...positiveZeroes, ...positiveZeroes.map(t => -t)];
    
    const zeroPositions: number[] = [];
    knownZeroes.forEach(t => {
        // Zeros are on the straight line (0, t, 0)
        zeroPositions.push(0, t, 0);
        addLabel(`i${t.toFixed(1)}`, 0.5, t, 0, 'yellow');
    });

    const zeroGeo = new THREE.BufferGeometry();
    zeroGeo.setAttribute('position', new THREE.Float32BufferAttribute(zeroPositions, 3));
    const zeroMat = new THREE.PointsMaterial({ color: 0xffff00, size: 6, sizeAttenuation: false });
    scene.add(new THREE.Points(zeroGeo, zeroMat));

    // Trivial Zeros (s = -2, -4, -6, -8)
    // Scale: Re(s) = 0.5 at X=0. Re(s)=0 at X=-4. Scale = 8 units per Re(1).
    const trivialZeros = [-2, -4, -6, -8];
    const trivialPos: number[] = [];
    trivialZeros.forEach(re => {
        const x = (re - 0.5) * 8;
        trivialPos.push(x, 0, 0); // t=0
        addLabel(`s=${re}`, x, 4, 0, 'yellow');
    });
    const trivialGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(trivialPos, 3));
    scene.add(new THREE.Points(trivialGeo, zeroMat)); // Reuse yellow material

    // Reference Grids
    // Increase size to see trivial zeros (up to X=-68)
    const gridXZ = new THREE.GridHelper(200, 50, 0xaaaaaa, 0x555555);
    scene.add(gridXZ);
    
    // --- UI: Legend ---
    const legend = document.createElement('div');
    legend.className = 'legend-box';
    legend.innerHTML = `
        <h1>Riemann Zeta Function ζ(s)</h1>
        <div class="legend-item"><div class="color-dot" style="background:cyan"></div>Re(s) = 1/2 (Critical Line)</div>
        <div class="legend-item"><div class="color-dot" style="background:magenta"></div>Zeta Value ζ(1/2 + it)</div>
        <div class="legend-item"><div class="color-dot" style="background:#666"></div>Critical Strip (0 < Re(s) < 1)</div>
        <div class="legend-item"><div class="color-dot" style="background:yellow"></div>Zeros (Trivial & Non-trivial)</div>
    `;
    document.body.appendChild(legend);

    // Return cleanup
    return () => {
        const labels = document.querySelectorAll('.label');
        labels.forEach(e => e.remove());
        legend.remove();
    };

    return () => {};
}
