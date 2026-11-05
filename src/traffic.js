// The traffic: autorickshaws, scooters, motorbikes, cars, the town bus and a lorry driving on the left, slowing for
// turns, keeping their distance, stopping for people (and Inaara) in front of them and hooting if she stays there.
// Autorickshaws at the stand take her on rides. Plain sums, no drawing (tests/traffic.test.mjs runs it).
import { buildRoads, along, pathLength, routeBetween, EDGES, NODES } from './roads.js';
import { rng } from './layout.js';

export const KINDS = {
  auto: { len: 2.7, wid: 1.35, top: 1.8, speed: 8, lanes: ['road'] },
  scooter: { len: 1.8, wid: 0.7, top: 1.6, speed: 9, lanes: ['road', 'lane'] },
  motorbike: { len: 2.0, wid: 0.75, top: 1.6, speed: 10, lanes: ['road', 'lane'] },
  car: { len: 3.9, wid: 1.7, top: 1.5, speed: 10, lanes: ['road'] },
  bus: { len: 10, wid: 2.45, top: 3.2, speed: 8, lanes: ['road'], mainOnly: true },
  lorry: { len: 7, wid: 2.3, top: 3.0, speed: 7, lanes: ['road'], mainOnly: true }
};
const MAIN = ['west', 'pond', 'junction', 'stand', 'east'];
// Junctions where roads cross: one vehicle at a time goes through, the others wait at the edge (no jams).
const CROSSINGS = ['pond', 'junction', 'school'];
const JR = 7.5; // how far a junction reaches from its middle

/** How the stand's autorickshaws get onto the road: out of their spot and into the westbound lane. */
export function standExit(spot) {
  const x = spot.x, z = spot.z;
  return [[x, z], [x - 1.6, z - 1.2], [x - 3.2, z - 3.6], [x - 5.5, 2.4], [x - 8, 2]];
}

export class Traffic {
  /**
   * `mix` is how many of each kind drive about, e.g. { auto: 5, scooter: 4, ... }; `stand` the stand's spots.
   */
  constructor(mix, stand, seed = 7) {
    this.R = buildRoads();
    this.r = rng(seed);
    this.vehicles = [];
    this.events = []; // { type: 'horn' | 'arrived', vehicle } since the last update, for sounds and the game
    this.t = 0;
    this.hold = {}; // junction -> the vehicle going through it
    for (const [kind, n] of Object.entries(mix)) for (let i = 0; i < n; i++) this.spawn(kind, true);
    if (stand) for (const spot of stand.spots) this.park(spot);
  }

  lanesFor(kind) {
    const K = KINDS[kind];
    return this.R.lanes.filter(l => K.lanes.includes(l.kind) && (!K.mainOnly || (MAIN.includes(l.from) && MAIN.includes(l.to))));
  }

  /** A new vehicle somewhere on the roads (`anywhere`), or coming into town at an edge of the map. */
  spawn(kind, anywhere = false, v = null) {
    const lanes = this.lanesFor(kind).filter(l => anywhere || EDGES.includes(l.from));
    for (let tries = 0; tries < 30; tries++) {
      const lane = lanes[(this.r() * lanes.length) | 0];
      const s = anywhere ? this.r() * lane.length : 0;
      const p = along(lane.pts, s);
      if (this.vehicles.some(o => o !== v && Math.hypot(o.x - p.x, o.z - p.z) < 14)) continue;
      const veh = v || { id: this.vehicles.length, kind, look: this.r(), ...KINDS[kind] };
      Object.assign(veh, { mode: 'drive', lane: lane.id, path: lane.pts.slice(), s, v: veh.speed * 0.6, x: p.x, z: p.z, dx: p.dx, dz: p.dz, wait: 0, blocked: 0, honked: -10, busStopped: false });
      veh.length2 = pathLength(veh.path);
      if (!v) this.vehicles.push(veh);
      return veh;
    }
    return null;
  }

