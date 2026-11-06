// The game: the town, Inaara (on foot, on her bicycle or in an autorickshaw), the people, the traffic, the camera
// that follows her, and what happens every frame.
import * as THREE from '../vendor/three/three.js';
import { buildTown, BOUND, inside, groundAt } from './layout.js';
import { World, Walker, Bike, cameraReach } from './move.js';
import { buildTown3D } from './town3d.js';
import { Child } from './children.js';
import { People } from './people.js';
import { Sky } from './sky.js';
import { Traffic, trafficMix } from './traffic.js';
import { makeAuto, makeTwoWheeler, makeCar, makeBus, makeLorry, Bicycle, vehicleGlow } from './vehicles.js';
import { JobPlay } from './jobplay.js';
import { ITEMS, SNACK_SECONDS } from './jobs.js';
import { LINES } from './lines.js';
import { instances } from './build.js';

export const CAMERA = { dist: 4.4, min: 2.2, max: 9, pitch: 0.28, height: 0.95 };

export class Game {
  constructor(renderer, assets, input, save, { quality = 'high', audio = null } = {}) {
    this.renderer = renderer;
    this.assets = assets;
    this.input = input;
    this.save = save;
    this.audio = audio;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 600);
    this.plan = buildTown();
    this.world = new World(this.plan.solids, BOUND);
    this.roofs = new World(this.plan.camera);
    this.town = buildTown3D(this.plan, assets, this.scene, { quality });
    this.sky = new Sky(renderer, this.scene, assets, { shadowSize: quality === 'low' ? 1024 : 2048 });
    this.hero = new Child('inaara');
    this.scene.add(this.hero.root);
    this.walker = new Walker(this.plan.start.x, this.plan.start.z, this.plan.start.heading);
    this.people = new People(this.plan, this.world, this.scene);

    // Her bicycle, waiting in her yard.
    const b = this.plan.bike;
    this.bike = new Bike(b.x, b.z, b.heading);
    this.bicycle = new Bicycle();
    this.scene.add(this.bicycle.root);
    this.bikeSolid = [{ kind: 'circle', x: 0, z: 0, r: 0.3, top: 0.9, person: true }, { kind: 'circle', x: 0, z: 0, r: 0.3, top: 0.9, person: true }];

    // The traffic, and a drawing for every vehicle.
    this.traffic = new Traffic(trafficMix(quality), this.plan.stand, 11);
    this.vehicleMeshes = new Map();
    this.vehicleSolids = [];
    this.syncVehicles();
    this.glow = [...this.town.glow, ...vehicleGlow()];
    this.sky.set(save.settings.time, this.glow);

    this.mode = 'foot'; // foot, bike, auto
    this.ride = null; // the autorickshaw she's in, or has waved down
    this.yaw = this.plan.start.heading + Math.PI;
    this.pitch = CAMERA.pitch;
    this.dist = CAMERA.dist;
    this.camPos = new THREE.Vector3();
    this.screen = 'title'; // title, play, paused
    this.area = '';
    this.onArea = () => {};
    this.onPrompt = () => {};
    this.onMenu = () => {};
    this.onToast = () => {};
    this.prompt = null;
    this.t = 0;
    this.stepCount = 0;
    this.onCoins = () => {};
    this.onJob = () => {};
    this.onFinale = () => {};
    this.onSave = () => {};
    this.onShop = () => {};
    // The jobs, coins and everything she has: saved in the browser.
    this.jobs = new JobPlay(this, save.progress);
    const kept = this.jobs.progress.p.bike;
    if (kept && !this.world.blocked(kept.x, kept.z, 0.36, 0.22)) Object.assign(this.bike, { x: kept.x, z: kept.z, heading: kept.heading });
    this.titlePose();
    this.updateWorldDynamic();
    this.placeBike();
    this.hero.update(0, this.walker);
    this.placeCamera(0, true);
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setTime(time) {
    this.save.settings.time = time;
    this.sky.set(time, this.glow);
    if (this.audio) this.audio.setTime(time);
  }

