// Inaara's moves: walking speed, steps, jumps, walls she can't get through or over, and the edge of the town.
import test from 'node:test';
import assert from 'node:assert/strict';
import { World, Walker, MOVE, cameraReach } from '../src/move.js';

const box = (x0, z0, x1, z1, top, extra = {}) => ({ kind: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: (x1 - x0) / 2, hd: (z1 - z0) / 2, top, ...extra });
const run = (w, world, secs, move, opts = {}) => {
  for (let t = 0; t < secs; t += 1 / 60) w.update(1 / 60, world, move, opts.run, opts.jump && t >= (opts.at || 0) && t < (opts.at || 0) + 0.05);
};

test('she walks and runs at her speeds, and turns to face the way she goes', () => {
  const world = new World([]);
  const w = new Walker(0, 0);
  run(w, world, 2, { x: 1, z: 0 });
  assert.ok(Math.abs(w.x - MOVE.walk * 2) < 0.4, `walked ${w.x}`);
  assert.ok(Math.abs(w.heading - Math.PI / 2) < 0.05);
  assert.equal(w.state, 'walk');
  const r = new Walker(0, 0);
  run(r, world, 2, { x: 0, z: 1 }, { run: true });
  assert.ok(r.z > MOVE.run * 1.6, `ran ${r.z}`);
  assert.equal(r.state, 'run');
  run(r, world, 1, { x: 0, z: 0 });
  assert.equal(r.state, 'idle');
});

test('walls stop her, and she slides along them', () => {
  const world = new World([box(2, -10, 3, 10, 3)]);
  const w = new Walker(0, 0);
  run(w, world, 3, { x: 1, z: 0.3 });
  assert.ok(w.x <= 2 - MOVE.radius + 1e-6, `stopped at ${w.x}`);
  assert.ok(w.z > 1, `slid along it to ${w.z}`);
});

test('she steps onto low steps without jumping, but not onto a sit-out without its step', () => {
  const world = new World([box(1, -1, 2, 1, 0.2), box(2, -1, 4, 1, 0.42)]);
  const w = new Walker(0, 0);
  run(w, world, 1.2, { x: 1, z: 0 });
  assert.ok(w.x > 2.5 && Math.abs(w.y - 0.42) < 1e-9, `up the step onto the sit-out: x ${w.x}, y ${w.y}`);
  const high = new World([box(1, -1, 3, 1, 0.42)]);
  const v = new Walker(0, 0);
  run(v, high, 2, { x: 1, z: 0 });
  assert.ok(v.x < 1, 'a 42 cm edge needs a step or a jump');
});

test('a jump gets her onto a market table but not over a yard wall', () => {
  const table = new World([box(1, -2, 3, 2, 0.8)]);
  const w = new Walker(-1, 0);
  run(w, table, 1.2, { x: 1, z: 0 }, { jump: true, at: 0.6 });
  assert.ok(Math.abs(w.y - 0.8) < 1e-9 && w.x > 1, `on the table: x ${w.x}, y ${w.y}`);
  const wall = new World([box(1, -20, 1.25, 20, 1.15)]);
  const v = new Walker(0, 0);
  for (let i = 0; i < 4; i++) run(v, wall, 1, { x: 1, z: 0 }, { jump: true, at: 0.3 });
  assert.ok(v.x < 1, 'still on her side of the wall');
});

test('she lands back on the ground after a jump, and falls off edges', () => {
  const world = new World([box(-1, -1, 1, 1, 0.3)]);
  const w = new Walker(0, 0);
  w.y = 0.3;
  run(w, world, 0.1, { x: 0, z: 0 }, { jump: true });
  assert.equal(w.onGround, false);
  run(w, world, 1, { x: 0, z: 0 });
  assert.ok(w.onGround && Math.abs(w.y - 0.3) < 1e-9);
  run(w, world, 1.5, { x: 1, z: 0 });
  assert.equal(w.y, 0);
});

test('she can never leave the town', () => {
  const world = new World([], 20);
  const w = new Walker(0, 0);
  run(w, world, 10, { x: 1, z: 1 }, { run: true });
  assert.ok(w.x <= 20 && w.z <= 20);
});

test('the camera comes closer instead of going into a house', () => {
  const world = new World([box(-5, 3, 5, 8, 4)]);
  const roofs = new World([]);
  const d = cameraReach(world, roofs, { x: 0, y: 1, z: 0 }, { x: 0, y: 0.2, z: 1 }, 6);
  assert.ok(d < 3, `came in to ${d}`);
  assert.equal(cameraReach(world, roofs, { x: 0, y: 1, z: 0 }, { x: 0, y: 0.2, z: -1 }, 6), 6);
});
