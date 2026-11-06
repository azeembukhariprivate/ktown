// The jobs: every person, thing and place in them can be reached on foot, every race runs on clear roads and can be
// won by a careful rider, and coins, prices and progress follow their rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTown, BOUND, groundAt } from '../src/layout.js';
import { World, BIKE, covers } from '../src/move.js';
import { jobPlaces, setJobs, everydayJob, ITEMS, Progress, fare, rideCost } from '../src/jobs.js';
import { LINES } from '../src/lines.js';
import { reachMap } from './reach.mjs';

const T = buildTown();
const world = new World(T.solids, BOUND);
const { reachable } = reachMap(T, world);
const P = jobPlaces(T);
const JOBS = setJobs(P);

test('there are 15 set jobs, each with a different job to do, in the planned kinds', () => {
  assert.equal(JOBS.length, 15);
  assert.equal(new Set(JOBS.map(j => j.id)).size, 15);
  for (const k of ['find', 'deliver', 'race', 'buy', 'passenger', 'escort', 'catch', 'fetch']) assert.ok(JOBS.some(j => j.kind === k), k);
  assert.deepEqual(JOBS.filter(j => j.kind === 'race').map(j => j.giver), ['atyb', 'atyb', 'atyb']);
});

test('every job giver stands somewhere free, and she can walk up to each one', () => {
  for (const g of T.idlers.filter(p => p.id)) {
    const inside = [...world.near(g.x, g.z, 1)].filter(s => s.top > (g.y || 0) + 0.05 && covers(s, g.x, g.z, 0.15));
    assert.deepEqual(inside.map(s => s.what || s.kind), [], `${g.id} is not inside anything`);
    assert.ok(reachable(g.x, g.z, 4), `${g.id} can be reached`);
  }
});

test('every place and lost thing in the jobs can be reached on foot', () => {
  for (const [name, p] of Object.entries(P)) {
    if (name === 'races' || !p || p.x === undefined) continue;
    assert.ok(reachable(p.x, p.z, 3), `${name} at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
  }
  // Her friends' gate and yard too: that's where Atyb, Aydin and Aiza play.
  assert.ok(reachable(P.friendsYard.x, P.friendsYard.z, 3));
});

test('every race runs on clear ground (road, lane or yard) and a careful rider can win it', () => {
  for (const [k, race] of P.races.entries()) {
    let len = 0;
    for (let i = 0; i + 1 < race.pts.length; i++) {
      const [ax, az] = race.pts[i], [bx, bz] = race.pts[i + 1], l = Math.hypot(bx - ax, bz - az);
      len += l;
      for (let d = 0; d <= l; d += 0.5) {
        const x = ax + ((bx - ax) * d) / l, z = az + ((bz - az) * d) / l;
        assert.equal(world.blocked(x, z, BIKE.radius, BIKE.step), false, `race ${k + 1} blocked at ${x.toFixed(1)}, ${z.toFixed(1)}`);
        assert.ok(['road', 'laterite', 'paving', 'yardpath'].includes(groundAt(T, x, z)), `race ${k + 1} on ${groundAt(T, x, z)} at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      }
    }
    // A careful rider: pedalling hard but at 80%, losing 4 seconds on the start and turns.
    const her = len / (BIKE.fast * 0.8) + 4, atyb = len / race.rival;
    assert.ok(her < atyb, `race ${k + 1}: a careful rider takes ${her.toFixed(1)} s, Atyb ${atyb.toFixed(1)} s`);
    // ...and after the first (easy) race, not so easy that a slow rider always wins.
    if (k > 0) assert.ok(len / BIKE.slow > atyb * 0.95, `race ${k + 1} needs pedalling hard`);
  }
});

test('every job has its lines in Malayalam with the English meaning', () => {
  const pairs = [];
  const walk = v => { if (Array.isArray(v) && typeof v[0] === 'string') pairs.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  walk(LINES);
  assert.ok(pairs.length > 60, `${pairs.length} lines`);
  for (const [ml, en] of pairs) {
    assert.match(ml, /[ഀ-ൿ]/, `"${ml}" is in Malayalam`);
    assert.match(en, /[a-z]/i);
  }
  for (const id of ['velu', 'kunjamma', 'mariyamma', 'gopalan', 'lakshmi', 'sarada', 'leela']) assert.ok(LINES.jobs[id].ask, id);
});

test('everyday jobs keep coming, each one reachable', () => {
  for (let n = 0; n < 40; n++) {
    const j = everydayJob(P, T, n);
    assert.ok(j.reward >= 8 && j.reward <= 20);
    if (j.to) assert.ok(reachable(j.to.x, j.to.z, 3), `everyday ${n} to ${j.to.x.toFixed(1)}, ${j.to.z.toFixed(1)}`);
  }
});

test('coins never go below zero, and the ride home is always possible', () => {
  const p = new Progress({ coins: 3 });
  assert.equal(p.spend(5), false);
  assert.equal(p.coins, 3);
  assert.equal(p.buy(ITEMS.find(i => i.id === 'sunglasses')), false, "can't buy what she can't pay for");
  assert.deepEqual(rideCost(3, 200, true), { pay: 0, ok: true, free: true });
  assert.equal(rideCost(3, 200, false).ok, false);
  assert.equal(rideCost(20, 200, false).pay, fare(200));
  for (let d = 0; d < 400; d += 10) assert.ok(fare(d) >= 5 && fare(d) <= 15);
  p.earn(40);
  assert.ok(p.buy(ITEMS.find(i => i.id === 'sunglasses')));
  assert.equal(p.buy(ITEMS.find(i => i.id === 'sunglasses')), false, 'not bought twice');
  assert.ok(p.wearing === undefined || p.p.wearing.includes('sunglasses'));
});

test('jobs come one after another; all 15 done gives the full garland', () => {
  const p = new Progress();
  for (let i = 0; i < 15; i++) {
    const j = p.next(JOBS);
    assert.equal(j.id, JOBS[i].id);
    p.finish(j);
  }
  assert.equal(p.next(JOBS), null);
  assert.equal(p.flowers, 15);
  assert.ok(p.allDone);
  assert.equal(p.coins, 10 + JOBS.reduce((n, j) => n + j.reward, 0));
  // Saved and loaded again (as the browser keeps it).
  const again = new Progress(JSON.parse(JSON.stringify(p.p)));
  assert.equal(again.flowers, 15);
  assert.equal(again.coins, p.coins);
});

test('every shop item is in a shop that is open', () => {
  const open = new Set([...T.shops.filter(s => s.open).map(s => s.name), 'Tea Shop']);
  for (const it of ITEMS) assert.ok(open.has(it.shop), `${it.name} in ${it.shop}`);
});