  /** Where she is now, whatever she's on. */
  get her() {
    if (this.mode === 'bike') return { x: this.bike.x, y: this.bike.y, z: this.bike.z, heading: this.bike.heading, speed: this.bike.speed };
    if (this.mode === 'auto' && this.ride) return { x: this.ride.x, y: 0, z: this.ride.z, heading: Math.atan2(this.ride.dx, this.ride.dz), speed: this.ride.v };
    const w = this.walker;
    return { x: w.x, y: w.y, z: w.z, heading: w.heading, speed: Math.hypot(w.vx, w.vz) };
  }

  frame(dt) {
    this.t += dt;
    const ctl = this.input.take();
    const playing = this.screen === 'play';
    if (playing) {
      // Turning the camera.
      const sp = 0.0042 * (this.save.settings.camSpeed || 1);
      this.yaw -= ctl.look.x * sp;
      this.pitch = Math.max(-0.35, Math.min(1.25, this.pitch + ctl.look.y * sp * (this.save.settings.invertY ? -1 : 1)));
      this.dist = Math.max(CAMERA.min, Math.min(CAMERA.max, this.dist * (1 + ctl.zoom * 0.1)));
      // Moving: the stick's forward is away from the camera.
      const m = this.input.move();
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const move = { x: fx * m.y + Math.cos(this.yaw) * m.x, z: fz * m.y - Math.sin(this.yaw) * m.x };
      // Long steps (a slow frame) are split so she never goes through a wall.
      const steps = Math.ceil(dt / (1 / 60));
      if (this.mode === 'foot') for (let i = 0; i < steps; i++) this.walker.update(dt / steps, this.world, move, m.run, ctl.jump && i === 0);
      else if (this.mode === 'bike') for (let i = 0; i < steps; i++) this.bike.update(dt / steps, this.world, move, m.run);
      if (ctl.action) this.action();
      if (ctl.bell && this.mode === 'bike' && this.audio) {
        if (this.jobs.progress.owns('horn')) this.audio.tune();
        else this.audio.play('bell');
      }
      // When she moves and the camera hasn't been turned by hand for a moment, it swings round behind her.
      const sinceLook = (performance.now() - this.input.lastLook) / 1000;
      const her = this.her;
      if (sinceLook > 1.5 && her.speed > 0.5 && (this.mode === 'auto' || Math.abs(m.y) > 0.2 || this.mode === 'bike')) {
        let d = her.heading + Math.PI - this.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        this.yaw += d * Math.min(1, dt * (this.mode === 'foot' ? 0.9 : 1.6) * Math.min(1, her.speed / 3));
      }
      this.checkArea();
    } else if (this.screen === 'title') {
      // The four friends at her gate, the camera in front of them, swaying gently.
      this.yaw = this.her.heading + 0.35 + Math.sin(this.t * 0.25) * 0.18;
      this.pitch = 0.1;
      this.dist = 4.6;
    }
    const still = this.screen === 'paused' ? 0 : dt;
    const her = this.her;
    // The traffic, stopping for people and for her (on foot or on her bicycle).
    const others = this.people.list.map(p => ({ x: p.x, z: p.z, r: 0.3 }));
    for (const k of Object.values(this.jobs.kids)) others.push({ x: k.x, z: k.z, r: k.racing ? 0.45 : 0.25 });
    if (this.mode !== 'auto') others.push({ x: her.x, z: her.z, r: this.mode === 'bike' ? 0.45 : 0.3, her: true });
    if (still) this.traffic.update(still, others);
    this.trafficEvents();
    this.syncVehicles();
    this.updateWorldDynamic();
    const near = this.people.update(still, { x: her.x, z: her.z });
    if (this.screen !== 'paused') this.jobs.update(still);
    this.poseHero(still, near);
    this.placeBike();
    if (playing) this.updatePrompt();
    this.placeCamera(dt);
    this.sky.follow(her.x, her.y, her.z, dt, this.town.lamps);
    if (this.audio) this.audio.update(dt, this);
    this.renderer.render(this.scene, this.camera);
  }

