// Inaara in 3D. Her face is her real picture from the character sheet (assets/faces, unchanged), shown on the front of
// her head; her body is made of simple shapes in the sheet's colours (the black dress with cream flowers, white shoes,
// the pearl necklace) so it can walk, run and jump.
import * as THREE from '../vendor/three/three.js';
import { rng } from './layout.js';

export const PAL = {
  skin: '#d9a07a', dress: '#17161a', flower: '#efe6cf', flowerMid: '#d8b25a', shoe: '#f3eee4', pearl: '#7f7d7b', hair: '#151313'
};

function dressTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = PAL.dress;
  g.fillRect(0, 0, 256, 256);
  const r = rng(7);
  for (let i = 0; i < 34; i++) {
    const fx = r() * 256, fy = r() * 256, fs = 7 + r() * 4;
    for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) {
      g.fillStyle = PAL.flower;
      for (let k = 0; k < 5; k++) {
        const a = k * 1.2566 + r();
        g.beginPath();
        g.arc(fx + ox + Math.cos(a) * fs, fy + oy + Math.sin(a) * fs, fs * 0.7, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = PAL.flowerMid;
      g.beginPath();
      g.arc(fx + ox, fy + oy, fs * 0.45, 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/**
 * The front of her head: part of an egg shape, with the picture laid straight onto it from the front (so the picture
 * itself isn't changed, only shown on a rounded surface).
 */
function faceGeo(rx, ry, rz) {
  const g = new THREE.SphereGeometry(1, 40, 32, Math.PI * 0.5 - 1.45, 2.9, 0.05, Math.PI - 0.1);
  const p = g.attributes.position, uv = g.attributes.uv;
  const k = 1.0;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    p.setXYZ(i, x * rx, y * ry, z * rz);
    uv.setXY(i, 0.5 + x / (2 * k), 0.5 + y / (2 * k));
  }
  g.computeVertexNormals();
  return g;
}

export class Hero {
  constructor(assets) {
    this.assets = assets;
    this.root = new THREE.Group(); // at her feet, turned the way she faces
    this.body = new THREE.Group(); // bobs and leans
    this.root.add(this.body);
    const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...o });
    const skin = mat(PAL.skin, { roughness: 0.6 });
    // The same flowered cloth on every part, repeated so the flowers stay round on each shape.
    const cloth = dressTexture();
    const dressAt = (u, v) => {
      const t = cloth.clone();
      t.repeat.set(u, v);
      t.needsUpdate = true;
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
    };
    const dress = dressAt(1.6, 1), skirtCloth = dressAt(3.2, 0.8);
    const shoe = mat(PAL.shoe, { roughness: 0.35 });
    const hair = mat(PAL.hair, { roughness: 0.55 });
    const add = (parent, geo, m, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // Legs, from the hips, each ending in a white shoe with a strap.
    this.legs = [-1, 1].map(s => {
      const hip = new THREE.Group();
      hip.position.set(s * 0.055, 0.5, 0);
      this.body.add(hip);
      add(hip, new THREE.CylinderGeometry(0.036, 0.03, 0.46, 10), skin, 0, -0.23, 0);
      const foot = add(hip, new THREE.CapsuleGeometry(0.032, 0.07, 4, 10), shoe, 0, -0.475, 0.025);
      foot.rotation.x = Math.PI / 2;
      foot.scale.set(1.15, 1, 0.8);
      add(hip, new THREE.TorusGeometry(0.03, 0.006, 6, 12, Math.PI), shoe, 0, -0.46, 0.005).rotation.y = Math.PI / 2;
      return hip;
    });

    // The dress: a fitted top and a full skirt that flares out, with short puffed sleeves.
    const skirtPts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      skirtPts.push(new THREE.Vector2(0.095 + 0.13 * Math.pow(t, 1.3) + Math.sin(t * Math.PI) * 0.01, 0.7 - t * 0.29));
    }
    skirtCloth.side = THREE.DoubleSide;
    this.skirt = add(this.body, new THREE.LatheGeometry(skirtPts, 28), skirtCloth);
    add(this.body, new THREE.CylinderGeometry(0.098, 0.096, 0.2, 20), dress, 0, 0.79, 0);
    add(this.body, new THREE.SphereGeometry(0.1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), dress, 0, 0.885, 0).scale.set(1.05, 0.35, 0.8);
    add(this.body, new THREE.CylinderGeometry(0.03, 0.034, 0.06, 12), skin, 0, 0.92, 0);
    // The neckline: a little skin above the dress at the front.
    add(this.body, new THREE.SphereGeometry(0.06, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), skin, 0, 0.865, 0.035).scale.set(1, 0.5, 0.6);
    // Pearl necklace.
    const pearls = mat(PAL.pearl, { roughness: 0.25, metalness: 0.3 });
    for (let i = 0; i < 13; i++) {
      const a = Math.PI * (0.15 + 0.7 * (i / 12));
      add(this.body, new THREE.SphereGeometry(0.009, 8, 6), pearls, Math.cos(a) * 0.058, 0.875 - Math.sin(a) * 0.035, Math.sin(a) * 0.062);
    }

    // Arms from the shoulders, under puffed sleeves.
    this.arms = [-1, 1].map(s => {
      const sh = new THREE.Group();
      sh.position.set(s * 0.115, 0.86, 0);
      this.body.add(sh);
      add(sh, new THREE.SphereGeometry(0.048, 14, 10), dress, s * 0.01, -0.01, 0).scale.set(1, 0.9, 1);
      add(sh, new THREE.CylinderGeometry(0.027, 0.023, 0.3, 10), skin, s * 0.006, -0.17, 0);
      add(sh, new THREE.SphereGeometry(0.026, 10, 8), skin, s * 0.006, -0.33, 0.004);
      return sh;
    });

    // Her head: dark hair all round, her picture on the front.
    this.head = new THREE.Group();
    this.head.position.set(0, 1.07, 0);
    this.body.add(this.head);
    // A child's head is big for her body. The picture's own outline (hair and face) is the front of the head; the
    // dark hair shape behind it is a little smaller, so from the front only her picture shows.
    const rx = 0.125, ry = 0.165, rz = 0.13;
    const back = add(this.head, new THREE.SphereGeometry(1, 28, 20), hair);
    back.scale.set(rx * 0.86, ry * 0.86, rz * 0.9);
    back.position.set(0, 0.006, -0.02);
    this.faceMat = new THREE.MeshStandardMaterial({ map: assets.faces.happy, alphaTest: 0.5, roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.42, emissiveMap: assets.faces.happy });
    this.face = add(this.head, faceGeo(rx, ry, rz), this.faceMat, 0, 0, 0);
    this.face.castShadow = false;
    this.faceName = 'happy';
    this.t = 0;
    this.lookAround = 0;
  }

  setFace(name) {
    if (name === this.faceName || !this.assets.faces[name]) return;
    this.faceName = name;
    this.faceMat.map = this.faceMat.emissiveMap = this.assets.faces[name];
    this.faceMat.needsUpdate = true;
  }

  /** Puts her where the walker is and moves her arms and legs for what she's doing. */
  update(dt, w, { nearPerson = false, camera = null } = {}) {
    this.t += dt;
    this.root.position.set(w.x, w.y, w.z);
    this.root.rotation.y = w.heading;
    const sp = Math.hypot(w.vx, w.vz), s = Math.sin(w.phase * 2.2);
    let legSwing = 0, armSwing = 0, bob = 0, lean = 0, armsOut = 0, legSplit = 0;
    switch (w.state) {
      case 'walk':
        legSwing = 0.5 * Math.min(1, sp / 2);
        armSwing = 0.45;
        bob = Math.abs(Math.cos(w.phase * 2.2)) * 0.018;
        lean = 0.04;
        break;
      case 'run':
        legSwing = 0.85;
        armSwing = 0.9;
        bob = Math.abs(Math.cos(w.phase * 2.2)) * 0.04;
        lean = 0.16;
        break;
      case 'jump':
      case 'fall':
        legSplit = w.vy > 0 ? 0.5 : 0.3;
        armsOut = w.vy > 0 ? 2.4 : 1.6;
        break;
      default:
        bob = Math.sin(this.t * 2.2) * 0.004;
    }
    const k = Math.min(1, dt * 14);
    const set = (o, v) => { o.rotation.x += (v - o.rotation.x) * k; };
    set(this.legs[0], legSplit ? -legSplit : s * legSwing);
    set(this.legs[1], legSplit ? legSplit * 0.6 : -s * legSwing);
    set(this.arms[0], armsOut ? -armsOut : -s * armSwing);
    set(this.arms[1], armsOut ? -armsOut : s * armSwing);
    for (const [i, a] of this.arms.entries()) a.rotation.z += ((i ? 1 : -1) * (armsOut ? 0.5 : 0.24) - a.rotation.z) * k;
    this.body.position.y = bob;
    this.body.rotation.x += (lean - this.body.rotation.x) * k;
    this.skirt.scale.x = this.skirt.scale.z = 1 + Math.min(0.12, sp * 0.02) + (w.state === 'fall' ? 0.08 : 0);

    // Standing still for a while, she looks about.
    if (w.state === 'idle') this.lookAround += dt;
    else this.lookAround = 0;
    let look = this.lookAround > 3 ? Math.sin((this.lookAround - 3) * 0.9) * 0.5 : 0;
    // When the camera is in front of her or to one side, she turns her head a little towards it (towards you).
    if (camera) {
      let rel = Math.atan2(camera.x - w.x, camera.z - w.z) - w.heading;
      rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      if (Math.abs(rel) < 2.2) look = Math.max(-0.85, Math.min(0.85, rel * 0.75));
    }
    this.head.rotation.y += (look - this.head.rotation.y) * Math.min(1, dt * 4);

    // Her face for the moment.
    let face = 'happy';
    if (w.bumped < 0.6) face = 'surprised';
    else if (w.state === 'run' || w.state === 'jump') face = 'excited';
    else if (nearPerson) face = 'shy';
    else if (this.lookAround > 7 && Math.sin(this.lookAround * 0.7) > 0.6) face = 'playful';
    this.setFace(face);
  }
}
