// The town's sounds: real recordings (Wikimedia Commons, public domain or CC0, see assets/SOURCES.json).
// Birds and parakeets by day, crickets, frogs and a nightjar in the evening, the market's bustle near the market,
// children near School Lane, the street near the junction; crows, a bulbul, sparrows and a rooster now and then;
// tea poured at the tea shop; engines of nearby vehicles; horns, the bicycle bell and her footsteps.
// Sounds come from where they happen (left, right, near, far). Sound can only start after a tap or a key.

export const SOUNDS = ['birds', 'parakeets', 'sparrows', 'bulbul', 'crow', 'rooster', 'cicadas', 'crickets', 'frogs',
  'nightjar', 'market', 'children', 'street', 'tea-pour', 'glass', 'thud', 'bell', 'horn', 'engine-small', 'engine-car',
  'engine-diesel', 'step-1', 'step-2', 'step-3', 'step-4', 'step-5', 'step-6'];

// Background sounds that loop, and how loud each is by day and in the evening, near and far.
const LOOPS = {
  birds: { day: 0.7, evening: 0.08 },
  parakeets: { day: 0.35, evening: 0 },
  cicadas: { day: 0.25, evening: 0.05 },
  crickets: { day: 0, evening: 0.55 },
  frogs: { day: 0, evening: 0.35 },
  street: { day: 0.45, evening: 0.3, near: { x: 24, z: 0, r: 70 } },
  market: { day: 0.9, evening: 0.45, near: { x: -54, z: -20, r: 45 } },
  children: { day: 0.6, evening: 0, near: { x: -30, z: -50, r: 40 } }
};
// Sounds that come now and then: [name, every (min, max seconds), when, how loud, where (null: somewhere around)].
const NOW_AND_THEN = [
  ['crow', 7, 22, 'day', 0.7], ['bulbul', 18, 40, 'day', 0.5], ['sparrows', 25, 55, 'day', 0.45],
  ['rooster', 45, 100, 'day', 0.5], ['nightjar', 25, 60, 'evening', 0.6], ['crow', 25, 50, 'evening', 0.4],
  ['tea-pour', 6, 14, 'both', 0.6, { x: 35, z: -11.5, r: 18 }], ['glass', 4, 10, 'both', 0.5, { x: 35, z: -11.5, r: 18 }]
];
const ENGINES = { auto: ['engine-small', 1.0], scooter: ['engine-small', 1.35], motorbike: ['engine-small', 0.8], car: ['engine-car', 1.0], bus: ['engine-diesel', 0.85], lorry: ['engine-diesel', 0.75] };
const HORN_PITCH = { auto: 1.45, scooter: 1.6, motorbike: 1.5, car: 1.0, bus: 0.72, lorry: 0.7 };