  /** Puts Inaara in the right pose for what she's doing. */
  poseHero(dt, nearPerson) {
    const camera = this.camera.position;
    if (this.mode === 'foot') {
      const w = this.walker, before = Math.floor(w.phase * 2.2 / Math.PI);
      this.hero.update(dt, w, { nearPerson, camera });
      const after = Math.floor(w.phase * 2.2 / Math.PI);
      if (after !== before && (w.state === 'walk' || w.state === 'run') && this.audio) this.audio.step(this.surface(w.x, w.z, w.y), w.state === 'run');
      return;
    }
    if (this.mode === 'bike') {
      const b = this.bike;
      // Her hips on the saddle (a little behind the middle of the bicycle).
      const back = 0.2;
      this.hero.update(dt, {
        x: b.x - Math.sin(b.heading) * back, y: b.y + 0.21, z: b.z - Math.cos(b.heading) * back, heading: b.heading,
        vx: Math.sin(b.heading) * b.speed, vz: Math.cos(b.heading) * b.speed, vy: 0, state: 'bike', phase: 0,
        pedal: b.roll * 0.6, roll: b.lean, bumped: b.bumped
      }, { nearPerson, camera });
      return;
    }
    // In the back of the autorickshaw, on its seat.
    const v = this.ride, h = Math.atan2(v.dx, v.dz);
    this.hero.update(dt, { x: v.x - v.dx * 0.85, y: 0.43, z: v.z - v.dz * 0.85, heading: h, vx: 0, vz: 0, vy: 0, state: 'sit', phase: 0, bumped: 10 }, { nearPerson, camera });
  }

  /** What the ground under her feet is, for her footsteps. */
  surface(x, z, y) {
    if (y > 0.15) return 'paving';
    const g = groundAt(this.plan, x, z);
    return g === 'road' ? 'road' : g === 'paving' ? 'paving' : g === 'grass' ? 'grass' : 'gravel';
  }

  placeBike() {
    const riding = this.mode === 'bike', b = this.bike;
    this.bicycle.set(b.x, b.y, b.z, b.heading, b.roll, riding ? b.lean : 0.0);
    const her = this.her;
    // A marker over the bicycle when she has left it somewhere.
    this.bicycle.marker.visible = !riding && Math.hypot(her.x - b.x, her.z - b.z) > 8;
    if (this.bicycle.marker.visible) this.bicycle.marker.position.y = 1.7 + Math.sin(this.t * 3) * 0.08;
  }

  /** Everything that moves and that she can bump into: people, vehicles, her parked bicycle. */
  updateWorldDynamic() {
    const list = [...this.people.solids, ...this.vehicleSolids, ...this.jobs.solids];
    if (this.mode !== 'bike') {
      const b = this.bike, dx = Math.sin(b.heading) * 0.3, dz = Math.cos(b.heading) * 0.3;
      Object.assign(this.bikeSolid[0], { x: b.x + dx, z: b.z + dz });
      Object.assign(this.bikeSolid[1], { x: b.x - dx, z: b.z - dz });
      if (this.mode === 'foot') list.push(...this.bikeSolid);
    }
    this.world.dynamic = list;
  }

  /** Keeps every vehicle's drawing where the vehicle is. */
  syncVehicles() {
    const make = { auto: makeAuto, scooter: v => makeTwoWheeler('scooter', v), motorbike: v => makeTwoWheeler('motorbike', v), car: makeCar, bus: makeBus, lorry: makeLorry };
    this.vehicleSolids.length = 0;
    for (const v of this.traffic.vehicles) {
      let g = this.vehicleMeshes.get(v);
      if (!g) {
        g = make[v.kind](v.look);
        this.scene.add(g);
        this.vehicleMeshes.set(v, g);
      }
      g.position.set(v.x, 0, v.z);
      g.rotation.y = Math.atan2(v.dx, v.dz);
      for (const c of this.traffic.circles(v)) this.vehicleSolids.push({ kind: 'circle', x: c.x, z: c.z, r: c.r, top: v.top, person: true });
    }
  }

