// Plays the real game in a browser (Chromium through Playwright, drawing without a graphics card, so slowly):
// the title, walking, running, jumping, bumping into a shop, the market, the lanes, her face, the evening, the
// settings and the phone controls. Fails on any error in the page. Pictures go to screenshots/.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { serve } from '../tools/serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const out = new URL('../screenshots/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const PORT = 8096, URL_ = `http://localhost:${PORT}/?test`;
const server = await serve(PORT);
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
});
const errors = [];
const watch = page => {
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
};
const wait = ms => new Promise(r => setTimeout(r, ms));
const step = async (name, fn) => {
  process.stdout.write(`- ${name} ... `);
  const t = Date.now();
  await fn();
  assert.deepEqual(errors, [], 'no errors in the page');
  console.log(`ok (${((Date.now() - t) / 1000).toFixed(0)} s)`);
};
const shot = (page, name) => page.screenshot({ path: out + name + '.png', timeout: 300000 });
const hold = async (page, keys, ms) => {
  for (const k of keys) await page.keyboard.down(k);
  await wait(ms);
  for (const k of [...keys].reverse()) await page.keyboard.up(k);
};
// Holds keys until `done(state)` is true (drawing without a graphics card can be very slow), up to `max` ms.
const holdUntil = async (page, keys, done, max = 20000) => {
  for (const k of keys) await page.keyboard.down(k);
  const t = Date.now();
  let s;
  while (Date.now() - t < max) {
    s = await page.evaluate(() => ktown.state());
    if (done(s)) break;
    await wait(100);
  }
  for (const k of [...keys].reverse()) await page.keyboard.up(k);
  return s;
};

