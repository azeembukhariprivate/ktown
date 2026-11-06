# KTOWN

Walk, ride and take autorickshaws around a little Kerala town with Inaara and her friends Atyb, Aydin and little Aiza:
the busy junction with its shops and tea shop, the market under tin roofs, and lanes of colourful houses with clay-tile
roofs, red laterite walls and coconut palms everywhere. Help the people of the town with jobs, earn coins, and win the
"Friend of KTOWN" jasmine garland.

**[▶ Play KTOWN](https://azeembukhariprivate.github.io/ktown/)**: free, in your web browser, on a computer or a phone.
Nothing to download.

![KTOWN's title screen](docs/title.jpg)

KTOWN is being built in steps:

1. Done: **a town to walk in**: the junction, the shops, the market, the lanes, people about, day and evening.
2. Done: **getting about**: Inaara's home on Pond Lane, her own bicycle, autorickshaw rides, traffic on the
   roads (autorickshaws, scooters, motorbikes, cars, the town bus, a lorry), and the town's sounds.
3. Done (now): **jobs, coins and friends**: 15 jobs from the people of the town and then everyday ones, coins to spend
   in the shops, a map, people chatting in Malayalam, Inaara's three friends across the lane, and saved progress.
4. The rest of the town: paddy fields, the backwater with a boat, the temple and the beach.

![Temple Road](docs/lanes.jpg)

## How to play

| | Keyboard and mouse | Phone or tablet | Game controller |
|---|---|---|---|
| Walk (or ride) | W A S D or the arrow keys | left thumb on the left side | left stick |
| Run (or pedal hard) | hold Shift | push the thumb all the way | right trigger |
| Jump | Space | Jump button | A |
| Talk to people, pick things up, shops, the bicycle, autorickshaws | E (when it says so) | the button at the bottom | Y |
| Ring the bicycle bell | B | 🔔 | X |
| Look around | click, then move the mouse (Esc gives it back) | drag on the right side | right stick |
| Camera nearer or further | mouse wheel | | |
| The big map | M | tap the small map | |
| Pause | P | ❚❚ | Start |

**Her bicycle** waits in her yard on Pond Lane. Ride it anywhere, and leave it where you like: a marker shows where
it is. **Autorickshaws** wait at the stand past the shops on the main road, or wave one down as it passes. Pick a place
and the driver takes you there; you can get off on the way too. The traffic keeps to the left and stops for people
and for Inaara. Bumping into anything only gives her a surprised face; nobody is ever hurt.

**Jobs.** People with a gold **!** over their head have a job for her: find Aydin's football, deliver snacks and
bananas, race Atyb on bicycles, buy little Aiza a banana fritter and walk her home, take Mariyamma aunty to the market,
find a goat and a cat, play catch, fetch a teacher's book. A tall light shows where to go. Each of the 15 jobs adds a
jasmine flower to her garland; with all 15, the three friends lead a little celebration at the junction. After that,
everyday jobs keep coming. Nothing can be lost for good: a lost race can be tried again, and a job can be left for later
from the pause menu.

**Coins** come from jobs, tips and coins lying about. Spend them on bicycle paint, a horn that plays a tune and a bigger
basket (Hardware), a flower clip, sunglasses and a handbag (Fancy Store), snacks that make her quicker for a minute
(bakery and tea shop), and flower pots and a swing for her yard. Autorickshaw rides cost 5 to 15 coins; with too few,
the driver takes her home for free.

**The map** in the corner turns as she does; the big map (M) shows the whole town, and a tap on it sets a pin to head for
(or to take an autorickshaw to). People say things now and then in **Malayalam**, with the meaning in English below.

**Settings** has the time of day (day or evening, when the shops and street lights glow), the picture (automatic,
best, or faster for older phones, with less traffic), the camera's speed, sound on or off and how loud, and full
screen.

**Sounds** are real recordings: crows, a red-vented bulbul, parakeets and sparrows by day, cicadas from the Western
Ghats, crickets, frogs and a nightjar recorded in Kerala in the evening, the market's bustle, tea being poured at the
tea shop, children near School Lane, engines, horns, the bicycle bell and her footsteps.

![The market](docs/market.jpg)

## Keep it on your phone or computer

KTOWN works without the internet once it has been opened. To get an icon for it:

- **Android (Chrome):** open the game, tap the ⋮ menu, then **Add to Home screen** (or **Install app**).
- **iPhone or iPad (Safari):** open the game, tap the Share button, then **Add to Home Screen**.
- **Computer (Chrome or Edge):** open the game and click **Install** in the address bar.

Your progress and settings are kept in your browser on that device. Nothing about you is sent anywhere.

![The junction in the evening](docs/evening.jpg)

## What it's made of

The houses, shops, palms, vehicles and people are made by the game's own code, and so are the four children: their
faces are made up, drawn by the game (no real photos). The Malayalam is shown in the Noto Sans Malayalam font. The ground, walls, roofs, skies and things lying about
(chairs, baskets, fruit, pots) are free (CC0) from [Poly Haven](https://polyhaven.com), and the sounds are free
recordings (public domain or CC0) from [Wikimedia Commons](https://commons.wikimedia.org); everyone who made them is
named in [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt). The 3D drawing is done by [three.js](https://threejs.org).

## Build it yourself

You need [Node.js](https://nodejs.org) 22 or newer. There's nothing to build: the game is plain JavaScript files.

```
npm test               # movement, the town plan, roads and traffic, rides, every job, coins, saving, the files
npm run test:browser   # plays it in Chromium (needs Playwright); screenshots in screenshots/
npm run serve          # then open http://localhost:8080/
```

Getting new textures, skies or models from Poly Haven, or sounds from Wikimedia Commons: run the **Fetch free
assets** workflow on GitHub (Poly Haven names, or `search:...` / `get:File:...` for sounds), download the `picked.zip`
it makes, then `python3 tools/prepare_assets.py <folder>` (pictures and models) or `python3 tools/prepare_sounds.py
<folder>` (sounds) makes them small and records them in `assets/SOURCES.json`; `python3 tools/write_notices.py`
names their makers, and `node tools/list_files.mjs` adds them to the offline copy.

## Licence

MIT. Made by Azeem, with Claude and ♥. Part of the KUDU family of free apps.
