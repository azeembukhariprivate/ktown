// Keeps the game on the device so it opens without the internet after the first visit.
// It answers from the saved copy straight away and fetches any newer copy for next time.
// The list of files is written by tools/list_files.mjs.
const VERSION = '0.1.0';
const CACHE = 'ktown-' + VERSION;
const FILES = [
  './',
  'assets/faces/full-front.png',
  'assets/faces/head-excited.png',
  'assets/faces/head-happy.png',
  'assets/faces/head-playful.png',
  'assets/faces/head-shy.png',
  'assets/faces/head-surprised.png',
  'assets/faces/portrait.png',
  'assets/fonts/Fredoka.ttf',
  'assets/icons/apple-touch-icon.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/maskable-512.png',
  'assets/models/bananas.glb',
  'assets/models/brass_pot_01.glb',
  'assets/models/ceramic_pot.glb',
  'assets/models/fern_02.glb',
  'assets/models/food_ginger_01.glb',
  'assets/models/food_lime_01.glb',
  'assets/models/grass_medium_01.glb',
  'assets/models/lemon.glb',
  'assets/models/metal_trash_can.glb',
  'assets/models/old_tyre.glb',
  'assets/models/painted_wooden_bench.glb',
  'assets/models/planter_pot_clay.glb',
  'assets/models/plastic_crate_01.glb',
  'assets/models/plastic_jerrycan.glb',
  'assets/models/plastic_monobloc_chair_01.glb',
  'assets/models/potted_plant_02.glb',
  'assets/models/sweet_potato.glb',
  'assets/models/utility_box_01.glb',
  'assets/models/wicker_basket_01.glb',
  'assets/models/wooden_crate_01.glb',
  'assets/models/yellow_onion.glb',
  'assets/sky/day.jpg',
  'assets/sky/evening.jpg',
  'assets/textures/brick/arm.jpg',
  'assets/textures/brick/color.jpg',
  'assets/textures/brick/normal.jpg',
  'assets/textures/grass/arm.jpg',
  'assets/textures/grass/color.jpg',
  'assets/textures/grass/normal.jpg',
  'assets/textures/iron/arm.jpg',
  'assets/textures/iron/color.jpg',
  'assets/textures/iron/normal.jpg',
  'assets/textures/laterite/arm.jpg',
  'assets/textures/laterite/color.jpg',
  'assets/textures/laterite/normal.jpg',
  'assets/textures/palm/arm.jpg',
  'assets/textures/palm/color.jpg',
  'assets/textures/palm/normal.jpg',
  'assets/textures/paving/arm.jpg',
  'assets/textures/paving/color.jpg',
  'assets/textures/paving/normal.jpg',
  'assets/textures/planks/arm.jpg',
  'assets/textures/planks/color.jpg',
  'assets/textures/planks/normal.jpg',
  'assets/textures/plaster-blue/arm.jpg',
  'assets/textures/plaster-blue/color.jpg',
  'assets/textures/plaster-blue/normal.jpg',
  'assets/textures/plaster-old/arm.jpg',
  'assets/textures/plaster-old/color.jpg',
  'assets/textures/plaster-old/normal.jpg',
  'assets/textures/plaster/arm.jpg',
  'assets/textures/plaster/color.jpg',
  'assets/textures/plaster/normal.jpg',
  'assets/textures/road/arm.jpg',
  'assets/textures/road/color.jpg',
  'assets/textures/road/normal.jpg',
  'assets/textures/roof-old/arm.jpg',
  'assets/textures/roof-old/color.jpg',
  'assets/textures/roof-old/normal.jpg',
  'assets/textures/roof/arm.jpg',
  'assets/textures/roof/color.jpg',
  'assets/textures/roof/normal.jpg',
  'assets/textures/sand/arm.jpg',
  'assets/textures/sand/color.jpg',
  'assets/textures/sand/normal.jpg',
  'assets/textures/shutter/arm.jpg',
  'assets/textures/shutter/color.jpg',
  'assets/textures/shutter/normal.jpg',
  'index.html',
  'manifest.webmanifest',
  'src/assets.js',
  'src/build.js',
  'src/game.js',
  'src/hero.js',
  'src/input.js',
  'src/layout.js',
  'src/main.js',
  'src/move.js',
  'src/people.js',
  'src/plants.js',
  'src/save.js',
  'src/sky.js',
  'src/town3d.js',
  'src/ui.js',
  'vendor/three/three.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('ktown-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const saved = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => saved);
    if (saved) {
      e.waitUntil(fresh);
      return saved;
    }
    return fresh;
  }));
});
