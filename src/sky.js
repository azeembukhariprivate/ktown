// The sky and the light: a real sky picture (Poly Haven) all round, the sun shining from where it is in that picture,
// soft light from the whole sky, and for the evening the dusk sky with the street lights, shops and windows lit.
import * as THREE from '../vendor/three/three.js';

/** Finds the brightest spot of a sky picture: where the sun (or the glow after sunset) is. */
function sunIn(texture) {
  const img = texture.image, w = 256, h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h / 2).data;
  let best = -1, bx = 0, by = 0;
  for (let y = 0; y < h / 2; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    if (l > best) {
      best = l;
      bx = x;
      by = y;
    }
  }
  // Picture position to a direction, the way three.js maps a sky picture round the world.
  const u = (bx + 0.5) / w, v = 1 - (by + 0.5) / h;
  const lon = (u - 0.5) * Math.PI * 2, lat = (v - 0.5) * Math.PI;
  return new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon));
}

const LOOKS = {
  // The sun comes from the south and a little east, behind you as you start out looking at the shops.
  day: { want: Math.atan2(0.45, 0.9), sun: '#fff1dc', sunPower: 3.1, sky: 1.0, exposure: 1.0, fog: '#cdd8e2', fogFar: 330, minLift: 0.5, glow: false },
  evening: { want: Math.atan2(-0.8, -0.5), sun: '#ffb27a', sunPower: 0.9, sky: 0.65, exposure: 1.3, fog: '#7d7690', fogFar: 230, minLift: 0.12, glow: true }
};

export class Sky {
  constructor(renderer, scene, assets, { shadowSize = 2048 } = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.assets = assets;
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envs = {};
    this.sun = new THREE.DirectionalLight('#ffffff', 3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(shadowSize, shadowSize);
    const cam = this.sun.shadow.camera;
    cam.left = cam.bottom = -34;
    cam.right = cam.top = 34;
    cam.near = 1;
    cam.far = 220;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.035;
    scene.add(this.sun, this.sun.target);
    this.fill = new THREE.HemisphereLight('#dfe9f5', '#6b5a40', 0.25);
    scene.add(this.fill);
    scene.fog = new THREE.Fog('#cdd8e2', 70, 330);
    this.lights = []; // street lights near her in the evening
    for (let i = 0; i < 6; i++) {
      const l = new THREE.PointLight('#ffd9a0', 0, 16, 1.6);
      l.visible = false;
      scene.add(l);
      this.lights.push(l);
    }
    this.sunDir = new THREE.Vector3(0, 1, 0);
    this.lampTimer = 0;
  }

  /** Switches between 'day' and 'evening'. `glow` lists the things that light up. */
  set(time, glow) {
    const L = LOOKS[time] || LOOKS.day;
    this.time = time in LOOKS ? time : 'day';
    const tex = this.assets.sky[this.time];
    if (!this.envs[this.time]) this.envs[this.time] = this.pmrem.fromEquirectangular(tex).texture;
    // Turn the sky so its sun is where we want it.
    const found = sunIn(tex);
    const turn = L.want - Math.atan2(found.x, found.z);
    this.scene.background = tex;
    this.scene.environment = this.envs[this.time];
    this.scene.backgroundRotation.set(0, turn, 0);
    this.scene.environmentRotation.set(0, turn, 0);
    this.scene.backgroundIntensity = 1;
    this.scene.environmentIntensity = L.sky;
    const dir = found.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), turn);
    if (dir.y < L.minLift) {
      // After sunset the light still comes from that way, just low.
      dir.y = L.minLift;
    }
    this.sunDir.copy(dir.normalize());
    this.sun.color.set(L.sun);
    this.sun.intensity = L.sunPower;
    this.fill.intensity = time === 'evening' ? 0.55 : 0.25;
    this.fill.color.set(time === 'evening' ? '#8d86b8' : '#dfe9f5');
    this.renderer.toneMappingExposure = L.exposure;
    this.scene.fog.color.set(L.fog);
    this.scene.fog.far = L.fogFar;
    for (const g of glow) {
      if (g.mesh) {
        g.mesh.visible = L.glow;
        g.mesh.material.emissiveIntensity = L.glow ? 1.6 : 0;
      }
      if (g.material) g.material.emissiveIntensity = L.glow ? 2.2 : 0;
    }
    this.evening = L.glow;
    for (const l of this.lights) l.visible = L.glow;
    this.lampTimer = 0;
  }

  /** Keeps the sun's shadows around her, and in the evening lights the street lights nearest to her. */
  follow(x, y, z, dt, lamps) {
    const texel = 68 / this.sun.shadow.mapSize.x;
    const sx = Math.round(x / texel) * texel, sz = Math.round(z / texel) * texel;
    this.sun.target.position.set(sx, 0, sz);
    this.sun.position.set(sx + this.sunDir.x * 100, this.sunDir.y * 100, sz + this.sunDir.z * 100);
    if (!this.evening) return;
    this.lampTimer -= dt;
    if (this.lampTimer > 0) return;
    this.lampTimer = 0.5;
    const near = [...lamps].sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
    this.lights.forEach((l, i) => {
      const p = near[i];
      if (!p) return (l.intensity = 0);
      l.position.set(p.x, p.y, p.z);
      l.intensity = p.small ? 6 : 18;
      l.distance = p.small ? 8 : 18;
    });
  }
}
