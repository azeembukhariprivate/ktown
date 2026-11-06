// The vehicles, made in code: autorickshaws, scooters, motorbikes, cars, the town bus, a lorry, and Inaara's own
// bicycle. Each faces +z (forward) with its middle at the origin, wheels on the ground. Parts with the same
// material are joined (build.js), so each vehicle is only a few drawings.
import * as THREE from '../vendor/three/three.js';
import { boxGeo, Batcher, place, signTexture } from './build.js';

const cache = new Map();
function mat(colour, { rough = 0.5, metal = 0.1, emissive = null, opacity = 1 } = {}) {
  const key = [colour, rough, metal, emissive, opacity].join('|');
  if (!cache.has(key)) {
    const m = new THREE.MeshStandardMaterial({ color: colour, roughness: rough, metalness: metal });
    if (emissive) {
      m.emissive = new THREE.Color(emissive);
      m.emissiveIntensity = 0;
      m.userData.glow = true;
    }
    if (opacity < 1) {
      m.transparent = true;
      m.opacity = opacity;
    }
    cache.set(key, m);
  }
  return cache.get(key);
}
const TYRE = () => mat('#1b1b1b', { rough: 0.9 });
const GLASS = () => mat('#22303a', { rough: 0.08, metal: 0.6, opacity: 0.85 });
const CHROME = () => mat('#c9cdd2', { rough: 0.2, metal: 0.9 });
const LAMP = () => mat('#fff6dc', { rough: 0.2, emissive: '#fff1c4' });
const TAIL = () => mat('#a01010', { rough: 0.3, emissive: '#ff2a1a' });

function wheel(B, r, w, x, y, z, rim = '#9a9a9a') {
  const tyre = new THREE.CylinderGeometry(r, r, w, 16);
  tyre.rotateZ(Math.PI / 2);
  B.add(tyre, TYRE(), place(x, y, z));
  const hub = new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 12);
  hub.rotateZ(Math.PI / 2);
  B.add(hub, mat(rim, { rough: 0.4, metal: 0.6 }), place(x, y, z));
}

