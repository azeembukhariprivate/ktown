// The town plan: she starts somewhere free, every gate, sit-out, shop, stall and walking route can be reached on foot
// (no jumping needed), and nobody walks through walls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTown, BOUND, overlaps } from '../src/layout.js';
import { World, MOVE, covers } from '../src/move.js';

const T = buildTown();
const world = new World(T.solids, BOUND);

// Every 0.5 m square she can stand in, found by walking out from the start (stepping up and down, never jumping).
const S = 0.25, N = Math.round((2 * BOUND) / S);
const key = (i, j) => i * (N + 1) + j;
const toCell = v => Math.round((v + BOUND) / S);
const reach = new Map();
{
  const i0 = toCell(T.start.x), j0 = toCell(T.start.z);
  const q = [[i0, j0, 0]];
  reach.set(key(i0, j0), 0);
  while (q.length) {
    const [i, j, h] = q.pop();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a > N || b > N || reach.has(key(a, b))) continue;
      const x = a * S - BOUND, z = b * S - BOUND;
      if (world.blocked(x, z, MOVE.radius, h + MOVE.step)) continue;
      const g = world.groundAt(x, z, h + MOVE.step);
      reach.set(key(a, b), g);
      q.push([a, b, g]);
    }
  }
}
const reachable = (x, z) => {
  for (const [dx, dz] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) if (reach.has(key(toCell(x + dx), toCell(z + dz)))) return true;
  return false;
};

test('the town has its parts', () => {
  assert.ok(T.houses.length >= 20, `${T.houses.length} houses`);
  assert.ok(T.shops.length >= 10 && T.stalls.length >= 12 && T.teaShop && T.busStop);
  assert.ok(T.palms.length > 300 && T.poles.length > 6 && T.routes.length >= 8);
});

test('she starts on open ground', () => {
  assert.equal(world.blocked(T.start.x, T.start.z, MOVE.radius, MOVE.step), false);
  assert.equal(world.groundAt(T.start.x, T.start.z, MOVE.step), 0);
});

test('she can walk to every gate and up onto every sit-out', () => {
  for (const h of T.houses) {
    const [gx, gz] = h.gate;
    assert.ok(reachable(gx, gz), `gate at ${gx.toFixed(1)}, ${gz.toFixed(1)}`);
    assert.ok(reachable(h.sitX, h.sitZ), `sit-out at ${h.sitX.toFixed(1)}, ${h.sitZ.toFixed(1)}`);
    assert.ok(Math.abs(reach.get(key(toCell(h.sitX), toCell(h.sitZ))) - 0.42) < 1e-9 || reachable(h.sitX, h.sitZ));
  }
});

test('she can walk to every shop, the tea shop, the bus stop and every market stall', () => {
  for (const s of T.shops) assert.ok(reachable(s.x, s.z + (s.facing === 'south' ? 1.2 : -1.2)), `${s.name}`);
  assert.ok(reachable(35, -9.6), 'tea shop');
  assert.ok(reachable(0, 7.6), 'bus stop');
  for (const st of T.stalls) assert.ok(reachable(st.x, st.z + 2.4), `stall at ${st.x}, ${st.z}`);
});

test('people walk only where she can walk, and never through anything', () => {
  for (const r of T.routes) {
    for (let k = 0; k + 1 < r.pts.length; k++) {
      const [ax, az] = r.pts[k], [bx, bz] = r.pts[k + 1], len = Math.hypot(bx - ax, bz - az);
      for (let d = 0; d <= len; d += 0.25) {
        const x = ax + ((bx - ax) * d) / len, z = az + ((bz - az) * d) / len;
        assert.equal(world.blocked(x, z, 0.3, MOVE.step), false, `route blocked at ${x.toFixed(1)}, ${z.toFixed(1)}`);
        // People keep to their left of the route (0.45 m), so they pass each other: that must be clear too.
        const nx = -(bz - az) / len, nz = (bx - ax) / len;
        for (const s of [-0.45, 0.45]) assert.equal(world.blocked(x + nx * s, z + nz * s, 0.3, MOVE.step), false, `walking lane blocked at ${(x + nx * s).toFixed(1)}, ${(z + nz * s).toFixed(1)}`);
        assert.ok(reachable(x, z), `route reachable at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      }
    }
  }
});

test('people standing about are not inside anything', () => {
  for (const p of T.idlers) {
    const solidHere = [...world.near(p.x, p.z, 1)].filter(s => s.top > (p.y || 0) + 0.05 && covers(s, p.x, p.z, 0.15));
    assert.deepEqual(solidHere.map(s => s.what || s.kind), [], `${p.kind} at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
  }
});

test('palms, banana plants and things are never inside houses, shops or walls', () => {
  const big = T.solids.filter(s => s.kind === 'box' && s.top > 1);
  for (const p of [...T.palms, ...T.bananas, ...T.props]) {
    const hit = big.find(s => covers(s, p.x, p.z, 0.1));
    assert.equal(hit, undefined, `at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}: ${hit && hit.what}`);
  }
});

test('house plots stay inside the town and off the roads', () => {
  const roads = T.ground.filter(g => g.type === 'road');
  for (const h of T.houses) {
    const p = h.plot;
    assert.ok(p.x0 >= -BOUND && p.x1 <= BOUND && p.z0 >= -BOUND && p.z1 <= BOUND);
    for (const r of roads) assert.ok(!overlaps(p, r), 'plot on a road');
  }
});
