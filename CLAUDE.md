# KTOWN

Walk, ride and take autorickshaws around a little Kerala town with Inaara: a free 3D game for the browser, in the
spirit of open-world games but child-friendly (no weapons, no crime, nobody gets hurt). Her face comes from her real picture sheet (as in INAARA),
shared by her parent for this public game.
Part of the KUDU family of free, open-source (MIT) apps by Azeem Bukhari.

## Working with Azeem (the owner)

- **Branches:** work on `main` and push to `main`. Ask before creating any other branch.
- **New features:** first say what you understood, and ask your doubts and suggestions, one question at a time.
  Only start building when Azeem says "build".
- **Step by step:** KTOWN is built in steps, stopping after each one to report (see "The plan"). Don't run ahead.
- **Look:** keep the game's current look (realistic textures from Poly Haven, things made in code). No redesigns unless asked.
- **Credit:** About says "Made by Azeem, with Claude and ♥" (the heart in the accent colour, marigold `ACCENT`). Keep it.
- **Commits:** author `Azeem Bukhari <12558389+azeembukhariprivate@users.noreply.github.com>`. Clear messages that say
  what changed and why. Don't put AI model names or versions in commits, code or docs.
- **Words:** the game's text, README and release notes use plain everyday words, not technical jargon.
- **Before pushing:** run the tests locally, and re-read the diff. After pushing, watch the GitHub Actions
  build until it's green; fix failures, never skip or disable a test to get green.

## How the game is built

- Plain JavaScript modules in `src/`, no build step. 3D by three.js 0.186.0, bundled once into `vendor/three/three.js`
  (`tools/three-entry.js` says how). Drawn on one canvas; the screens over it are web page parts (`src/ui.js`).
- Inaara's faces: use only the pictures from her sheet (`assets/faces`, same as INAARA); never draw, change or make up
  her face. `src/hero.js` shows them on the front of her head; her body is shapes in the sheet's colours.
- Her head (`src/hero.js`): the picture on a gently rounded face (`faceGeo`, not a ball) with a bob of hair behind it
  (`hairGeo`, a drawn strand texture), tucked behind her chin.
- Free assets: textures, skies and models from Poly Haven (CC0); sounds from Wikimedia Commons (public domain or CC0
  only). This container can reach neither, so the `fetch-assets.yml` workflow (run by hand) downloads them into a
  temporary pre-release `asset-staging` (`tools/fetch_polyhaven.py`, `tools/fetch_commons.py`: "search:..." lists
  free recordings, "get:File:..." fetches them, gently: Wikimedia limits bots). `tools/prepare_assets.py` and
  `tools/prepare_sounds.py` shrink them and write `assets/SOURCES.json` (SHA-256, makers, licence);
  `tools/write_notices.py` writes THIRD-PARTY-NOTICES from it; a test checks every file against both. Remove the
  pre-release afterwards (run the workflow with "remove"). A recording first published somewhere with its own
  licence (e.g. Pixabay) isn't truly public domain: leave it out.
- The town plan is `src/layout.js` (plain data: roads, plots with houses and yard walls, shops, the tea shop, bus stop,
  market stalls, palms, poles, people's routes and spots). `tests/town.test.mjs` walks it on a 25 cm grid: the start
  is free, every gate, sit-out, shop, stall and route can be reached on foot, nobody stands inside anything.
  Change the plan, run the tests.
- Movement and collisions: `src/move.js` (`MOVE` numbers, `World` of boxes and circles with a height `top`: she steps
  up 36 cm, jumps about 78 cm plus a 15 cm ledge help; yard walls are 1.15 m so she uses the gates).
- Drawing the town: `src/town3d.js` (batched by material, `src/build.js`), `src/plants.js` (palms and bananas,
  instanced in 64 m squares), `src/people.js` (all people drawn as one instanced mesh per body part), `src/sky.js`
  (sky picture turned so the sun is south-east, sun shadows following her, evening lights).
- Getting about (0.2): her home is a Pond Lane house (`T.home`, start in her yard, `T.bike` beside her). `src/roads.js`
  is the vehicles' map: every road as two one-way lanes on the left, curved turns at junctions, turning round only
  for rides (`uturn`) and at dead ends, `routeBetween` for rides. `src/traffic.js` (plain sums): vehicles keep their
  distance, slow for turns, stop for people and her and hoot if she stays in the way, the bus waits at the bus stop,
  autorickshaws at the stand (`T.stand`) are hired (`hire`) or waved down (`hail`). `tests/roads.test.mjs` checks
  every lane stays on the road clear of everything, every ride arrives, and 2 minutes of traffic never collide.
  `src/vehicles.js` draws them in code; `Bike` in `src/move.js` is her bicycle; `src/game.js` has the modes (foot,
  bike, auto) and the prompt (E / the button / Y). `src/audio.js` plays the sounds (WebAudio, from where they are).
- Plays offline: `sw.js` lists every file (`node tools/list_files.mjs` writes the list), and its `VERSION` must match
  `package.json` and `src/ui.js` (a test checks).
- Settings are kept in the browser (`src/save.js`, key `ktown-save-v1`). Nothing is sent anywhere.

```
npm test               # movement, the town plan, roads and traffic, rides, the files
npm run test:browser   # plays it in Chromium (slow without a graphics card); screenshots in screenshots/
npm run serve          # http://localhost:8080/
```

## The plan (agreed with Azeem)

1. Done (0.1): walking around one area (junction, shops, tea shop, bus stop, market, lanes of houses), people about,
   day and evening, controls for keyboard and mouse, phone and game controller.
2. Done (0.2): her home, her bicycle, autorickshaw rides (stand or waved down, a list of places), traffic (autos,
   scooters, motorbikes, cars, the town bus, a lorry; bumps only push), real sounds, her new head (no "balloon").
3. Jobs from people with a marker above their head (deliveries, races, lost things, passengers), a small map, saved
   progress; finished jobs open new areas.
4. The rest of the town: paddy fields, the backwater with a boat, the temple and the beach. Then 1.0.

## Releasing

1. Raise `version` in `package.json`, `VERSION` in `sw.js` and in `src/ui.js`.
2. Commit and push to `main`.
3. GitHub Actions (`.github/workflows/build.yml`) tests the game, plays it in a browser and puts it online at
   https://azeembukhariprivate.github.io/ktown/ (GitHub Pages).
