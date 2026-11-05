# Fetches free (CC0) textures, skies and models from Poly Haven, for picking what goes into the game.
# Runs on GitHub's build machines (.github/workflows/fetch-assets.yml); the picked files are then checked and added
# to assets/ by hand, with their checksums in assets/SOURCES.json.
#
#   python3 tools/fetch_polyhaven.py catalog out            -> out/catalog.json (every asset, its kind and tags)
#   python3 tools/fetch_polyhaven.py "id:1k,id2:2k" out      -> out/<id>/... (the files at that size) + info.json
import json
import os
import sys
import urllib.request

API = 'https://api.polyhaven.com'
UA = {'User-Agent': 'KTOWN-asset-fetch (github.com/azeembukhariprivate/ktown)'}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read()


def save(url, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(get(url))
    print('  ', path, os.path.getsize(path))


def texture(id, res, files, out):
    # Colour, surface bumps (OpenGL normal map) and the packed AO/rough/metal map, as JPGs.
    for kind in ('Diffuse', 'nor_gl', 'arm', 'Rough', 'AO', 'Displacement'):
        if kind in files and res in files[kind] and 'jpg' in files[kind][res]:
            save(files[kind][res]['jpg']['url'], f'{out}/{id}/{id}_{kind}_{res}.jpg')


def hdri(id, res, files, out):
    save(files['hdri'][res]['hdr']['url'], f'{out}/{id}/{id}_{res}.hdr')
    if 'tonemapped' in files:
        save(files['tonemapped']['url'], f'{out}/{id}/{id}_tonemapped.jpg')


def model(id, res, files, out):
    g = files['gltf'][res]['gltf']
    save(g['url'], f'{out}/{id}/{id}_{res}.gltf')
    for rel, f in g.get('include', {}).items():
        save(f['url'], f'{out}/{id}/{rel}')


def main():
    what, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    if what == 'catalog':
        cat = json.loads(get(f'{API}/assets?t=all'))
        slim = {k: {'type': v['type'], 'name': v['name'], 'categories': v.get('categories', []),
                    'tags': v.get('tags', []), 'dimensions': v.get('dimensions')} for k, v in cat.items()}
        with open(f'{out}/catalog.json', 'w') as f:
            json.dump(slim, f, indent=0, sort_keys=True)
        print(len(slim), 'assets')
        return
    infos = {}
    for item in what.split(','):
        id, _, res = item.strip().partition(':')
        res = res or '1k'
        info = json.loads(get(f'{API}/info/{id}'))
        files = json.loads(get(f'{API}/files/{id}'))
        infos[id] = {'name': info.get('name'), 'type': info.get('type'), 'authors': info.get('authors'),
                     'res': res, 'page': f'https://polyhaven.com/a/{id}'}
        print(id, info.get('type'))
        [hdri, texture, model][info['type']](id, res, files, out)
    with open(f'{out}/info.json', 'w') as f:
        json.dump(infos, f, indent=1)


if __name__ == '__main__':
    main()
