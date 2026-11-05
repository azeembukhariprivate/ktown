// Coconut palms and banana plants, made in code: palm trunks with real palm bark (Poly Haven), fronds and banana
// leaves drawn on a canvas. A few shapes of each are made, then drawn many times at once.
import * as THREE from '../vendor/three/three.js';
import { rng } from './layout.js';

const { mergeGeometries } = THREE.BufferGeometryUtils;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

/** A palm frond seen flat: a middle rib with thin leaflets either side, pointing towards the tip (top). */
function frondTexture() {
  const [c, g] = canvas(256, 1024);
  const r = rng(11);
  for (let i = 0; i < 120; i++) {
    const t = i / 120, y = 1000 - t * 980; // from the base (bottom) to the tip (top)
    const len = (0.25 + 0.75 * Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.9)) * 118 * (0.85 + r() * 0.3);
    for (const side of [-1, 1]) {
      const green = 70 + r() * 60;
      g.fillStyle = `rgb(${40 + r() * 30},${green + 40},${20 + r() * 25})`;
      g.beginPath();
      const x0 = 128 + side * 4, ang = 0.55 + r() * 0.2;
      const tx = 128 + side * len * Math.cos(ang), ty = y - len * Math.sin(ang);
      g.moveTo(x0, y + 3);
      g.quadraticCurveTo((x0 + tx) / 2 + side * 3, (y + ty) / 2 + 6, tx, ty);
      g.quadraticCurveTo((x0 + tx) / 2 - side * 2, (y + ty) / 2 - 3, x0, y - 5);
      g.fill();
    }
  }
  g.strokeStyle = '#8a7a3a';
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(128, 1024);
  g.lineTo(128, 10);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A banana leaf: wide, bright green, with a pale middle and a few tears at the edges. */
