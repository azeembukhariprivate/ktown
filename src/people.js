// The people of the town: walking along the road sides and lanes, sitting at the tea shop and the bus stop, selling at
// the market. All of one body part are drawn together (one draw for every head, one for every shirt...), which keeps
// a busy town smooth on phones. They stop when Inaara is in their way; bumping into them only pushes her aside.
import * as THREE from '../vendor/three/three.js';
import { rng } from './layout.js';

const SKIN = ['#8d5a3b', '#a8714c', '#c08a62', '#7a4a2e', '#b57e58', '#9b6644'];
const HAIR = ['#141110', '#1c1714', '#2a221d', '#141110', '#8f8a84', '#d8d4cc'];
const SHIRT = ['#f2f2f2', '#9cc3e6', '#e8d27a', '#c94c4c', '#5a8f5a', '#3d5a99', '#f0b27a', '#ffffff', '#b39ddb', '#80cbc4'];
const MUNDU = ['#f6f2e6', '#f6f2e6', '#eee4c8', '#3a6e4e', '#2d4a7a', '#7a3b3b'];
const SAREE = ['#d84a5a', '#2f8f6a', '#e0a020', '#6a3fa0', '#1f6fb0', '#c2185b', '#f4efe0', '#ef6c00'];
const TROUSER = ['#2b2b33', '#3b3a36', '#4a5a6a', '#6b5a45'];

