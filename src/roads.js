// Where vehicles drive: every road and lane as two one-way lanes (on the left, as in India), joined by curves at
// the junctions, and the way from anywhere to anywhere (for autorickshaw rides). Plain data and sums, no drawing,
// so the tests can check every lane and every ride (tests/roads.test.mjs).

// Places on the map (x east, z south, metres).
export const NODES = {
  west: [-128, 0], pond: [-26, 0], junction: [24, 0], stand: [70, 0], east: [128, 0],
  school: [24, -50], north: [24, -128], schoolEnd: [-70, -50], pondEnd: [-26, 98]
};

// Roads between places: [from, to, how far each lane is from the middle, kind]. 'road' is tarmac (everything drives
// there); 'lane' is a laterite lane (only scooters, motorbikes and autorickshaws on a ride).
export const ROADS = [
  ['west', 'pond', 2, 'road'], ['pond', 'junction', 2, 'road'], ['junction', 'stand', 2, 'road'], ['stand', 'east', 2, 'road'],
  ['junction', 'school', 1.5, 'road'], ['school', 'north', 1.5, 'road'],
  ['school', 'schoolEnd', 1.1, 'lane'], ['pond', 'pondEnd', 1.1, 'lane']
];

// How far before a junction a lane stops, so the turn has room. Map ends have none (vehicles come and go there).
const ROOM = { pond: 5, junction: 6, school: 5, stand: 0, west: 0, east: 0, north: 0, schoolEnd: 0, pondEnd: 0 };
// Places at the edge of the map: vehicles leave the town there (and others come in).
export const EDGES = ['west', 'east', 'north'];
// Dead ends inside the town: vehicles turn round there.
const DEAD_ENDS = ['schoolEnd', 'pondEnd'];

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = v => Math.hypot(v[0], v[1]);
const norm = v => { const l = len(v) || 1; return [v[0] / l, v[1] / l]; };
// The left of a direction: x east, z south, so facing (dx, dz) your left hand points to (dz, -dx).
const left = d => [d[1], -d[0]];

/** Builds every one-way lane and the turns between them. */
export function buildRoads() {
  const lanes = [];
  for (const [a, b, off, kind] of ROADS) {
    for (const [from, to] of [[a, b], [b, a]]) {
      const A = NODES[from], B = NODES[to], d = norm(sub(B, A)), l = left(d);
      const start = [A[0] + l[0] * off + d[0] * ROOM[from], A[1] + l[1] * off + d[1] * ROOM[from]];
      const end = [B[0] + l[0] * off - d[0] * ROOM[to], B[1] + l[1] * off - d[1] * ROOM[to]];
      lanes.push({ id: lanes.length, from, to, kind, off, dir: d, pts: [start, end] });
    }
  }
  // At each place, every lane coming in can carry on into every lane going out (not straight back the way it came,
  // except at dead ends).
  const turns = [];
  for (const inLane of lanes) for (const outLane of lanes) {
    if (inLane.to !== outLane.from) continue;
    const back = outLane.to === inLane.from;
    if (EDGES.includes(inLane.to)) continue;
    // Turning round where it isn't a dead end is only for rides (an autorickshaw does it to reach the other side).
    turns.push({ from: inLane.id, to: outLane.id, at: inLane.to, pts: curve(inLane, outLane, back), uturn: back && !DEAD_ENDS.includes(inLane.to) });
  }
  for (const l of lanes) l.length = len(sub(l.pts[1], l.pts[0]));
  for (const t of turns) t.length = pathLength(t.pts);
  return { lanes, turns };
}

/** A smooth turn from the end of one lane to the start of the next. */
function curve(a, b, back) {
  const p0 = a.pts[1], p2 = b.pts[0];
  if (back) {
    // Turning round at a dead end: a half circle to the other lane.
    const c = [(p0[0] + p2[0]) / 2 + a.dir[0] * 1.6, (p0[1] + p2[1]) / 2 + a.dir[1] * 1.6];
    return bezier(p0, [c[0] + a.dir[0] * 1.5, c[1] + a.dir[1] * 1.5], p2, 10);
  }
  // Where the two lane lines would meet: the corner of the turn.
  const d1 = a.dir, d2 = b.dir, cross = d1[0] * d2[1] - d1[1] * d2[0];
  let c;
  if (Math.abs(cross) < 1e-6) c = [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2];
  else {
    const t = ((p2[0] - p0[0]) * d2[1] - (p2[1] - p0[1]) * d2[0]) / cross;
    c = [p0[0] + d1[0] * t, p0[1] + d1[1] * t];
  }
  return bezier(p0, c, p2, 10);
}

function bezier(a, c, b, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return out;
}