/** A person sitting (a driver or rider): shirt, skin, hair, legs forward, hands out to the handlebar or wheel. */
export function seated(B, { shirt = '#ffffff', skin = '#9b6644', hair = '#141110', lower = '#2b2b33', helmet = null, x = 0, y = 0, z = 0, reach = 0.35 }) {
  const torso = new THREE.CylinderGeometry(0.17, 0.15, 0.55, 10);
  B.add(torso, mat(shirt, { rough: 0.8 }), place(x, y + 0.3, z));
  for (const s of [-1, 1]) {
    // Thighs forward, shins down.
    const th = new THREE.CylinderGeometry(0.06, 0.055, 0.42, 8);
    th.rotateX(Math.PI / 2);
    B.add(th, mat(lower, { rough: 0.8 }), place(x + s * 0.09, y + 0.03, z + 0.2));
    B.add(new THREE.CylinderGeometry(0.05, 0.045, 0.42, 8), mat(lower, { rough: 0.8 }), place(x + s * 0.11, y - 0.18, z + 0.41));
    // Arms reaching forward.
    const arm = new THREE.CylinderGeometry(0.04, 0.035, 0.5, 8);
    arm.rotateX(Math.PI / 2 - 0.5);
    B.add(arm, mat(skin, { rough: 0.7 }), place(x + s * 0.2, y + 0.4, z + reach * 0.6));
  }
  B.add(new THREE.SphereGeometry(0.105, 12, 10), mat(skin, { rough: 0.7 }), place(x, y + 0.72, z));
  if (helmet) B.add(new THREE.SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(helmet, { rough: 0.3 }), place(x, y + 0.74, z));
  else B.add(new THREE.SphereGeometry(0.11, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(hair, { rough: 0.8 }), place(x, y + 0.74, z - 0.01));
}

const SHIRTS = ['#f2f2f2', '#9cc3e6', '#e8d27a', '#c94c4c', '#5a8f5a', '#3d5a99', '#f0b27a', '#b39ddb'];
const SKINS = ['#8d5a3b', '#a8714c', '#c08a62', '#7a4a2e', '#b57e58'];
const pick = (a, t) => a[Math.floor(t * a.length) % a.length];

/** An autorickshaw: black body, yellow canopy, one wheel in front, a driver; room in the back for a passenger. */
export function makeAuto(look = 0.3, withDriver = true) {
  const B = new Batcher(), g = new THREE.Group();
  const body = mat(look < 0.75 ? '#151515' : '#1f5f2c', { rough: 0.35, metal: 0.3 });
  const top = mat(look < 0.75 ? '#f2c318' : '#f2d23a', { rough: 0.7 });
  B.add(boxGeo(1.3, 0.22, 2.3), body, place(0, 0.4, -0.1));
  // The nose with its headlight, the windscreen, the handlebar.
  B.add(boxGeo(0.62, 0.75, 0.42), body, place(0, 0.72, 1.05));
  B.add(boxGeo(0.95, 0.35, 0.5), body, place(0, 0.62, 0.7));
  B.add(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 14).rotateX(Math.PI / 2), LAMP(), place(0, 0.98, 1.28));
  B.add(boxGeo(1.12, 0.5, 0.03), GLASS(), place(0, 1.25, 0.9).multiply(new THREE.Matrix4().makeRotationX(-0.25)));
  B.add(boxGeo(0.7, 0.04, 0.04), CHROME(), place(0, 1.0, 0.75));
  // The back: sides up to the seat, a bench seat, the engine cover, tail lights.
  for (const s of [-1, 1]) B.add(boxGeo(0.05, 0.55, 1.25), body, place(s * 0.65, 0.78, -0.55));
  B.add(boxGeo(1.3, 0.6, 0.06), body, place(0, 0.8, -1.2));
  B.add(boxGeo(1.15, 0.12, 0.55), mat('#5a2a1a', { rough: 0.6 }), place(0, 0.86, -0.85));
  B.add(boxGeo(1.15, 0.5, 0.1), mat('#5a2a1a', { rough: 0.6 }), place(0, 1.12, -1.12));
  for (const s of [-1, 1]) B.add(boxGeo(0.12, 0.08, 0.03), TAIL(), place(s * 0.5, 0.75, -1.24));
  // The canopy: a rounded roof on thin posts.
  // The canopy: a rounded roof (yellow outside, dark inside) on thin posts, high enough for a passenger.
  const roof = new THREE.CylinderGeometry(0.68, 0.68, 2.25, 20, 1, true, -Math.PI / 2, Math.PI);
  roof.rotateX(Math.PI / 2);
  roof.rotateZ(Math.PI / 2);
  roof.scale(1, 0.42, 1);
  B.add(roof, top, place(0, 1.62, -0.15));
  const under = mat('#202020', { rough: 0.9 });
  const inside = under.clone();
  inside.side = THREE.BackSide;
  B.add(roof.clone().scale(0.985, 0.97, 0.995), inside, place(0, 1.62, -0.15));
  // The canopy's edge strip and the front and back of the roof.
  for (const z of [0.97, -1.27]) B.add(boxGeo(1.36, 0.08, 0.05), top, place(0, 1.62, z));
  for (const [x, z] of [[-0.64, 0.9], [0.64, 0.9], [-0.64, -1.2], [0.64, -1.2]]) B.add(new THREE.CylinderGeometry(0.025, 0.025, 0.75, 6), body, place(x, 1.25, z));
  wheel(B, 0.22, 0.14, 0, 0.22, 0.95);
  for (const s of [-1, 1]) wheel(B, 0.22, 0.16, s * 0.6, 0.22, -0.75);
  if (withDriver) seated(B, { shirt: pick(['#f4f4f4', '#d9c79a', '#8fb7d6'], look * 3.7), skin: pick(SKINS, look * 7.1), x: 0, y: 0.6, z: 0.25, reach: 0.4 });
  build(B, g);
  return finish(g);
}

