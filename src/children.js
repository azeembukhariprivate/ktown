// The four children: Inaara, and her friends across Pond Lane, Atyb (9), Aydin (7) and Aiza (3), brother, brother and
// sister. Everyone's face is made up and drawn by the game's own code (no photos): eyes, eyebrows, nose and mouth
// painted onto the front of a rounded head, with an expression for each moment (happy, excited, surprised, shy,
// playful). Bodies, clothes and hair are made of simple shapes, so they can walk, run, ride and sit.
import * as THREE from '../vendor/three/three.js';
import { rng } from './layout.js';

export const LOOKS = {
  inaara: {
    name: 'Inaara', age: 5, scale: 1, head: 1, girl: true, skin: '#d9a07a', hair: 'bob', hairColour: '#17110e',
    outfit: 'dress', cloth: { base: '#17161a', flower: '#efe6cf', mid: '#d8b25a', kind: 'flowers' }, shoes: '#f3eee4',
    pearls: true, clip: '#e2bf6e', eyes: '#4a2a14'
  },
  atyb: {
    name: 'Atyb', age: 9, scale: 1.2, head: 0.94, girl: false, skin: '#c48a62', hair: 'spiky', hairColour: '#120d0b',
    outfit: 'tee', tee: '#d32f2f', shorts: '#1e4f9a', shoes: '#2b2b2b', cap: '#1565c0', eyes: '#3a2010'
  },
  aydin: {
    name: 'Aydin', age: 7, scale: 1.1, head: 0.97, girl: false, skin: '#cf9670', hair: 'curly', hairColour: '#1a120e',
    outfit: 'tee', tee: 'stripes', shorts: '#4e5b31', shoes: '#8d6e63', ball: true, eyes: '#3d2412'
  },
  aiza: {
    name: 'Aiza', age: 3, scale: 0.84, head: 1.06, girl: true, skin: '#dba67f', hair: 'pigtails', hairColour: '#1a120e',
    outfit: 'dress', cloth: { base: '#f48fb1', flower: '#ffffff', mid: '#ffffff', kind: 'dots' }, shoes: '#f8bbd0',
    bands: '#ec407a', rabbit: true, eyes: '#4a2a14'
  }
};
export const FACES = ['happy', 'excited', 'surprised', 'shy', 'playful'];

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c, repeat = null) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}

/** Cloth with flowers (Inaara's black dress) or dots (Aiza's pink frock). */
function clothTexture(cl) {
  const [c, g] = canvas(256);
  g.fillStyle = cl.base;
  g.fillRect(0, 0, 256, 256);
  const r = rng(7);
  const n = cl.kind === 'dots' ? 46 : 34;
  for (let i = 0; i < n; i++) {
    const fx = r() * 256, fy = r() * 256, fs = cl.kind === 'dots' ? 4 + r() * 2 : 7 + r() * 4;
    for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) {
      g.fillStyle = cl.flower;
      if (cl.kind === 'dots') {
        g.beginPath();
        g.arc(fx + ox, fy + oy, fs, 0, Math.PI * 2);
        g.fill();
        continue;
      }
      for (let k = 0; k < 5; k++) {
        const a = k * 1.2566 + r();
        g.beginPath();
        g.arc(fx + ox + Math.cos(a) * fs, fy + oy + Math.sin(a) * fs, fs * 0.7, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = cl.mid;
      g.beginPath();
      g.arc(fx + ox, fy + oy, fs * 0.45, 0, Math.PI * 2);
      g.fill();
    }
  }
  return c;
}

function stripes() {
  const [c, g] = canvas(64);
  for (let y = 0; y < 64; y += 16) {
    g.fillStyle = '#2e7d32';
    g.fillRect(0, y, 64, 8);
    g.fillStyle = '#f4f4f4';
    g.fillRect(0, y + 8, 64, 8);
  }
  return c;
}

function hairTexture(colour) {
  const [c, g] = canvas(256);
  g.fillStyle = colour;
  g.fillRect(0, 0, 256, 256);
  const r = rng(31);
  for (let i = 0; i < 700; i++) {
    const x = r() * 256, len = 60 + r() * 150, y = r() * 100 - 30, bend = (r() - 0.5) * 20, light = r();
    g.strokeStyle = light > 0.93 ? 'rgba(122,92,70,0.5)' : light > 0.6 ? 'rgba(70,50,38,0.45)' : 'rgba(0,0,0,0.5)';
    g.lineWidth = 1 + r();
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + bend, y + len / 2, x + bend * 0.4, y + len);
    g.stroke();
  }
  return c;
}

