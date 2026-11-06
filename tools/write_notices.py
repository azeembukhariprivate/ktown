# Writes THIRD-PARTY-NOTICES.txt from assets/SOURCES.json (every texture, sky, model and sound, with its makers).
#   python3 tools/write_notices.py
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = json.load(open(os.path.join(ROOT, 'assets', 'SOURCES.json')))


def group(prefix):
    by = {}
    for f, s in src.items():
        if (f.startswith('assets/sounds/')) == (prefix == 'sounds'):
            by.setdefault((s['name'], s['from'], tuple(s['by']), s['licence']), []).append(f)
    out = []
    for (name, url, authors, licence), files in sorted(by.items()):
        out.append(f"{name}, by {', '.join(authors)} ({licence}): {url}")
        out += [f'  {f}' for f in sorted(files)]
    return out


lines = ['KTOWN uses these things made by others. Thank you.', '',
         'three.js 0.186.0 (vendor/three/three.js, with its GLTFLoader and BufferGeometryUtils, bundled into one file)',
         '  Copyright 2010-2026 three.js authors. MIT License (vendor/three/LICENSE).', '',
         'Fredoka font (assets/fonts/Fredoka.ttf)',
         '  Copyright 2016 The Fredoka Project Authors. SIL Open Font License, Version 1.1 (assets/fonts/OFL.txt).', '',
         'Noto Sans Malayalam font (assets/fonts/NotoSansMalayalam.woff2)',
         '  Copyright 2022 The Noto Project Authors. SIL Open Font License, Version 1.1 (assets/fonts/NotoSansMalayalam-OFL.txt).', '',
         'Textures, skies and models from Poly Haven (https://polyhaven.com), all CC0 (public domain): free to use for anything.',
         "Each file's source and SHA-256 is in assets/SOURCES.json. They were made smaller for the game (tools/prepare_assets.py).", '']
lines += group('pictures')
lines += ['', 'Sounds: recordings from Wikimedia Commons (https://commons.wikimedia.org), each public domain or CC0: free to use',
          'for anything. Cut, made mono and evened out in loudness for the game (tools/prepare_sounds.py).', '']
lines += group('sounds')
lines += ['', "Everything else (the houses, shops, palms, vehicles, the people and the four children with their made-up faces)",
          "is made by the game's own code."]
open(os.path.join(ROOT, 'THIRD-PARTY-NOTICES.txt'), 'w').write('\n'.join(lines) + '\n')
print('written')