  trafficEvents() {
    for (const e of this.traffic.events) {
      if (e.type === 'horn' && this.audio) this.audio.horn(e.vehicle);
      if (e.type === 'horn') this.jobs.driverCalls(e.vehicle);
      if (e.type === 'arrived' && e.vehicle === this.ride && this.mode === 'auto') {
        const place = e.vehicle.place, name = place ? place.name : '';
        this.jobs.say(() => ({ x: e.vehicle.x, y: 2.1, z: e.vehicle.z }), LINES.ride.here, 3);
        this.leaveAuto();
        if (name) this.onToast('Here we are: ' + name);
        this.jobs.rideArrived(place);
      }
    }
    // A hailed autorickshaw opens the list of places once it has stopped beside her.
    if (this.ride && this.mode === 'foot' && this.ride.mode === 'hailed' && this.ride.v < 0.2 && !this.menuOpen) this.openPlaces();
    if (this.ride && this.mode === 'auto' && this.ride.mode === 'stopping' && this.ride.v < 0.2) this.leaveAuto();
    // The stand fills up again with autorickshaws, out of her sight.
    const her = this.her;
    for (const spot of this.plan.stand.spots) {
      const taken = this.traffic.vehicles.some(v => v.mode === 'parked' && v.spot === spot);
      if (!taken && Math.hypot(her.x - spot.x, her.z - spot.z) > 35) this.traffic.park(spot);
    }
  }

  /** What she can do here, shown as a prompt (E, a button on phones, Y on a controller). */
  updatePrompt() {
    let p = null;
    const her = this.her;
    if (this.mode === 'bike' && !this.jobs.prompt()) p = { text: 'Get off the bicycle', act: () => this.getOffBike() };
    else if (this.mode === 'auto') p = this.ride.mode === 'stopping' ? null : { text: 'Get off here', act: () => { this.ride.mode = 'stopping'; } };
    const jobPrompt = this.mode !== 'auto' && !this.menuOpen ? this.jobs.prompt() : null;
    if (jobPrompt) p = jobPrompt;
    else if (this.mode === 'foot' && !this.menuOpen && this.nearShop()) {
      const shop = this.nearShop();
      p = { text: 'Look in ' + (shop.name === 'Tea Shop' ? 'the tea shop' : shop.name), act: () => this.openShop(shop) };
    } else if (!this.menuOpen && this.mode === 'foot') {
      const b = this.bike;
      const nearAuto = this.traffic.vehicles
        .filter(v => v.kind === 'auto' && (v.mode === 'parked' || v.mode === 'drive' || v.mode === 'hailed'))
        .map(v => ({ v, d: Math.hypot(v.x - her.x, v.z - her.z) }))
        .filter(o => o.d < (o.v.mode === 'parked' ? 3.2 : 9)).sort((a, b) => a.d - b.d)[0];
      if (Math.hypot(b.x - her.x, b.z - her.z) < 1.6 && this.walker.onGround) p = { text: 'Get on your bicycle', act: () => this.getOnBike() };
      else if (nearAuto && nearAuto.v.mode === 'parked') p = { text: 'Take an autorickshaw', act: () => { this.ride = nearAuto.v; this.openPlaces(); } };
      else if (nearAuto && nearAuto.v.mode === 'drive') p = { text: 'Wave down the autorickshaw', act: () => { this.ride = nearAuto.v; this.traffic.hail(nearAuto.v); } };
    }
    if (this.ride && this.mode === 'foot' && this.ride.mode === 'hailed' && Math.hypot(this.ride.x - her.x, this.ride.z - her.z) > 14) {
      // She walked off: the driver carries on.
      this.ride.mode = 'drive';
      this.ride = null;
    }
    const key = p ? p.text : '';
    if (key !== (this.prompt ? this.prompt.text : '')) this.onPrompt(p);
    this.prompt = p;
  }