function bananaTexture() {
  const [c, g] = canvas(256, 1024);
  const r = rng(5);
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, '#3f7f1f');
  grad.addColorStop(0.45, '#6fae35');
  grad.addColorStop(0.5, '#c9d98a');
  grad.addColorStop(0.55, '#6fae35');
  grad.addColorStop(1, '#3a7a1c');
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(128, 1020);
  g.bezierCurveTo(10, 900, 6, 200, 128, 6);
  g.bezierCurveTo(250, 200, 246, 900, 128, 1020);
  g.fill();
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 26; i++) {
    const side = r() < 0.5 ? -1 : 1, y = 80 + r() * 860, x = side < 0 ? 0 : 256;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(128 + side * (10 + r() * 30), y - 30 - r() * 40);
    g.lineTo(x, y - 4);
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = 'rgba(40,70,20,0.35)';
  g.lineWidth = 1;
  for (let y = 40; y < 1000; y += 9) {
    g.beginPath();
    g.moveTo(128, y);
    g.lineTo(20, y - 50);
    g.moveTo(128, y);
    g.lineTo(236, y - 50);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A leaf strip along a drooping curve, folded a little in a V along its rib. */
function leafGeo(len, width, droop, fold, segs = 10, widthAt = t => Math.sin(Math.min(1, t * 1.2) * Math.PI * 0.95)) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    // Out along +z, rising a little then drooping.
    const z = len * t * (1 - 0.15 * droop * t), y = len * (0.35 * t - droop * t * t);
    const w = width * Math.max(0.12, widthAt(t)) / 2;
    for (const [s, u] of [[-1, 0], [0, 0.5], [1, 1]]) {
      pos.push(s * w, y - Math.abs(s) * fold * w, z);
      uv.push(u, t);
    }
    if (i < segs) {
      const a = i * 3;
      idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A trunk along a gentle curve: thick at the base, rings of bark all the way up. */
function trunkGeo(h, lean, r0, r1, rings = 0.55) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push(new THREE.Vector3(Math.sin(t * 1.2) * lean * h * 0.5, t * h, 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.TubeGeometry(curve, 14, 1, 7, false);
  // Taper it: TubeGeometry gives a fixed radius of 1, so pull each ring in.
  const p = tube.attributes.position, uv = tube.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const t = uv.getX(i);
    const c = curve.getPointAt(t);
    const rad = (r0 + (r1 - r0) * t) * (1 + 0.6 * Math.max(0, 1 - t * 12));
    p.setXYZ(i, c.x + (p.getX(i) - c.x) * rad, p.getY(i) * 0 + c.y + (p.getY(i) - c.y) * rad, c.z + (p.getZ(i) - c.z) * rad);
    uv.setXY(i, uv.getY(i) * 1.0, (t * h) / rings);
  }
  tube.computeVertexNormals();
  return { geo: tube, top: curve.getPointAt(1) };
}

const UP = new THREE.Vector3(0, 1, 0);

/** Makes `kinds` shapes of coconut palm. Each is { trunk, crown, nuts } geometries, sized for a 10 m palm. */
function palmShapes(kinds = 4) {
  const out = [];
  for (let k = 0; k < kinds; k++) {
    const r = rng(100 + k);
    const h = 10, lean = 0.15 + r() * 0.35;
    const { geo: trunk, top } = trunkGeo(h, lean, 0.17, 0.12);
    const leaves = [];
    const n = 15 + ((r() * 5) | 0);
    for (let i = 0; i < n; i++) {
      const young = i < 4;
      const len = young ? 2.6 + r() : 3.6 + r() * 1.4;
      const g = leafGeo(len, 1.5, young ? 0.1 : 0.55 + r() * 0.35, 0.35, 7);
      const tilt = young ? -0.9 - r() * 0.3 : -0.2 + r() * 0.5;
      g.applyMatrix4(new THREE.Matrix4().makeRotationX(tilt));
      g.applyMatrix4(new THREE.Matrix4().makeRotationY((i / n) * Math.PI * 2 + r() * 0.4));
      g.translate(top.x, top.y - 0.15, top.z);
      leaves.push(g);
    }
    // Coconuts under the leaves: coloured from the frond picture's rib, so they're part of the same drawing.
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + r(), s = new THREE.SphereGeometry(0.13, 6, 4);
      s.scale(1, 1.15, 1);
      s.translate(top.x + Math.cos(a) * 0.22, top.y - 0.45 - r() * 0.15, top.z + Math.sin(a) * 0.22);
      const uv = s.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, 0.5, 0.5);
      leaves.push(s.toNonIndexed());
    }
    out.push({ trunk, crown: mergeGeometries(leaves.map(g => (g.index ? g.toNonIndexed() : g))) });
  }
  return out;
}

function bananaShapes(kinds = 3) {
  const out = [];
  for (let k = 0; k < kinds; k++) {
    const r = rng(200 + k);
    const stem = new THREE.CylinderGeometry(0.1, 0.16, 2.2, 8, 3);
    stem.translate(0, 1.1, 0);
    const leaves = [];
    for (let i = 0; i < 7; i++) {
      const g = leafGeo(1.8 + r() * 0.6, 0.55, 0.35 + r() * 0.4, 0.05, 8, t => Math.sin(t * Math.PI) * 0.9 + 0.1);
      g.translate(0, 0, 0.1);
      g.applyMatrix4(new THREE.Matrix4().makeRotationX(-0.6 + r() * 0.5));
      g.applyMatrix4(new THREE.Matrix4().makeRotationY((i / 7) * Math.PI * 2 + r() * 0.5));
      g.translate(0, 2.1, 0);
      leaves.push(g);
    }
    out.push({ stem, leaves: mergeGeometries(leaves) });
  }
  return out;
}

/**
 * Adds every coconut palm and banana plant of the town to `parent`. `palms` items: { x, z, h, lean, dir, kind };
 * `bananas`: { x, z, h, dir }. Returns the meshes (they sway a little in the wind: `sway(t)`).
 */
export function addPlants(parent, assets, palms, bananas, { far = 140 } = {}) {
  const shapes = palmShapes(3);
  const bark = assets.material('palm', { scale: 1.2, tint: '#d9cdb8' });
  const frond = new THREE.MeshStandardMaterial({ map: frondTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 });
  // Palms are drawn in squares of the town, so the ones out of sight (and out of the sun's shadow area) are skipped.
  const CHUNK = 64, chunks = new Map();
  for (const p of palms) {
    if (Math.max(Math.abs(p.x), Math.abs(p.z)) > far) continue;
    const key = `${Math.floor(p.x / CHUNK)},${Math.floor(p.z / CHUNK)},${p.kind % shapes.length}`;
    if (!chunks.has(key)) chunks.set(key, []);
    chunks.get(key).push(p);
  }
  for (const [key, list] of chunks) {
    const s = shapes[Number(key.split(',')[2])];
    // Stretching the trunk upwards keeps its top's sideways lean, so the crown just moves up by the same amount.
    const trunkM = list.map(p => new THREE.Matrix4().compose(new THREE.Vector3(p.x, 0, p.z),
      new THREE.Quaternion().setFromAxisAngle(UP, p.dir), new THREE.Vector3(1, p.h / 10, 1)));
    const crownM = list.map(p => new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.h - 10, p.z),
      new THREE.Quaternion().setFromAxisAngle(UP, p.dir), new THREE.Vector3(1, 1, 1)));
    for (const [geo, mat, ms] of [[s.trunk, bark, trunkM], [s.crown, frond, crownM]]) {
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      ms.forEach((m, i) => im.setMatrixAt(i, m));
      im.castShadow = true;
      im.receiveShadow = true;
      im.computeBoundingSphere();
      parent.add(im);
    }
  }

  const banana = bananaShapes(3);
  const leafMat = new THREE.MeshStandardMaterial({ map: bananaTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 });
  const stemMat = new THREE.MeshStandardMaterial({ color: '#7d8a3c', roughness: 0.8 });
  banana.forEach((b, k) => {
    const list = bananas.filter((p, i) => i % banana.length === k);
    if (!list.length) return;
    for (const [geo, mat] of [[b.stem, stemMat], [b.leaves, leafMat]]) {
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((p, i) => im.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(p.x, 0, p.z),
        new THREE.Quaternion().setFromAxisAngle(UP, p.dir), new THREE.Vector3(p.h / 3, p.h / 3, p.h / 3))));
      im.castShadow = true;
      im.receiveShadow = true;
      im.computeBoundingSphere();
      parent.add(im);
    }
  });
  return {};
}
