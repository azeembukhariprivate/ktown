// Starts KTOWN: sets up the 3D drawing, loads everything, and runs the game every frame.
import * as THREE from '../vendor/three/three.js';
import { Assets } from './assets.js';
import { Input } from './input.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { load, store } from './save.js';

const canvas = document.getElementById('game');
const ui = new UI(document.getElementById('ui'));
const params = new URLSearchParams(location.search);
const testing = params.has('test');
const save = load();
const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const quality = params.get('quality') || (save.settings.quality === 'auto' ? (touch ? 'low' : 'high') : save.settings.quality);

ui.loading(0);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'high-performance', preserveDrawingBuffer: testing });
} catch (e) {
  ui.failed('This browser could not start 3D drawing.');
  throw e;
}
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const input = new Input(canvas);
input.noLock = testing;
let game = null;

function resize() {
  const w = innerWidth, h = innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, quality === 'low' ? 1.25 : 2);
  while (w * h * dpr * dpr > 2600 * 1500 && dpr > 1) dpr -= 0.25;
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  if (game) game.resize(w, h);
}
addEventListener('resize', resize);
resize();

// Full screen on phones (from a button: browsers only allow it after a tap).
const fs = {
  available: !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen),
  active: () => !!(document.fullscreenElement || document.webkitFullscreenElement),
  toggle() {
    if (fs.active()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else {
      const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
      try {
        const p = req.call(el, { navigationUI: 'hide' });
        if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
      } catch {
        // Not allowed here: carry on in the page.
      }
    }
  }
};
ui.fullscreen = fs;
ui.save = save;
ui.apply = key => {
  store(save);
  if (!game) return;
  if (key === 'time') game.setTime(save.settings.time);
};

function play() {
  if (game.screen === 'title') game.yaw = game.walker.heading + Math.PI; // the camera behind her again
  game.screen = 'play';
  input.enabled = true;
  ui.hud(input.touchMode || touch);
  game.checkArea();
  ui.toast(game.area || 'KTOWN');
  if (!save.seenHelp) {
    save.seenHelp = true;
    store(save);
    setTimeout(() => ui.toast(touch ? 'Left thumb to walk, drag on the right to look round' : 'W A S D to walk, Shift to run, Space to jump. Click to look round with the mouse.', 5), 2800);
  }
}
function pause() {
  if (!game || game.screen !== 'play') return;
  game.screen = 'paused';
  input.releasePointer();
  ui.paused();
}
ui.on('play', play);
ui.on('pause', pause);
ui.on('resume', () => {
  ui.unpause();
  game.screen = 'play';
});
ui.on('title', () => {
  game.screen = 'title';
  ui.title();
});
ui.on('jump', () => (input.jumpPressed = true));

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
addEventListener('keydown', e => {
  if (!game) return;
  if ((e.code === 'KeyP' || (e.code === 'Escape' && !input.locked)) && game.screen === 'play') pause();
  else if ((e.code === 'KeyP' || e.code === 'Escape') && game.screen === 'paused' && !Object.keys(ui.screens).some(k => k !== 'paused')) {
    ui.unpause();
    game.screen = 'play';
  } else if ((e.code === 'Enter' || e.code === 'Space') && game.screen === 'title' && !ui.screens.help && !ui.screens.settings && !ui.screens.about) play();
});

let last = performance.now(), frames = 0, fpsTime = 0;
window.__fps = 0;
function loop(now) {
  // A long pause (another tab) shouldn't jump the game ahead; the tests draw very slowly, so they allow longer steps.
  const dt = Math.min(testing ? 0.5 : 0.1, Math.max(0, (now - last) / 1000));
  last = now;
  if (game) {
    game.frame(dt);
    if (game.screen === 'play') ui.stick(input.stick);
    if (input.take && game.screen === 'play') {
      const pad = input.pad();
      if (pad && pad.buttons[9] && pad.buttons[9].pressed && !loop.padStart) pause();
      loop.padStart = pad && pad.buttons[9] && pad.buttons[9].pressed;
    }
  }
  frames++;
  fpsTime += dt;
  if (fpsTime > 1) {
    window.__fps = frames / fpsTime;
    frames = 0;
    fpsTime = 0;
  }
  requestAnimationFrame(loop);
}

async function start() {
  const assets = new Assets(renderer, p => ui.loading(p));
  try {
    await Promise.all([assets.load(), document.fonts ? document.fonts.load('600 20px Fredoka').catch(() => {}) : null]);
  } catch (e) {
    ui.failed('Some of the town\'s files could not be loaded. Check the internet connection and try again.');
    throw e;
  }
  game = new Game(renderer, assets, input, save, { quality });
  game.onArea = name => game.screen === 'play' && ui.toast(name);
  resize();
  // Draw once so the first frame is ready before the title shows.
  renderer.compile(game.scene, game.camera);
  ui.title();
  requestAnimationFrame(loop);
  if (testing) {
    window.ktown = {
      game,
      play,
      pause,
      state: () => ({
        screen: game.screen, x: game.walker.x, y: game.walker.y, z: game.walker.z, state: game.walker.state,
        face: game.hero.faceName, area: game.area, time: game.sky.time, people: game.people.list.length,
        calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, fps: window.__fps
      }),
      teleport: (x, z, h) => game.teleport(x, z, h),
      look: (yaw, pitch, dist) => {
        game.yaw = yaw;
        if (pitch != null) game.pitch = pitch;
        if (dist != null) game.dist = dist;
        game.camReady = false;
      },
      setTime: t => game.setTime(t)
    };
  }
}
start();

if ('serviceWorker' in navigator && !testing && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
