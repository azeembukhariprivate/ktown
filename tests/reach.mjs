// Shared by the tests: every 25 cm square Inaara can walk to from her start (stepping up and down, never jumping).
import { BOUND } from '../src/layout.js';
import { MOVE } from '../src/move.js';

export function reachMap(T, world) {
  const S = 0.25, N = Math.round((2 * BOUND) / S);
  const key = (i, j) => i * (N + 1) + j;
  const toCell = v => Math.round((v + BOUND) / S);
  const reach = new Map();
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
  const reachable = (x, z, r = 1) => {
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (reach.has(key(toCell(x) + dx, toCell(z) + dz))) return true;
    return false;
  };
  return { reach, reachable, key, toCell };
}