/** A scooter or a motorbike, with its rider. */
export function makeTwoWheeler(kind, look = 0.5) {
  const B = new Batcher(), g = new THREE.Group();
  const paint = mat(pick(['#c62828', '#1565c0', '#f4f4f4', '#2e7d32', '#212121', '#6a1b9a'], look * 5.3), { rough: 0.3, metal: 0.4 });
  if (kind === 'scooter') {
    B.add(boxGeo(0.45, 0.5, 1.0), paint, place(0, 0.55, -0.3));
    B.add(boxGeo(0.4, 0.7, 0.15), paint, place(0, 0.7, 0.45));
    B.add(boxGeo(0.38, 0.06, 0.55), paint, place(0, 0.3, 0.2));
    B.add(boxGeo(0.36, 0.1, 0.62), mat('#1d1d1d', { rough: 0.7 }), place(0, 0.84, -0.35));
  } else {
    B.add(boxGeo(0.32, 0.25, 0.5), paint, place(0, 0.85, 0.2));
    B.add(boxGeo(0.25, 0.3, 0.5), mat('#2b2b2b', { rough: 0.5, metal: 0.6 }), place(0, 0.5, 0.05));
    B.add(boxGeo(0.3, 0.1, 0.6), mat('#1d1d1d', { rough: 0.7 }), place(0, 0.86, -0.35));
    B.add(new THREE.CylinderGeometry(0.04, 0.05, 0.7, 8).rotateX(Math.PI / 2), CHROME(), place(0.18, 0.35, -0.4));
  }
  B.add(boxGeo(0.6, 0.04, 0.04), CHROME(), place(0, 1.05, 0.5));
  B.add(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12).rotateX(Math.PI / 2), LAMP(), place(0, 0.98, 0.58));
  B.add(boxGeo(0.12, 0.06, 0.03), TAIL(), place(0, 0.7, -0.72));
  const r = kind === 'scooter' ? 0.24 : 0.32;
  wheel(B, r, 0.1, 0, r, 0.65);
  wheel(B, r, 0.1, 0, r, -0.6);
  seated(B, { shirt: pick(SHIRTS, look * 9.7), skin: pick(SKINS, look * 4.3), helmet: look > 0.35 ? pick(['#f4f4f4', '#c62828', '#212121'], look * 11) : null, x: 0, y: 0.82, z: -0.25, reach: 0.55 });
  build(B, g);
  return finish(g);
}

/** A small car. */
export function makeCar(look = 0.5) {
  const B = new Batcher(), g = new THREE.Group();
  const paint = mat(pick(['#f4f4f4', '#b71c1c', '#9e9e9e', '#1a237e', '#263238', '#d0b88a'], look * 6.1), { rough: 0.25, metal: 0.55 });
  B.add(boxGeo(1.7, 0.6, 3.9), paint, place(0, 0.6, 0));
  B.add(boxGeo(1.55, 0.55, 2.0), GLASS(), place(0, 1.17, -0.25));
  B.add(boxGeo(1.6, 0.08, 1.95), paint, place(0, 1.47, -0.25));
  for (const s of [-1, 1]) {
    B.add(boxGeo(0.1, 0.55, 0.06), paint, place(s * 0.75, 1.17, 0.73));
    B.add(boxGeo(0.25, 0.12, 0.04), LAMP(), place(s * 0.6, 0.7, 1.96));
    B.add(boxGeo(0.25, 0.12, 0.04), TAIL(), place(s * 0.6, 0.75, -1.96));
  }
  B.add(boxGeo(1.72, 0.12, 0.08), CHROME(), place(0, 0.38, 1.95));
  for (const [x, z] of [[-0.78, 1.25], [0.78, 1.25], [-0.78, -1.25], [0.78, -1.25]]) wheel(B, 0.3, 0.2, x, 0.3, z);
  seated(B, { shirt: pick(SHIRTS, look * 3.3), skin: pick(SKINS, look * 2.9), x: 0.38, y: 0.75, z: 0.1, reach: 0.4 });
  build(B, g);
  return finish(g);
}

