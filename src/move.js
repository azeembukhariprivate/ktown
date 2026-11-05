// How Inaara moves: walking, running, jumping, stepping up onto low things and bumping into the rest.
// No drawing here, so the tests can check it (tests/move.test.mjs).

export const MOVE = {
  walk: 2.4, // metres a second
  run: 5.2,
  accel: 16, // how quickly she gets up to speed
  jump: 5.0, // up speed when she jumps: about 0.78 m high
  ledge: 0.15, // in the air she still gets onto an edge this much above her feet
  gravity: 16,
  step: 0.36, // she steps onto anything this much higher without jumping
  radius: 0.24,
  turn: 11 // how quickly she turns to face where she's going
};

const CELL = 8;

/** The solid things of the town, sorted into squares so only nearby ones are looked at. */
export class World {
  constructor(solids, bound = Infinity) {
    this.bound = bound;
    this.cells = new Map();
    this.dynamic = []; // people and other moving things, set every frame
    for (const s of solids) this.add(s);
  }

  add(s) {
    const [x0, z0, x1, z1] = extent(s);
    for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++)
      for (let cz = Math.floor(z0 / CELL); cz <= Math.floor(z1 / CELL); cz++) {
        const k = cx * 100003 + cz;
        if (!this.cells.has(k)) this.cells.set(k, []);
        this.cells.get(k).push(s);
      }
  }

  near(x, z, rad = 1) {
    const out = new Set(this.dynamic);
    for (let cx = Math.floor((x - rad) / CELL); cx <= Math.floor((x + rad) / CELL); cx++)
      for (let cz = Math.floor((z - rad) / CELL); cz <= Math.floor((z + rad) / CELL); cz++) {
        const list = this.cells.get(cx * 100003 + cz);
        if (list) for (const s of list) out.add(s);
      }
    return out;
  }

  /** The highest thing under (x, z) that's no higher than `upTo`: what she'd stand on. The ground is 0. */
  groundAt(x, z, upTo) {
    let g = 0;
    for (const s of this.near(x, z, 0.5)) if (s.top <= upTo && s.top > g && covers(s, x, z, 0)) g = s.top;
    return g;
  }

  /** Is anything higher than `above` in the way of a circle at (x, z)? */
  blocked(x, z, radius, above) {
    if (Math.abs(x) > this.bound - radius || Math.abs(z) > this.bound - radius) return true;
    for (const s of this.near(x, z, radius + 0.5)) if (s.top > above && (s.bottom || 0) < above + 1 && covers(s, x, z, radius)) return true;
    return false;
  }

  /** Moves a circle out of everything higher than `above` it overlaps. Returns the new [x, z]. */
  pushOut(x, z, radius, above) {
    for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      for (const s of this.near(x, z, radius + 0.5)) {
        if (s.top <= above || (s.bottom || 0) >= above + 1.2) continue;
        const d = separate(s, x, z, radius);
        if (d) {
          x += d[0];
          z += d[1];
          moved = true;
        }
      }
      if (!moved) break;
    }
    const b = this.bound - radius;
    return [Math.max(-b, Math.min(b, x)), Math.max(-b, Math.min(b, z))];
  }
}

function extent(s) {
  if (s.kind === 'circle') return [s.x - s.r, s.z - s.r, s.x + s.r, s.z + s.r];
  return [s.x - s.hw, s.z - s.hd, s.x + s.hw, s.z + s.hd];
}

/** Does the thing cover (x, z), counting a margin `m` around it? */
export function covers(s, x, z, m) {
  if (s.kind === 'circle') return (x - s.x) ** 2 + (z - s.z) ** 2 < (s.r + m) ** 2;
  const dx = Math.max(Math.abs(x - s.x) - s.hw, 0), dz = Math.max(Math.abs(z - s.z) - s.hd, 0);
  return m === 0 ? dx === 0 && dz === 0 && Math.abs(x - s.x) < s.hw && Math.abs(z - s.z) < s.hd : dx * dx + dz * dz < m * m;
}

/** How far to move a circle so it no longer overlaps the thing, or null if it doesn't. */
function separate(s, x, z, rad) {
  if (s.kind === 'circle') {
    const dx = x - s.x, dz = z - s.z, d = Math.hypot(dx, dz), need = s.r + rad;
    if (d >= need) return null;
    if (d < 1e-6) return [need, 0];
    return [(dx / d) * (need - d), (dz / d) * (need - d)];
  }
  const lx = x - s.x, lz = z - s.z;
  const cx = Math.max(-s.hw, Math.min(s.hw, lx)), cz = Math.max(-s.hd, Math.min(s.hd, lz));
  const dx = lx - cx, dz = lz - cz, d = Math.hypot(dx, dz);
  if (d > 0) {
    if (d >= rad) return null;
    return [(dx / d) * (rad - d), (dz / d) * (rad - d)];
  }
  // The middle of the circle is inside the box: out by the shortest way.
  const px = s.hw - Math.abs(lx) + rad, pz = s.hd - Math.abs(lz) + rad;
  return px < pz ? [Math.sign(lx || 1) * px, 0] : [0, Math.sign(lz || 1) * pz];
}