/**
 * A made-up face, painted for one expression: almond eyes with brown irises and a sparkle, eyebrows, a small nose,
 * a mouth, rosy cheeks. Drawn on a see-through canvas laid over the front of the head.
 */
export function paintFace(look, expr) {
  const [c, g] = canvas(256);
  const L = 128 - 44, R = 128 + 44, EY = 112;
  const girl = look.girl, young = look.age <= 3;
  const eyeW = young ? 27 : 24, eyeH = expr === 'surprised' ? 23 : expr === 'shy' ? 13 : 18;
  // Cheeks.
  for (const x of [L - 8, R + 8]) {
    const grad = g.createRadialGradient(x, 160, 2, x, 160, 30);
    grad.addColorStop(0, expr === 'shy' ? 'rgba(232,96,96,0.55)' : 'rgba(232,110,100,0.3)');
    grad.addColorStop(1, 'rgba(232,110,100,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, 160, 30, 0, Math.PI * 2);
    g.fill();
  }
  // Eyebrows.
  g.strokeStyle = look.hairColour;
  g.lineCap = 'round';
  g.lineWidth = girl ? 5 : 7;
  for (const [x, s] of [[L, -1], [R, 1]]) {
    const lift = expr === 'surprised' ? -12 : expr === 'shy' ? 4 : 0;
    g.beginPath();
    g.moveTo(x - s * 22, EY - 30 + lift + (expr === 'shy' ? -4 : 2));
    g.quadraticCurveTo(x, EY - 40 + lift, x + s * 20, EY - 32 + lift);
    g.stroke();
  }
  // Eyes.
  const eye = (x, wink) => {
    if (wink) {
      g.strokeStyle = '#2a1408';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(x - eyeW * 0.8, EY + 2);
      g.quadraticCurveTo(x, EY - 10, x + eyeW * 0.8, EY + 2);
      g.stroke();
      return;
    }
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(x, EY, eyeW, eyeH, 0, 0, Math.PI * 2);
    g.fill();
    const look2 = expr === 'shy' ? 6 : 0;
    g.save();
    g.beginPath();
    g.ellipse(x, EY, eyeW, eyeH, 0, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = look.eyes;
    g.beginPath();
    g.arc(x + look2, EY + 2 + look2 * 0.5, young ? 16 : 14, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#0d0705';
    g.beginPath();
    g.arc(x + look2, EY + 2 + look2 * 0.5, 7, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(x + look2 - 5, EY - 4, 4.5, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(x + look2 + 5, EY + 7, 2, 0, Math.PI * 2);
    g.fill();
    g.restore();
    // Eyelid line (and lashes for the girls).
    g.strokeStyle = '#1d0e06';
    g.lineWidth = girl ? 4.5 : 3.5;
    g.beginPath();
    g.ellipse(x, EY, eyeW, eyeH, 0, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();
    if (girl) {
      // Two little lashes at the outer corner.
      const out = x < 128 ? -1 : 1, ex = x + out * eyeW * 0.92;
      for (const d of [0, 7]) {
        g.beginPath();
        g.moveTo(ex - out * d, EY - eyeH * 0.55 - d * 0.4);
        g.lineTo(ex - out * d + out * 6, EY - eyeH * 0.55 - d * 0.4 - 6);
        g.stroke();
      }
    }
  };
  eye(L, false);
  eye(R, expr === 'playful');
  // Nose: a soft little curve.
  g.strokeStyle = 'rgba(120,60,40,0.55)';
  g.lineWidth = 3.5;
  g.beginPath();
  g.moveTo(122, 146);
  g.quadraticCurveTo(128, 152, 134, 146);
  g.stroke();
  // Mouth.
  const MY = 178;
  g.lineWidth = 4;
  g.strokeStyle = '#7a2e22';
  if (expr === 'happy' || expr === 'shy') {
    const w = expr === 'shy' ? 13 : 22;
    g.beginPath();
    g.moveTo(128 - w, MY - 3);
    g.quadraticCurveTo(128, MY + (expr === 'shy' ? 7 : 14), 128 + w, MY - 3);
    g.stroke();
  } else if (expr === 'excited' || expr === 'playful') {
    g.fillStyle = '#7a2e22';
    g.beginPath();
    g.moveTo(128 - 26, MY - 6);
    g.quadraticCurveTo(128, MY + 30, 128 + 26, MY - 6);
    g.closePath();
    g.fill();
    g.fillStyle = '#ffffff';
    g.fillRect(128 - 18, MY - 6, 36, 7);
    g.fillStyle = expr === 'playful' ? '#ef6f7f' : '#d7646c';
    g.beginPath();
    g.ellipse(128 + (expr === 'playful' ? 4 : 0), MY + (expr === 'playful' ? 16 : 10), 12, expr === 'playful' ? 11 : 7, 0, 0, Math.PI * 2);
    g.fill();
  } else if (expr === 'surprised') {
    g.fillStyle = '#7a2e22';
    g.beginPath();
    g.ellipse(128, MY + 4, 10, 13, 0, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

/** The front of a head (part of an egg shape) for the painted face, with the picture laid on from the front. */
function faceShell(rx, ry, rz) {
  const g = new THREE.SphereGeometry(1, 36, 28, Math.PI * 0.5 - 1.25, 2.5, 0.25, Math.PI - 0.55);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    p.setXYZ(i, x * rx * 1.012, y * ry * 1.012, z * rz * 1.012);
    uv.setXY(i, 0.5 + x / 2, 0.5 + y / 2);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Hair over the head, in a style: the head shape a little bigger, pushed inside the head where the hair doesn't
 * reach (the face, and below the cut), so it shows only where hair grows.
 */
function hairShape(style, rx, ry, rz) {
  const g = new THREE.SphereGeometry(1, 36, 28);
  const p = g.attributes.position;
  // Where the hair stops: above the eyebrows at the front, lower at the sides and back.
  const cut = { bob: [0.42, -0.62], spiky: [0.5, -0.25], curly: [0.48, -0.3], pigtails: [0.45, -0.4] }[style];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const front = Math.max(0, z); // 0 at the sides and back, 1 at the front
    const limit = cut[1] + (cut[0] - cut[1]) * Math.min(1, front * 1.6);
    let k = y > limit ? 1.07 : 0.9;
    if (style === 'bob' && y < 0.1 && y > limit) k = 1.07 + 0.08 * (0.1 - y) * (1 - front);
    p.setXYZ(i, x * rx * k, y * ry * k, z * rz * k);
  }
  g.computeVertexNormals();
  return g;
}

export class Child {
  constructor(who) {
    const L = LOOKS[who];
    this.who = who;
    this.look = L;
    this.root = new THREE.Group();
    this.scaled = new THREE.Group();
    this.scaled.scale.setScalar(L.scale);
    this.root.add(this.scaled);
    this.body = new THREE.Group();
    this.scaled.add(this.body);
    const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...o });
    const skin = mat(L.skin, { roughness: 0.6 });
    const add = (parent, geo, m, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const shoe = mat(L.shoes, { roughness: 0.4 });
    let clothMat = null, top;
    if (L.outfit === 'dress') {
      const cloth = clothTexture(L.cloth);
      const at = (u, v) => new THREE.MeshStandardMaterial({ map: tex(cloth, [u, v]), roughness: 0.85 });
      clothMat = at(1.6, 1);
      top = clothMat;
      const skirtPts = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        skirtPts.push(new THREE.Vector2(0.095 + 0.13 * Math.pow(t, 1.3) + Math.sin(t * Math.PI) * 0.01, 0.7 - t * 0.32));
      }
      skirtPts.reverse();
      this.skirt = add(this.body, new THREE.LatheGeometry(skirtPts, 28), at(3.2, 0.8));
      this.skirt.add(new THREE.Mesh(new THREE.LatheGeometry(skirtPts, 28), new THREE.MeshStandardMaterial({ color: '#0f0e11', roughness: 1, side: THREE.BackSide })));
      add(this.body, new THREE.CylinderGeometry(0.098, 0.096, 0.2, 20), clothMat, 0, 0.79, 0);
      add(this.body, new THREE.SphereGeometry(0.1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), clothMat, 0, 0.885, 0).scale.set(1.05, 0.35, 0.8);
    } else {
      top = L.tee === 'stripes' ? new THREE.MeshStandardMaterial({ map: tex(stripes(), [2, 3]), roughness: 0.85 }) : mat(L.tee, { roughness: 0.85 });
      add(this.body, new THREE.CylinderGeometry(0.105, 0.1, 0.36, 18), top, 0, 0.72, 0);
      add(this.body, new THREE.SphereGeometry(0.107, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), top, 0, 0.89, 0).scale.set(1.05, 0.32, 0.82);
      add(this.body, new THREE.CylinderGeometry(0.1, 0.108, 0.12, 18), mat(L.shorts, { roughness: 0.85 }), 0, 0.5, 0);
    }
    add(this.body, new THREE.CylinderGeometry(0.03, 0.034, 0.06, 12), skin, 0, 0.92, 0);
    if (L.outfit === 'dress') add(this.body, new THREE.SphereGeometry(0.06, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), skin, 0, 0.865, 0.035).scale.set(1, 0.5, 0.6);
    if (L.pearls) {
      const pearls = mat('#7f7d7b', { roughness: 0.25, metalness: 0.3 });
      for (let i = 0; i < 13; i++) {
        const a = Math.PI * (0.15 + 0.7 * (i / 12));
        add(this.body, new THREE.SphereGeometry(0.009, 8, 6), pearls, Math.cos(a) * 0.058, 0.875 - Math.sin(a) * 0.035, Math.sin(a) * 0.062);
      }
    }

    // Legs from the hips: skin, with shorts or under-shorts at the top, shoes at the bottom.
    const under = L.outfit === 'dress' ? mat(L.cloth.base === '#17161a' ? '#17161a' : '#f8bbd0', { roughness: 0.9 }) : mat(L.shorts, { roughness: 0.85 });
    this.legs = [-1, 1].map(s => {
      const hip = new THREE.Group();
      hip.position.set(s * 0.055, 0.5, 0);
      this.body.add(hip);
      add(hip, new THREE.CylinderGeometry(0.036, 0.03, 0.46, 10), skin, 0, -0.23, 0);
      add(hip, new THREE.CylinderGeometry(0.052, 0.047, L.outfit === 'dress' ? 0.15 : 0.2, 12), under, 0, L.outfit === 'dress' ? -0.06 : -0.08, 0);
      const foot = add(hip, new THREE.CapsuleGeometry(0.032, 0.07, 4, 10), shoe, 0, -0.475, 0.025);
      foot.rotation.x = Math.PI / 2;
      foot.scale.set(1.15, 1, 0.8);
      return hip;
    });

    // Arms with sleeves (puffed for the dresses, short for the T-shirts).
    this.arms = [-1, 1].map(s => {
      const sh = new THREE.Group();
      sh.position.set(s * 0.115, 0.86, 0);
      this.body.add(sh);
      if (L.outfit === 'dress') add(sh, new THREE.SphereGeometry(0.048, 14, 10), top, s * 0.01, -0.01, 0).scale.set(1, 0.9, 1);
      else add(sh, new THREE.CylinderGeometry(0.042, 0.036, 0.12, 12), top, s * 0.004, -0.04, 0);
      add(sh, new THREE.CylinderGeometry(0.027, 0.023, 0.3, 10), skin, s * 0.006, -0.17, 0);
      add(sh, new THREE.SphereGeometry(0.026, 10, 8), skin, s * 0.006, -0.33, 0.004);
      return sh;
    });
    this.hand = new THREE.Group(); // something she or he carries (a ball, a toy rabbit, a parcel)
    this.hand.position.set(0, -0.36, 0.05);
    this.arms[1].add(this.hand);

    // The head: skin, a painted face, hair in their own style, little ears.
    const hs = L.head;
    this.head = new THREE.Group();
    this.head.position.set(0, 1.07, 0);
    this.head.scale.setScalar(hs);
    this.body.add(this.head);
    const rx = 0.12, ry = 0.142, rz = 0.13;
    add(this.head, new THREE.SphereGeometry(1, 32, 24), skin).scale.set(rx, ry, rz);
    for (const s of [-1, 1]) add(this.head, new THREE.SphereGeometry(0.03, 10, 8), skin, s * rx * 0.98, -0.01, -0.005).scale.set(0.55, 1, 0.8);
    this.faces = {};
    for (const f of FACES) this.faces[f] = tex(paintFace(L, f));
    this.faceMat = new THREE.MeshStandardMaterial({ map: this.faces.happy, transparent: true, alphaTest: 0.02, roughness: 0.8, depthWrite: false });
    this.face = add(this.head, faceShell(rx, ry, rz), this.faceMat);
    this.face.castShadow = false;
    this.face.renderOrder = 2;
    const hairMat = new THREE.MeshStandardMaterial({ map: tex(hairTexture(L.hairColour), [3, 1]), roughness: 0.6 });
    add(this.head, hairShape(L.hair, rx, ry, rz), hairMat);
    if (L.hair === 'spiky') {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2, r = 0.06;
        const sp = add(this.head, new THREE.ConeGeometry(0.03, 0.07, 6), hairMat, Math.cos(a) * r, ry * 0.95, Math.sin(a) * r - 0.01);
        sp.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
      }
      // A cap worn backwards.
      const capMat = mat(L.cap, { roughness: 0.6 });
      add(this.head, new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), capMat, 0, ry * 0.35, 0).scale.set(rx * 1.12, ry * 0.8, rz * 1.12);
      add(this.head, new THREE.CylinderGeometry(0.075, 0.075, 0.012, 16, 1, false, Math.PI / 2, Math.PI), capMat, 0, ry * 0.38, -rz * 0.95).scale.set(1.2, 1, 0.9);
    }
    if (L.hair === 'curly') {
      const r = rng(5);
      for (let i = 0; i < 60; i++) {
        const th = r() * Math.PI * 2, ph = r() * 1.2;
        const x = Math.sin(ph) * Math.cos(th), y = Math.cos(ph), z = Math.sin(ph) * Math.sin(th);
        if (z > 0.55 && y < 0.6) continue;
        add(this.head, new THREE.SphereGeometry(0.028, 8, 6), hairMat, x * rx * 1.05, y * ry * 1.05, z * rz * 1.05);
      }
    }
    if (L.hair === 'pigtails') {
      const band = mat(L.bands, { roughness: 0.5 });
      for (const s of [-1, 1]) {
        add(this.head, new THREE.SphereGeometry(0.045, 12, 10), hairMat, s * rx * 1.12, ry * 0.25, -0.03).scale.set(0.9, 1.3, 0.9);
        add(this.head, new THREE.TorusGeometry(0.022, 0.008, 6, 14), band, s * rx * 1.02, ry * 0.42, -0.025).rotation.y = Math.PI / 2;
      }
    }
    if (L.clip) {
      // Her gold flower clip.
      const gold = mat(L.clip, { roughness: 0.3, metalness: 0.7 });
      const clip = new THREE.Group();
      clip.position.set(-rx * 0.62, ry * 0.75, rz * 0.62);
      clip.rotation.set(-0.5, -0.5, 0.9);
      this.head.add(clip);
      add(clip, new THREE.TorusGeometry(0.035, 0.005, 6, 20), gold).scale.set(0.45, 1, 1);
      for (let k = 0; k < 5; k++) add(clip, new THREE.SphereGeometry(0.009, 8, 6), gold, Math.cos(k * 1.256) * 0.012, Math.sin(k * 1.256) * 0.012, 0.004);
    }
    // Things they always carry.
    if (L.ball) this.carry('ball');
    if (L.rabbit) this.carry('rabbit');
    // Shop things Inaara can wear (shown when bought and chosen).
    this.extras = {};
    this.faceName = 'happy';
    this.t = 0;
    this.lookAround = 0;
  }

  /** Puts something in the right hand: 'ball', 'rabbit', 'parcel', or nothing. */
  carry(what) {
    this.hand.clear();
    this.carrying = what || null;
    if (!what) return;
    const m = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
    if (what === 'ball') {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 1), m('#f5f5f5', { flatShading: true }));
      b.position.set(0.04, 0.0, 0.06);
      this.hand.add(b);
    } else if (what === 'rabbit') {
      const g = new THREE.Group();
      const fur = m('#f3e5d0', { roughness: 0.95 });
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), fur));
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), fur);
      h.position.y = 0.06;
      g.add(h);
      for (const s of [-1, 1]) {
        const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.05, 3, 6), fur);
        e.position.set(s * 0.015, 0.11, 0);
        g.add(e);
      }
      g.position.set(0.03, -0.01, 0.05);
      this.hand.add(g);
    } else if (what === 'parcel') {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.12), m('#c9a066'));
      p.position.set(-0.06, 0.02, 0.1);
      this.hand.add(p);
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.012, 0.125), m('#c62828'));
      s.position.copy(p.position);
      this.hand.add(s);
    }
    this.hand.traverse(o => { if (o.isMesh) o.castShadow = true; });
  }

  /** Shop things she can wear: 'flower' (a jasmine flower clip), 'sunglasses', 'handbag'. */
  wear(list) {
    const want = new Set(list || []);
    for (const [k, obj] of Object.entries(this.extras)) if (!want.has(k)) {
      obj.parent.remove(obj);
      delete this.extras[k];
    }
    const m = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o });
    for (const k of want) {
      if (this.extras[k]) continue;
      const g = new THREE.Group();
      if (k === 'flower') {
        for (let i = 0; i < 6; i++) {
          const p = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), m('#ffffff'));
          p.position.set(Math.cos(i * 1.05) * 0.02, Math.sin(i * 1.05) * 0.02, 0);
          g.add(p);
        }
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), m('#f9a825')));
        g.position.set(0.1, 0.1, 0.06);
        g.rotation.y = 0.8;
        this.head.add(g);
      } else if (k === 'sunglasses') {
        const dark = m('#101010', { roughness: 0.15, metalness: 0.4 });
        for (const s of [-1, 1]) {
          const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.008, 16), dark);
          l.rotation.x = Math.PI / 2;
          l.position.set(s * 0.042, 0.012, 0.128);
          g.add(l);
        }
        const br = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.006), dark);
        br.position.set(0, 0.02, 0.13);
        g.add(br);
        this.head.add(g);
      } else if (k === 'handbag') {
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.04), m('#d81b60'));
        bag.position.set(0.15, 0.55, 0.02);
        g.add(bag);
        const strap = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.005, 6, 30, Math.PI * 0.55), m('#d81b60'));
        strap.position.set(0.02, 0.62, 0.02);
        strap.rotation.z = -0.3;
        g.add(strap);
        this.body.add(g);
      }
      g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      this.extras[k] = g;
    }
  }

  setFace(name) {
    if (name === this.faceName || !this.faces[name]) return;
    this.faceName = name;
    this.faceMat.map = this.faces[name];
    this.faceMat.needsUpdate = true;
  }

  /** Puts the child where `w` says and moves arms and legs for what they're doing (walk, run, jump, bike, sit...). */
  update(dt, w, { nearPerson = false, camera = null, face = null } = {}) {
    this.t += dt;
    this.root.position.set(w.x, w.y, w.z);
    this.root.rotation.order = 'YXZ';
    this.root.rotation.set(0, w.heading, -(w.roll || 0));
    const sp = Math.hypot(w.vx || 0, w.vz || 0), s = Math.sin((w.phase || 0) * 2.2);
    let legSwing = 0, armSwing = 0, bob = 0, lean = 0, armsOut = 0, legSplit = 0;
    switch (w.state) {
      case 'walk':
        legSwing = 0.5 * Math.min(1, sp / 2);
        armSwing = 0.45;
        bob = Math.abs(Math.cos((w.phase || 0) * 2.2)) * 0.018;
        lean = 0.04;
        break;
      case 'run':
        legSwing = 0.85;
        armSwing = 0.9;
        bob = Math.abs(Math.cos((w.phase || 0) * 2.2)) * 0.04;
        lean = 0.16;
        break;
      case 'jump':
      case 'fall':
        legSplit = w.vy > 0 ? 0.5 : 0.3;
        armsOut = w.vy > 0 ? 2.4 : 1.6;
        break;
      case 'cheer':
        armsOut = 2.6 + Math.sin(this.t * 9) * 0.25;
        bob = Math.max(0, Math.sin(this.t * 9)) * 0.05;
        break;
      case 'bike':
      case 'sit':
        break;
      default:
        bob = Math.sin(this.t * 2.2) * 0.004;
    }
    const k = Math.min(1, dt * 14);
    const set = (o, v) => { o.rotation.x += (v - o.rotation.x) * k; };
    const carrying = !!this.carrying;
    if (w.state === 'bike') {
      const pd = w.pedal || 0;
      this.legs[0].rotation.x = -1.05 + Math.sin(pd) * 0.42;
      this.legs[1].rotation.x = -1.05 - Math.sin(pd) * 0.42;
      set(this.arms[0], -1.05);
      set(this.arms[1], -1.05);
      for (const [i, a] of this.arms.entries()) a.rotation.z += ((i ? 1 : -1) * 0.12 - a.rotation.z) * k;
      lean = 0.22;
    } else if (w.state === 'sit') {
      set(this.legs[0], -1.45);
      set(this.legs[1], -1.45);
      set(this.arms[0], -0.55);
      set(this.arms[1], -0.55);
      for (const [i, a] of this.arms.entries()) a.rotation.z += ((i ? 1 : -1) * 0.1 - a.rotation.z) * k;
    } else {
      set(this.legs[0], legSplit ? -legSplit : s * legSwing);
      set(this.legs[1], legSplit ? legSplit * 0.6 : -s * legSwing);
      set(this.arms[0], armsOut ? -armsOut : -s * armSwing);
      // Holding something: that arm stays bent forward.
      set(this.arms[1], armsOut ? -armsOut : carrying ? -0.55 : s * armSwing);
      for (const [i, a] of this.arms.entries()) a.rotation.z += ((i ? 1 : -1) * (armsOut ? 0.5 : 0.24) - a.rotation.z) * k;
    }
    this.body.position.y = bob;
    this.body.rotation.x += (lean - this.body.rotation.x) * k;
    if (this.skirt) this.skirt.scale.x = this.skirt.scale.z = 1 + Math.min(0.12, sp * 0.02) + (w.state === 'fall' ? 0.08 : 0);

    if (w.state === 'idle') this.lookAround += dt;
    else this.lookAround = 0;
    let look = this.lookAround > 3 ? Math.sin((this.lookAround - 3) * 0.9) * 0.5 : 0;
    if (camera) {
      let rel = Math.atan2(camera.x - w.x, camera.z - w.z) - w.heading;
      rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      if (Math.abs(rel) < 2.2) look = Math.max(-0.85, Math.min(0.85, rel * 0.75));
    }
    if (w.lookAt) {
      let rel = Math.atan2(w.lookAt.x - w.x, w.lookAt.z - w.z) - w.heading;
      rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      look = Math.max(-0.9, Math.min(0.9, rel));
    }
    this.head.rotation.y += (look - this.head.rotation.y) * Math.min(1, dt * 4);

    let f = face || 'happy';
    if (!face) {
      if ((w.bumped ?? 10) < 0.6) f = 'surprised';
      else if (w.state === 'run' || w.state === 'jump' || w.state === 'cheer' || (w.state === 'bike' && sp > 4.5)) f = 'excited';
      else if (nearPerson) f = 'shy';
      else if (this.lookAround > 7 && Math.sin(this.lookAround * 0.7) > 0.6) f = 'playful';
    }
    this.setFace(f);
  }
}