// The parts every person is made of. Sizes are for a 1.7 m adult; children are scaled down.
const PARTS = {
  legL: () => new THREE.CylinderGeometry(0.058, 0.05, 0.86, 8).translate(0, -0.43, 0),
  legR: () => new THREE.CylinderGeometry(0.058, 0.05, 0.86, 8).translate(0, -0.43, 0),
  lower: () => new THREE.CylinderGeometry(0.19, 0.22, 0.8, 14, 1, true).translate(0, -0.4, 0),
  torso: () => new THREE.CylinderGeometry(0.19, 0.165, 0.56, 14).translate(0, 0.28, 0),
  shoulders: () => new THREE.SphereGeometry(0.19, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.4, 0.75),
  sleeveL: () => new THREE.CylinderGeometry(0.06, 0.055, 0.24, 8).translate(0, -0.12, 0),
  sleeveR: () => new THREE.CylinderGeometry(0.06, 0.055, 0.24, 8).translate(0, -0.12, 0),
  armL: () => new THREE.CylinderGeometry(0.042, 0.036, 0.6, 8).translate(0, -0.3, 0),
  armR: () => new THREE.CylinderGeometry(0.042, 0.036, 0.6, 8).translate(0, -0.3, 0),
  neck: () => new THREE.CylinderGeometry(0.05, 0.055, 0.1, 8),
  head: () => new THREE.SphereGeometry(0.105, 16, 12).scale(0.92, 1.12, 1),
  hair: () => new THREE.SphereGeometry(0.11, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(0.95, 1.12, 1.04).translate(0, 0.012, -0.008),
  bun: () => new THREE.SphereGeometry(0.055, 10, 8).translate(0, 0.02, -0.12),
  eyes: () => {
    const a = new THREE.SphereGeometry(0.012, 6, 4).translate(-0.035, 0.02, 0.095);
    const b = new THREE.SphereGeometry(0.012, 6, 4).translate(0.035, 0.02, 0.095);
    return THREE.BufferGeometryUtils.mergeGeometries([a, b]);
  },
  moustache: () => new THREE.BoxGeometry(0.075, 0.016, 0.02).translate(0, -0.035, 0.098),
  // A made-up face like the children's: eyebrows and a smiling mouth.
  brows: () => THREE.BufferGeometryUtils.mergeGeometries([
    new THREE.BoxGeometry(0.034, 0.008, 0.01).translate(-0.036, 0.045, 0.096),
    new THREE.BoxGeometry(0.034, 0.008, 0.01).translate(0.036, 0.045, 0.096)
  ]),
  mouth: () => new THREE.TorusGeometry(0.018, 0.0045, 4, 10, Math.PI).rotateZ(Math.PI).translate(0, -0.052, 0.094),
  drape: () => new THREE.BoxGeometry(0.42, 0.62, 0.03).translate(0, 0.27, 0.12)
};

// The people who give jobs: who they are (a woman or a man, older or not).
const WHO = {
  velu: { woman: false, old: false }, kunjamma: { woman: true, old: true }, mariyamma: { woman: true, old: true },
  gopalan: { woman: false, old: true }, lakshmi: { woman: true, old: false }, sarada: { woman: true, old: false },
  leela: { woman: true, old: false }, bookstall: { woman: false, old: true }
};

/** Makes up a person: what they wear and look like. `kind` is how they spend their time. */
function makeLook(r, kind, who = null) {
  const pick = a => a[(r() * a.length) | 0];
  const child = !who && kind !== 'seller' && kind !== 'shopkeeper' && r() < 0.14;
  let woman = r() < 0.48;
  let old = !child && r() < 0.2;
  if (who) {
    woman = who.woman;
    old = who.old;
  }
  const look = {
    scale: child ? 0.68 + r() * 0.08 : (woman ? 0.93 : 1) * (0.95 + r() * 0.08),
    skin: pick(SKIN), hair: old ? pick(HAIR.slice(4)) : pick(HAIR.slice(0, 4)),
    woman, child, moustache: !woman && !child && r() < 0.7, bun: woman && !child && r() < 0.6
  };
  if (child) {
    // School uniform: white shirt, blue skirt or shorts.
    look.shirt = '#f4f4f4';
    look.lower = woman ? '#2d4a8a' : null;
    look.legs = woman ? look.skin : '#2d4a8a';
    look.sleeves = '#f4f4f4';
  } else if (woman) {
    const sareeWearer = r() < 0.55;
    const c = sareeWearer ? pick(SAREE) : pick(SAREE);
    look.shirt = sareeWearer ? (r() < 0.5 ? c : pick(SHIRT)) : c;
    look.lower = sareeWearer ? c : pick(['#f4efe0', '#2b2b33', c]);
    look.legs = look.lower;
    look.sleeves = look.shirt;
    look.drape = sareeWearer ? c : null;
    look.longLower = true;
  } else {
    look.shirt = pick(SHIRT);
    look.sleeves = look.shirt;
    if (r() < 0.6) {
      look.lower = pick(MUNDU);
      look.legs = look.skin;
    } else {
      look.lower = null;
      look.legs = pick(TROUSER);
    }
  }
  return look;
}

export class People {
  constructor(T, world, scene) {
    this.world = world;
    this.list = [];
    const r = rng(42);
    // Walkers spread along each route, going both ways.
    for (const route of T.routes) {
      const len = routeLength(route.pts);
      for (let i = 0; i < route.who; i++) {
        const p = {
          look: makeLook(r, 'walker'), route, d: ((i + r() * 0.6) / route.who) * len, len, dir: r() < 0.5 ? 1 : -1,
          speed: 1.0 + r() * 0.45, x: 0, z: 0, y: 0, heading: 0, phase: r() * 6, wait: 0, pause: 3 + r() * 20, kind: 'walker'
        };
        p.look.scale *= 1;
        this.place(p, 0);
        this.list.push(p);
      }
    }
    for (const it of T.idlers) {
      this.list.push({
        look: makeLook(r, it.kind, WHO[it.id]), id: it.id, name: it.name, x: it.x, z: it.z, y: it.y || 0, heading: it.heading, phase: r() * 6, kind: it.kind, seat: it.kind === 'sitting',
        turn: r() * 6
      });
    }
    // Everyone is a solid circle she bumps into.
    this.solids = this.list.map(p => ({ kind: 'circle', x: p.x, z: p.z, r: 0.27 * p.look.scale + 0.03, top: (p.y || 0) + 1.6 * p.look.scale, person: true }));

    // One drawing for each body part, coloured per person.
    this.meshes = {};
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
    const n = this.list.length;
    for (const [name, make] of Object.entries(PARTS)) {
      const im = new THREE.InstancedMesh(make(), mat, n);
      im.castShadow = !['eyes', 'moustache', 'brows', 'mouth'].includes(name);
      im.receiveShadow = true;
      im.frustumCulled = false;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const col = new THREE.Color();
      this.list.forEach((p, i) => {
        const L = p.look;
        const c = {
          legL: L.legs, legR: L.legs, lower: L.lower || L.legs, torso: L.shirt, shoulders: L.shirt, sleeveL: L.sleeves, sleeveR: L.sleeves,
          armL: L.skin, armR: L.skin, neck: L.skin, head: L.skin, hair: L.hair, bun: L.hair, eyes: '#120e0c', moustache: L.hair, drape: L.drape || L.shirt,
          brows: L.hair === '#d8d4cc' ? '#8f8a84' : '#1a1412', mouth: '#6e2a20'
        }[name];
        im.setColorAt(i, col.set(c));
      });
      scene.add(im);
      this.meshes[name] = im;
    }
    this.m = new THREE.Matrix4();
    this.tmp = new THREE.Object3D();
  }

  /** Puts a walker at distance `d` along its route, a little to its own left so people pass each other. */
  place(p, dt) {
    const [x, z, hx, hz] = pointAt(p.route.pts, p.d);
    const side = p.dir > 0 ? 1 : -1;
    const nx = -hz * side * 0.45, nz = hx * side * 0.45;
    const tx = x + nx, tz = z + nz;
    if (dt > 0) {
      const want = Math.atan2(hx * p.dir, hz * p.dir);
      let dh = want - p.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      p.heading += dh * Math.min(1, dt * 6);
    } else p.heading = Math.atan2(hx * p.dir, hz * p.dir);
    p.x = tx;
    p.z = tz;
  }

  update(dt, hero) {
    let near = false;
    this.list.forEach((p, i) => {
      const dx = hero.x - p.x, dz = hero.z - p.z, dist = Math.hypot(dx, dz);
      if (dist < 2.2) near = true;
      if (p.controlled) {
        // Moved by a job (walking with Inaara, riding along, gathering for her garland).
        const s = this.solids[i];
        s.x = p.x;
        s.z = p.z;
        this.pose(p, i);
        return;
      }
      p.moving = false;
      if (p.route) {
        // Stop when she's just ahead; now and then stop for a moment anyway.
        const ahead = (dx * Math.sin(p.heading) + dz * Math.cos(p.heading));
        const blocked = dist < 1.3 && ahead > 0;
        if (p.wait > 0) p.wait -= dt;
        else if (!blocked) {
          p.pause -= dt;
          if (p.pause < 0) {
            p.wait = 1.5 + (i % 5);
            p.pause = 8 + ((i * 7) % 25);
          }
          p.d += p.dir * p.speed * dt;
          if (p.d > p.len) { p.d = p.len; p.dir = -1; }
          if (p.d < 0) { p.d = 0; p.dir = 1; }
          p.moving = true;
          p.phase += p.speed * dt * 2.4;
        }
        this.place(p, dt);
        if (blocked) {
          // Look at her.
          const want = Math.atan2(dx, dz);
          let dh = want - p.heading;
          dh = Math.atan2(Math.sin(dh), Math.cos(dh));
          p.heading += dh * Math.min(1, dt * 3);
        }
      } else if (p.kind === 'seller' || p.kind === 'waiting' || p.kind === 'chatting' || p.kind === 'shopkeeper') {
        // Standing: turn to look at her when she's close, otherwise look about now and then.
        p.turn += dt;
        const base = p.kindHeading ?? (p.kindHeading = p.heading);
        const want = dist < 4 ? Math.atan2(dx, dz) : base + Math.sin(p.turn * 0.3) * 0.5;
        let dh = want - p.heading;
        dh = Math.atan2(Math.sin(dh), Math.cos(dh));
        p.heading += dh * Math.min(1, dt * 2);
      }
      const s = this.solids[i];
      s.x = p.x;
      s.z = p.z;
      this.pose(p, i);
    });
    for (const m of Object.values(this.meshes)) m.instanceMatrix.needsUpdate = true;
    return near;
  }

  /** Sets every part of person `i` for this moment. */
  pose(p, i) {
    const L = p.look, S = L.scale;
    const swing = p.moving ? Math.sin(p.phase * 2.2) * 0.42 : 0;
    const bob = p.moving ? Math.abs(Math.cos(p.phase * 2.2)) * 0.02 : Math.sin(p.phase + performance.now() / 1300) * 0.003;
    const base = new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y, p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.heading), new THREE.Vector3(S, S, S));
    const hipY = p.seat ? 0.45 / S : 0.9;
    const set = (name, x, y, z, rx = 0, sx = 1, sy = 1, sz = 1, rz = 0) => {
      this.tmp.position.set(x, y + bob, z);
      this.tmp.rotation.set(rx, 0, rz);
      this.tmp.scale.set(sx, sy, sz);
      this.tmp.updateMatrix();
      this.meshes[name].setMatrixAt(i, this.m.multiplyMatrices(base, this.tmp.matrix));
    };
    const legRot = p.seat ? -1.45 : 0;
    set('legL', -0.085, hipY, 0, legRot + swing);
    set('legR', 0.085, hipY, 0, legRot - swing);
    const lowerLen = L.lower ? (L.longLower || L.woman ? 1.05 : 0.95) : 0;
    if (L.lower && !p.seat) set('lower', 0, hipY + 0.02, 0, 0, 1, lowerLen, 1);
    else if (L.lower && p.seat) set('lower', 0, hipY + 0.02, 0.1, -1.45, 1, 0.55, 0.8);
    else set('lower', 0, 0, 0, 0, 0, 0, 0);
    const top = hipY;
    set('torso', 0, top, 0);
    set('shoulders', 0, top + 0.56, 0);
    set('neck', 0, top + 0.62, 0);
    set('head', 0, top + 0.77, 0);
    set('hair', 0, top + 0.77, 0);
    set('bun', 0, top + 0.77, 0, 0, L.bun ? 1 : 0, L.bun ? 1 : 0, L.bun ? 1 : 0);
    set('eyes', 0, top + 0.77, 0);
    set('brows', 0, top + 0.77, 0);
    set('mouth', 0, top + 0.77, 0, 0, L.moustache ? 0 : 1, L.moustache ? 0 : 1, L.moustache ? 0 : 1);
    set('moustache', 0, top + 0.77, 0, 0, L.moustache ? 1 : 0, L.moustache ? 1 : 0, L.moustache ? 1 : 0);
    set('drape', 0, top, 0, 0.05, L.drape ? 1 : 0, L.drape ? 1 : 0, L.drape ? 1 : 0, L.drape ? -0.5 : 0);
    const armRest = p.seat ? -0.5 : p.kind === 'seller' || p.kind === 'shopkeeper' ? -0.25 : 0;
    set('sleeveL', -0.2, top + 0.52, 0, -swing + armRest, 1, 1, 1, -0.08);
    set('sleeveR', 0.2, top + 0.52, 0, swing + armRest, 1, 1, 1, 0.08);
    set('armL', -0.205, top + 0.52, 0, -swing + armRest, 1, 1, 1, -0.08);
    set('armR', 0.205, top + 0.52, 0, swing + armRest, 1, 1, 1, 0.08);
  }
}

function routeLength(pts) {
  let l = 0;
  for (let i = 0; i + 1 < pts.length; i++) l += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  return l;
}

/** The point `d` metres along a route, and the direction there. */
export function pointAt(pts, d) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], l = Math.hypot(bx - ax, bz - az);
    if (d <= l || i + 2 === pts.length) {
      const t = Math.max(0, Math.min(1, d / l));
      return [ax + (bx - ax) * t, az + (bz - az) * t, (bx - ax) / l, (bz - az) / l];
    }
    d -= l;
  }
  return [pts[0][0], pts[0][1], 1, 0];
}
