# KTOWN

Walk around a little Kerala town with Inaara: the busy junction with its shops and tea shop, the market under
tin roofs, and lanes of colourful houses with clay-tile roofs, red laterite walls and coconut palms everywhere.

**[▶ Play KTOWN](https://azeembukhariprivate.github.io/ktown/)**: free, in your web browser, on a computer or a phone.
Nothing to download.

![KTOWN's title screen](docs/title.jpg)

This is the first part. KTOWN is being built in steps:

1. **A town to walk in** (now): Inaara on foot, the junction, the shops, the market, the lanes, people about,
   day and evening.
2. Bicycles, the autorickshaw and traffic on the roads.
3. Jobs from the people of the town, a map, and saved progress.
4. The rest of the town: paddy fields, the backwater with a boat, the temple and the beach, with sounds and music.

![Temple Road](docs/lanes.jpg)

## How to play

| | Keyboard and mouse | Phone or tablet | Game controller |
|---|---|---|---|
| Walk | W A S D or the arrow keys | left thumb on the left side | left stick |
| Run | hold Shift | push the thumb all the way | right trigger |
| Jump | Space | Jump button | A |
| Look around | click, then move the mouse (Esc gives it back) | drag on the right side | right stick |
| Camera nearer or further | mouse wheel | | |
| Pause | P | ❚❚ | Start |

She can step up onto steps and jump onto low things like a market table, but not over the yard walls: go in
through the gates. People stop when she's in their way; bumping into anything only gives her a surprised face.

**Settings** has the time of day (day or evening, when the shops and street lights glow), the picture (automatic,
best or faster for older phones), the camera's speed and full screen.

![The market](docs/market.jpg)

## Keep it on your phone or computer

KTOWN works without the internet once it has been opened. To get an icon for it:

- **Android (Chrome):** open the game, tap the ⋮ menu, then **Add to Home screen** (or **Install app**).
- **iPhone or iPad (Safari):** open the game, tap the Share button, then **Add to Home Screen**.
- **Computer (Chrome or Edge):** open the game and click **Install** in the address bar.

Your settings are kept in your browser on that device. Nothing about you is sent anywhere.

![The junction in the evening](docs/evening.jpg)

## What it's made of

The houses, shops, palms, people and Inaara's body are made by the game's own code. Her face is her own picture
from her picture sheet, shared by her family. The ground, walls, roofs, skies and things lying about (chairs,
baskets, fruit, pots) are free (CC0) from [Poly Haven](https://polyhaven.com); the artists are named in
[THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt). The 3D drawing is done by [three.js](https://threejs.org).

## Build it yourself

You need [Node.js](https://nodejs.org) 22 or newer. There's nothing to build: the game is plain JavaScript files.

```
npm test               # the movement rules and the town plan (every gate, shop and stall can be reached)
npm run test:browser   # plays it in Chromium (needs Playwright); screenshots in screenshots/
npm run serve          # then open http://localhost:8080/
```

Getting new textures, skies or models from Poly Haven: run the **Fetch free assets** workflow on GitHub with their
names, download the `picked.zip` it makes, then `python3 tools/prepare_assets.py <unzipped folder>` makes them small
enough for phones and records them in `assets/SOURCES.json`, and `node tools/list_files.mjs` adds them to the offline
copy.

## Licence

MIT. Made by Azeem, with Claude and ♥. Part of the KUDU family of free apps.