export function pathLength(pts) {
  let l = 0;
  for (let i = 0; i + 1 < pts.length; i++) l += len(sub(pts[i + 1], pts[i]));
  return l;
}

/** The point `d` metres along a path, and its direction. */
export function along(pts, d) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const seg = sub(pts[i + 1], pts[i]), l = len(seg);
    if (d <= l || i + 2 === pts.length) {
      const t = Math.max(0, Math.min(1, l ? d / l : 0));
      return { x: pts[i][0] + seg[0] * t, z: pts[i][1] + seg[1] * t, dx: seg[0] / (l || 1), dz: seg[1] / (l || 1) };
    }
    d -= l;
  }
  const p = pts[pts.length - 1];
  return { x: p[0], z: p[1], dx: 1, dz: 0 };
}

/** The lane (of the allowed kinds) nearest to a point, and how far along it the point is. */
export function nearestLane(R, x, z, kinds = ['road', 'lane']) {
  let best = null;
  for (const l of R.lanes) {
    if (!kinds.includes(l.kind)) continue;
    const [a, b] = l.pts, ab = sub(b, a), t = Math.max(0, Math.min(l.length, ((x - a[0]) * ab[0] + (z - a[1]) * ab[1]) / l.length));
    const px = a[0] + (ab[0] / l.length) * t, pz = a[1] + (ab[1] / l.length) * t, d = Math.hypot(px - x, pz - z);
    if (!best || d < best.dist) best = { lane: l, s: t, dist: d, x: px, z: pz };
  }
  return best;
}

/**
 * The way from a point on one lane to a point on another, as a list of points to drive along (shortest way, using
 * lanes of the allowed kinds). Returns null if there's no way.
 */
export function route(R, from, to, kinds = ['road', 'lane']) {
  const ok = l => kinds.includes(l.kind);
  if (from.lane.id === to.lane.id && to.s >= from.s) return { pts: dedupe([[from.x, from.z], [to.x, to.z]]), lanes: [from.lane.id] };
  // Shortest way (Dijkstra). A step is a turn into a lane; reaching the end point's lane through a turn finishes
  // ('end'), costing only the part of that lane up to the point.
  const dist = new Map(), prev = new Map(), done = new Set();
  const START = 'start', END = 'end';
  dist.set(START, 0);
  const next = key => {
    const lane = key === START ? from.lane : R.lanes[key];
    const rest = key === START ? from.lane.length - from.s : lane.length;
    return R.turns.filter(t => t.from === lane.id && ok(R.lanes[t.to])).map(t => ({ t, cost: rest + t.length + (t.uturn ? 40 : 0) }));
  };
  while (true) {
    let cur = null;
    for (const [k, d] of dist) if (!done.has(k) && (cur === null || d < dist.get(cur))) cur = k;
    if (cur === null) return null;
    if (cur === END) break;
    done.add(cur);
    for (const { t, cost } of next(cur)) {
      const options = t.to === to.lane.id ? [[END, to.s], [t.to, 0]] : [[t.to, 0]];
      for (const [k, extra] of options) {
        const nd = dist.get(cur) + cost + extra;
        if (!dist.has(k) || nd < dist.get(k)) {
          dist.set(k, nd);
          prev.set(k, { from: cur, t });
        }
      }
    }
  }
  const chain = [];
  for (let k = END; k !== START;) {
    const p = prev.get(k);
    chain.unshift(p.t);
    k = p.from;
  }
  const pts = [[from.x, from.z]];
  for (const t of chain) pts.push(...t.pts);
  pts.push([to.x, to.z]);
  return { pts: dedupe(pts), lanes: [from.lane.id, ...chain.map(t => t.to)] };
}

function dedupe(pts) {
  const out = [];
  for (const p of pts) if (!out.length || Math.hypot(p[0] - out[out.length - 1][0], p[1] - out[out.length - 1][1]) > 0.05) out.push(p);
  return out;
}

/**
 * The way from (sx, sz) to beside (tx, tz), using whichever lane on either side of the road works (and turning round
 * on the spot if it must). The way starts exactly at (sx, sz). Returns null if there's none.
 */
export function routeBetween(R, sx, sz, tx, tz, kinds = ['road', 'lane'], startKinds = ['road']) {
  const near = (x, z, ks) => R.lanes.filter(l => ks.includes(l.kind))
    .map(l => ({ l, n: nearestLane({ lanes: [l] }, x, z, ks) })).filter(o => o.n && o.n.dist < 8)
    .sort((a, b) => a.n.dist - b.n.dist).map(o => o.n);
  for (const from of near(sx, sz, startKinds)) for (const to of near(tx, tz, kinds)) {
    const way = route(R, from, to, kinds);
    if (way) return { ...way, pts: dedupe([[sx, sz], ...way.pts]), endLane: to.lane, endS: to.s };
  }
  return null;
}