/** Inaara's body in the world: where she is, how fast she's going, what she's doing. */
export class Walker {
  constructor(x, z, heading = 0) {
    this.x = x;
    this.z = z;
    this.y = 0;
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;
    this.heading = heading;
    this.onGround = true;
    this.state = 'idle'; // idle, walk, run, jump, fall
    this.phase = 0; // the walking cycle, grows with distance
    this.bumped = 10; // seconds since she last bumped into something (for her surprised face)
    this.jumps = 0;
  }

  /**
   * One step of `dt` seconds. `move` is the wanted direction on the ground (x, z), up to 1 long;
   * `run` and `jump` are true while held.
   */
  update(dt, world, move, run = false, jump = false) {
    const len = Math.min(1, Math.hypot(move.x, move.z));
    const speed = (run && len > 0.5 ? MOVE.run : MOVE.walk) * len;
    const tx = len > 0 ? (move.x / Math.hypot(move.x, move.z)) * speed : 0;
    const tz = len > 0 ? (move.z / Math.hypot(move.x, move.z)) * speed : 0;
    const a = Math.min(1, MOVE.accel * dt * (this.onGround ? 1 : 0.35));
    this.vx += (tx - this.vx) * a;
    this.vz += (tz - this.vz) * a;
    if (len > 0.05) {
      const want = Math.atan2(move.x, move.z);
      let d = want - this.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.heading += d * Math.min(1, MOVE.turn * dt);
    }

    if (jump && this.onGround) {
      this.vy = MOVE.jump;
      this.onGround = false;
      this.jumps++;
    }

    // Along the ground: move, then out of anything too high to step onto.
    const above = this.y + (this.onGround ? MOVE.step : MOVE.ledge);
    const ox = this.x, oz = this.z;
    [this.x, this.z] = world.pushOut(this.x + this.vx * dt, this.z + this.vz * dt, MOVE.radius, above);
    const moved = Math.hypot(this.x - ox, this.z - oz), wanted = Math.hypot(this.vx, this.vz) * dt;
    if (wanted > 0.01 && moved < wanted * 0.4) this.bumped = 0;
    else this.bumped += dt;
    if (dt > 0) {
      // Slide along walls rather than keep pushing into them.
      this.vx = (this.x - ox) / dt * 0.5 + this.vx * 0.5;
      this.vz = (this.z - oz) / dt * 0.5 + this.vz * 0.5;
    }

    // Up and down.
    if (this.onGround) {
      const g = world.groundAt(this.x, this.z, this.y + MOVE.step);
      if (g < this.y - MOVE.step) {
        this.onGround = false;
        this.vy = 0;
      } else this.y = g;
    }
    if (!this.onGround) {
      const was = this.y;
      this.vy -= MOVE.gravity * dt;
      this.y += this.vy * dt;
      const g = world.groundAt(this.x, this.z, Math.max(was, this.y) + MOVE.ledge);
      if (this.y <= g) {
        this.y = g;
        this.vy = 0;
        this.onGround = true;
      }
    }

    const sp = Math.hypot(this.vx, this.vz);
    this.phase += sp * dt * 2.6;
    this.state = !this.onGround ? (this.vy > 0 ? 'jump' : 'fall') : sp > MOVE.walk + 0.4 ? 'run' : sp > 0.25 ? 'walk' : 'idle';
  }
}

/**
 * How far the camera can be from the point it looks at, along a direction, before something solid (a wall, a roof)
 * is in the way. Keeps the camera out of houses so she's always in view.
 */
export function cameraReach(world, roofs, from, dir, want) {
  const step = 0.25;
  for (let d = 0.6; d <= want; d += step) {
    const x = from.x + dir.x * d, y = from.y + dir.y * d, z = from.z + dir.z * d;
    for (const s of world.near(x, z, 0.3)) if (s.top > y && !s.person && covers(s, x, z, 0.2)) return Math.max(0.6, d - 0.35);
    for (const s of roofs.near(x, z, 0.3)) if (s.top > y && s.bottom < y && covers(s, x, z, 0.2)) return Math.max(0.6, d - 0.35);
  }
  return want;
}
