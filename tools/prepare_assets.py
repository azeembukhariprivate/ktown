# Turns the files fetched from Poly Haven (tools/fetch_polyhaven.py, unzipped into a folder) into the smaller files the
# game uses, and writes assets/SOURCES.json with where each came from, who made it and its SHA-256.
#
#   python3 tools/prepare_assets.py <fetched folder>
#
# Textures: colour 1024 px, surface bumps (normal) 512 px, shading (ambient occlusion, roughness, metal) 512 px, as JPG.
# Skies: the tonemapped picture at 4096 x 2048 (the light in the game comes from it and from the sun in code).
# Models: packed into one .glb each with gltf-transform (npm), simplified, textures at 512 px.
import hashlib
import json
import os
import subprocess
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ASSETS = os.path.join(ROOT, 'assets')

TEXTURES = {
    # name in the game: Poly Haven id
    'laterite': 'red_laterite_soil_stones',
    'grass': 'leafy_grass',
    'road': 'asphalt_02',
    'paving': 'concrete_pavement',
    'sand': 'coast_sand_01',
    'roof': 'clay_roof_tiles_02',
    'roof-old': 'roof_tiles_14',
    'plaster': 'beige_wall_001',
    'plaster-old': 'damaged_plaster',
    'plaster-blue': 'blue_plaster_weathered',
    'brick': 'castle_brick_02_red',
    'shutter': 'wood_shutter',
    'planks': 'wood_planks',
    'iron': 'corrugated_iron_02',
    'palm': 'palm_tree_bark',
}
SKIES = {
    'day': 'kloofendal_48d_partly_cloudy_puresky',
    'evening': 'qwantani_dusk_2_puresky',
}
# Each model and how much of its detail to keep (the originals are made for close-ups; the town has hundreds of them).
MODELS = {
    'bananas': 0.05, 'brass_pot_01': 0.3, 'ceramic_pot': 0.3, 'fern_02': 0.15, 'food_ginger_01': 0.06,
    'food_lime_01': 0.03, 'lemon': 0.06, 'yellow_onion': 0.05, 'sweet_potato': 0.12, 'metal_trash_can': 0.2,
    'old_tyre': 0.4, 'painted_wooden_bench': 1, 'planter_pot_clay': 0.4, 'plastic_crate_01': 0.04, 'plastic_jerrycan': 0.2,
    'plastic_monobloc_chair_01': 0.5, 'potted_plant_02': 0.035, 'utility_box_01': 0.4, 'wicker_basket_01': 0.02,
    'wooden_crate_01': 0.3, 'grass_medium_01': 0.06,
}


def sha(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def jpg(src, dst, size, quality=82):
    im = Image.open(src).convert('RGB')
    if im.width != size:
        im = im.resize((size, size if im.width == im.height else size * im.height // im.width), Image.LANCZOS)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst, quality=quality, optimize=True, progressive=True)


def main():
    src = sys.argv[1]
    info = json.load(open(os.path.join(src, 'info.json')))
    sources = {}

    def note(rel, id):
        i = info[id]
        sources[rel] = {'from': i['page'], 'name': i['name'], 'by': i['authors'] and list(i['authors']),
                        'licence': 'CC0', 'sha256': sha(os.path.join(ROOT, rel))}

    for name, id in TEXTURES.items():
        for kind, out, size in (('Diffuse', 'color', 1024), ('nor_gl', 'normal', 512), ('arm', 'arm', 512)):
            rel = f'assets/textures/{name}/{out}.jpg'
            jpg(os.path.join(src, id, f'{id}_{kind}_1k.jpg'), os.path.join(ROOT, rel), size)
            note(rel, id)
    for name, id in SKIES.items():
        rel = f'assets/sky/{name}.jpg'
        im = Image.open(os.path.join(src, id, f'{id}_tonemapped.jpg')).convert('RGB').resize((4096, 2048), Image.LANCZOS)
        os.makedirs(os.path.dirname(os.path.join(ROOT, rel)), exist_ok=True)
        im.save(os.path.join(ROOT, rel), quality=84, optimize=True, progressive=True)
        note(rel, id)
    os.makedirs(os.path.join(ASSETS, 'models'), exist_ok=True)
    for id, keep in MODELS.items():
        rel = f'assets/models/{id}.glb'
        simplify = ['--simplify', 'false'] if keep >= 1 else ['--simplify', 'true', '--simplify-ratio', str(keep), '--simplify-error', '0.06']
        subprocess.run(['npx', '--yes', '@gltf-transform/cli@4.2.1', 'optimize', os.path.join(src, id, f'{id}_1k.gltf'),
                        os.path.join(ROOT, rel), '--texture-compress', 'auto', '--texture-size', '512',
                        '--compress', 'false', *simplify], check=True, capture_output=True)
        note(rel, id)
    with open(os.path.join(ASSETS, 'SOURCES.json'), 'w') as f:
        json.dump(dict(sorted(sources.items())), f, indent=1)
    print(len(sources), 'files')


if __name__ == '__main__':
    main()