  action() {
    // What she can do right now (not a moment ago).
    this.updatePrompt();
    if (this.prompt) this.prompt.act();
  }

  getOnBike() {
    this.mode = 'bike';
    this.bike.speed = 0;
    this.bike.y = this.world.groundAt(this.bike.x, this.bike.z, 0.3);
    if (this.audio) this.audio.play('bell', { volume: 0.4 });
  }

  getOffBike() {
    const b = this.bike;
    if (b.speed > 1.5) return; // slow down first
    const spot = this.freeSpotBeside(b.x, b.z, Math.sin(b.heading), Math.cos(b.heading), 0.6);
    this.mode = 'foot';
    b.speed = 0;
    this.walker = new Walker(spot.x, spot.z, b.heading);
    this.walker.y = this.world.groundAt(spot.x, spot.z, b.y + 0.36);
  }

  openPlaces() {
    this.menuOpen = true;
    const v = this.ride;
    let list = this.plan.places.filter(p => Math.hypot(p.x - v.x, p.z - v.z) > 15);
    list = this.jobs.ridePlaces(list).map(p => {
      const cost = this.jobs.rideCost(Math.hypot(p.x - v.x, p.z - v.z), p);
      return { ...p, cost };
    });
    this.jobs.say(() => ({ x: v.x, y: 2.1, z: v.z }), LINES.ride.where, 3);
    this.onMenu(list, place => {
      this.menuOpen = false;
      if (!place) {
        if (this.ride && this.ride.mode === 'hailed') this.ride.mode = 'drive';
        this.ride = null;
        return;
      }
      if (!place.cost) place.cost = this.jobs.rideCost(Math.hypot(place.x - v.x, place.z - v.z), place);
      if (!place.cost.ok) {
        this.jobs.say(() => ({ x: v.x, y: 2.1, z: v.z }), LINES.ride.short, 3);
        this.onToast('Not enough coins for that ride. Home is always free!');
        if (this.ride && this.ride.mode === 'hailed') this.ride.mode = 'drive';
        this.ride = null;
        return;
      }
      if (this.traffic.hire(this.ride, place)) {
        this.jobs.progress.spend(place.cost.pay);
        this.onCoins(this.jobs.progress.coins, -place.cost.pay);
        this.mode = 'auto';
        if (place.cost.free) this.jobs.say(() => ({ x: v.x, y: 2.1, z: v.z }), LINES.ride.free, 4);
        else this.jobs.say(() => ({ x: v.x, y: 2.1, z: v.z }), LINES.ride.hop, 2.5);
        this.onToast('To ' + place.name + (place.cost.pay ? ` (${place.cost.pay} coins)` : place.cost.aunty ? ' (Mariyamma aunty pays)' : ' (free)'));
        if (this.audio) this.audio.play('horn', { at: this.ride, volume: 0.4, rate: 1.45 });
        this.jobs.save();
      } else {
        this.onToast('The driver doesn\'t know the way there');
        this.ride = null;
      }
    });
  }

  // ---------- Shops ----------

  /** The shops she can look in: each open shop with things to buy, and the tea shop. */
  shopSpots() {
    if (!this._shops) {
      const names = new Set(ITEMS.map(i => i.shop));
      this._shops = this.plan.shops.filter(s => s.open && names.has(s.name))
        .map(s => ({ name: s.name, x: s.x, z: s.z + (s.facing === 'south' ? 1.6 : -1.6) }));
      this._shops.push({ name: 'Tea Shop', x: 35, z: -9.6 });
    }
    return this._shops;
  }