/** The town bus: a brightly painted private bus with its route board. */
export function makeBus(look = 0.5) {
  const B = new Batcher(), g = new THREE.Group();
  const paint = mat(look < 0.5 ? '#1e88e5' : '#e53935', { rough: 0.35, metal: 0.3 });
  const stripe = mat('#fdd835', { rough: 0.4 });
  B.add(boxGeo(2.45, 1.2, 10), paint, place(0, 0.95, 0));
  B.add(boxGeo(2.46, 0.18, 10.02), stripe, place(0, 1.35, 0));
  B.add(boxGeo(2.4, 0.95, 9.6), GLASS(), place(0, 2.0, -0.1));
  for (let z = -4.6; z <= 4.4; z += 1.15) for (const s of [-1, 1]) B.add(boxGeo(0.05, 0.95, 0.14), paint, place(s * 1.22, 2.0, z));
  B.add(boxGeo(2.45, 0.6, 10), paint, place(0, 2.75, 0));
  B.add(boxGeo(2.3, 0.08, 9.8), mat('#e0e0e0', { rough: 0.6 }), place(0, 3.08, 0));
  const board = new THREE.MeshStandardMaterial({ map: signTexture('KAVALA', '#111111', '#ffd54f', 512, 96), roughness: 0.5 });
  B.add(boxGeo(1.6, 0.3, 0.04), board, place(0, 2.75, 5.02));
  for (const s of [-1, 1]) {
    B.add(boxGeo(0.3, 0.18, 0.04), LAMP(), place(s * 0.85, 0.75, 5.01));
    B.add(boxGeo(0.25, 0.2, 0.04), TAIL(), place(s * 0.9, 0.8, -5.01));
  }
  for (const z of [3.3, -2.9]) for (const s of [-1, 1]) wheel(B, 0.5, 0.35, s * 1.05, 0.5, z, '#d0d0d0');
  seated(B, { shirt: '#9cc3e6', x: 0.75, y: 1.1, z: 4.2, reach: 0.45 });
  // A few passengers by the windows.
  for (const [x, z, t] of [[-0.7, 2.5, 0.1], [0.7, 1.2, 0.5], [-0.7, -0.5, 0.8], [0.7, -2.2, 0.3], [-0.7, -3.5, 0.6]]) seated(B, { shirt: pick(SHIRTS, t * 5), skin: pick(SKINS, t * 3), x, y: 1.1, z });
  build(B, g);
  return finish(g);
}

/** A goods lorry, its back painted in bright colours as lorries are. */
export function makeLorry(look = 0.5) {
  const B = new Batcher(), g = new THREE.Group();
  const cab = mat('#f9a825', { rough: 0.4, metal: 0.3 });
  B.add(boxGeo(2.3, 1.6, 1.8), cab, place(0, 1.6, 2.5));
  B.add(boxGeo(2.2, 0.75, 0.05), GLASS(), place(0, 2.0, 3.41));
  B.add(boxGeo(2.3, 0.5, 7), mat('#3e3e3e', { rough: 0.6 }), place(0, 0.75, 0));
  const back = mat('#c62828', { rough: 0.5 });
  B.add(boxGeo(2.3, 1.3, 4.9), back, place(0, 1.65, -1.05));
  B.add(boxGeo(2.32, 0.2, 4.92), mat('#2e7d32', { rough: 0.5 }), place(0, 2.2, -1.05));
  B.add(boxGeo(2.32, 0.12, 4.92), mat('#fdd835', { rough: 0.5 }), place(0, 1.2, -1.05));
  for (const s of [-1, 1]) {
    B.add(boxGeo(0.3, 0.18, 0.04), LAMP(), place(s * 0.85, 1.0, 3.41));
    B.add(boxGeo(0.25, 0.2, 0.04), TAIL(), place(s * 0.9, 0.85, -3.51));
  }
  for (const z of [2.3, -1.6, -2.7]) for (const s of [-1, 1]) wheel(B, 0.48, 0.35, s * 1.0, 0.48, z);
  seated(B, { shirt: '#f4f4f4', x: 0.55, y: 1.25, z: 2.6, reach: 0.4 });
  build(B, g);
  return finish(g);
}

/**
 * Builds a vehicle's parts: all plain painted parts become one drawing (each keeps its colour), and only glass,
 * lights and signs stay separate. A whole vehicle is then a handful of drawings, which keeps busy roads smooth.
 */
function build(B, g) {
  const painted = [];
  for (const [key, grp] of [...B.groups]) {
    const m = grp.material;
    if (m.map || m.transparent || m.userData.glow || m.side !== THREE.FrontSide) continue;
    const c = m.color;
    for (const geo of grp.list) {
      const n = geo.attributes.position.count, col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      painted.push(geo);
    }
    B.groups.delete(key);
  }
  B.build(g);
  if (painted.length) {
    const mesh = new THREE.Mesh(THREE.BufferGeometryUtils.mergeGeometries(painted), PAINT());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
}
const PAINT = (() => {
  let m = null;
  return () => (m = m || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.25 }));
})();

function finish(g) {
  g.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.matrixAutoUpdate = false;
    }
  });
  return g;
}

/** Everything that lights up in the evening (headlights, tail lights), to be switched with the town's lights. */
export function vehicleGlow() {
  return [...cache.values()].filter(m => m.userData.glow).map(m => ({ material: m }));
}

/**
 * Inaara's bicycle: a small pink bicycle with a basket in front. Its wheels and pedals turn (`spin`), and it leans
 * into turns.
 */