try {
  const pc = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  watch(pc);
  const state = () => pc.evaluate(() => ktown.state());

  await step('the town loads and the title shows', async () => {
    await pc.goto(URL_);
    await pc.waitForFunction(() => window.ktown, null, { timeout: 300000 });
    await wait(1500);
    const s = await state();
    assert.equal(s.screen, 'title');
    assert.ok(s.people >= 50, `${s.people} people in town`);
    assert.ok(await pc.isVisible('text=Play'));
    await shot(pc, '01-title');
  });

  await step('Enter starts the game at her home on Pond Lane, her bicycle beside her', async () => {
    await pc.keyboard.press('Enter');
    await wait(1000);
    const s = await state();
    assert.equal(s.screen, 'play');
    assert.equal(s.area, 'Pond Lane');
    await shot(pc, '02-home');
  });

  await step('she walks where the camera looks (out of her gate), and runs with Shift', async () => {
    const a = await state();
    const b = await holdUntil(pc, ['KeyW'], s => Math.hypot(s.x - a.x, s.z - a.z) > 1.5);
    assert.ok(a.x - b.x > 1.4, `walked forward, towards her gate (west): x ${a.x.toFixed(2)} to ${b.x.toFixed(2)}`);
    assert.ok(Math.abs(b.z - a.z) < 0.5, 'straight ahead');
    await pc.evaluate(() => ktown.teleport(-10, 5, Math.PI / 2));
    await pc.keyboard.down('ShiftLeft');
    const r = await holdUntil(pc, ['KeyW'], s => s.state === 'run' && s.face === 'excited');
    await pc.keyboard.up('ShiftLeft');
    assert.equal(r.state, 'run');
    assert.equal(r.face, 'excited');
    assert.ok(r.x > -10, 'ran the way she faced');
    await shot(pc, '03-run');
  });

  await step('Space jumps', async () => {
    await wait(1500);
    let top = 0;
    await pc.keyboard.down('Space');
    for (let i = 0; i < 40 && top < 0.15; i++) {
      top = Math.max(top, (await state()).y);
      await wait(50);
    }
    await pc.keyboard.up('Space');
    assert.ok(top > 0.15, `jumped ${top.toFixed(2)} m`);
  });

  await step('she can\'t walk through the shops, and looks surprised when she bumps into them', async () => {
    await pc.evaluate(() => ktown.teleport(0, -5, Math.PI));
    await wait(400);
    let surprised = false;
    await holdUntil(pc, ['KeyW'], s => (surprised = surprised || s.face === 'surprised') && s.z < -8.3, 25000);
    const s = await state();
    assert.ok(s.z > -9, `stopped at the shop front (z ${s.z.toFixed(2)})`);
    assert.ok(Math.abs(s.y - 0.3) < 0.01, 'on the shop step');
    assert.ok(surprised, 'surprised face when bumping');
    await shot(pc, '04-shops');
  });

  await step('she gets on her bicycle with E, rides it, and gets off again', async () => {
    await pc.evaluate(() => { const b = ktown.game.plan.bike; ktown.teleport(b.x - 1.0, b.z, Math.PI / 2); });
    await pc.waitForFunction(() => ktown.state().prompt === 'Get on your bicycle', null, { timeout: 60000 });
    assert.ok(await pc.isVisible('text=Get on your bicycle'), 'the prompt shows');
    await pc.keyboard.press('KeyE');
    await pc.waitForFunction(() => ktown.state().mode === 'bike', null, { timeout: 60000 });
    // Ride out of the gate and along Pond Lane.
    await pc.evaluate(() => { const g = ktown.game; g.bike.x = -26; g.bike.z = 20; g.bike.heading = 0; g.yaw = Math.PI; });
    await pc.keyboard.down('ShiftLeft');
    const r = await holdUntil(pc, ['KeyW'], s => s.speed > 5, 40000);
    await pc.keyboard.up('ShiftLeft');
    assert.ok(r.speed > 5, `riding at ${r.speed.toFixed(1)} m/s`);
    await pc.keyboard.press('KeyB');
    await shot(pc, '05-bicycle');
    await pc.waitForFunction(() => ktown.state().speed < 1.5, null, { timeout: 60000 });
    await pc.keyboard.press('KeyE');
    await pc.waitForFunction(() => ktown.state().mode === 'foot', null, { timeout: 60000 });
  });

  await step('an autorickshaw from the stand takes her to the market', async () => {
    await pc.evaluate(() => ktown.teleport(71.5, 5.3, 0));
    await pc.waitForFunction(() => ktown.state().prompt === 'Take an autorickshaw', null, { timeout: 60000 });
    await pc.keyboard.press('KeyE');
    await pc.waitForSelector('.places button', { timeout: 60000 });
    await shot(pc, '06-where-to');
    const before = (await pc.evaluate(() => ktown.game.jobs.progress.coins));
    await pc.click('.places button:has-text("The Market")');
    await pc.waitForFunction(() => ktown.state().mode === 'auto', null, { timeout: 60000 });
    await wait(3000);
    await shot(pc, '07-autorickshaw');
    await pc.waitForFunction(() => ktown.state().mode === 'foot', null, { timeout: 600000, polling: 500 });
    const s = await state();
    assert.ok(Math.hypot(s.x - -50, s.z - -4.5) < 9, `dropped near the market (${s.x.toFixed(1)}, ${s.z.toFixed(1)})`);
    const after = await pc.evaluate(() => ktown.game.jobs.progress.coins);
    assert.ok(after < before && after >= 0, `the ride cost coins (${before} to ${after})`);
  });

  const coins = () => pc.evaluate(() => ktown.game.jobs.progress.coins);
  const promptIs = (start, t = 120000) => pc.waitForFunction(x => (ktown.state().prompt || '').startsWith(x), start, { timeout: t, polling: 200 });

  await step('a job: Aydin\'s lost football, with speech bubbles in Malayalam', async () => {
    await pc.evaluate(() => { const k = ktown.game.jobs.kids.aydin; ktown.teleport(k.x + 1.6, k.z, -Math.PI / 2); ktown.look(Math.PI / 2 + 0.5, 0.2, 3.6); });
    await promptIs('Talk to Aydin');
    await pc.keyboard.press('KeyE');
    await pc.waitForFunction(() => ktown.game.jobs.active, null, { timeout: 60000 });
    await pc.waitForSelector('.bubble .ml', { timeout: 60000 });
    const ml = await pc.textContent('.bubble .ml');
    assert.ok(/[\u0D00-\u0D7F]/.test(ml), `the bubble is in Malayalam: ${ml}`);
    await wait(1500);
    await shot(pc, '15-job');
    const a = await coins();
    await pc.evaluate(() => { const t = ktown.game.jobs.thing; ktown.teleport(t.x + 1.2, t.z, -Math.PI / 2); });
    await promptIs('Pick up');
    await pc.keyboard.press('KeyE');
    await pc.waitForFunction(() => ktown.game.jobs.active.picked, null, { timeout: 60000 });
    await pc.evaluate(() => { const k = ktown.game.jobs.kids.aydin; ktown.teleport(k.x + 1.6, k.z, -Math.PI / 2); });
    await promptIs('Give back');
    await pc.keyboard.press('KeyE');
    await pc.waitForFunction(() => !ktown.game.jobs.active, null, { timeout: 60000 });
    assert.ok(await coins() >= a + 15, 'paid for the job');
    assert.deepEqual(await pc.evaluate(() => ktown.game.jobs.progress.p.done), ['ball1']);
  });

  await step('a delivery: the tea shop snacks to Temple Road', async () => {
    await pc.evaluate(() => { const v = ktown.game.jobs.posOf('velu'); ktown.teleport(v.x, v.z + 1.5, Math.PI); });
    await promptIs('Talk to');
    await pc.keyboard.press('KeyE');
    await pc.waitForFunction(() => ktown.game.jobs.active, null, { timeout: 60000 });
    const a = await coins();
    await pc.evaluate(() => { const t = ktown.game.jobs.active.job.to; ktown.teleport(t.x + 1, t.z, 0); });
    await promptIs('Hand over');
    await pc.keyboard.press('KeyE');
    await pc.waitForFunction(() => !ktown.game.jobs.active, null, { timeout: 60000 });
    assert.ok(await coins() >= a + 20, 'paid for the delivery');
  });

  await step('a race with Atyb on bicycles', async () => {
    await pc.evaluate(() => { const k = ktown.game.jobs.kids.atyb; ktown.teleport(k.x + 1.5, k.z, -Math.PI / 2); });
    await promptIs('Talk to Atyb');
    await pc.keyboard.press('KeyE');
    await pc.waitForFunction(() => ktown.game.jobs.active, null, { timeout: 60000 });
    // On her bicycle, to the start line.
    await pc.evaluate(() => {
      const g = ktown.game, st = g.jobs.P.races[0].start;
      g.bike.x = st.x; g.bike.z = st.z;
      ktown.teleport(st.x - 1, st.z, 0);
    });
    await promptIs('Get on');
    await pc.keyboard.press('KeyE');
    await promptIs('Ready, steady');
    await pc.keyboard.press('KeyE');
    await pc.waitForFunction(() => ktown.game.jobs.active.stage === 'go', null, { timeout: 120000 });
    await shot(pc, '16-race');
    const a = await coins();
    // Ride the course (moved along it, as drawing is too slow here to pedal it).
    const pts = await pc.evaluate(() => ktown.game.jobs.P.races[0].pts);
    for (const [x, z] of pts.slice(1)) {
      await pc.evaluate(([x, z]) => { const b = ktown.game.bike; b.x = x; b.z = z; }, [x, z]);
      await wait(300);
    }
    await pc.waitForFunction(() => !ktown.game.jobs.active, null, { timeout: 60000 });
    assert.ok(await coins() >= a + 25, 'won the race');
    await pc.keyboard.press('KeyE');
  });

  await step('the big map, and buying a flower clip at the Fancy Store', async () => {
    await pc.keyboard.press('KeyM');
    await pc.waitForSelector('.mapscreen', { timeout: 60000 });
    await shot(pc, '17-map');
    await pc.keyboard.press('KeyM');
    await pc.evaluate(() => { const s = ktown.game.shopSpots().find(s => s.name === 'Fancy Store'); ktown.teleport(s.x, s.z, Math.PI); });
    await promptIs('Look in');
    await pc.keyboard.press('KeyE');
    await pc.waitForSelector('.shoplist', { timeout: 60000 });
    const a = await coins();
    await pc.click('.shoplist button:has-text("flower clip")');
    assert.equal(await coins(), a - 25, 'paid for it');
    assert.ok(await pc.evaluate(() => ktown.game.jobs.progress.p.wearing.includes('flower')), 'she wears it');
    await shot(pc, '18-shop');
    await pc.click('.card button.main');
  });

  await step('every sound loads', async () => {
    const n = await pc.evaluate(async () => { await ktown.audio.unlock(); return [Object.keys(ktown.audio.buffers).length, ktown.sounds.length]; });
    assert.equal(n[0], n[1], `${n[0]} of ${n[1]} sounds`);
  });

  await step('the market, the lanes and her face', async () => {
    await pc.evaluate(() => { ktown.teleport(-52, -4.6, Math.PI); ktown.look(0, 0.35, 5); });
    await pc.waitForFunction(() => ktown.state().area === 'The Market', null, { timeout: 60000 });
    await wait(1500);
    await shot(pc, '08-market');
    await pc.evaluate(() => { ktown.teleport(20, -40, Math.PI); ktown.look(-0.9, 0.3, 6); });
    await pc.waitForFunction(() => ktown.state().area === 'Temple Road', null, { timeout: 60000 });
    await wait(1500);
    await shot(pc, '09-temple-road');
    await pc.evaluate(() => { ktown.teleport(11, 4.8, Math.PI); ktown.look(Math.PI, 0.1, 1.6); });
    await wait(2500);
    await shot(pc, '10-face');
  });

  await step('the evening, chosen in the settings', async () => {
    await pc.keyboard.press('KeyP');
    await wait(400);
    assert.equal((await state()).screen, 'paused');
    await shot(pc, '11-paused');
    await pc.click('text=Settings');
    await pc.click('button:has-text("Evening")');
    await wait(300);
    await shot(pc, '12-settings');
    assert.equal((await state()).time, 'evening');
    await pc.click('button:text-is("Back")');
    await pc.click('text=Carry on');
    await pc.evaluate(() => ktown.look(0.3, 0.3, 4.4));
    await wait(2500);
    assert.equal((await state()).screen, 'play');
    await shot(pc, '13-evening');
  });

  await step('About shows the credit line', async () => {
    await pc.keyboard.press('KeyP');
    await pc.click('text=About');
    assert.ok(await pc.isVisible('text=Made by Azeem, with Claude and'));
    await shot(pc, '14-about');
    const s = await state();
    console.log(`\n  (drawing: ${s.calls} draws, ${(s.triangles / 1e6).toFixed(1)} million triangles a frame)`);
  });
  await pc.close();

  const phone = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  watch(phone);
  await step('on a phone: the thumb stick walks her, the button jumps', async () => {
    await phone.goto(URL_ + '&quality=low');
    await phone.waitForFunction(() => window.ktown, null, { timeout: 300000 });
    await wait(1000);
    await shot(phone, '20-phone-title');
    await phone.tap('text=Play');
    await wait(800);
    assert.ok(await phone.isVisible('.jump-btn'));
    const a = await phone.evaluate(() => ktown.state());
    const touch = (type, x, y) => phone.evaluate(([type, x, y]) => {
      const c = document.getElementById('game');
      const t = new Touch({ identifier: 1, target: c, clientX: x, clientY: y });
      c.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true }));
    }, [type, x, y]);
    await touch('touchstart', 150, 280);
    await touch('touchmove', 150, 230);
    let b = a;
    for (let i = 0; i < 200 && Math.hypot(b.x - a.x, b.z - a.z) < 1; i++) {
      await wait(100);
      b = await phone.evaluate(() => ktown.state());
    }
    await shot(phone, '21-phone-walk');
    await touch('touchend', 150, 230);
    assert.ok(Math.hypot(b.x - a.x, b.z - a.z) > 0.6, 'she walked');
    await wait(1000);
    await phone.tap('.jump-btn');
    let top = 0;
    for (let i = 0; i < 40 && top < 0.1; i++) {
      top = Math.max(top, (await phone.evaluate(() => ktown.state())).y);
      await wait(50);
    }
    assert.ok(top > 0.1, 'she jumped');
  });
  await phone.setViewportSize({ width: 390, height: 844 });
  await step('an upright phone shows the title fitted', async () => {
    await phone.tap('.pause-btn');
    await phone.tap('text=Back to the start');
    await wait(1500);
    assert.equal((await phone.evaluate(() => ktown.state())).screen, 'title');
    await shot(phone, '22-phone-upright');
  });
  console.log('All good.');
} finally {
  await browser.close();
  server.close();
}