  nearShop() {
    const her = this.her;
    return this.shopSpots().find(s => Math.hypot(s.x - her.x, s.z - her.z) < 2.2) || null;
  }

  openShop(shop) {
    this.menuOpen = true;
    this.onShop(shop, ITEMS.filter(i => i.shop === shop.name), () => { this.menuOpen = false; });
  }

  /** Buys something; returns what happened, for the shop's list. */
  buy(item) {
    const pr = this.jobs.progress;
    if (!pr.buy(item)) return pr.owns(item.id) ? 'owned' : 'short';
    const forAiza = this.jobs.active && this.jobs.active.job.kind === 'buy' && (item.id === this.jobs.active.job.item || item.same === this.jobs.active.job.item);
    if (item.kind === 'snack' && !forAiza) {
      this.jobs.snack = SNACK_SECONDS;
      this.onToast('Yum! She runs and pedals a little faster for a minute.');
    }
    if (item.kind === 'bike') this.bicycle.setColour(item.value);
    if (item.kind === 'basket') this.bicycle.bigBasket(true);
    if (item.kind === 'wear') this.hero.wear(pr.p.wearing);
    if (item.kind === 'yard') this.setYard({ pots: pr.owns('pots'), swing: pr.owns('swing') });
    this.jobs.bought(item);
    this.onCoins(pr.coins, -item.price);
    this.jobs.save();
    return 'bought';
  }

  /** Puts on or takes off something she owns (or chooses a bicycle colour she owns). */
  choose(item) {
    const pr = this.jobs.progress;
    if (!pr.owns(item.id)) return;
    if (item.kind === 'wear') {
      const w = pr.p.wearing;
      if (w.includes(item.id)) w.splice(w.indexOf(item.id), 1);
      else w.push(item.id);
      this.hero.wear(w);
    }
    if (item.kind === 'bike') {
      pr.p.bikeColour = item.value;
      this.bicycle.setColour(item.value);
    }
    this.jobs.save();
  }

