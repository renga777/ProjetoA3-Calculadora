/* ═══════════════════════════════════════
   GRÁFICO 3D — Three.js
═══════════════════════════════════════ */

let g3Scene, g3Camera, g3Renderer, g3Mesh, g3Frame;
let g3Dragging = false, g3LastX = 0, g3LastY = 0;
let g3RotX = 0.5, g3RotY = 0.4;
let g3Zoom = 5;
let g3Initialized = false;

const G3_PRESETS = [
  { label: 'Ondas',        fn: 'sin(sqrt(x*x+y*y))' },
  { label: 'Sela',         fn: 'x*x - y*y' },
  { label: 'Gaussiana',    fn: 'exp(-(x*x+y*y)/4)' },
  { label: 'Ripple',       fn: 'sin(x)*cos(y)' },
  { label: 'Cone',         fn: 'sqrt(x*x+y*y)' },
  { label: 'Parabolóide',  fn: '(x*x+y*y)/4' },
  { label: 'Espiral',      fn: 'sin(x+y)*cos(x-y)' },
  { label: 'Vulcão',       fn: 'exp(-(x*x+y*y)/2)*sin(3*sqrt(x*x+y*y))' },
];

function g3Init() {
  if (g3Initialized) { g3Resize(); return; }
  g3Initialized = true;

  const canvas = document.getElementById('g3canvas');
  const W = canvas.clientWidth, H = canvas.clientHeight;

  g3Scene    = new THREE.Scene();
  g3Camera   = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
  g3Renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  g3Renderer.setPixelRatio(window.devicePixelRatio);
  g3Renderer.setSize(W, H);
  g3Renderer.setClearColor(0x000000, 0);

  // Iluminação
  g3Scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 7);
  g3Scene.add(dir);

  // Eixos
  g3Scene.add(new THREE.AxesHelper(3));

  // Preenche presets
  const sel = document.getElementById('g3preset');
  if (sel && sel.options.length === 1) {
    G3_PRESETS.forEach(p => {
      const o = document.createElement('option');
      o.value = p.fn; o.textContent = p.label;
      sel.appendChild(o);
    });
  }

  // Eventos mouse
  canvas.addEventListener('mousedown',  e => { g3Dragging = true; g3LastX = e.clientX; g3LastY = e.clientY; });
  canvas.addEventListener('mousemove',  e => {
    if (!g3Dragging) return;
    g3RotY += (e.clientX - g3LastX) * 0.01;
    g3RotX += (e.clientY - g3LastY) * 0.01;
    g3RotX = Math.max(-1.4, Math.min(1.4, g3RotX));
    g3LastX = e.clientX; g3LastY = e.clientY;
  });
  canvas.addEventListener('mouseup',   () => g3Dragging = false);
  canvas.addEventListener('mouseleave',() => g3Dragging = false);
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    g3Zoom = Math.max(2, Math.min(14, g3Zoom + e.deltaY * 0.01));
  }, { passive: false });

  // Touch
  let g3Touch = null;
  canvas.addEventListener('touchstart', e => { g3Touch = e.touches[0]; g3LastX = g3Touch.clientX; g3LastY = g3Touch.clientY; });
  canvas.addEventListener('touchmove',  e => {
    e.preventDefault();
    const t = e.touches[0];
    g3RotY += (t.clientX - g3LastX) * 0.012;
    g3RotX += (t.clientY - g3LastY) * 0.012;
    g3RotX = Math.max(-1.4, Math.min(1.4, g3RotX));
    g3LastX = t.clientX; g3LastY = t.clientY;
  }, { passive: false });

  g3Plot();
  g3Animate();
}

function g3SafeEval(fnStr) {
  const safe = fnStr
    .replace(/\^/g, '**')
    .replace(/\b(sin|cos|tan|sqrt|exp|log|abs|pow|PI|E)\b/g, m => 'Math.' + m);
  return new Function('x', 'y', '"use strict"; return ' + safe + ';');
}

function g3Plot() {
  const input = document.getElementById('g3input').value.trim();
  const errEl = document.getElementById('g3error');
  errEl.textContent = '';

  let fn;
  try { fn = g3SafeEval(input); fn(0, 0); }
  catch { errEl.textContent = 'Função inválida. Ex: sin(sqrt(x*x+y*y))'; return; }

  if (g3Mesh) { g3Scene.remove(g3Mesh); g3Mesh.geometry.dispose(); g3Mesh.material.dispose(); }

  const STEPS = 60, RANGE = 4;
  const geo = new THREE.BufferGeometry();
  const N = STEPS + 1;
  const positions = new Float32Array(N * N * 3);
  const colors    = new Float32Array(N * N * 3);
  const indices   = [];

  let zMin = Infinity, zMax = -Infinity;
  const zVals = new Float32Array(N * N);

  for (let i = 0; i <= STEPS; i++) {
    for (let j = 0; j <= STEPS; j++) {
      const x = (i / STEPS) * RANGE * 2 - RANGE;
      const y = (j / STEPS) * RANGE * 2 - RANGE;
      let z = fn(x, y);
      if (!isFinite(z)) z = 0;
      zVals[i * N + j] = z;
      if (z < zMin) zMin = z;
      if (z > zMax) zMax = z;
    }
  }

  const zRange = zMax - zMin || 1;

  for (let i = 0; i <= STEPS; i++) {
    for (let j = 0; j <= STEPS; j++) {
      const idx = i * N + j;
      const x = (i / STEPS) * RANGE * 2 - RANGE;
      const y = (j / STEPS) * RANGE * 2 - RANGE;
      const z = zVals[idx];
      positions[idx * 3]     = x;
      positions[idx * 3 + 1] = z * (2 / zRange);
      positions[idx * 3 + 2] = y;

      // Cor por altura: azul → roxo → rosa → laranja
      const t = (z - zMin) / zRange;
      const c = new THREE.Color();
      c.setHSL(0.66 - t * 0.55, 1.0, 0.45 + t * 0.2);
      colors[idx * 3]     = c.r;
      colors[idx * 3 + 1] = c.g;
      colors[idx * 3 + 2] = c.b;
    }
  }

  for (let i = 0; i < STEPS; i++) {
    for (let j = 0; j < STEPS; j++) {
      const a = i * N + j, b = a + 1, c = (i + 1) * N + j, d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshPhongMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    shininess: 60,
    specular: new THREE.Color(0x444466),
  });

  g3Mesh = new THREE.Mesh(geo, mat);
  g3Scene.add(g3Mesh);
}

function g3Animate() {
  g3Frame = requestAnimationFrame(g3Animate);
  if (!g3Camera || !g3Renderer) return;

  g3Camera.position.x = g3Zoom * Math.sin(g3RotY) * Math.cos(g3RotX);
  g3Camera.position.y = g3Zoom * Math.sin(g3RotX);
  g3Camera.position.z = g3Zoom * Math.cos(g3RotY) * Math.cos(g3RotX);
  g3Camera.lookAt(0, 0, 0);

  g3Renderer.render(g3Scene, g3Camera);
}

function g3Resize() {
  if (!g3Renderer || !g3Camera) return;
  const canvas = document.getElementById('g3canvas');
  const W = canvas.clientWidth, H = canvas.clientHeight;
  g3Renderer.setSize(W, H);
  g3Camera.aspect = W / H;
  g3Camera.updateProjectionMatrix();
}

function g3SetPreset(val) {
  if (!val) return;
  document.getElementById('g3input').value = val;
  g3Plot();
}

function g3Reset() {
  g3RotX = 0.5; g3RotY = 0.4; g3Zoom = 5;
}

window.addEventListener('resize', g3Resize);