  park(spot) {
    const veh = { id: this.vehicles.length, kind: 'auto', look: this.r(), ...KINDS.auto, mode: 'parked', spot,
      x: spot.x, z: spot.z, dx: Math.sin(spot.heading), dz: Math.cos(spot.heading), v: 0, s: 0, path: null, blocked: 0, honked: -10 };
    this.vehicles.push(veh);
    return veh;
  }

  /** The vehicle's outline as circles, for bumping into it (bumps only push). */
  circles(v) {
    const n = Math.max(1, Math.round(v.len / v.wid)), out = [];
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n - 0.5;
      out.push({ x: v.x + v.dx * t * (v.len - v.wid * 0.6), z: v.z + v.dz * t * (v.len - v.wid * 0.6), r: v.wid / 2 });
    }
    return out;
  }

  /**
   * Takes her on a ride in an autorickshaw from where it is to `place` ({x, z}). Returns false if there's no way.
   */
  hire(v, place) {
    let pts;
    let startPt;
    if (v.mode === 'parked') {
      const out = standExit(v.spot);
      startPt = out[out.length - 1];
      pts = out.slice(0, -1);
    } else {
      startPt = [v.x, v.z];
      pts = [];
    }
    const way = routeBetween(this.R, startPt[0], startPt[1], place.x, place.z, ['road', 'lane'], ['road', 'lane']);
    if (!way) return false;
    v.path = [...pts, ...way.pts];
    v.length2 = pathLength(v.path);
    v.s = 0;
    v.mode = 'ride';
    v.lane = way.endLane.id;
    v.place = place;
    v.spot = null;
    return true;
  }

  /** Stops a passing autorickshaw for her. */
  hail(v) {
    if (v.mode === 'drive') v.mode = 'hailed';
  }

  /** One step. `others` are people (and Inaara) on foot: { x, z, r, her }. */
  update(dt, others = []) {
    this.t += dt;
    this.events.length = 0;
    for (const v of this.vehicles) {
      if (v.mode === 'parked' || v.mode === 'waiting') continue;
      // How fast it may go: its own speed, slower in turns, and never into anything ahead.
      let want = v.speed;
      if (v.mode === 'hailed' || v.mode === 'stopping') want = 0;
      const ahead = along(v.path, v.s + 6);
      const turn = 1 - (ahead.dx * v.dx + ahead.dz * v.dz);
      if (turn > 0.05) want = Math.min(want, 4 + 4 * (1 - Math.min(1, turn * 2)));
      const look = 5 + v.v * 1.4;
      let herBlocking = false;
      // Junctions: wait at the edge while another vehicle is going through; once in, don't wait for those waiting.
      const J = this.junctionOf(v);
      if (J) {
        const holder = this.hold[J.name];
        if (J.d < JR) {
          if (!holder || holder === v || this.junctionOf(holder)?.name !== J.name) this.hold[J.name] = v;
        } else if (J.toward && holder && holder !== v && this.junctionOf(holder)?.name === J.name) {
          want = Math.min(want, Math.max(0, (J.d - JR) * 1.2));
        }
        if (this.hold[J.name] === v && J.d >= JR && !J.toward) this.hold[J.name] = null;
      }
      const inside = J && this.hold[J.name] === v;
      const check = (x, z, r, len, isHer, other) => {
        if (inside && other) {
          // Going through a junction: those waiting at its edge are not in the way.
          const O = this.junctionOf(other);
          if (O && O.name === J.name && O.toward && O.d >= JR - 0.3 && this.hold[J.name] !== other) return;
        }
        const rx = x - v.x, rz = z - v.z, fwd = rx * v.dx + rz * v.dz, lat = Math.abs(rx * v.dz - rz * v.dx);
        if (fwd <= 0 || fwd > look + len / 2 || lat > v.wid / 2 + r + 0.45) return;
        const gap = v.len / 2 + len / 2 + 1.2;
        want = Math.min(want, Math.max(0, (fwd - gap) * 1.1));
        if (isHer && fwd - gap < 2) herBlocking = true;
      };
      for (const o of this.vehicles) if (o !== v && (o.mode !== 'parked' || Math.hypot(o.x - v.x, o.z - v.z) < 10)) check(o.x, o.z, o.wid / 2, o.len, false, o);
      for (const p of others) check(p.x, p.z, p.r, 0.6, p.her);
      // The bus waits at the bus stop for a while.
      if (v.kind === 'bus' && v.lane !== undefined && !v.busStopped && v.dx < -0.9 && Math.abs(v.z - 2) < 0.6 && v.x < 2.5 && v.x > 0) {
        v.busStopped = true;
        v.mode = 'busstop';
        v.wait = 6;
      }
      if (v.mode === 'busstop') {
        want = 0;
        v.wait -= dt;
        if (v.wait <= 0) v.mode = 'drive';
      }
      // Speed up gently, brake firmly.
      v.v += Math.max(-9 * dt, Math.min(3 * dt, want - v.v));
      if (v.v < 0) v.v = 0;
      if (herBlocking && v.v < 0.5) {
        v.blocked += dt;
        if (v.blocked > 1.6 && this.t - v.honked > 5) {
          v.honked = this.t;
          this.events.push({ type: 'horn', vehicle: v });
        }
      } else v.blocked = 0;
      v.s += v.v * dt;
      // At the end of the way: carry on into the next lane (or arrive, or leave town).
      if (v.s >= v.length2) {
        if (v.mode === 'ride') {
          v.s = v.length2;
          v.mode = 'arrived';
          v.v = 0;
          this.events.push({ type: 'arrived', vehicle: v });
        } else this.next(v);
      }
      const p = along(v.path, v.s);
      v.x = p.x;
      v.z = p.z;
      if (Math.hypot(p.dx, p.dz) > 0.5) {
        v.dx = p.dx;
        v.dz = p.dz;
      }
    }
  }

  /** The junction a vehicle is at or coming up to (within reach), how far, and whether it's heading into it. */
  junctionOf(v) {
    for (const name of CROSSINGS) {
      const [nx, nz] = NODES[name], dx = nx - v.x, dz = nz - v.z, d = Math.hypot(dx, dz);
      if (d < JR + 7) return { name, d, toward: dx * v.dx + dz * v.dz > 0 };
    }
    return null;
  }

  /** Picks where a vehicle goes at the end of its lane. */
  next(v) {
    const lane = this.R.lanes[v.lane];
    if (EDGES.includes(lane.to)) {
      // Left town: someone else comes in from an edge.
      this.spawn(v.kind, false, v);
      return;
    }
    const allowed = this.lanesFor(v.kind).map(l => l.id);
    const turns = this.R.turns.filter(t => t.from === v.lane && allowed.includes(t.to) && !t.uturn);
    if (!turns.length) {
      this.spawn(v.kind, false, v);
      return;
    }
    const t = turns[(this.r() * turns.length) | 0];
    const nextLane = this.R.lanes[t.to];
    // Drop the part already driven, keep a little before the turn for a smooth join.
    v.path = [[v.x, v.z], ...t.pts, ...nextLane.pts.slice(1)];
    v.length2 = pathLength(v.path);
    v.s = 0;
    v.lane = t.to;
  }

  /** After a ride, the autorickshaw drives off as ordinary traffic. */
  release(v) {
    const lane = this.R.lanes[v.lane];
    v.path = [[v.x, v.z], lane.pts[1]];
    v.length2 = pathLength(v.path);
    v.s = 0;
    v.mode = 'drive';
    v.place = null;
  }
}

/** How much traffic: an everyday mix, about half on the faster picture setting. */
export function trafficMix(quality) {
  return quality === 'low'
    ? { auto: 3, scooter: 3, motorbike: 1, car: 2, bus: 1, lorry: 0 }
    : { auto: 5, scooter: 4, motorbike: 3, car: 4, bus: 1, lorry: 1 };
}
