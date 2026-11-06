// Loads the pictures, skies and models (all free from Poly Haven, see assets/SOURCES.json) and makes the materials.
import * as THREE from '../vendor/three/three.js';

export const TEXTURES = ['laterite', 'grass', 'road', 'paving', 'sand', 'roof', 'roof-old', 'plaster', 'plaster-old',
  'plaster-blue', 'brick', 'shutter', 'planks', 'iron', 'palm'];
export const MODELS = ['bananas', 'brass_pot_01', 'ceramic_pot', 'fern_02', 'food_ginger_01', 'food_lime_01', 'lemon',
  'yellow_onion', 'sweet_potato', 'metal_trash_can', 'old_tyre', 'painted_wooden_bench', 'planter_pot_clay',
  'plastic_crate_01', 'plastic_jerrycan', 'plastic_monobloc_chair_01', 'potted_plant_02', 'utility_box_01',
  'wicker_basket_01', 'wooden_crate_01', 'grass_medium_01'];

export class Assets {
  constructor(renderer, onProgress = () => {}) {
    this.renderer = renderer;
    this.maps = {}; // name -> { color, normal, arm }
    this.models = {};
    this.sky = {};
    this.onProgress = onProgress;
    this.done = 0;
    this.total = 0;
    this.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    this.cache = new Map();
  }

  tick() {
    this.done++;
    this.onProgress(this.done / this.total);
  }

  texture(url, colour = true) {
    return new Promise((ok, fail) => new THREE.TextureLoader().load(url, t => {
      t.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = this.anisotropy;
      this.tick();
      ok(t);
    }, undefined, () => fail(new Error('Could not load ' + url))));
  }

  async load() {
    const jobs = [];
    for (const name of TEXTURES) {
      this.maps[name] = {};
      for (const [k, colour] of [['color', true], ['normal', false], ['arm', false]])
        jobs.push(this.texture(`assets/textures/${name}/${k}.jpg`, colour).then(t => { this.maps[name][k] = t; }));
    }
    for (const name of ['day', 'evening'])
      jobs.push(this.texture(`assets/sky/${name}.jpg`).then(t => {
        t.mapping = THREE.EquirectangularReflectionMapping;
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.ClampToEdgeWrapping;
        this.sky[name] = t;
      }));
    const gltf = new THREE.GLTFLoader();
    for (const m of MODELS)
      jobs.push(gltf.loadAsync(`assets/models/${m}.glb`).then(g => {
        g.scene.traverse(o => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        this.models[m] = g.scene;
        this.tick();
      }));
    this.total = jobs.length;
    await Promise.all(jobs);
  }

  /**
   * A material from one of the textures. `scale` is how many metres one copy of the picture covers (the geometry's
   * UVs are in metres). `tint` colours it (for painted walls).
   */
  material(name, { tint = '#ffffff', scale = 2, rough = 1, side = THREE.FrontSide } = {}) {
    const key = [name, tint, scale, rough, side].join('|');
    if (this.cache.has(key)) return this.cache.get(key);
    const m = this.maps[name];
    const rep = (t) => {
      const c = t.clone();
      c.repeat.set(1 / scale, 1 / scale);
      c.needsUpdate = true;
      return c;
    };
    const mat = new THREE.MeshStandardMaterial({
      map: rep(m.color), normalMap: rep(m.normal), aoMap: null, roughnessMap: rep(m.arm), metalnessMap: rep(m.arm),
      color: new THREE.Color(tint), roughness: rough, metalness: 1, side
    });
    mat.normalScale.set(1, 1);
    this.cache.set(key, mat);
    return mat;
  }

  /** A plain coloured material (for small painted things). */
  plain(colour, { rough = 0.8, metal = 0, emissive = null, side = THREE.FrontSide } = {}) {
    const key = ['plain', colour, rough, metal, emissive, side].join('|');
    if (this.cache.has(key)) return this.cache.get(key);
    const mat = new THREE.MeshStandardMaterial({ color: colour, roughness: rough, metalness: metal, side });
    if (emissive) {
      mat.emissive = new THREE.Color(emissive);
      mat.emissiveIntensity = 0;
      mat.userData.glow = true;
    }
    this.cache.set(key, mat);
    return mat;
  }
}
