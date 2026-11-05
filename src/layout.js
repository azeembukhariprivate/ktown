// The plan of the town: roads, lanes, the market, shops, houses in their walled yards, coconut palms, electric poles,
// and where people walk. Plain data with no drawing, so the tests can check it (tests/town.test.mjs).
// x runs east, z runs south, in metres. The middle of the junction is near (24, 0).

export const BOUND = 100; // she can walk up to here in every direction

/** Small repeatable random numbers, so the town is the same every time. */
export function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rect = (x0, z0, x1, z1) => ({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1) });
export const overlaps = (a, b, m = 0) => a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.z0 < b.z1 + m && a.z1 > b.z0 - m;
export const inside = (r, x, z, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;

/** A solid box from the ground up to `top`; she can step onto low ones and jump onto a little higher. */
function box(r, top, extra = {}) {
  return { kind: 'box', x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2, hw: (r.x1 - r.x0) / 2, hd: (r.z1 - r.z0) / 2, top, ...extra };
}
const circle = (x, z, r, top) => ({ kind: 'circle', x, z, r, top });

// Ways a building can face: the side its front (door) is on.
export const FACING = { south: [0, 1], north: [0, -1], east: [1, 0], west: [-1, 0] };

const HOUSE_COLOURS = ['#f4efe2', '#f2d98c', '#bfe0d2', '#f3c6a5', '#cfe1f2', '#e8d2ef', '#f6f1c7', '#d9ecb8', '#f4c9c9'];
const SHOPS = [
  { name: 'Lakshmi Stores', colour: '#2f6db5' },
  { name: 'Fresh Bakery', colour: '#c4432d' },
  { name: 'Sree Textiles', colour: '#7a3fa0' },
  { name: 'Mobile World', colour: '#1f8a6b' },
  { name: 'Medicals', colour: '#2a9a3b' },
  { name: 'Hardware', colour: '#a86b1d' },
  { name: 'Fancy Store', colour: '#d1477a' },
  { name: 'Fruits & Veg', colour: '#4d8c22' },
  { name: 'Photo Studio', colour: '#34495e' },
  { name: 'Book Stall', colour: '#b5462f' }
];

export function buildTown() {
  const r = rng(20251105);
  const T = {
    ground: [], // {type, x0, z0, x1, z1}: road, laterite, paving, sand, yard path
    solids: [], // what she bumps into or stands on
    camera: [], // things only the camera keeps out of (roofs and awnings over places she can walk)
    houses: [], shops: [], stalls: [], teaShop: null, busStop: null,
    palms: [], bananas: [], bushes: [], poles: [], props: [],
    routes: [], idlers: [], areas: [],
    start: { x: 11, z: 4.8, heading: Math.PI } // on the road side by the zebra crossing, looking at the shops
  };
  const reserved = [];
  const ground = (type, rc) => { T.ground.push({ type, ...rc }); return rc; };
  const reserve = rc => { reserved.push(rc); return rc; };

  // Roads and lanes.
  reserve(ground('road', rect(-130, -4, 130, 4)));
  reserve(ground('laterite', rect(-130, -6.4, 130, -4)));
  reserve(ground('laterite', rect(-130, 4, 130, 6.4)));
  reserve(ground('road', rect(21, -130, 27, -6.4)));
  reserve(ground('laterite', rect(18.6, -130, 21, -6.4)));
  reserve(ground('laterite', rect(27, -130, 29.4, -6.4)));
  reserve(ground('laterite', rect(-28.2, 6.4, -23.8, 130)));
  reserve(ground('laterite', rect(-72, -52.2, 18.6, -47.8)));
  T.areas.push({ name: 'Kavala Junction', ...rect(-20, -20, 70, 20) }, { name: 'The Market', ...rect(-72, -36, -36, -4) },
    { name: 'Temple Road', ...rect(14, -100, 34, -20) }, { name: 'Pond Lane', ...rect(-34, 6, -18, 100) },
    { name: 'School Lane', ...rect(-72, -60, 18, -40) });

  // A row of shops on the north side of the main road, and another on the south side.
  const shopRow = (x0, n, side, names) => {
    const s = side === 'north' ? -1 : 1, front = s * 6.6, plinth = s * 8.8, back = s * 15;
    reserve(rect(x0 - 0.5, front, x0 + n * 6 + 0.5, back));
    ground('paving', rect(x0, front, x0 + n * 6, plinth));
    T.solids.push(box(rect(x0, front, x0 + n * 6, plinth), 0.3, { what: 'shop step' }));
    T.solids.push(box(rect(x0, plinth, x0 + n * 6, back), 4.6, { what: 'shops' }));
    T.camera.push(box(rect(x0, front - s * 0.4, x0 + n * 6, plinth), 6, { bottom: 2.7 }));
    for (let i = 0; i < n; i++) {
      const shop = { ...names[i], x: x0 + i * 6 + 3, z: plinth, w: 6, facing: side === 'north' ? 'south' : 'north', open: i % 3 !== 2 };
      T.shops.push(shop);
      if (shop.open) T.idlers.push({ x: shop.x + 0.8, z: plinth - s * 0.6, y: 0.3, heading: side === 'north' ? 0 : Math.PI, kind: 'shopkeeper' });
    }
  };
  shopRow(-20, 6, 'north', SHOPS.slice(0, 6));
  shopRow(32, 5, 'south', SHOPS.slice(5, 10));

  // The tea shop at the corner of Temple Road: open at the front, benches outside.
  {
    const rc = reserve(rect(30, -15, 40, -6.6));
    ground('paving', rect(30, -9.2, 40, -6.6));
    T.solids.push(box(rect(30, -15, 40, -12.6), 4.2, { what: 'tea shop' }));
    T.solids.push(box(rect(31, -11.3, 39, -10.7), 1.0, { what: 'tea counter' }));
    T.solids.push(box(rect(30, -12.6, 30.4, -6.6), 3, { what: 'tea shop wall' }), box(rect(39.6, -12.6, 40, -6.6), 3, { what: 'tea shop wall' }));
    T.camera.push(box(rect(30, -12.6, 40, -6.4), 6, { bottom: 2.6 }));
    T.teaShop = { x: 35, z: -12.6, w: 10, facing: 'south', ...rc };
    T.solids.push(box(rect(30.6, -8.4, 33.6, -7.9), 0.45, { what: 'bench' }), box(rect(36.4, -8.4, 39.4, -7.9), 0.45, { what: 'bench' }));
    T.idlers.push({ x: 35, z: -12.0, y: 0, heading: 0, kind: 'shopkeeper' },
      { x: 31.6, z: -8.15, y: 0.45, heading: Math.PI, kind: 'sitting' }, { x: 38.2, z: -8.15, y: 0.45, heading: Math.PI, kind: 'sitting' },
      { x: 33.2, z: -7.2, y: 0, heading: Math.PI / 2, kind: 'chatting' });
  }

  // The bus stop across from the shops.
  {
    const rc = reserve(rect(-3.5, 6.4, 3.5, 9.6));
    T.busStop = { ...rc };
    ground('paving', rc);
    T.solids.push(box(rect(-3.4, 9.1, 3.4, 9.5), 2.6, { what: 'bus stop wall' }));
    T.solids.push(box(rect(-2.6, 8.4, 2.6, 8.9), 0.45, { what: 'bus stop bench' }));
    T.solids.push(circle(-3.2, 6.7, 0.14, 2.6), circle(3.2, 6.7, 0.14, 2.6));
    T.camera.push(box(rect(-3.6, 6.6, 3.6, 9.6), 5, { bottom: 2.5 }));
    T.idlers.push({ x: -1.2, z: 8.6, y: 0.45, heading: Math.PI, kind: 'sitting' }, { x: 2.2, z: 7.4, y: 0, heading: Math.PI, kind: 'waiting' });
  }

  // The market: paved, with rows of stalls under tin roofs.
  {
    const m = reserve(ground('paving', rect(-71, -35, -37, -6.4)));
    const rows = [-12.5, -21, -29.5], cols = [-64.5, -57, -49.5, -42];
    const goods = ['bananas', 'food_lime_01', 'yellow_onion', 'lemon', 'sweet_potato', 'food_ginger_01', 'bananas', 'brass_pot_01', 'ceramic_pot', 'wicker_basket_01', 'plastic_crate_01', 'yellow_onion'];
    let k = 0;
    for (const zc of rows) for (const xc of cols) {
      const st = { x: xc, z: zc, w: 5, d: 3, goods: goods[k % goods.length], awning: ['#2e7d32', '#1565c0', '#c62828', '#6a1b9a', '#ef6c00'][k % 5] };
      T.stalls.push(st);
      T.solids.push(box(rect(xc - 2, zc + 0.3, xc + 2, zc + 1.5), 0.8, { what: 'stall table' }));
      for (const [px, pz] of [[-2.4, -1.4], [2.4, -1.4], [-2.4, 1.4], [2.4, 1.4]]) T.solids.push(circle(xc + px, zc + pz, 0.08, 2.6));
      T.camera.push(box(rect(xc - 2.7, zc - 1.7, xc + 2.7, zc + 1.7), 5, { bottom: 2.3 }));
      if (k % 4 !== 3) T.idlers.push({ x: xc + (r() - 0.5) * 2, z: zc - 0.6, y: 0, heading: 0, kind: 'seller' });
      T.props.push({ model: 'wooden_crate_01', x: xc + 1.9, z: zc - 1.0, rot: r() });
      T.solids.push(circle(xc + 1.9, zc - 1.0, 0.25, 0.3));
      k++;
    }
    for (const z of [-8.3, -16.75, -25.25]) T.routes.push({ pts: [[m.x0 + 1.5, z], [m.x1 - 1.5, z]], who: 2 });
    T.routes.push({ pts: [[-68.5, -8.3], [-68.5, -33.2], [-38.3, -33.2], [-38.3, -8.3]], who: 2 });
    T.props.push({ model: 'plastic_monobloc_chair_01', x: -38.2, z: -10.5, rot: 2.6 }, { model: 'plastic_monobloc_chair_01', x: -38.6, z: -19.4, rot: 3.6 });
    T.props.push({ model: 'metal_trash_can', x: -70.2, z: -7.4, rot: 0 });
  }

  // Electric poles along the roads, with a tube light on every other one.
  for (let x = -96, i = 0; x <= 96; x += 28, i++) {
    if (inside(rect(17, -8, 31, 8), x, -6, 0)) continue;
    T.poles.push({ x, z: -6.0, light: i % 2 === 0, armTo: [0, 1] });
  }
  for (let z = -34, i = 0; z >= -96; z -= 28, i++) T.poles.push({ x: 29.0, z, light: i % 2 === 0, armTo: [-1, 0] });
  for (const p of T.poles) T.solids.push(circle(p.x, p.z, 0.16, 9));

  // House plots along the lanes: a walled yard with a gate facing the lane, the house set back inside.
  const plots = [];
  const plot = (x0, z0, x1, z1, facing) => {
    const rc = rect(x0, z0, x1, z1);
    if (rc.x0 < -BOUND || rc.x1 > BOUND || rc.z0 < -BOUND || rc.z1 > BOUND) return;
    if (reserved.some(q => overlaps(rc, q, 0.4)) || plots.some(q => overlaps(rc, q, 0.4))) return;
    plots.push({ ...rc, facing });
  };
  for (let z = -16; z > -100; z -= 17) {
    plot(2.6, z, 18.2, z - 16, 'east'); // Temple Road, west side
    plot(29.8, z, 45.4, z - 16, 'west'); // Temple Road, east side
  }
  for (let x = 2; x > -74; x -= 17) {
    plot(x, -52.6, x - 16, -68, 'south'); // School Lane, north side
    plot(x, -47.4, x - 16, -35.8, 'north'); // School Lane, south side
  }
  for (let z = 7; z < 100; z += 17) {
    plot(-44, z, -28.6, z + 16, 'east'); // Pond Lane, west side
    plot(-23.4, z, -8, z + 16, 'west'); // Pond Lane, east side
  }
  for (let x = -98; x < 100; x += 17) {
    plot(x, 6.8, x + 16, 22, 'north'); // main road, south side
    plot(x, -6.8, x + 16, -22, 'south'); // main road, north side
  }

  for (const p of plots) addHouse(T, p, r);

  // Coconut groves where there are no houses, and palms around the edge so the town feels bigger than it is.
  const taken = () => [...reserved, ...plots];
  const free = (x, z, m) => !taken().some(q => inside(q, x, z, m)) && !T.palms.some(p => Math.hypot(p.x - x, p.z - z) < 3.6);
  for (let i = 0; i < 2600 && T.palms.length < 520; i++) {
    const x = (r() * 2 - 1) * 128, z = (r() * 2 - 1) * 128;
    if (free(x, z, 1.4)) T.palms.push({ x, z, h: 8 + r() * 6, lean: (r() - 0.5) * 0.5, dir: r() * Math.PI * 2, kind: (r() * 4) | 0 });
  }
  for (let i = 0; i < 800 && T.bananas.length < 60; i++) {
    const x = (r() * 2 - 1) * 98, z = (r() * 2 - 1) * 98;
    if (free(x, z, 1.2) && !T.bananas.some(b => Math.hypot(b.x - x, b.z - z) < 2)) T.bananas.push({ x, z, h: 2.4 + r() * 1.2, dir: r() * 6.28 });
  }
  for (const p of T.palms) if (Math.abs(p.x) < BOUND + 2 && Math.abs(p.z) < BOUND + 2) T.solids.push(circle(p.x, p.z, 0.22, 30));
  for (const b of T.bananas) T.solids.push(circle(b.x, b.z, 0.14, 3));

  // People walking along the road sides and lanes, back and forth.
  T.routes.push({ pts: [[-98, -5.0], [98, -5.0]], who: 5 }, { pts: [[-98, 5.0], [98, 5.0]], who: 5 });
  T.routes.push({ pts: [[20.0, -7.5], [20.0, -98]], who: 3 }, { pts: [[28.0, -9], [28.0, -98]], who: 2 });
  T.routes.push({ pts: [[-26, 7.5], [-26, 98]], who: 3 }, { pts: [[-70, -50], [17.4, -50]], who: 3 });
  return T;
}

/** A Kerala house in its plot: walls, a sit-out (verandah) at the front, a tiled roof, a walled yard with a gate. */
function addHouse(T, p, r) {
  const [fx, fz] = FACING[p.facing];
  // Work in the plot's own frame: `u` along the front, `v` from the front (gate) to the back.
  const along = fx !== 0 ? [0, 1] : [1, 0];
  const width = fx !== 0 ? p.z1 - p.z0 : p.x1 - p.x0, depth = fx !== 0 ? p.x1 - p.x0 : p.z1 - p.z0;
  const cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2;
  const at = (u, v) => [cx + along[0] * u - fx * (v - depth / 2), cz + along[1] * u - fz * (v - depth / 2)];
  const rectUV = (u0, v0, u1, v1) => { const [a, b] = at(u0, v0), [c, d] = at(u1, v1); return rect(a, b, c, d); };

  const sit = 2.2;
  let hw = 4.2 + r() * 1.3, hd = 3.6 + r() * 0.8, setback = 4.6 + r() * 1.2;
  // Keep the house inside its yard, with room to walk round the back.
  setback = Math.min(setback, Math.max(3.2, depth - 1.6 - sit - 2 * hd));
  hd = Math.min(hd, (depth - 1.6 - sit - setback) / 2);
  hw = Math.min(hw, width / 2 - 1.6);
  if (hd < 2.8 || hw < 3.2) return;
  const offset = (r() - 0.5) * Math.max(0, width - 2 * hw - 4);
  const storeys = r() < 0.3 ? 2 : 1;
  const house = {
    facing: p.facing, x: 0, z: 0, w: 2 * hw, d: 2 * hd, sit, storeys,
    colour: HOUSE_COLOURS[(r() * HOUSE_COLOURS.length) | 0], old: r() < 0.25, roof: r() < 0.3 ? 'roof-old' : 'roof',
    plot: { ...p }
  };
  const vWall0 = setback + sit, vWall1 = vWall0 + 2 * hd;
  const [hx, hz] = at(offset, (vWall0 + vWall1) / 2);
  house.x = hx;
  house.z = hz;
  const [sx, sz] = at(offset, setback + sit / 2);
  house.sitX = sx;
  house.sitZ = sz;
  T.houses.push(house);
  const H = storeys === 2 ? 6.2 : 3.2;
  T.solids.push(box(rectUV(offset - hw, vWall0, offset + hw, vWall1), H + 2, { what: 'house' }));
  T.solids.push(box(rectUV(offset - hw, setback, offset + hw, vWall0), 0.42, { what: 'sit-out' }));
  T.solids.push(box(rectUV(offset - 0.9, setback - 0.7, offset + 0.9, setback), 0.2, { what: 'step' }));
  for (const u of [offset - hw + 0.25, offset + hw - 0.25]) {
    const [px, pz] = at(u, setback + 0.25);
    T.solids.push(circle(px, pz, 0.17, 3));
  }
  T.camera.push(box(rectUV(offset - hw - 0.8, setback - 0.8, offset + hw + 0.8, vWall1 + 0.8), H + 4, { bottom: 2.9 }));

  // Yard: swept sand, a laterite path from the gate to the step, laterite block walls with a gate gap.
  T.ground.push({ type: 'sand', ...rect(p.x0, p.z0, p.x1, p.z1) });
  T.ground.push({ type: 'yardpath', ...rectUV(offset - 0.8, 0, offset + 0.8, setback - 0.6) });
  const t = 0.25, wallTop = 1.15, gate = 1.6;
  const walls = [
    rectUV(-width / 2, 0, offset - gate, t), rectUV(offset + gate, 0, width / 2, t), // front, with the gate
    rectUV(-width / 2, depth - t, width / 2, depth), // back
    rectUV(-width / 2, 0, -width / 2 + t, depth), rectUV(width / 2 - t, 0, width / 2, depth) // sides
  ];
  house.walls = walls;
  house.gate = at(offset, 0);
  for (const w of walls) if (w.x1 - w.x0 > 0.3 || w.z1 - w.z0 > 0.3) T.solids.push(box(w, wallTop, { what: 'compound wall' }));
  for (const u of [offset - gate, offset + gate]) {
    const [gx, gz] = at(u, t / 2);
    T.solids.push(box(rect(gx - 0.25, gz - 0.25, gx + 0.25, gz + 0.25), 1.5, { what: 'gate post' }));
  }

  // A few palms and a banana plant in the yard, pots on the sit-out, maybe a chair.
  const clear = (u, v) => !(v > setback - 1.4 && v < vWall1 + 1.4 && Math.abs(u - offset) < hw + 1.4) && Math.abs(u - offset) > 1.6;
  for (let i = 0, n = 0; i < 20 && n < 3; i++) {
    const u = (r() - 0.5) * (width - 3), v = 1.6 + r() * (depth - 3.2);
    if (!clear(u, v)) continue;
    const [x, z] = at(u, v);
    if (T.palms.some(q => Math.hypot(q.x - x, q.z - z) < 3.2)) continue;
    T.palms.push({ x, z, h: 7 + r() * 5, lean: (r() - 0.5) * 0.4, dir: r() * 6.28, kind: (r() * 4) | 0 });
    n++;
  }
  {
    const u = offset + (r() < 0.5 ? -1 : 1) * (hw + 2.2), v = vWall0 + 1;
    if (Math.abs(u) < width / 2 - 1.2) {
      const [x, z] = at(u, v);
      T.bananas.push({ x, z, h: 2.4 + r(), dir: r() * 6.28 });
    }
  }
  const rot = Math.atan2(fx, fz);
  for (const s of [-1, 1]) {
    const [x, z] = at(offset + s * 1.6, setback - 0.25);
    T.props.push({ model: r() < 0.5 ? 'potted_plant_02' : 'planter_pot_clay', x, z, rot: r() * 6 });
  }
  if (r() < 0.6) {
    const [x, z] = at(offset + hw - 1.0, setback + sit / 2);
    T.props.push({ model: 'plastic_monobloc_chair_01', x, z, y: 0.42, rot: rot + Math.PI + (r() - 0.5) * 0.6 });
  }
  if (r() < 0.5) T.idlers.push({ x: sx + along[0] * (hw - 2), z: sz + along[1] * (hw - 2), y: 0.42, heading: rot, kind: 'waiting' });
}

/** Ground kinds, for the tests and the map: which ones are drawn on top of which. */
export const GROUND_ORDER = ['sand', 'paving', 'laterite', 'yardpath', 'road'];
