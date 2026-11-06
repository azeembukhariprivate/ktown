// Makes the app icons: the four children (made up, drawn by the game) on marigold. Needs Playwright with Chromium.
//   node tools/make_icons.mjs
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const out = fileURLToPath(new URL('../assets/icons/', import.meta.url));
const server = await serve(8109);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [file, size, zoom] of [['icon-512.png', 512, 1], ['icon-192.png', 192, 1], ['apple-touch-icon.png', 180, 1], ['maskable-512.png', 512, 0.78]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.goto(`http://localhost:8109/tools/kids.html?view=icon&w=${size}&h=${size}&zoom=${zoom}&faces=excited,happy,happy,happy`);
  await page.waitForFunction(() => window.done, null, { timeout: 120000 });
  await page.screenshot({ path: out + file });
  await page.close();
}
await browser.close();
server.close();
console.log('icons made');
