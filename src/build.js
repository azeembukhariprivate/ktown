// Helpers for making the town's shapes: boxes and slopes whose textures are measured in metres (so a wall's plaster
// looks the same size on every wall), and a batcher that joins everything with the same material into one mesh
// (far fewer things for the graphics card to draw, which keeps phones smooth).
import * as THREE from '../vendor/three/three.js';

const { mergeGeometries } = THREE.BufferGeometryUtils;

/** A box w x h x d (centred), with texture coordinates in metres on every side. */
export function boxGeo(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  // Sides in order: +x, -x, +y, -y, +z, -z; each has 4 corners.
  const size = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    uv.setXY(i, uv.getX(i) * size[f][0], uv.getY(i) * size[f][1]);
  }
  return g;
}

/** A flat rectangle on the ground (facing up), texture in metres; `ox`, `oz` shift the texture to match neighbours. */
export function groundGeo(x0, z0, x1, z1, y = 0) {
  const g = new THREE.BufferGeometry();
  const p = [x0, y, z0, x0, y, z1, x1, y, z1, x1, y, z0];
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([x0, -z0, x0, -z1, x1, -z1, x1, -z0], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

/**
 * Flat pieces made of points (a roof slope, a triangle end). Texture: `u` along the given direction, `v` along the
 * slope, in metres from `origin`.
 */
export function polyGeo(faces) {
  const pos = [], nor = [], uv = [], idx = [];
  for (const { pts, uDir, origin } of faces) {
    const a = new THREE.Vector3(...pts[0]), b = new THREE.Vector3(...pts[1]), c = new THREE.Vector3(...pts[2]);
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    const u = new THREE.Vector3(...uDir).normalize(), v = new THREE.Vector3().crossVectors(n, u).normalize();
    const o = new THREE.Vector3(...(origin || pts[0]));
    const base = pos.length / 3;
    for (const p of pts) {
      const q = new THREE.Vector3(...p);
      pos.push(q.x, q.y, q.z);
      nor.push(n.x, n.y, n.z);
      const d = q.clone().sub(o);
      uv.push(d.dot(u), d.dot(v));
    }
    for (let k = 1; k + 1 < pts.length; k++) idx.push(base, base + k, base + k + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/**
 * A hipped roof (four slopes, the usual Kerala shape) over a W x D rectangle with its eaves at y = 0, rising `H`,
 * plus the flat underside. Centred on the origin; the ridge runs along the longer side.
 */
export function hipRoof(W, D, H) {
  const long = W >= D, L = long ? W : D, S = long ? D : W, r = (L - S) / 2;
  // Work with the ridge along x, then turn if needed.
  const x = L / 2, z = S / 2;
  const faces = [
    { pts: [[-x, 0, z], [x, 0, z], [r, H, 0], [-r, H, 0]], uDir: [1, 0, 0] },
    { pts: [[x, 0, -z], [-x, 0, -z], [-r, H, 0], [r, H, 0]], uDir: [-1, 0, 0] },
    { pts: [[x, 0, z], [x, 0, -z], [r, H, 0]], uDir: [0, 0, -1] },
    { pts: [[-x, 0, -z], [-x, 0, z], [-r, H, 0]], uDir: [0, 0, 1] }
  ];
  const roof = polyGeo(faces.map(f => (f.pts.length === 4 && f.pts[3][0] === f.pts[2][0] ? { ...f, pts: f.pts.slice(0, 3) } : f)));
  const under = polyGeo([{ pts: [[-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z]], uDir: [1, 0, 0] }]);
  if (!long) {
    roof.rotateY(Math.PI / 2);
    under.rotateY(Math.PI / 2);
  }
  return { roof, under };
}

/** Joins every shape with the same material into one mesh. */
export class Batcher {
  constructor() {
    this.groups = new Map();
  }

  add(geo, material, matrix = null, { shadow = true } = {}) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone());
    if (matrix) g.applyMatrix4(matrix);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2));
    const key = material.uuid + (shadow ? '' : '-noshadow');
    if (!this.groups.has(key)) this.groups.set(key, { material, list: [], shadow });
    this.groups.get(key).list.push(g);
  }

  /** Adds the batched meshes to `parent`. */
  build(parent) {
    for (const { material, list, shadow } of this.groups.values()) {
      const mesh = new THREE.Mesh(mergeGeometries(list), material);
      mesh.castShadow = shadow;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
    }
    this.groups.clear();
  }
}

/** A matrix from a position, a turn around the up axis, and an optional size. */
export function place(x, y, z, rot = 0, s = 1) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot),
    typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s));
}

/**
 * Copies of a loaded model at many places, drawn together (one draw for each part of the model).
 * `list` items: { x, y, z, rot, scale }.
 */
export function instances(model, list, parent, { shadow = true, chunk = 0 } = {}) {
  if (!list.length) return [];
  if (chunk) {
    // Split into squares of the town, so the ones out of sight aren't drawn.
    const groups = new Map();
    for (const p of list) {
      const k = `${Math.floor(p.x / chunk)},${Math.floor(p.z / chunk)}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(p);
    }
    return [...groups.values()].flatMap(g => instances(model, g, parent, { shadow }));
  }
  model.updateMatrixWorld(true);
  const out = [];
  model.traverse(o => {
    if (!o.isMesh) return;
    const im = new THREE.InstancedMesh(o.geometry, o.material, list.length);
    list.forEach((p, i) => im.setMatrixAt(i, place(p.x, p.y || 0, p.z, p.rot || 0, p.scale || 1).multiply(o.matrixWorld)));
    im.castShadow = shadow;
    im.receiveShadow = true;
    im.computeBoundingSphere();
    parent.add(im);
    out.push(im);
  });
  return out;
}

/** Writing on a board (shop signs): a canvas texture. */
export function signTexture(text, bg, fg = '#ffffff', w = 512, h = 128) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 6;
  g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = fg;
  let size = h * 0.5;
  g.font = `600 ${size}px Fredoka, Arial, sans-serif`;
  while (g.measureText(text).width > w * 0.86 && size > 10) g.font = `600 ${(size -= 2)}px Fredoka, Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