  /** Flower pots and a swing in her yard (when bought). */
  setYard({ pots, swing }) {
    const h = this.plan.home;
    if (!this.yard) this.yard = {};
    if (pots && !this.yard.pots) {
      const [x, z] = h.yardSpots[0];
      const g = new THREE.Group();
      const list = [0, 1, 2, 3].map(i => ({ x: x + (i - 1.5) * 0.7, z, rot: i }));
      instances(this.assets.models.potted_plant_02, list, g);
      this.scene.add(g);
      this.yard.pots = g;
    }
    if (swing && !this.yard.swing) {
      const [x, z] = h.yardSpots[1];
      const g = new THREE.Group();
      const wood = new THREE.MeshStandardMaterial({ color: '#7a4a2a', roughness: 0.8 });
      const rope = new THREE.MeshStandardMaterial({ color: '#d7c9a7', roughness: 0.9 });
      for (const s of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.2, 8), wood);
        post.position.set(s * 0.9, 1.1, 0);
        g.add(post);
        const r = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.5, 6), rope);
        r.position.set(s * 0.35, 1.35, 0);
        g.add(r);
      }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.1), wood);
      beam.position.y = 2.15;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.3), wood);
      seat.position.y = 0.6;
      g.add(beam, seat);
      g.position.set(x, 0, z);
      g.rotation.y = Math.PI / 2;
      g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      this.scene.add(g);
      this.yard.swing = g;
    }
  }

  saveProgress(p) {
    this.save.progress = p;
    this.onSave();
  }

  /** On the title screen: the four friends standing together at her gate, looking at you. */
  titlePose() {
    const s = this.her, h = s.heading, rx = Math.cos(h), rz = -Math.sin(h);
    const spots = { atyb: -1.25, aiza: 0.75, aydin: 1.45 };
    for (const [who, off] of Object.entries(spots)) {
      const k = this.jobs.kids[who];
      Object.assign(k, { x: s.x + rx * off + Math.sin(h) * 0.3, z: s.z + rz * off + Math.cos(h) * 0.3, heading: h, target: null });
    }
    this.titleCentre = { x: s.x + rx * 0.1, z: s.z + rz * 0.1 };
  }

  /** Leaving the title: her friends go back across the lane. */
  leaveTitle() {
    for (const k of Object.values(this.jobs.kids)) Object.assign(k, { x: k.home.x, z: k.home.z, heading: k.home.heading, target: null });
  }

  leaveAuto() {
    const v = this.ride;
    const spot = this.freeSpotBeside(v.x, v.z, v.dx, v.dz, 1.2);
    this.mode = 'foot';
    this.walker = new Walker(spot.x, spot.z, Math.atan2(v.dx, v.dz));
    this.walker.y = this.world.groundAt(spot.x, spot.z, 0.4);
    this.traffic.release(v);
    this.ride = null;
  }

  /**
   * A free place to stand beside something at (x, z) pointing (dx, dz): to its left, else its right, a little further
   * out each time; off the road if there's a way (out of an autorickshaw, she steps onto the road side).
   */
  freeSpotBeside(x, z, dx, dz, side) {
    const saved = this.world.dynamic;
    this.world.dynamic = this.people.solids;
    const free = (px, pz) => !this.world.blocked(px, pz, 0.26, 0.4) && !this.vehicleSolids.some(c => Math.hypot(c.x - px, c.z - pz) < c.r + 0.3);
    let found = null, fallback = null;
    for (let d = side; d <= side + 3.2 && !found; d += 0.4) {
      for (const [ox, oz] of [[dz, -dx], [-dz, dx]]) {
        const px = x + ox * d, pz = z + oz * d;
        if (!free(px, pz)) continue;
        if (groundAt(this.plan, px, pz) !== 'road') {
          found = { x: px, z: pz };
          break;
        }
        fallback = fallback || { x: px, z: pz };
      }
    }
    this.world.dynamic = saved;
    return found || fallback || { x: x - dx * 2, z: z - dz * 2 };
  }

  placeCamera(dt, snap = false) {
    const her = this.screen === 'title' && this.titleCentre ? { ...this.her, ...this.titleCentre } : this.her;
    const h = this.mode === 'auto' ? 1.35 : this.mode === 'bike' ? 1.15 : CAMERA.height;
    const target = new THREE.Vector3(her.x, her.y + h, her.z);
    const cp = Math.cos(this.pitch);
    const dir = new THREE.Vector3(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);
    const dist = this.mode === 'auto' ? Math.max(this.dist, 5.2) : this.dist;
    const reach = cameraReach(this.world, this.roofs, target, dir, dist);
    const want = target.clone().addScaledVector(dir, reach);
    want.y = Math.max(want.y, 0.3);
    if (snap || !this.camReady) {
      this.camPos.copy(want);
      this.camReady = true;
    } else {
      // Smooth, but come in quickly when something gets in the way.
      const k = 1 - Math.exp(-dt * (this.camPos.distanceTo(target) > reach + 0.2 ? 20 : 10));
      this.camPos.lerp(want, k);
    }
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(target.x, target.y + 0.15, target.z);
  }

  checkArea() {
    const her = this.her;
    const a = this.plan.areas.find(a => inside(a, her.x, her.z));
    const name = a ? a.name : '';
    if (name !== this.area) {
      this.area = name;
      if (name) this.onArea(name);
    }
  }

  /** For the tests: put her somewhere (on foot). */
  teleport(x, z, heading = this.walker.heading) {
    if (this.mode === 'auto' && this.ride) this.traffic.release(this.ride);
    this.mode = 'foot';
    this.ride = null;
    this.walker = new Walker(x, z, heading);
    this.walker.y = this.world.groundAt(x, z, 1);
    this.yaw = heading + Math.PI;
    this.camReady = false;
  }
}
