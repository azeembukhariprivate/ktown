// The game's files: the offline copy (sw.js) lists every one, the version matches everywhere, every picture and model
// from Poly Haven is the one recorded (SHA-256) with who made it, the credit line is there, and it stays small enough
// for phones.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = f => readFileSync(join(root, f), 'utf8');
const walk = d => readdirSync(join(root, d)).flatMap(f => statSync(join(root, d, f)).isDirectory() ? walk(d + '/' + f) : [d + '/' + f]);
const sw = read('sw.js');
const listed = [...sw.matchAll(/^\s+'([^']+)',?$/gm)].map(m => m[1]);

test('every game file is kept for playing offline', () => {
  const need = ['index.html', 'manifest.webmanifest', ...walk('src'), 'vendor/three/three.js',
    ...walk('assets').filter(f => !f.endsWith('.txt') && !f.endsWith('.json'))];
  for (const f of need) assert.ok(listed.includes(f), `${f} is in sw.js (run node tools/list_files.mjs)`);
  for (const f of listed) if (f !== './') assert.ok(existsSync(join(root, f)), `${f} exists`);
});

test('the version is the same everywhere', () => {
  const { version } = JSON.parse(read('package.json'));
  assert.match(sw, new RegExp(`const VERSION = '${version.replace(/\./g, '\\.')}'`));
  assert.match(read('src/ui.js'), new RegExp(`export const VERSION = '${version.replace(/\./g, '\\.')}'`));
});

test('every texture, sky, model and sound is the recorded free file, with its makers named', () => {
  const sources = JSON.parse(read('assets/SOURCES.json'));
  const files = [...walk('assets/textures'), ...walk('assets/sky'), ...walk('assets/models'), ...walk('assets/sounds')];
  assert.deepEqual(files.sort(), Object.keys(sources).sort());
  const notices = read('THIRD-PARTY-NOTICES.txt');
  for (const [f, s] of Object.entries(sources)) {
    assert.equal(createHash('sha256').update(readFileSync(join(root, f))).digest('hex'), s.sha256, `${f} is unchanged`);
    // Free for anything: CC0 or public domain, from Poly Haven (pictures, models) or Wikimedia Commons (sounds).
    assert.ok(['CC0', 'Public domain'].includes(s.licence), `${f}: ${s.licence}`);
    assert.match(s.from, f.startsWith('assets/sounds/') ? /^https:\/\/commons\.wikimedia\.org\/wiki\/File(:|%3A)/ : /^https:\/\/polyhaven\.com\/a\//);
    assert.ok(notices.includes(s.name), `${s.name} is in THIRD-PARTY-NOTICES.txt`);
  }
});

test('the credit line is in the game', () => {
  const ui = read('src/ui.js');
  assert.ok(ui.includes("'Made by Azeem, with Claude and '"));
  assert.ok(ui.includes("h('span', { class: 'heart' }, '♥')"));
});

test('it stays small enough to load on a phone', () => {
  const total = listed.filter(f => f !== './').reduce((n, f) => n + statSync(join(root, f)).size, 0);
  assert.ok(total < 24 * 1024 * 1024, `all files together: ${(total / 1048576).toFixed(1)} MB`);
});

test('no real photos: every face is made up by the game', () => {
  assert.equal(existsSync(join(root, 'assets/faces')), false, 'no face pictures');
  const pictures = walk('assets').filter(f => /\.(png|jpe?g|webp)$/i.test(f));
  // The only pictures are the app icons (made from the game's own drawing), and textures and skies from Poly Haven.
  for (const f of pictures) assert.ok(f.startsWith('assets/icons/') || f.startsWith('assets/textures/') || f.startsWith('assets/sky/'), f);
  const code = walk('src').map(read).join('\n');
  assert.ok(!code.includes('assets/faces'), 'nothing in the game asks for a face picture');
});
