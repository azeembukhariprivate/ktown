// Builds the town you see from the plan (layout.js): ground, houses, shops, the tea shop, the bus stop, the market,
// electric poles and wires, things lying about, and the plants.
import * as THREE from '../vendor/three/three.js';
import { boxGeo, groundGeo, hipRoof, polyGeo, Batcher, place, instances, signTexture } from './build.js';
import { FACING, rng } from './layout.js';
import { addPlants } from './plants.js';

const rotOf = facing => {
  const [fx, fz] = FACING[facing];
  return Math.atan2(fx, fz); // turns the local +z (front) to face that way
};

export function buildTown3D(T, assets, scene, { quality = 'high' } = {}) {
  const root = new THREE.Group();
  root.name = 'town';
  scene.add(root);
  const B = new Batcher();
  const glow = []; // things that light up in the evening: { mesh/material, light position }
  const lamps = []; // where the street lights are, for the evening lights

  // ----- Ground -----
  {
    const size = 520, segs = 104;
    const g = new THREE.PlaneGeometry(size, size, segs, segs);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, uv = g.attributes.uv, col = new Float32Array(p.count * 3);
    const r = rng(3);
    const blobs = Array.from({ length: 70 }, () => [(r() - 0.5) * 300, (r() - 0.5) * 300, 8 + r() * 26, r()]);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      uv.setXY(i, x, -z);
      let d = 0, y = 0;
      for (const [bx, bz, br, k] of blobs) {
        const f = Math.max(0, 1 - Math.hypot(x - bx, z - bz) / br);
        if (k < 0.5) d += f * 0.25; else y += f * 0.3;
      }
      col[i * 3] = 0.92 - d + y * 0.25;
      col[i * 3 + 1] = 0.95 - d * 0.6 + y * 0.05;
      col[i * 3 + 2] = 0.88 - d - y * 0.3;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = assets.material('grass', { scale: 3.2 }).clone();
    m.vertexColors = true;
    const mesh = new THREE.Mesh(g, m);
    mesh.receiveShadow = true;
    root.add(mesh);

    // Patches over the grass, in order (later ones on top), each lifted a hair so they don't flicker.
    const kinds = {
      sand: ['sand', { scale: 3, tint: '#e9dcc3' }, 0.004],
      paving: ['paving', { scale: 2.4, tint: '#d8d2c8' }, 0.012],
      laterite: ['laterite', { scale: 2.6 }, 0.008],
      yardpath: ['laterite', { scale: 2.0, tint: '#e0b9a0' }, 0.01],
      stone: ['paving', { scale: 1.2, tint: '#6b6e72' }, 0.006],
      road: ['road', { scale: 4.5, tint: '#9a9a9a' }, 0.016]
    };
    const mats = {};
    for (const [k, [tex, opt, lift]] of Object.entries(kinds)) {
      const mat = assets.material(tex, opt).clone();
      mat.polygonOffset = true;
      mat.polygonOffsetFactor = -1;
      mat.polygonOffsetUnits = -2 - lift * 400;
      mats[k] = [mat, lift];
    }
    const order = ['sand', 'stone', 'paving', 'laterite', 'yardpath', 'road'];
    for (const k of order) for (const p of T.ground.filter(g => g.type === k))
      B.add(groundGeo(p.x0, p.z0, p.x1, p.z1, mats[k][1]), mats[k][0], null, { shadow: false });

    // White lines on the roads.
    const white = assets.plain('#e8e6dc', { rough: 0.6 }).clone();
    white.polygonOffset = true;
    white.polygonOffsetFactor = -1;
    white.polygonOffsetUnits = -14;
    for (let x = -126; x < 126; x += 6) if (x < 17 || x > 29) B.add(groundGeo(x, -0.07, x + 3, 0.07, 0.02), white, null, { shadow: false });
    for (const z of [-3.75, 3.75]) for (let x = -126; x < 126; x += 2) if (x < 18 || x > 28) B.add(groundGeo(x, z - 0.06, x + 2, z + 0.06, 0.02), white, null, { shadow: false });
    for (let z = -126; z < -9; z += 6) B.add(groundGeo(23.93, z, 24.07, z + 3, 0.02), white, null, { shadow: false });
    // A zebra crossing by the bus stop.
    for (let x = 5.2; x < 9; x += 0.9) B.add(groundGeo(x, -3.7, x + 0.5, 3.7, 0.021), white, null, { shadow: false });
  }

  // ----- Houses -----
  const plaster = (h) => assets.material(h.old ? 'plaster-old' : 'plaster', { scale: 2.2, tint: h.colour });
  const roofMat = n => assets.material(n, { scale: 1.6 });
  const wood = assets.material('planks', { scale: 1.2, tint: '#9a6a44' });
  const shutterMats = ['#5e8f5a', '#4f7fa8', '#8a5a3a', '#6d6d6d'].map(c => assets.material('shutter', { scale: 1.1, tint: c }));
  const redOxide = assets.plain('#8e3424', { rough: 0.35 });
  const pillarMat = assets.plain('#f1ece2', { rough: 0.7 });
  const soffit = assets.material('planks', { scale: 1.4, tint: '#7a5236' });
  const laterite = assets.material('brick', { scale: 1.6, tint: '#e2a487' });
  const coping = assets.plain('#d7d0c4', { rough: 0.8 });
  const windowGlow = assets.plain('#2a2018', { rough: 0.4, emissive: '#ffcf7a' });
  const r = rng(77);

  for (const h of T.houses) {
    if (h.home) {
      drawHome(B, h, assets, glow, root);
      continue;
    }
    const rot = rotOf(h.facing);
    const M = (x, y, z) => place(h.x, 0, h.z, rot).multiply(place(x, y, z));
    const W = h.w, D = h.d, H = h.storeys === 2 ? 6.0 : 3.0, sit = h.sit;
    const wall = plaster(h);
    B.add(boxGeo(W, H, D), wall, M(0, H / 2, 0));
    // A red band along the bottom of the walls (a plinth), as most houses have.
    B.add(boxGeo(W + 0.08, 0.42, D + 0.08), redOxide, M(0, 0.21, 0));
    // The sit-out: polished red floor, a step, pillars holding the roof.
    B.add(boxGeo(W, 0.42, sit), redOxide, M(0, 0.21, D / 2 + sit / 2));
    B.add(boxGeo(1.8, 0.2, 0.7), redOxide, M(0, 0.1, D / 2 + sit + 0.35));
    for (const x of [-W / 2 + 0.25, W / 2 - 0.25]) B.add(new THREE.CylinderGeometry(0.15, 0.17, 2.6, 12), pillarMat, M(x, 0.42 + 1.3, D / 2 + sit - 0.25));
    // Low wall at the edge of the sit-out, either side of the step.
    for (const s of [-1, 1]) B.add(boxGeo(W / 2 - 1.2, 0.5, 0.15), wall, M(s * (W / 4 + 0.6), 0.67, D / 2 + sit - 0.08));
    // Door and windows.
    B.add(boxGeo(1.05, 2.1, 0.08), wood, M(0, 0.42 + 1.05, D / 2 + 0.04));
    B.add(boxGeo(1.3, 0.12, 0.1), wood, M(0, 0.42 + 2.16, D / 2 + 0.05));
    const shut = shutterMats[(r() * shutterMats.length) | 0];
    const win = (x, y, z, ry) => {
      const m = M(x, y, z).multiply(place(0, 0, 0, ry));
      B.add(boxGeo(1.1, 1.25, 0.07), shut, m);
      B.add(boxGeo(1.3, 0.1, 0.18), coping, m.clone().multiply(place(0, -0.7, 0.05)));
    };
    const floors = h.storeys === 2 ? [1.6, 4.6] : [1.6];
    for (const y of floors) {
      win(-W / 4 - 0.3, y, D / 2 + 0.035, 0);
      win(W / 4 + 0.3, y, D / 2 + 0.035, 0);
      for (const s of [-1, 1]) win(s * (W / 2 + 0.035), y, 0, s * Math.PI / 2);
      win(0, y, -D / 2 - 0.035, Math.PI);
    }
    // Lit windows for the evening (a glowing pane just in front of one shutter on each floor).
    const lit = new THREE.Mesh(boxGeo(0.9, 1.0, 0.02), windowGlow);
    lit.applyMatrix4(M(W / 4 + 0.3, 1.6, D / 2 + 0.075));
    lit.visible = false;
    root.add(lit);
    glow.push({ mesh: lit });

    // Roof: one hipped roof of clay tiles over the house and the sit-out (single storey), or a flat slab over the
    // sit-out and the tiled roof on top (two storeys).
    const ov = 0.7, rm = roofMat(h.roof);
    if (h.storeys === 1) {
      const { roof, under } = hipRoof(W + 2 * ov, D + sit + 2 * ov, 1.9);
      B.add(roof, rm, M(0, H, sit / 2));
      B.add(under, soffit, M(0, H - 0.01, sit / 2));
    } else {
      B.add(boxGeo(W + 0.4, 0.18, sit + 0.3), coping, M(0, 3.0, D / 2 + sit / 2 + 0.1));
      B.add(boxGeo(W + 0.4, 0.8, 0.12), wall, M(0, 3.5, D / 2 + sit + 0.2));
      const { roof, under } = hipRoof(W + 2 * ov, D + 2 * ov, 1.9);
      B.add(roof, rm, M(0, H, 0));
      B.add(under, soffit, M(0, H - 0.01, 0));
    }

    // The yard walls: laterite blocks with a plastered top.
    for (const w of h.walls) {
      const lx = w.x1 - w.x0, lz = w.z1 - w.z0;
      if (lx < 0.3 && lz < 0.3) continue;
      B.add(boxGeo(lx, 1.05, lz), laterite, place((w.x0 + w.x1) / 2, 0.525, (w.z0 + w.z1) / 2));
      B.add(boxGeo(lx + 0.06, 0.1, lz + 0.06), coping, place((w.x0 + w.x1) / 2, 1.1, (w.z0 + w.z1) / 2));
    }
    // Gate posts.
    const [gx, gz] = h.gate;
    const [fx, fz] = FACING[h.facing];
    const ax = fz !== 0 ? 1 : 0, az = fx !== 0 ? 1 : 0;
    for (const s of [-1, 1]) {
      const px = gx + ax * s * 1.6, pz = gz + az * s * 1.6;
      B.add(boxGeo(0.5, 1.5, 0.5), wall, place(px - fx * 0.125, 0.75, pz - fz * 0.125));
      B.add(boxGeo(0.62, 0.12, 0.62), coping, place(px - fx * 0.125, 1.56, pz - fz * 0.125));
    }
  }

  // ----- Shops -----
  const blockMat = assets.material('plaster', { scale: 2.4, tint: '#efe9dc' });
  const ironMat = assets.material('iron', { scale: 1.5, tint: '#c9c9c9' });
  const tinMat = assets.material('iron', { scale: 1.5, tint: '#b8bec2', side: THREE.DoubleSide });
  const dark = assets.plain('#1d1712', { rough: 0.9 });
  const shelfMat = assets.material('planks', { scale: 1, tint: '#8a6040' });
  const goodsColours = ['#d84315', '#1e88e5', '#fdd835', '#43a047', '#8e24aa', '#f4511e', '#00897b', '#ffffff', '#6d4c41'];
  const shopsGlow = assets.plain('#3a2a18', { rough: 0.6, emissive: '#ffe2a8' });
  const rows = new Map();
  for (const s of T.shops) {
    const key = s.facing + ':' + (s.facing === 'south' ? -1 : 1);
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(s);
  }
  for (const list of rows.values()) {
    const s0 = list[0], rot = rotOf(s0.facing), front = s0.z; // shops' front wall
    const dir = s0.facing === 'south' ? 1 : -1; // towards the road
    const x0 = Math.min(...list.map(s => s.x - 3)), x1 = Math.max(...list.map(s => s.x + 3)), cx = (x0 + x1) / 2;
    const depth = 6.2, Hs = 4.6, rec = 1.2; // shop fronts are set back `rec` under a deep lintel
    B.add(boxGeo(x1 - x0, Hs, depth - rec), blockMat, place(cx, Hs / 2, front - dir * (rec + (depth - rec) / 2)));
    B.add(boxGeo(x1 - x0, Hs - 2.9, rec), blockMat, place(cx, (Hs + 2.9) / 2, front - dir * rec / 2));
    B.add(boxGeo(x1 - x0, 0.3, rec), assets.material('paving', { scale: 1.5, tint: '#b9b2a8' }), place(cx, 0.15, front - dir * rec / 2));
    for (let k = 0; k <= list.length; k++) B.add(boxGeo(0.35, 2.9, rec), blockMat, place(x0 + k * 6 + (k === 0 ? 0.17 : k === list.length ? -0.17 : 0), 1.45, front - dir * rec / 2));
    B.add(boxGeo(x1 - x0 + 0.2, 0.35, depth + 0.2), coping, place(cx, Hs + 0.1, front - dir * depth / 2));
    // The step along the front.
    B.add(boxGeo(x1 - x0, 0.3, 2.2), assets.material('paving', { scale: 1.5, tint: '#b9b2a8' }), place(cx, 0.15, front + dir * 1.1));
    for (const s of list) {
      const M = (x, y, z) => place(s.x, 0, front, rot).multiply(place(x, y, z));
      if (s.open) {
        // An open shop: dark inside, shelves full of goods, a counter.
        B.add(boxGeo(5.6, 2.6, 0.05), dark, M(0, 0.3 + 1.3, -rec + 0.03));
        for (const y of [0.9, 1.5, 2.1]) {
          B.add(boxGeo(5.4, 0.05, 0.45), shelfMat, M(0, 0.3 + y, -rec + 0.3));
          for (let i = 0; i < 9; i++) {
            const c = goodsColours[(r() * goodsColours.length) | 0];
            B.add(boxGeo(0.4, 0.22 + r() * 0.2, 0.3), assets.plain(c, { rough: 0.6 }), M(-2.3 + i * 0.57, 0.3 + y + 0.17, -rec + 0.3));
          }
        }
        B.add(boxGeo(2.2, 0.9, 0.5), shelfMat, M(-1.2, 0.3 + 0.45, -0.3));
        const g = new THREE.Mesh(boxGeo(5.6, 2.6, 0.02), shopsGlow);
        g.applyMatrix4(M(0, 1.6, -rec + 0.06));
        g.visible = false;
        root.add(g);
        glow.push({ mesh: g });
      } else {
        B.add(boxGeo(5.65, 2.6, 0.08), ironMat, M(0, 0.3 + 1.3, -0.05));
      }
      // The sign board above.
      const sign = new THREE.MeshStandardMaterial({ map: signTexture(s.name, s.colour), roughness: 0.6 });
      B.add(boxGeo(5.4, 0.9, 0.1), sign, M(0, 3.5, 0.15));
    }
    // The tin awning over the step.
    const aw = polyGeo([{ pts: [[x0, 2.95, front], [x1, 2.95, front], [x1, 2.55, front + dir * 2.4], [x0, 2.55, front + dir * 2.4]], uDir: [1, 0, 0] }]);
    if (dir < 0) aw.scale(1, 1, 1);
    B.add(aw, tinMat);
  }

  // ----- The tea shop -----
  {
    const t = T.teaShop;
    const wallMat = assets.material('plaster-blue', { scale: 2, tint: '#d8ecf0' });
    B.add(boxGeo(10, 4.2, 2.4), wallMat, place(35, 2.1, -13.8));
    for (const x of [30.2, 39.8]) B.add(boxGeo(0.4, 3.0, 6.2), wallMat, place(x, 1.5, -9.7));
    B.add(boxGeo(10.4, 0.25, 6.6), coping, place(35, 3.1, -9.6));
    B.add(boxGeo(8, 1.0, 0.6), shelfMat, place(35, 0.5, -11.0));
    // Glass jars of snacks and a big brass tea urn on the counter.
    const jar = assets.plain('#f3e7c9', { rough: 0.15 });
    for (let i = 0; i < 6; i++) B.add(new THREE.CylinderGeometry(0.13, 0.13, 0.32, 12), jar, place(31.8 + i * 0.5, 1.16, -11.0));
    B.add(new THREE.CylinderGeometry(0.28, 0.32, 0.75, 16), assets.plain('#c9a043', { rough: 0.25, metal: 0.9 }), place(37.4, 1.38, -11.0));
    const sign = new THREE.MeshStandardMaterial({ map: signTexture('Tea Shop', '#a33b2a'), roughness: 0.6 });
    B.add(boxGeo(6, 0.8, 0.1), sign, place(35, 3.7, -6.55));
    // Benches outside.
    for (const x of [32.1, 37.9]) {
      B.add(boxGeo(3, 0.07, 0.5), wood, place(x, 0.43, -8.15));
      for (const dx of [-1.3, 1.3]) B.add(boxGeo(0.08, 0.4, 0.45), wood, place(x + dx, 0.2, -8.15));
    }
    const g = new THREE.Mesh(boxGeo(8, 2, 0.02), shopsGlow);
    g.applyMatrix4(place(35, 2, -12.55));
    g.visible = false;
    root.add(g);
    glow.push({ mesh: g });
    lamps.push({ x: 35, y: 2.8, z: -9 });
  }

  // ----- The bus stop -----
  {
    const conc = assets.material('paving', { scale: 2, tint: '#cfcac1' });
    B.add(boxGeo(6.8, 2.6, 0.4), conc, place(0, 1.3, 9.3));
    B.add(boxGeo(7.4, 0.18, 3.2), conc, place(0, 2.6, 8.0));
    for (const x of [-3.2, 3.2]) B.add(boxGeo(0.2, 2.5, 0.2), conc, place(x, 1.25, 6.7));
    B.add(boxGeo(5.2, 0.08, 0.5), wood, place(0, 0.43, 8.65));
    const sign = new THREE.MeshStandardMaterial({ map: signTexture('Bus Stop', '#1f5fa8'), roughness: 0.6 });
    B.add(boxGeo(3, 0.6, 0.06), sign, place(0, 2.0, 9.08));
  }

  // ----- The market -----
  const tarp = c => assets.plain(c, { rough: 0.85, side: THREE.DoubleSide });
  const postMat = assets.material('planks', { scale: 1, tint: '#7a5a3a' });
  const goods = {}; // model -> list of places
  const putGoods = (m, p) => (goods[m] = goods[m] || []).push(p);
  for (const st of T.stalls) {
    const { x, z } = st;
    for (const [px, pz] of [[-2.4, -1.4], [2.4, -1.4], [-2.4, 1.4], [2.4, 1.4]]) B.add(new THREE.CylinderGeometry(0.05, 0.06, 2.6, 6), postMat, place(x + px, 1.3, z + pz));
    const roof = polyGeo([{ pts: [[x - 2.7, 2.7, z - 1.7], [x + 2.7, 2.7, z - 1.7], [x + 2.7, 2.35, z + 1.8], [x - 2.7, 2.35, z + 1.8]], uDir: [1, 0, 0] }]);
    B.add(roof, tinMat);
    B.add(boxGeo(5.4, 0.35, 0.02), tarp(st.awning), place(x, 2.2, z + 1.8));
    // Table.
    B.add(boxGeo(4, 0.06, 1.2), shelfMat, place(x, 0.77, z + 0.9));
    for (const [px, pz] of [[-1.9, 0.4], [1.9, 0.4], [-1.9, 1.4], [1.9, 1.4]]) B.add(boxGeo(0.06, 0.74, 0.06), postMat, place(x + px, 0.37, z + pz));
    // Goods in baskets on the table.
    for (let i = 0; i < 4; i++) {
      const bx = x - 1.5 + i, bz = z + 0.9;
      if (st.goods === 'brass_pot_01' || st.goods === 'ceramic_pot' || st.goods === 'plastic_crate_01') {
        putGoods(st.goods, { x: bx, y: 0.8, z: bz, rot: r() * 6 });
        continue;
      }
      putGoods('wicker_basket_01', { x: bx, y: 0.8, z: bz, rot: (r() - 0.5) * 0.3, scale: 0.95 });
      const many = st.goods === 'bananas' ? 2 : st.goods === 'food_ginger_01' ? 5 : 14;
      for (let k = 0; k < many; k++) {
        const s = st.goods === 'food_ginger_01' ? 0.5 : 1;
        putGoods(st.goods, { x: bx + (r() - 0.5) * 0.24, y: 0.84 + (k > 7 ? 0.05 : 0), z: bz + (r() - 0.5) * 0.18, rot: r() * 6, scale: s });
      }
    }
    lamps.push({ x, y: 2.2, z, small: true });
  }
  for (const [m, list] of Object.entries(goods)) instances(assets.models[m], list, root, { shadow: m !== 'food_lime_01' && m !== 'lemon' && m !== 'yellow_onion' });

  // ----- Things lying about -----
  {
    const byModel = {};
    for (const p of T.props) (byModel[p.model] = byModel[p.model] || []).push(p);
    // Ferns and grass along the yard walls and the road sides.
    const rr = rng(9);
    byModel.fern_02 = [];
    byModel.grass_medium_01 = [];
    for (const h of T.houses) for (const w of h.walls) {
      const len = Math.max(w.x1 - w.x0, w.z1 - w.z0);
      for (let i = 0; i < len / 9; i++) {
        const t = rr(), x = w.x0 + (w.x1 - w.x0) * t, z = w.z0 + (w.z1 - w.z0) * t;
        (rr() < 0.5 ? byModel.fern_02 : byModel.grass_medium_01).push({ x: x + (rr() - 0.5) * 0.6, z: z + (rr() - 0.5) * 0.6, rot: rr() * 6, scale: 0.5 + rr() * 0.5 });
      }
    }
    for (let x = -96; x < 96; x += 6 + rr() * 8) for (const z of [-6.9, 6.9]) {
      if (Math.abs(x - 24) < 7 || (z < 0 && x > -72 && x < 41) || (z > 0 && x > -5 && x < 64)) continue;
      byModel.grass_medium_01.push({ x, z: z + (rr() - 0.5) * 0.6, rot: rr() * 6, scale: 0.4 + rr() * 0.4 });
    }
    byModel.metal_trash_can = (byModel.metal_trash_can || []).concat([{ x: 40.8, z: -7.6, rot: 0.3 }]);
    byModel.plastic_jerrycan = [{ x: 30.8, z: -12.1, rot: 1 }, { x: -36.8, z: -33.9, rot: 2 }];
    byModel.old_tyre = [{ x: 63.4, z: 7.4, y: 0.08, rot: 0, scale: 1 }];
    byModel.utility_box_01 = [{ x: 17.6, z: -7.2, rot: Math.PI }];
    for (const [m, list] of Object.entries(byModel)) {
      const model = assets.models[m];
      if (!model) continue;
      // Some models lie on their side as made; the tyre is turned upright.
      const fixed = list.map(p => ({ ...p, y: p.y || 0 }));
      const small = ['grass_medium_01', 'fern_02'].includes(m);
      instances(model, fixed, root, { shadow: !small, chunk: small ? 64 : 0 });
    }
  }

  // ----- Electric poles, wires and street lights -----
  {
    const concrete = assets.material('paving', { scale: 1.5, tint: '#bdb8ae' });
    const steel = assets.plain('#3a3a3a', { rough: 0.5, metal: 0.6 });
    const insul = assets.plain('#e8e4dc', { rough: 0.3 });
    const tube = assets.plain('#f0f0ea', { rough: 0.3, emissive: '#fff4d6' });
    const tubes = new Batcher();
    const pole = new THREE.CylinderGeometry(0.1, 0.17, 9, 4);
    pole.rotateY(Math.PI / 4);
    for (const p of T.poles) {
      B.add(pole, concrete, place(p.x, 4.5, p.z));
      const along = p.armTo[0] !== 0 ? 0 : Math.PI / 2; // the cross-arm runs along the road
      B.add(boxGeo(1.6, 0.1, 0.1), steel, place(p.x, 8.6, p.z, along));
      for (const s of [-0.7, 0, 0.7]) {
        const dx = Math.cos(along) * s, dz = -Math.sin(along) * s;
        B.add(new THREE.CylinderGeometry(0.04, 0.05, 0.16, 8), insul, place(p.x + dx, 8.73, p.z + dz));
      }
      if (p.light) {
        const [ax, az] = p.armTo;
        B.add(boxGeo(0.06, 0.06, 1.4), steel, place(p.x + ax * 0.7, 6.6, p.z + az * 0.7, Math.atan2(ax, az)));
        tubes.add(boxGeo(0.12, 0.08, 0.7), tube, place(p.x + ax * 1.3, 6.52, p.z + az * 1.3, Math.atan2(ax, az)));
        lamps.push({ x: p.x + ax * 1.3, y: 6.4, z: p.z + az * 1.3 });
      }
    }
    const tubeGroup = new THREE.Group();
    tubes.build(tubeGroup);
    root.add(tubeGroup);
    glow.push({ material: tube });
    // Wires sag between poles on the same line.
    const pts = [];
    const lines = [T.poles.filter(p => p.armTo[1] !== 0), T.poles.filter(p => p.armTo[0] !== 0)];
    for (const line of lines) {
      const sorted = [...line].sort((a, b) => (a.x - b.x) || (a.z - b.z));
      for (let i = 0; i + 1 < sorted.length; i++) {
        const a = sorted[i], b = sorted[i + 1];
        if (Math.hypot(a.x - b.x, a.z - b.z) > 60) continue;
        const along = a.armTo[0] !== 0 ? 0 : Math.PI / 2;
        for (const s of [-0.7, 0, 0.7]) {
          const dx = Math.cos(along) * s, dz = -Math.sin(along) * s;
          for (let k = 0; k < 12; k++) {
            for (const t of [k / 12, (k + 1) / 12]) {
              const sag = 4 * 0.7 * t * (1 - t);
              pts.push(a.x + (b.x - a.x) * t + dx, 8.8 - sag, a.z + (b.z - a.z) * t + dz);
            }
          }
        }
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    root.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#1b1b1b' })));
  }

  B.build(root);
  const plants = addPlants(root, assets, T.palms, T.bananas, { far: quality === 'low' ? 110 : 140 });
  return { root, glow, lamps, plants };
}

/**
 * Inaara's home, after the family's photo (layout.js addHome has the plan): two storeys, white walls with a dark band
 * at the bottom, two hip roofs of brown clay tiles above meeting at an angle, a wide tiled roof round the ground
 * floor, a balcony with a white and wood-brown railing, a sit-out with turned wooden pillars and curved steps on the
 * left, a car porch with a round white pillar on the right, wooden doors and windows.
 */
function drawHome(B, h, assets, glow, root) {
  const rot = rotOf(h.facing);
  // Local frame: origin in the middle of the walls, +z towards the gate, `R(u)` is u metres to your right as you
  // face the house.
  const M = (x, y, z) => place(h.x, 0, h.z, rot).multiply(place(x, y, z));
  // Facing the house from the gate you look along -z, so your right is +x in this frame.
  const R = u => u;
  const W = h.w, D = h.d, F = h.front;
  const white = assets.plain('#f3f3ef', { rough: 0.85 });
  const band = assets.plain('#2b2d31', { rough: 0.7 });
  const tiles = assets.material('roof', { scale: 1.4, tint: '#a8655a' });
  const soffit = assets.plain('#f2f2ee', { rough: 0.8 });
  const wood = assets.material('planks', { scale: 1.0, tint: '#7a4528' });
  const woodLight = assets.material('planks', { scale: 1.0, tint: '#a8653c' });
  const shutter = assets.material('shutter', { scale: 1.1, tint: '#8a4f2c' });
  const granite = assets.plain('#2a2a2c', { rough: 0.25 });
  const floor = assets.material('paving', { scale: 1.0, tint: '#d8d6d0' });
  const H1 = 3.2, H2 = 3.0;
  // Ground floor and its dark band.
  B.add(boxGeo(W, H1, D), white, M(0, H1 / 2, 0));
  B.add(boxGeo(W + 0.06, 0.55, D + 0.06), band, M(0, 0.275, 0));
  // Upper floor: a little narrower and set back from the front.
  const W2 = W - 2, D2 = D - 1.4;
  B.add(boxGeo(W2, H2, D2), white, M(0, H1 + H2 / 2, -0.5));
  // The wide tiled roof round the ground floor: slopes from the upper walls out past the walls and over the front.
  const inner = { x0: -W2 / 2, x1: W2 / 2, z0: -0.5 - D2 / 2, z1: -0.5 + D2 / 2 };
  const outer = { x0: -W / 2 - 0.9, x1: W / 2 + 0.9, z0: -D / 2 - 0.9, z1: D / 2 + F + 0.6 };
  const yIn = H1 + 0.55, yOut = H1 - 0.35;
  const P = (x, y, z) => [x, y, z];
  const skirt = polyGeo([
    { pts: [P(outer.x0, yOut, outer.z1), P(outer.x1, yOut, outer.z1), P(inner.x1, yIn, inner.z1), P(inner.x0, yIn, inner.z1)], uDir: [1, 0, 0] },
    { pts: [P(outer.x1, yOut, outer.z0), P(outer.x0, yOut, outer.z0), P(inner.x0, yIn, inner.z0), P(inner.x1, yIn, inner.z0)], uDir: [-1, 0, 0] },
    { pts: [P(outer.x1, yOut, outer.z1), P(outer.x1, yOut, outer.z0), P(inner.x1, yIn, inner.z0), P(inner.x1, yIn, inner.z1)], uDir: [0, 0, -1] },
    { pts: [P(outer.x0, yOut, outer.z0), P(outer.x0, yOut, outer.z1), P(inner.x0, yIn, inner.z1), P(inner.x0, yIn, inner.z0)], uDir: [0, 0, 1] }
  ]);
  B.add(skirt, tiles, M(0, 0, 0));
  B.add(polyGeo([{ pts: [P(outer.x0, yOut - 0.02, outer.z0), P(outer.x1, yOut - 0.02, outer.z0), P(outer.x1, yOut - 0.02, outer.z1), P(outer.x0, yOut - 0.02, outer.z1)], uDir: [1, 0, 0] }]), soffit, M(0, 0, 0));
  // A white fascia and gutter along the eaves.
  B.add(boxGeo(outer.x1 - outer.x0, 0.14, 0.12), soffit, M(0, yOut - 0.05, outer.z1));
  // The balcony: the upper floor's front opens onto a terrace over the sit-out and porch, with a railing.
  const balZ = -0.5 + D2 / 2, balD = D / 2 + F - 0.2 - balZ;
  B.add(boxGeo(W2 + 0.4, 0.2, balD), floor, M(0, H1 + 0.6, balZ + balD / 2));
  const railZ = balZ + balD;
  B.add(boxGeo(W2 + 0.4, 0.95, 0.12), white, M(0, H1 + 1.18, railZ));
  for (const y of [H1 + 0.68, H1 + 1.66]) B.add(boxGeo(W2 + 0.5, 0.12, 0.18), woodLight, M(0, y, railZ));
  for (const sx of [-1, 1]) B.add(boxGeo(0.12, 0.95, balD), white, M(sx * (W2 / 2 + 0.14), H1 + 1.18, balZ + balD / 2));
  // Wood-brown posts in the railing, and dark round grilles.
  for (let i = -3; i <= 3; i++) B.add(boxGeo(0.08, 0.85, 0.16), woodLight, M(i * (W2 / 7), H1 + 1.18, railZ));
  for (const u of [-W2 / 3, W2 / 3]) for (const dx of [-0.18, 0, 0.18]) {
    const ring = new THREE.TorusGeometry(0.08, 0.015, 6, 16);
    B.add(ring, band, M(R(u) + dx, H1 + 1.2, railZ + 0.07));
  }
  // Two hip roofs above, meeting at an angle: one over each half of the upper floor.
  for (const [cx, w, d] of [[R(-W2 / 4), W2 / 2 + 1.2, D2 + 1.6], [R(W2 / 4), W2 / 2 + 1.6, D2 + 1.2]]) {
    const { roof, under } = hipRoof(w, d, 1.6);
    B.add(roof, tiles, M(cx, H1 + H2, -0.5));
    B.add(under, soffit, M(cx, H1 + H2 - 0.01, -0.5));
  }
  // Windows (wooden shutters in brown frames) and doors.
  const win = (x, y, z, ry, w = 1.2, hh = 1.3) => {
    const m = M(x, y, z).multiply(place(0, 0, 0, ry));
    B.add(boxGeo(w + 0.16, hh + 0.16, 0.06), wood, m);
    B.add(boxGeo(w, hh, 0.08), shutter, m);
  };
  win(R(-4.6), H1 + 1.6, -0.5 + D2 / 2 + 0.04, 0);
  win(R(3.2), H1 + 1.6, -0.5 + D2 / 2 + 0.04, 0, 1.6);
  B.add(boxGeo(1.0, 2.1, 0.08), wood, M(R(-0.8), H1 + 1.05 + 0.6, -0.5 + D2 / 2 + 0.04));
  for (const sx of [-1, 1]) {
    win(sx * (W / 2 + 0.035), 1.7, 0.8, sx * Math.PI / 2);
    win(sx * (W2 / 2 + 0.035), H1 + 1.6, -0.8, sx * Math.PI / 2);
  }
  win(R(5.2), 1.7, D / 2 + 0.035, 0);
  win(R(-2.2), 1.7, -D / 2 - 0.035, Math.PI);
  // The big wooden double door in the sit-out.
  B.add(boxGeo(2.0, 2.5, 0.1), wood, M(R(-3.8), 0.45 + 1.25, D / 2 + 0.05));
  B.add(boxGeo(0.04, 2.4, 0.12), granite, M(R(-3.8), 0.45 + 1.2, D / 2 + 0.06));
  // The sit-out: a light floor, curved granite steps, turned wooden pillars, low wooden railings with curves.
  const sitX = R(-3.8);
  B.add(boxGeo(6.4, 0.45, F - 0.7), floor, M(sitX, 0.225, D / 2 + (F - 0.7) / 2));
  const st1 = new THREE.CylinderGeometry(1.6, 1.6, 0.22, 24, 1, false, -Math.PI / 2, Math.PI);
  B.add(st1, granite, M(sitX, 0.11, D / 2 + F - 0.7).multiply(new THREE.Matrix4().makeScale(1, 1, 0.45)));
  const turned = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    turned.push(new THREE.Vector2(0.13 + 0.05 * Math.sin(t * Math.PI * 3) ** 2 + (t < 0.08 || t > 0.92 ? 0.05 : 0), t * 2.25));
  }
  for (const u of [-6.7, -0.9]) B.add(new THREE.LatheGeometry(turned, 14), woodLight, M(R(u), 0.45, D / 2 + F - 0.95));
  for (const [u0, u1] of [[-7.0, -5.3], [-2.3, -0.6]]) {
    const cxr = R((u0 + u1) / 2), len = u1 - u0;
    B.add(boxGeo(len, 0.08, 0.1), woodLight, M(cxr, 1.15, D / 2 + F - 0.95));
    for (let k = 0; k < 4; k++) {
      const arc = new THREE.TorusGeometry(0.22, 0.025, 6, 12, Math.PI);
      B.add(arc, woodLight, M(cxr - len / 2 + 0.3 + k * (len - 0.6) / 3, 0.62, D / 2 + F - 0.95));
    }
  }
  // The car porch: the round white pillar at its corner (and her bicycle, which the game puts there).
  B.add(new THREE.CylinderGeometry(0.2, 0.2, H1 - 0.3, 16), soffit, M(R(6.6), (H1 - 0.3) / 2, D / 2 + F - 0.4));
  B.add(boxGeo(5.6, 0.04, F), floor, M(R(3.6), 0.02, D / 2 + F / 2));
  // White yard walls on a dark base, and square gate posts by the wide gate.
  for (const w of h.walls) {
    const lx = w.x1 - w.x0, lz = w.z1 - w.z0, x = (w.x0 + w.x1) / 2, z = (w.z0 + w.z1) / 2;
    if (lx < 0.3 && lz < 0.3) continue;
    B.add(boxGeo(lx, 0.35, lz), band, place(x, 0.175, z));
    B.add(boxGeo(lx, 0.75, lz), white, place(x, 0.725, z));
    B.add(boxGeo(lx + 0.06, 0.1, lz + 0.06), soffit, place(x, 1.15, z));
  }
  const [gx, gz] = h.gate, [fx, fz] = FACING[h.facing];
  const ax = fz !== 0 ? 1 : 0, az = fx !== 0 ? 1 : 0;
  for (const sg of [-1, 1]) {
    const px = gx + ax * sg * h.gateWidth - fx * 0.125, pz = gz + az * sg * h.gateWidth - fz * 0.125;
    B.add(boxGeo(0.6, 1.6, 0.6), white, place(px, 0.8, pz));
    B.add(boxGeo(0.72, 0.12, 0.72), band, place(px, 1.66, pz));
  }
  // A lamp by the door that lights up in the evening.
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.08), assets.plain('#fff5d6', { rough: 0.3, emissive: '#ffe2a8' }));
  lamp.applyMatrix4(M(R(-1.9), 2.6, D / 2 + 0.06));
  root.add(lamp);
  glow.push({ mesh: lamp });
}
