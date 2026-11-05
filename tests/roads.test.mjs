// Where vehicles drive: every lane and turn stays on the road (or a laterite lane), clear of walls, poles and
// stalls; the stand's autorickshaws can take her to every place; and the traffic keeps its distance and stops for
// people.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTown, groundAt, BOUND } from '../src/layout.js';
import { World } from '../src/move.js';
import { buildRoads, routeBetween, along, pathLength } from '../src/roads.js';
import { Traffic, KINDS, standExit, trafficMix } from '../src/traffic.js';

const T = buildTown();
const world = new World(T.solids, Infinity);
const R = buildRoads();
const DRIVABLE = ['road', 'laterite', 'paving'];

const checkPath = (pts, radius, what) => {
  const L = pathLength(pts);
  for (let d = 0; d <= L; d += 0.5) {
    const p = along(pts, d);
    if (Math.abs(p.x) > 126 || Math.abs(p.z) > 126) continue;
    assert.ok(DRIVABLE.includes(groundAt(T, p.x, p.z)), `${what}: off the road at ${p.x.toFixed(1)}, ${p.z.toFixed(1)} (${groundAt(T, p.x, p.z)})`);
    assert.equal(world.blocked(p.x, p.z, radius, 0.4), false, `${what}: hits something at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
  }
};

test('every lane and turn stays on the road, clear of everything', () => {
  for (const l of R.lanes) checkPath(l.pts, l.kind === 'road' ? KINDS.bus.wid / 2 : KINDS.auto.wid / 2, `lane ${l.from} to ${l.to}`);
  for (const t of R.turns) checkPath(t.pts, R.lanes[t.to].kind === 'road' && R.lanes[t.from].kind === 'road' ? KINDS.car.wid / 2 : KINDS.auto.wid / 2, `turn at ${t.at}`);
});

test('the stand\'s autorickshaws can drive out onto the road', () => {
  for (const spot of T.stand.spots) checkPath(standExit(spot), KINDS.auto.wid / 2, 'out of the stand');
});

test('an autorickshaw can take her from the stand to every place, and stops near it', () => {
  for (const spot of T.stand.spots) {
    const out = standExit(spot), last = out[out.length - 1];
    for (const place of T.places) {
      const way = routeBetween(R, last[0], last[1], place.x, place.z);
      assert.ok(way, `a way to ${place.name}`);
      checkPath(way.pts, KINDS.auto.wid / 2, `ride to ${place.name}`);
      const end = way.pts[way.pts.length - 1];
      assert.ok(Math.hypot(end[0] - place.x, end[1] - place.z) < 7, `stops near ${place.name}`);
    }
  }
});

test('a ride also works from anywhere an autorickshaw might be driving', () => {
  for (const l of R.lanes.filter(l => l.kind === 'road')) for (const place of T.places) {
    const p = along(l.pts, l.length / 2);
    const way = routeBetween(R, p.x, p.z, place.x, place.z);
    assert.ok(way, `from ${l.from}-${l.to} to ${place.name}`);
  }
});

test('traffic keeps its distance, and never drives into people or her', () => {
  const tr = new Traffic(trafficMix('high'), T.stand, 3);
  // People standing in the road: one on the zebra crossing, and Inaara on Temple Road.
  const people = [{ x: 7.1, z: 2, r: 0.3 }, { x: 22.5, z: -30, r: 0.25, her: true }];
  let horn = false;
  for (let i = 0; i < 60 * 120; i++) {
    tr.update(1 / 60, people);
    if (tr.events.some(e => e.type === 'horn')) horn = true;
    for (const v of tr.vehicles) {
      for (const p of people) {
        const d = Math.hypot(v.x - p.x, v.z - p.z);
        const fwd = (p.x - v.x) * v.dx + (p.z - v.z) * v.dz;
        const lat = Math.abs((p.x - v.x) * v.dz - (p.z - v.z) * v.dx);
        if (lat < v.wid / 2 + p.r) assert.ok(fwd < 0 || fwd > v.len / 2 + p.r, `${v.kind} drove into someone (${d.toFixed(2)} m)`);
      }
      for (const o of tr.vehicles) {
        if (o === v || o.mode === 'parked' || v.mode === 'parked') continue;
        assert.ok(Math.hypot(o.x - v.x, o.z - v.z) > 0.9, `${v.kind} and ${o.kind} ran into each other at ${v.x.toFixed(1)}, ${v.z.toFixed(1)}`);
      }
    }
  }
  assert.ok(horn, 'someone hooted at her for standing in the road');
});

test('the bus stops at the bus stop', () => {
  const tr = new Traffic({ bus: 1 }, null, 5);
  let stopped = false;
  for (let i = 0; i < 60 * 300 && !stopped; i++) {
    tr.update(1 / 60);
    const b = tr.vehicles[0];
    if (b.mode === 'busstop') stopped = Math.abs(b.x) < 3 && Math.abs(b.z - 2) < 0.7;
  }
  assert.ok(stopped);
});

test('a hired autorickshaw arrives where she asked', () => {
  for (const place of T.places) {
    const tr = new Traffic({}, T.stand, 1);
    const v = tr.vehicles[0];
    assert.ok(tr.hire(v, place));
    let arrived = false;
    for (let i = 0; i < 60 * 240 && !arrived; i++) {
      tr.update(1 / 60);
      arrived = tr.events.some(e => e.type === 'arrived');
    }
    assert.ok(arrived, `arrived at ${place.name}`);
    assert.ok(Math.hypot(v.x - place.x, v.z - place.z) < 7, `near ${place.name}`);
  }
});

test('the traffic never jams: nothing waits for long (10 minutes of traffic)', () => {
  const tr = new Traffic(trafficMix('high'), T.stand, 11);
  const still = new Map();
  for (let i = 0; i < 60 * 600; i++) {
    tr.update(1 / 60);
    for (const v of tr.vehicles) {
      if (v.mode === 'parked' || v.mode === 'busstop') {
        still.set(v, 0);
        continue;
      }
      const s = v.v < 0.1 ? (still.get(v) || 0) + 1 / 60 : 0;
      still.set(v, s);
      assert.ok(s < 30, `${v.kind} stuck at ${v.x.toFixed(1)}, ${v.z.toFixed(1)}`);
    }
  }
});
