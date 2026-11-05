# Turns the sound recordings fetched from Wikimedia Commons (tools/fetch_commons.py, unzipped into a folder) into the
# game's sounds: cut, made mono, evened out in loudness, loops made seamless, saved as small MP3s in assets/sounds/,
# and recorded in assets/SOURCES.json (where from, who made it, licence, SHA-256).
#
#   python3 tools/prepare_sounds.py <fetched folder>        (needs ffmpeg and numpy)
import hashlib
import json
import os
import subprocess
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'sounds')
RATE = 32000

# name in the game: (Commons file, start s, length s (None: to the end), loop?, how loud)
CUTS = {
    'birds': ('File:20200119 083339 chestnut hd beeeater.ogg', 0, None, True, -26),
    'parakeets': ('File:Halsbandsittich.ogg', 0, 45, True, -28),
    'sparrows': ('File:House Sparrow 202279702.wav', 38, 12, False, -3),
    'bulbul': ('File:Redvented Bulbul.ogg', 0, None, False, -3),
    'crow': ('File:Corvus cornix.ogg', 0, None, False, -3),
    'rooster': ('File:Medium rooster crowing.ogg', 0.8, 7, False, -3),
    'cicadas': ('File:Cicada 20200619.wav', 36, 24, True, -28),
    'crickets': ('File:Country night noise.ogg', 9, 24, True, -24),
    'frogs': ('File:Pseudacris triseriata chorus.wav', 0, None, True, -28),
    'nightjar': ('File:Great Eared Nighjar from Vazhachal, Kerala.ogg', 0, None, False, -3),
    'market': ('File:Market activities record.ogg', 100, 60, True, -22),
    'children': ('File:Douzen kids on playground.ogg', 0, 40, True, -24),
    'street': ('File:Sunday in the city street noise1.ogg', 100, 60, True, -24),
    'tea-pour': ('File:Pouring iced tea.ogg', 0, 3.6, False, -3),
    'glass': ('File:GLASS BELL TAPPING SOUND.wav', 0, None, False, -3),
    'thud': ('File:Dull thud.ogg', 0, None, False, -3),
    'bell': ('File:Rotating-bicycle-bell.wav', 0, None, False, -3),
    'horn': ('File:Car Horn.wav', 0.48, 0.45, False, -3),
    'engine-small': ('File:USSR bicycle 2T engine D-4.wav', 7, 4, True, -20),
    'engine-car': ('File:Starting a car and driving.ogg', 28, 6, True, -20),
    'engine-diesel': ('File:Detroit62.ogg', 3.9, 1.6, True, -20),
}
STEPS = 'File:Forest track 3.ogg'  # footsteps: cut into single steps


def load(path, start=0, length=None):
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(start)] + (['-t', str(length)] if length else []) + \
          ['-i', path, '-ac', '1', '-ar', str(RATE), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32).copy()


def save(x, name):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(RATE), '-ac', '1', '-i', '-',
                    '-b:a', '56k', path], input=x.astype(np.float32).tobytes(), check=True)
    return path


def level(x, db, loop):
    if loop:
        rms = np.sqrt(np.mean(x ** 2)) or 1
        x = x * (10 ** (db / 20) / rms)
    else:
        x = x * (10 ** (db / 20) / (np.max(np.abs(x)) or 1))
    return np.clip(x, -0.99, 0.99)


def fade(x, a=0.01, b=0.05):
    n, m = int(a * RATE), int(b * RATE)
    x[:n] *= np.linspace(0, 1, n)
    x[-m:] *= np.linspace(1, 0, m)
    return x


def seamless(x, overlap=1.0):
    """Blends the last second into the first, so the loop has no click or jump."""
    n = min(int(overlap * RATE), len(x) // 4)
    head, tail = x[:n], x[-n:]
    t = np.linspace(0, 1, n)
    x = x[:-n].copy()
    x[:n] = head * np.sqrt(t) + tail * np.sqrt(1 - t)
    return x


def steps(x):
    """Finds each footstep (a short loud moment) and cuts it out."""
    w = RATE // 50
    e = np.array([np.sqrt(np.mean(x[i:i + w] ** 2)) for i in range(0, len(x) - w, w)])
    out, i = [], 0
    while i < len(e):
        if e[i] > e.max() * 0.35:
            s = max(0, (i - 1) * w)
            out.append(x[s:s + int(0.3 * RATE)].copy())
            i += int(0.35 * RATE / w)
        else:
            i += 1
    return out


def main():
    src = sys.argv[1]
    info = json.load(open(os.path.join(src, 'info.json')))
    sources_path = os.path.join(ROOT, 'assets', 'SOURCES.json')
    sources = {k: v for k, v in json.load(open(sources_path)).items() if not k.startswith('assets/sounds/')}

    def note(path, title):
        i = info[title]
        rel = os.path.relpath(path, ROOT).replace(os.sep, '/')
        licence = 'CC0' if i['licence'].lower().startswith('cc') else 'Public domain'
        sources[rel] = {'from': i['page'], 'name': title.split(':', 1)[1], 'by': [i['by'] if i['by'] and i['by'].lower() != 'own source' else 'an unnamed Wikimedia Commons contributor'],
                        'licence': licence, 'sha256': hashlib.sha256(open(path, 'rb').read()).hexdigest()}

    for name, (title, start, length, loop, db) in CUTS.items():
        x = load(os.path.join(src, info[title]['file']), start, (length + 1 if loop and length else length))
        x = level(x, db, loop)
        x = seamless(x) if loop else fade(x)
        note(save(x, name), title)
    for k, s in enumerate(steps(load(os.path.join(src, info[STEPS]['file'])))[:6]):
        note(save(fade(level(s, -3, False), 0.003, 0.08), f'step-{k + 1}'), STEPS)
    with open(sources_path, 'w') as f:
        json.dump(dict(sorted(sources.items())), f, indent=1)
    print(len([k for k in sources if k.startswith('assets/sounds/')]), 'sounds')


if __name__ == '__main__':
    main()
