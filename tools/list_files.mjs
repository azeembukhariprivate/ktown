// Writes the list of files the game needs into sw.js (run after adding or removing a file): node tools/list_files.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const walk = d => readdirSync(join(root, d)).flatMap(f => statSync(join(root, d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]);
const files = ['index.html', 'manifest.webmanifest', ...walk('src'), ...walk('vendor').filter(f => f.endsWith('.js')),
  ...walk('assets').filter(f => !f.endsWith('.txt') && !f.endsWith('.json'))].map(f => relative(root, join(root, f)).split('\\').join('/')).sort();
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
const list = "const FILES = [\n  './',\n" + files.map(f => `  '${f}'`).join(',\n') + '\n];';
writeFileSync(join(root, 'sw.js'), sw.replace(/const FILES = \[[\s\S]*?\];/, list));
console.log(files.length, 'files listed');