export class Bicycle {
  constructor(colour = '#e85d8f') {
    this.root = new THREE.Group();
    this.frame = new THREE.Group();
    this.root.add(this.frame);
    // Its own paint (not shared), so it can be repainted.
    const pink = this.paint = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.35, metalness: 0.3 });
    const B = new Batcher();
    const tube = (a, b, r = 0.022, m = pink) => {
      const d = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
      const geo = new THREE.CylinderGeometry(r, r, d.length(), 8);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
      const mid = new THREE.Vector3(...a).add(d.multiplyScalar(0.5));
      B.add(geo, m, new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));
    };
    const R = 0.25; // wheel size, for a small child's bicycle
    const rear = [0, R, -0.42], front = [0, R, 0.42], crank = [0, 0.26, -0.04], seat = [0, 0.62, -0.2], head = [0, 0.66, 0.3];
    tube(rear, crank);
    tube(rear, seat);
    tube(crank, seat);
    tube(crank, head);
    tube(seat, head, 0.02);
    tube(head, front, 0.02, CHROME());
    tube([0, 0.66, 0.3], [0, 0.8, 0.27], 0.02, CHROME());
    tube([-0.22, 0.8, 0.25], [0.22, 0.8, 0.25], 0.016, CHROME());
    for (const s of [-1, 1]) tube([s * 0.22, 0.8, 0.25], [s * 0.27, 0.8, 0.25], 0.026, mat('#f5f5f5', { rough: 0.6 }));
    B.add(boxGeo(0.12, 0.05, 0.22), mat('#f5f5f5', { rough: 0.6 }), place(0, 0.66, -0.22));
    // The basket in front, and the bell.
    B.add(boxGeo(0.28, 0.16, 0.2), mat('#c9a066', { rough: 0.8 }), place(0, 0.72, 0.45));
    B.add(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 10), CHROME(), place(0.14, 0.82, 0.25));
    B.build(this.frame);
    // Wheels and pedals turn: built on their own.
    this.wheels = [rear, front].map(p => {
      const w = new THREE.Group();
      w.position.set(...p);
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(R - 0.02, 0.025, 8, 28), TYRE());
      tyre.rotation.y = Math.PI / 2;
      w.add(tyre);
      for (let k = 0; k < 6; k++) {
        const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 2 * R - 0.06, 4), CHROME());
        sp.rotation.x = (k / 6) * Math.PI;
        w.add(sp);
      }
      this.frame.add(w);
      return w;
    });
    this.pedals = new THREE.Group();
    this.pedals.position.set(...crank);
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.16), CHROME());
      arm.position.set(s * 0.06, 0, s * 0.08);
      this.pedals.add(arm);
      const pd = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.05), TYRE());
      pd.position.set(s * 0.1, 0, s * 0.16);
      this.pedals.add(pd);
    }
    this.frame.add(this.pedals);
    finish(this.root);
    this.root.traverse(o => (o.matrixAutoUpdate = true));
    this.basket = this.frame.children.find(o => o.isMesh && o.material.color && o.material.color.getHexString() === 'c9a066') || null;
    this.marker = makeMarker();
    this.root.add(this.marker);
    this.seatHeight = 0.66;
  }

  setColour(c) {
    this.paint.color.set(c);
  }

  /** A bigger basket in front (bought at the Hardware shop). */
  bigBasket(on) {
    if (this.basket) this.basket.visible = !on;
    if (on && !this.big) {
      this.big = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.28), new THREE.MeshStandardMaterial({ color: '#b98b52', roughness: 0.85 }));
      this.big.position.set(0, 0.75, 0.47);
      this.big.castShadow = true;
      this.frame.add(this.big);
    }
    if (this.big) this.big.visible = on;
  }

  /** Puts the bicycle at (x, y, z) facing `heading`, its wheels turned `roll` (radians) and leaning `lean`. */
  set(x, y, z, heading, roll, lean = 0) {
    this.root.position.set(x, y, z);
    this.root.rotation.set(0, heading, 0);
    this.frame.rotation.z = -lean;
    for (const w of this.wheels) w.rotation.x = roll;
    this.pedals.rotation.x = roll * 0.6;
  }
}

/** A soft marker floating above something to find (her bicycle when she leaves it). */
function makeMarker() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.32, 16), new THREE.MeshBasicMaterial({ color: '#ffcf5e', transparent: true, opacity: 0.9 }));
  m.rotation.x = Math.PI;
  g.add(m);
  g.position.y = 1.7;
  g.visible = false;
  return g;
}