export class TownAudio {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.buffers = {};
    this.loops = {};
    this.engines = new Map();
    this.timers = NOW_AND_THEN.map(([, a, b]) => a + Math.random() * (b - a));
    this.time = settings.time || 'day';
    this.ready = false;
  }

  /** Starts sound after the first tap or key (browsers only allow it then), and loads the recordings. */
  async unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.applyVolume();
    await Promise.all(SOUNDS.map(async n => {
      try {
        const res = await fetch(`assets/sounds/${n}.mp3`);
        this.buffers[n] = await this.ctx.decodeAudioData(await res.arrayBuffer());
      } catch {
        // A sound that won't load is simply left out.
      }
    }));
    for (const name of Object.keys(LOOPS)) {
      if (!this.buffers[name]) continue;
      const src = this.ctx.createBufferSource(), gain = this.ctx.createGain();
      src.buffer = this.buffers[name];
      src.loop = true;
      gain.gain.value = 0;
      src.connect(gain).connect(this.master);
      // Start each loop at a different point so they don't line up.
      src.start(0, Math.random() * src.buffer.duration);
      this.loops[name] = gain;
    }
    this.ready = true;
  }

  applyVolume() {
    if (!this.master) return;
    const on = this.settings.sound !== false;
    this.master.gain.value = on ? (this.settings.volume ?? 0.8) : 0;
  }

  setTime(time) {
    this.time = time;
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  /** A sound from a place (x, z) or right here, through a panner so it comes from the right side. */
  play(name, { at = null, volume = 1, rate = 1, filter = null } = {}) {
    if (!this.ready || !this.buffers[name]) return;
    const c = this.ctx, src = c.createBufferSource(), gain = c.createGain();
    src.buffer = this.buffers[name];
    src.playbackRate.value = rate;
    gain.gain.value = volume;
    let node = src;
    if (filter) {
      const f = c.createBiquadFilter();
      f.type = filter.type;
      f.frequency.value = filter.freq;
      node.connect(f);
      node = f;
    }
    node.connect(gain);
    if (at) gain.connect(this.panner(at)).connect(this.master);
    else gain.connect(this.master);
    src.start();
  }

  panner(at, ref = 4) {
    const p = this.ctx.createPanner();
    p.panningModel = 'equalpower';
    p.distanceModel = 'inverse';
    p.refDistance = ref;
    p.rolloffFactor = 1.2;
    p.maxDistance = 200;
    setPos(p, at.x, at.y ?? 1, at.z);
    return p;
  }

  step(surface, run) {
    const n = 'step-' + (1 + ((Math.random() * 6) | 0));
    const v = (run ? 0.42 : 0.28) * (surface === 'grass' ? 0.6 : 1);
    if (surface === 'road' || surface === 'paving') this.play(n, { volume: v, rate: 1.25, filter: { type: 'highpass', freq: 700 } });
    else if (surface === 'grass') this.play(n, { volume: v, rate: 0.9, filter: { type: 'lowpass', freq: 1400 } });
    else this.play(n, { volume: v, rate: 1 + Math.random() * 0.1 });
  }

  horn(v) {
    this.play('horn', { at: { x: v.x, y: 1, z: v.z }, volume: 0.9, rate: HORN_PITCH[v.kind] || 1 });
  }

  /** Every frame: the listener where the camera is, the background sounds for here and now, engines nearby. */
  update(dt, game) {
    if (!this.ready || this.ctx.state !== 'running') return;
    const c = this.ctx, cam = game.camera, L = c.listener;
    const f = cam.getWorldDirection(cam.position.clone()).normalize();
    if (L.positionX) {
      L.positionX.value = cam.position.x;
      L.positionY.value = cam.position.y;
      L.positionZ.value = cam.position.z;
      L.forwardX.value = f.x;
      L.forwardY.value = f.y;
      L.forwardZ.value = f.z;
      L.upX.value = 0;
      L.upY.value = 1;
      L.upZ.value = 0;
    } else {
      L.setPosition(cam.position.x, cam.position.y, cam.position.z);
      L.setOrientation(f.x, f.y, f.z, 0, 1, 0);
    }
    const her = game.her, evening = this.time === 'evening';
    const playing = game.screen === 'play';
    // Background: by the time of day, louder near where each belongs.
    for (const [name, spec] of Object.entries(LOOPS)) {
      const g = this.loops[name];
      if (!g) continue;
      let v = spec[evening ? 'evening' : 'day'];
      if (spec.near) v *= Math.max(0, 1 - Math.hypot(her.x - spec.near.x, her.z - spec.near.z) / spec.near.r) ** 1.3;
      if (!playing) v *= 0.6;
      g.gain.setTargetAtTime(v, c.currentTime, 0.6);
    }
    // Now and then: a crow on a palm, the bulbul, tea being poured...
    NOW_AND_THEN.forEach(([name, a, b, when, vol, near], i) => {
      this.timers[i] -= dt;
      if (this.timers[i] > 0) return;
      this.timers[i] = a + Math.random() * (b - a);
      if (when !== 'both' && (when === 'evening') !== evening) return;
      let at;
      if (near) {
        if (Math.hypot(her.x - near.x, her.z - near.z) > near.r) return;
        at = { x: near.x + (Math.random() - 0.5) * 4, y: 1.2, z: near.z + (Math.random() - 0.5) * 2 };
      } else {
        const ang = Math.random() * Math.PI * 2, d = 8 + Math.random() * 22;
        at = { x: her.x + Math.cos(ang) * d, y: 6 + Math.random() * 6, z: her.z + Math.sin(ang) * d };
      }
      this.play(name, { at, volume: vol, rate: 0.95 + Math.random() * 0.1 });
    });
    // Engines of the nearest moving vehicles.
    const near = game.traffic.vehicles
      .filter(v => v.mode !== 'parked')
      .map(v => ({ v, d: Math.hypot(v.x - her.x, v.z - her.z) }))
      .filter(o => o.d < 45).sort((a, b) => a.d - b.d).slice(0, 5).map(o => o.v);
    for (const [v, e] of this.engines) if (!near.includes(v)) {
      e.gain.gain.setTargetAtTime(0, c.currentTime, 0.2);
      e.src.stop(c.currentTime + 1);
      this.engines.delete(v);
    }
    for (const v of near) {
      let e = this.engines.get(v);
      const [name, base] = ENGINES[v.kind];
      if (!e) {
        if (!this.buffers[name]) continue;
        const src = c.createBufferSource(), gain = c.createGain(), pan = this.panner({ x: v.x, y: 0.8, z: v.z }, 3);
        src.buffer = this.buffers[name];
        src.loop = true;
        gain.gain.value = 0;
        src.connect(gain).connect(pan).connect(this.master);
        src.start(0, Math.random() * src.buffer.duration);
        e = { src, gain, pan };
        this.engines.set(v, e);
      }
      const speed = Math.min(1, v.v / v.speed);
      const inside = v === game.ride && game.mode === 'auto';
      setPos(e.pan, v.x, 0.8, v.z);
      e.src.playbackRate.setTargetAtTime(base * (0.75 + speed * 0.55), c.currentTime, 0.2);
      e.gain.gain.setTargetAtTime((0.35 + speed * 0.65) * (inside ? 0.35 : 0.8), c.currentTime, 0.2);
    }
  }
}

function setPos(p, x, y, z) {
  if (p.positionX) {
    p.positionX.value = x;
    p.positionY.value = y;
    p.positionZ.value = z;
  } else p.setPosition(x, y, z);
}
