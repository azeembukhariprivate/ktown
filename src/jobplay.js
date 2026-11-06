// Playing the jobs in the town: Inaara's three friends (Atyb, Aydin, Aiza) moving about, the job givers' markers,
// what she carries, who follows her (Aiza, a goat, a cat, Mariyamma aunty), Atyb racing on his bicycle, catch with
// Aydin, coins lying about, things bought in the shops, people saying things now and then (Malayalam bubbles), and
// the jasmine garland at the end. The rules and numbers are in jobs.js; this is them happening in the world.
import * as THREE from '../vendor/three/three.js';
import { Child } from './children.js';
import { Bicycle } from './vehicles.js';
import { jobPlaces, setJobs, everydayJob, ITEMS, Progress, rideCost, SNACK_SECONDS, SNACK_BOOST } from './jobs.js';
import { LINES, pick } from './lines.js';
import { MOVE } from './move.js';

const GIVER_NAMES = { atyb: 'Atyb', aydin: 'Aydin', aiza: 'Aiza', velu: 'Velu', kunjamma: 'Kunjamma', mariyamma: 'Mariyamma aunty', gopalan: 'Gopalan', lakshmi: 'Lakshmi', sarada: 'Sarada teacher', leela: 'Leela aunty', bookstall: 'the Book Stall' };
const THINGS = { ball: 'the football', goat: 'the goat', cat: 'the cat' };

/** A gold marker that floats and turns above someone with a job, or over a place to go. */
function marker(colour = '#ffcf3a', tall = false) {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.92, depthWrite: false });
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), m);
  top.position.y = 0.42;
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, 0.42, 10), m);
  bar.position.y = 0.72;
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), m);
  dot.position.y = 0.42;
  if (tall) {
    // A soft pillar of light standing on the spot (for places to go and race checkpoints).
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 6, 24, 1, true), new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
    beam.position.y = 3;
    g.add(beam);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.06, 8, 32), m);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    g.add(ring);
  } else {
    g.add(bar, dot);
  }
  g.renderOrder = 5;
  return g;
}

/** A goat or a cat, made in code, that can trot after her. */
function animal(kind) {
  const g = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: kind === 'goat' ? '#efe9df' : '#e08a3c', roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2b2420', roughness: 0.8 });
  const s = kind === 'goat' ? 1 : 0.45;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17 * s, 0.42 * s, 6, 12), coat);
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.55 * s;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12 * s, 12, 10), coat);
  head.position.set(0, 0.78 * s, 0.33 * s);
  head.scale.set(0.85, 1, 1.25);
  g.add(head);
  for (const e of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.015 * s + 0.004, 6, 4), dark);
    eye.position.set(e * 0.06 * s, 0.82 * s, 0.45 * s);
    g.add(eye);
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.04 * s, 0.1 * s, 6), kind === 'goat' ? coat : coat);
    ear.position.set(e * 0.08 * s, 0.9 * s, 0.3 * s);
    ear.rotation.z = -e * (kind === 'goat' ? 1.3 : 0.2);
    g.add(ear);
    if (kind === 'goat') {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.12, 6), dark);
      horn.position.set(e * 0.04, 0.93, 0.28);
      horn.rotation.x = -0.5;
      g.add(horn);
    }
  }
  const legs = [];
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * s + 0.006, 0.025 * s + 0.006, 0.42 * s, 6), kind === 'goat' ? coat : coat);
    leg.geometry.translate(0, -0.21 * s, 0);
    leg.position.set(x * 0.1 * s, 0.45 * s, z * 0.2 * s);
    g.add(leg);
    legs.push(leg);
  }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.3 * s, 6), coat);
  tail.position.set(0, 0.62 * s, -0.4 * s);
  tail.rotation.x = kind === 'cat' ? -0.6 : 0.8;
  g.add(tail);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.legs = legs;
  return g;
}

export class JobPlay {
  constructor(game, saved) {
    this.game = game;
    const T = game.plan;
    this.P = jobPlaces(T);
    this.jobs = setJobs(this.P);
    this.progress = new Progress(saved, this.jobs.length);
    this.scene = game.scene;
    this.t = 0;
    this.active = null; // { job, stage, ... }
    this.offer = null; // an everyday job someone is offering
    this.bubbles = []; // { at: () => {x,y,z}, ml, en, until }
    this.snack = 0;
    this.chatTimer = 3;
    this.coins = [];
    this.coinTimer = 0;

    // Her three friends across Pond Lane.
    const P = this.P;
    this.kids = {};
    const homeSpots = {
      atyb: { x: P.friendsGate.x + 0.3, z: P.friendsGate.z - 1.2, heading: Math.PI / 2 },
      aydin: { x: P.friendsYard.x, z: P.friendsYard.z, heading: Math.PI / 2 },
      aiza: { x: P.friendsYard.x + 0.4, z: P.friendsYard.z + 1.4, heading: Math.PI / 2 }
    };
    for (const who of ['atyb', 'aydin', 'aiza']) {
      const c = new Child(who);
      this.scene.add(c.root);
      const h = homeSpots[who];
      this.kids[who] = { who, child: c, x: h.x, z: h.z, y: 0, heading: h.heading, home: h, vx: 0, vz: 0, phase: 0, state: 'idle', target: null, speed: 0 };
    }
    // Atyb's own bicycle, for races.
    this.rivalBike = new Bicycle('#1565c0');
    this.rivalBike.root.visible = false;
    this.scene.add(this.rivalBike.root);
    // Things to find and things that follow.
    this.thing = null; // { kind, mesh, x, z, picked, follow }
    this.markers = [];
    this.target = marker('#ffcf3a', true);
    this.target.visible = false;
    this.scene.add(this.target);
    this.ballFlight = null;
    this.garland = null;
    this.finale = null;
    this.solids = Object.values(this.kids).map(k => ({ kind: 'circle', x: k.x, z: k.z, r: 0.22, top: 1.2, person: true }));
    this.applyOwned();
  }

  get her() { return this.game.her; }

  /** Saves her progress (coins, jobs, things bought, where her bicycle is). */
  save() {
    const b = this.game.bike;
    this.progress.p.bike = { x: b.x, z: b.z, heading: b.heading };
    this.game.saveProgress(this.progress.p);
  }

  /** Shows what she owns: bicycle colour, basket, things she wears, things in her yard, the garland. */
  applyOwned() {
    const p = this.progress;
    this.game.bicycle.setColour(p.p.bikeColour);
    this.game.bicycle.bigBasket(p.owns('basket'));
    this.game.hero.wear(p.p.wearing.filter(w => p.owns(w)));
    this.game.setYard({ pots: p.owns('pots'), swing: p.owns('swing') });
    if (p.p.garland) this.wearGarland();
  }

  // ---------- Talking ----------

  /** A speech bubble over someone (or her): Malayalam with the English meaning, for a few seconds. */
  say(who, line, secs = 4) {
    if (!line) return;
    const at = typeof who === 'function' ? who : () => this.headOf(who);
    this.bubbles = this.bubbles.filter(b => b.key !== who);
    this.bubbles.push({ key: who, at, ml: line[0], en: line[1], until: this.t + secs, her: who === 'inaara' });
    if (this.bubbles.length > 4) this.bubbles.shift();
  }

  headOf(who) {
    if (who === 'inaara') {
      const h = this.her;
      return { x: h.x, y: h.y + (this.game.mode === 'auto' ? 1.75 : this.game.mode === 'bike' ? 1.75 : 1.45), z: h.z };
    }
    if (this.kids[who]) {
      const k = this.kids[who];
      return { x: k.x, y: k.y + 1.25 * k.child.look.scale + 0.25, z: k.z };
    }
    const p = this.game.people.list.find(q => q.id === who) || who;
    if (p && p.x !== undefined) return { x: p.x, y: (p.y || 0) + (p.look ? 1.75 * p.look.scale : 1.8), z: p.z };
    return null;
  }

  posOf(who) {
    if (this.kids[who]) return this.kids[who];
    return this.game.people.list.find(q => q.id === who);
  }

  // ---------- Offers and prompts ----------

  /** Who is offering a job now: the next set job's giver, and maybe an everyday job. */
  offers() {
    if (this.active || this.finale) return [];
    const out = [];
    const next = this.progress.next(this.jobs);
    if (next) out.push(next);
    if (this.progress.p.done.length >= 3) {
      if (!this.offer) this.offer = everydayJob(this.P, this.game.plan, this.progress.p.everyday);
      if (!next || this.offer.giver !== next.giver) out.push(this.offer);
    }
    return out;
  }

  /** Where the giver of a job stands (Aiza is at the market for the "walk her home" job). */
  giverSpot(job) {
    if (job.kind === 'escort') return this.kids.aiza;
    return this.posOf(job.giver);
  }

  /** What she can do here for the jobs: talk to someone, pick something up, hand something over. */
  prompt() {
    const g = this.game, her = this.her, foot = g.mode === 'foot';
    const near = (p, r) => p && Math.hypot(p.x - her.x, p.z - her.z) < r;
    if (this.finale) return null;
    const a = this.active;
    if (a) {
      const j = a.job;
      if (j.kind === 'find' && !a.picked && foot && near(this.thing, 1.8)) return { text: (j.thing === 'ball' ? 'Pick up ' : 'Call ') + THINGS[j.thing], act: () => this.pickUp() };
      if ((j.kind === 'find' && a.picked) && foot && near(this.posOf(j.back), 2.6)) return { text: 'Give back ' + THINGS[j.thing], act: () => this.complete() };
      if (j.kind === 'deliver' && near(j.to, 2.8)) return { text: 'Hand over the parcel', act: () => this.complete() };
      if (j.kind === 'fetch' && !a.picked && foot && near(this.posOf(j.from), 2.8)) return { text: "Ask for the teacher's book", act: () => this.fetchBook() };
      if (j.kind === 'fetch' && a.picked && foot && near(this.posOf(j.back), 2.6)) return { text: 'Give Sarada teacher her book', act: () => this.complete() };
      if (j.kind === 'buy' && a.bought && foot && near(this.kids.aiza, 2.2)) return { text: 'Give Aiza the banana fritter', act: () => this.complete() };
      if (j.kind === 'escort' && !a.following && foot && near(this.kids.aiza, 2.2)) return { text: "Hold Aiza's hand", act: () => this.startEscort() };
      if (j.kind === 'race' && a.stage === 'ready' && near(this.P.races[j.race].start, 7)) {
        return g.mode === 'bike' ? { text: 'Ready, steady... go!', act: () => this.startRace() } : null;
      }
      return null;
    }
    for (const job of this.offers()) {
      const p = this.giverSpot(job);
      if (near(p, job.kind === 'race' ? 4.5 : 2.6)) return { text: 'Talk to ' + (job.kind === 'escort' ? 'Aiza' : GIVER_NAMES[job.giver]), act: () => this.accept(job) };
    }
    return null;
  }

  accept(job) {
    const g = this.game;
    this.active = { job, stage: 'on', picked: false };
    const L = LINES;
    const askLine = {
      ball1: L.aydin.lost, ball2: L.aydin.lost, race1: L.atyb.hi, race2: L.atyb.hi, race3: L.atyb.hi, fritter: L.aiza.treat,
      aizahome: L.aiza.hand, catch: L.aydin.play
    }[job.id] || (L.jobs[job.giver] && (job.id === 'groceries' ? L.jobs.lakshmi.ask : L.jobs[job.giver].ask)) || L.jobs.everyday.ask;
    this.say(job.kind === 'escort' ? 'aiza' : job.giver, job.everyday ? L.jobs.everyday.ask : askLine, 5);
    setTimeout(() => this.say('inaara', job.kind === 'race' ? L.inaara.ok : L.inaara.willDo, 3), 1600);
    g.onJob(job.title);
    if (job.kind === 'deliver') g.hero.carry('parcel');
    if (job.kind === 'find') this.placeThing(job.thing, job.at);
    if (job.kind === 'race') {
      this.active.stage = 'ready';
      if (g.mode !== 'bike') setTimeout(() => this.say('atyb', LINES.atyb.bike, 4), 3200);
      this.moveKid('atyb', this.P.races[job.race].start);
    }
    if (job.kind === 'passenger') this.active.follower = 'mariyamma';
    if (job.kind === 'catch') this.active.caught = 0;
    if (job.kind === 'buy') this.active.bought = false;
    this.save();
  }

  // ---------- The kinds of job ----------

  placeThing(kind, at) {
    if (this.thing) this.scene.remove(this.thing.mesh);
    let mesh;
    if (kind === 'ball') {
      mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), new THREE.MeshStandardMaterial({ color: '#f5f5f5', flatShading: true, roughness: 0.6 }));
      mesh.position.y = 0.11;
      const g = new THREE.Group();
      g.add(mesh);
      mesh = g;
    } else mesh = animal(kind);
    mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
    mesh.position.set(at.x, 0, at.z);
    this.scene.add(mesh);
    this.thing = { kind, mesh, x: at.x, z: at.z, heading: 0, follow: false };
  }

  pickUp() {
    const a = this.active, th = this.thing;
    a.picked = true;
    this.say('inaara', LINES.inaara.found, 3);
    if (th.kind === 'ball') {
      this.scene.remove(th.mesh);
      this.game.hero.carry('ball');
    } else th.follow = true;
  }

  fetchBook() {
    this.active.picked = true;
    this.say('bookstall', LINES.jobs.sarada.stall, 4);
    this.game.hero.carry('parcel');
  }

  startEscort() {
    this.active.following = true;
    this.say('aiza', LINES.aiza.hand, 4);
  }

  startRace() {
    const a = this.active, race = this.P.races[a.job.race];
    a.stage = 'count';
    a.count = 3;
    a.next = 1;
    a.rivalS = 0;
    this.say('atyb', LINES.atyb.go, 4);
    const k = this.kids.atyb;
    k.racing = true;
    k.x = race.pts[0][0] + 1.2;
    k.z = race.pts[0][1];
  }

  /** Called by the shops when she buys something (for Aiza's banana fritter). */
  bought(item) {
    const a = this.active;
    if (a && a.job.kind === 'buy' && (item.id === a.job.item || item.same === a.job.item)) {
      a.bought = true;
      this.game.hero.carry('parcel');
      this.game.onToast('Now give it to Aiza');
    }
  }

  /** Called when an autorickshaw ride arrives (for Mariyamma aunty). */
  rideArrived(place) {
    const a = this.active;
    if (a && a.job.kind === 'passenger' && place && place.name === a.job.place) this.complete();
  }

  /** The places a ride can go: only the market while Mariyamma aunty is along. */
  ridePlaces(list) {
    const a = this.active;
    if (a && a.job.kind === 'passenger') return list.filter(p => p.name === a.job.place);
    return list;
  }

  /** What a ride costs here; Mariyamma aunty pays for hers. */
  rideCost(dist, place) {
    const a = this.active;
    if (a && a.job.kind === 'passenger') return { pay: 0, ok: true, aunty: true };
    return rideCost(this.progress.coins, dist, place.name === 'Home');
  }

  complete() {
    const a = this.active, j = a.job, g = this.game;
    const thanks = {
      ball1: LINES.aydin.thanks, ball2: LINES.aydin.thanks, fritter: LINES.aiza.yum, aizahome: LINES.aiza.home, catch: LINES.aydin.done,
      race1: LINES.atyb.won, race2: LINES.atyb.won, race3: LINES.atyb.won, groceries: LINES.jobs.velu.groceries
    }[j.id] || (LINES.jobs[j.back || j.giver] && LINES.jobs[j.back || j.giver].thanks) || LINES.jobs.everyday.thanks;
    const who = j.kind === 'deliver' && j.id === 'groceries' ? 'velu' : j.kind === 'deliver' ? null : j.kind === 'escort' ? 'aiza' : (j.back || j.giver);
    if (who) this.say(who, thanks, 4);
    if (j.kind === 'deliver' || j.kind === 'fetch' || j.kind === 'buy') this.say('inaara', LINES.inaara.here, 3);
    if (j.kind === 'race') this.say('inaara', LINES.inaara.won, 3);
    g.hero.carry(null);
    if (this.thing) {
      if (this.thing.kind !== 'ball') {
        // The animal goes home with its owner.
        const owner = this.posOf(j.back);
        this.thing.follow = false;
        this.thing.home = owner ? { x: owner.x + 0.8, z: owner.z + 0.6 } : null;
      } else this.thing = null;
    }
    this.progress.finish(j);
    if (j.everyday) this.offer = null;
    g.onCoins(this.progress.coins, j.reward);
    g.onToast(`Well done! +${j.reward} coins` + (j.everyday ? '' : `  ·  ${this.progress.flowers} of 15 jasmine flowers`));
    if (g.audio) g.audio.play('glass', { volume: 0.8, rate: 1.6 });
    this.active = null;
    g.onJob(null);
    if (j.kind === 'race' || j.kind === 'escort' || j.id === 'catch') this.sendKidsHome();
    if (this.progress.allDone && !this.progress.p.garland) setTimeout(() => this.callFinale(), 3500);
    this.save();
  }

  /** Lost the race: Atyb says so, and she can ask again. */
  loseRace() {
    this.say('atyb', LINES.atyb.lost, 5);
    this.say('inaara', LINES.inaara.oops, 3);
    this.active = null;
    this.game.onJob(null);
    this.game.onToast('Atyb won this time. Talk to him to race again!');
    this.sendKidsHome();
  }

  /** She can give up a job (from the pause menu); it'll be offered again. */
  giveUp() {
    if (!this.active) return;
    this.game.hero.carry(null);
    if (this.thing) {
      this.scene.remove(this.thing.mesh);
      this.thing = null;
    }
    this.active = null;
    this.game.onJob(null);
    this.sendKidsHome();
  }

  sendKidsHome() {
    for (const k of Object.values(this.kids)) {
      k.racing = false;
      k.target = { ...k.home };
    }
  }

  moveKid(who, to) {
    this.kids[who].target = { x: to.x, z: to.z };
  }

  // ---------- Every frame ----------

  /** Where the arrow should point: the place to go next for the job (or the next giver). */
  goal() {
    const a = this.active;
    if (this.finale && this.finale.stage === 'call') return this.P.junction;
    if (!a) return null;
    const j = a.job;
    if (j.kind === 'find') return a.picked ? this.posOf(j.back) : this.thing;
    if (j.kind === 'deliver') return j.to;
    if (j.kind === 'fetch') return a.picked ? this.posOf(j.back) : this.posOf(j.from);
    if (j.kind === 'buy') return a.bought ? this.kids.aiza : this.nearestShopFor(j.item);
    if (j.kind === 'escort') return a.following ? this.P.friendsGate : this.kids.aiza;
    if (j.kind === 'passenger') return this.game.mode === 'auto' ? this.P.market : this.nearestAuto();
    if (j.kind === 'race') {
      const race = this.P.races[j.race];
      if (a.stage === 'ready') return race.start;
      const p = race.pts[Math.min(a.next, race.pts.length - 1)];
      return { x: p[0], z: p[1] };
    }
    if (j.kind === 'catch') return this.kids.aydin;
    return null;
  }

  nearestShopFor(item) {
    const shops = ITEMS.filter(i => i.id === item || i.same === item).map(i => i.shop);
    const her = this.her;
    const spots = this.game.shopSpots().filter(s => shops.includes(s.name));
    return spots.sort((a, b) => Math.hypot(a.x - her.x, a.z - her.z) - Math.hypot(b.x - her.x, b.z - her.z))[0];
  }

  nearestAuto() {
    const her = this.her;
    return this.game.traffic.vehicles.filter(v => v.kind === 'auto' && v.mode === 'parked')
      .sort((a, b) => Math.hypot(a.x - her.x, a.z - her.z) - Math.hypot(b.x - her.x, b.z - her.z))[0] || this.game.plan.stand.spots[1];
  }

  update(dt) {
    this.t += dt;
    const g = this.game, her = this.her;
    // A snack makes her a little faster for a while.
    if (this.snack > 0) this.snack -= dt;
    const boost = this.snack > 0 ? SNACK_BOOST : 1;
    g.walker.boost = boost;
    g.bike.boost = boost;

    this.updateKids(dt);
    this.updateThing(dt);
    this.updateJob(dt);
    this.updateMarkers();
    this.updateCoins(dt);
    this.chatter(dt);
    this.updateFinale(dt);
    this.bubbles = this.bubbles.filter(b => b.until > this.t);
    // Atyb and his family are solid (she bumps into them, cars stop for them).
    Object.values(this.kids).forEach((k, i) => Object.assign(this.solids[i], { x: k.x, z: k.z }));
  }

  updateKids(dt) {
    const g = this.game, her = this.her;
    const a = this.active;
    for (const k of Object.values(this.kids)) {
      let want = null, speed = k.who === 'aiza' ? 1.6 : 2.2;
      if (k.racing) continue; // moved by the race
      const escortOffered = !a && (this.progress.next(this.jobs) || {}).kind === 'escort';
      if (k.who === 'aiza' && ((a && a.job.kind === 'escort') || escortOffered)) {
        if (a && a.following) {
          // Walk beside her, holding hands (a little behind and to her side); wait if she rides off.
          const d = Math.hypot(her.x - k.x, her.z - k.z);
          if (g.mode === 'foot' && d > 1.0) want = { x: her.x - Math.sin(g.walker.heading) * 0.6 + Math.cos(g.walker.heading) * 0.5, z: her.z - Math.cos(g.walker.heading) * 0.6 - Math.sin(g.walker.heading) * 0.5 };
          speed = d > 4 ? 2.8 : 2.0;
          if (d > 10 && (!k.waited || this.t - k.waited > 8)) {
            k.waited = this.t;
            this.say('aiza', LINES.aiza.wait, 3);
          }
        } else if (Math.hypot(k.x - this.P.aizaMarket.x, k.z - this.P.aizaMarket.z) > 0.5) {
          // She wandered off to the market: put her there (out of sight).
          if (Math.hypot(her.x - k.x, her.z - k.z) > 25) Object.assign(k, { x: this.P.aizaMarket.x, z: this.P.aizaMarket.z });
        }
      } else if (k.target) {
        want = k.target;
        if (Math.hypot(k.target.x - k.x, k.target.z - k.z) < 0.3) {
          if (k.target.heading !== undefined) k.heading = k.target.heading;
          k.target = null;
          want = null;
        }
      }
      if (want) {
        const dx = want.x - k.x, dz = want.z - k.z, d = Math.hypot(dx, dz);
        if (d > 0.05) {
          const step = Math.min(d, speed * dt);
          const nx = k.x + (dx / d) * step, nz = k.z + (dz / d) * step;
          const saved = g.world.dynamic;
          g.world.dynamic = [];
          [k.x, k.z] = g.world.pushOut(nx, nz, 0.2, 0.36);
          g.world.dynamic = saved;
          k.heading = Math.atan2(dx, dz);
          k.vx = (dx / d) * speed;
          k.vz = (dz / d) * speed;
          k.phase += speed * dt * 2.6;
          k.state = 'walk';
        }
      } else {
        k.vx = k.vz = 0;
        k.state = this.finale && this.finale.stage === 'party' ? 'cheer' : 'idle';
        // Turn to look at her when she's near (not on the title, where they all face you).
        const d = Math.hypot(her.x - k.x, her.z - k.z);
        if (d < 5 && g.screen !== 'title') {
          let dh = Math.atan2(her.x - k.x, her.z - k.z) - k.heading;
          dh = Math.atan2(Math.sin(dh), Math.cos(dh));
          k.heading += dh * Math.min(1, dt * 3);
        }
      }
      k.y = g.world.groundAt(k.x, k.z, k.y + 0.36);
      const w = { x: k.x, y: k.y, z: k.z, heading: k.heading, state: k.state, vx: k.vx, vz: k.vz, phase: k.phase, bumped: 10 };
      k.child.update(dt, w, {});
    }
  }

  updateThing(dt) {
    const th = this.thing;
    if (!th) return;
    const her = this.her;
    let want = null;
    if (th.follow) want = { x: her.x - Math.sin(this.game.walker.heading) * 1.2, z: her.z - Math.cos(this.game.walker.heading) * 1.2 };
    else if (th.home) want = th.home;
    const legs = th.mesh.userData.legs;
    if (want) {
      const dx = want.x - th.x, dz = want.z - th.z, d = Math.hypot(dx, dz);
      if (d > 0.4) {
        const sp = Math.min(d, (d > 4 ? 3.2 : 2.2) * dt);
        th.x += (dx / d) * sp;
        th.z += (dz / d) * sp;
        [th.x, th.z] = this.game.world.pushOut(th.x, th.z, 0.25, 0.36);
        th.heading = Math.atan2(dx, dz);
        if (legs) legs.forEach((l, i) => (l.rotation.x = Math.sin(this.t * 12 + (i % 2) * Math.PI) * 0.5));
      } else if (th.home && !th.follow) {
        // Home with its owner: it can stay a while, then it's gone.
        th.homeTime = (th.homeTime || 0) + dt;
        if (th.homeTime > 30 && Math.hypot(this.her.x - th.x, this.her.z - th.z) > 25) {
          this.scene.remove(th.mesh);
          this.thing = null;
          return;
        }
      }
    }
    th.mesh.position.set(th.x, 0, th.z);
    th.mesh.rotation.y = th.heading;
  }

  updateJob(dt) {
    const a = this.active;
    if (!a) return;
    const g = this.game, her = this.her, j = a.job;
    if (j.kind === 'escort' && a.following && Math.hypot(this.kids.aiza.x - this.P.friendsGate.x, this.kids.aiza.z - this.P.friendsGate.z) < 3) this.complete();
    else if (j.kind === 'passenger') this.updateAunty(dt);
    else if (j.kind === 'race') this.updateRace(dt);
    else if (j.kind === 'catch') this.updateCatch(dt);
  }

  /** Mariyamma aunty walks along with her, and rides beside her in the autorickshaw. */
  updateAunty(dt) {
    const g = this.game, p = this.posOf('mariyamma');
    if (!p) return;
    p.controlled = true;
    if (g.mode === 'auto' && g.ride) {
      const v = g.ride;
      p.x = v.x - v.dx * 0.85 + v.dz * 0.3;
      p.z = v.z - v.dz * 0.85 - v.dx * 0.3;
      p.y = 0.47;
      p.heading = Math.atan2(v.dx, v.dz);
      p.seat = true;
      p.moving = false;
      return;
    }
    p.seat = false;
    p.y = 0;
    const her = this.her, d = Math.hypot(her.x - p.x, her.z - p.z);
    if (d > 1.6) {
      const sp = Math.min(d - 1.4, (d > 5 ? 3.2 : 2.0) * dt);
      p.x += ((her.x - p.x) / d) * sp;
      p.z += ((her.z - p.z) / d) * sp;
      [p.x, p.z] = g.world.pushOut(p.x, p.z, 0.25, 0.36);
      p.heading = Math.atan2(her.x - p.x, her.z - p.z);
      p.moving = true;
      p.phase += dt * 3;
    } else p.moving = false;
  }

  updateRace(dt) {
    const a = this.active, race = this.P.races[a.job.race], g = this.game, k = this.kids.atyb, her = this.her;
    if (a.stage === 'ready') return;
    if (a.stage === 'count') {
      a.count -= dt;
      if (a.count <= 0) {
        a.stage = 'go';
        if (g.audio) g.audio.play('bell', { volume: 0.6 });
      }
    }
    // Atyb rides along the course at his steady speed.
    if (a.stage === 'go') a.rivalS += race.rival * dt;
    const pts = race.pts;
    let s = a.rivalS, i = 0;
    while (i + 1 < pts.length) {
      const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      if (s <= l) break;
      s -= l;
      i++;
    }
    const finished = i + 1 >= pts.length;
    const A = pts[Math.min(i, pts.length - 1)], B = pts[Math.min(i + 1, pts.length - 1)];
    const l = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, t = finished ? 1 : s / l;
    const hx = (B[0] - A[0]) / l, hz = (B[1] - A[1]) / l;
    // Ride on the left of the course, so they don't bump into each other.
    k.x = A[0] + (B[0] - A[0]) * t + hz * 0.9;
    k.z = A[1] + (B[1] - A[1]) * t - hx * 0.9;
    k.heading = Math.atan2(hx, hz);
    const b = this.rivalBike;
    b.root.visible = true;
    b.set(k.x, 0, k.z, k.heading, a.rivalS / 0.25, 0);
    k.child.update(dt, { x: k.x - hx * 0.2, y: 0.21 * 1.15, z: k.z - hz * 0.2, heading: k.heading, state: 'bike', vx: hx * 5, vz: hz * 5, pedal: a.rivalS / 0.25 * 0.6, bumped: 10 }, {});
    // Her checkpoints: each in turn.
    if (a.stage === 'go' && a.next < pts.length) {
      const p = pts[a.next];
      if (Math.hypot(her.x - p[0], her.z - p[1]) < 6) a.next++;
      if (a.next >= pts.length) {
        this.rivalBike.root.visible = false;
        this.complete();
        return;
      }
    }
    if (finished && a.stage === 'go') {
      this.rivalBike.root.visible = false;
      this.loseRace();
    }
  }

  /** Catch with Aydin: he throws, she runs to where it comes down. */
  updateCatch(dt) {
    const a = this.active, k = this.kids.aydin, her = this.her, g = this.game;
    const d = Math.hypot(her.x - k.x, her.z - k.z);
    if (!this.ballFlight) {
      a.wait = (a.wait ?? 2) - dt;
      if (a.wait > 0 || d > 12 || d < 2.5 || g.mode !== 'foot') return;
      // Throw to somewhere near her.
      const ang = Math.random() * Math.PI * 2, off = 0.6 + Math.random() * 1.6;
      let to = { x: her.x + Math.cos(ang) * off, z: her.z + Math.sin(ang) * off };
      if (g.world.blocked(to.x, to.z, 0.3, 0.4)) to = { x: her.x, z: her.z };
      const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 1), new THREE.MeshStandardMaterial({ color: '#f5f5f5', flatShading: true }));
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.ballFlight = { from: { x: k.x, z: k.z }, to, t: 0, dur: 1.4, mesh };
      k.child.carry(null);
      this.say('aydin', LINES.aydin.catch, 1.5);
      return;
    }
    const f = this.ballFlight;
    f.t += dt;
    const u = Math.min(1, f.t / f.dur);
    f.mesh.position.set(f.from.x + (f.to.x - f.from.x) * u, 1.0 + Math.sin(u * Math.PI) * 3.0 - u * 0.4, f.from.z + (f.to.z - f.from.z) * u);
    if (u >= 1) {
      this.scene.remove(f.mesh);
      this.ballFlight = null;
      k.child.carry('ball');
      a.wait = 2.2;
      if (Math.hypot(her.x - f.to.x, her.z - f.to.z) < 1.3) {
        a.caught++;
        this.say('inaara', LINES.inaara.caught, 2);
        g.onToast(`Caught ${a.caught} of ${a.job.catches}`);
        if (a.caught >= a.job.catches) this.complete();
      } else this.say('inaara', LINES.inaara.oops, 2);
    }
  }

  updateMarkers() {
    const offers = this.offers();
    const wanted = offers.map(j => this.giverSpot(j)).filter(Boolean);
    while (this.markers.length < wanted.length) {
      const m = marker();
      this.scene.add(m);
      this.markers.push(m);
    }
    const title = this.game.screen === 'title';
    this.markers.forEach((m, i) => {
      const p = wanted[i];
      m.visible = !!p && !title;
      if (!p) return;
      const h = this.headOf(this.kids[p.who] ? p.who : (p.id || p));
      m.position.set(p.x, (h ? h.y : 1.8) + 0.25 + Math.sin(this.t * 3) * 0.06, p.z);
      m.rotation.y = this.t * 1.5;
    });
    const goal = this.goal();
    this.target.visible = !!goal && !(this.active && ['find'].includes(this.active.job.kind) && !this.active.picked && false);
    if (goal) {
      this.target.position.set(goal.x, 0, goal.z);
      this.target.children.forEach(c => { if (c.geometry.type === 'TorusGeometry') c.scale.setScalar(1 + Math.sin(this.t * 4) * 0.08); });
    }
  }

  // ---------- Coins lying about ----------

  updateCoins(dt) {
    const g = this.game, her = this.her;
    this.coinTimer -= dt;
    if (this.coinTimer <= 0 && this.coins.length < 6) {
      this.coinTimer = 12;
      // Somewhere along the paths people walk, not too near and not too far.
      const routes = g.plan.routes;
      for (let tries = 0; tries < 20; tries++) {
        const r = routes[(Math.random() * routes.length) | 0], i = (Math.random() * (r.pts.length - 1)) | 0, t = Math.random();
        const x = r.pts[i][0] + (r.pts[i + 1][0] - r.pts[i][0]) * t, z = r.pts[i][1] + (r.pts[i + 1][1] - r.pts[i][1]) * t;
        const d = Math.hypot(x - her.x, z - her.z);
        if (d < 15 || d > 70) continue;
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 18), new THREE.MeshStandardMaterial({ color: '#f2c94c', metalness: 0.9, roughness: 0.25, emissive: '#6b4c00', emissiveIntensity: 0.4 }));
        mesh.rotation.x = Math.PI / 2;
        mesh.position.set(x, 0.35, z);
        mesh.castShadow = true;
        this.scene.add(mesh);
        this.coins.push({ x, z, mesh, value: 1 + ((Math.random() * 3) | 0) });
        break;
      }
    }
    for (const c of [...this.coins]) {
      c.mesh.rotation.z += dt * 3;
      c.mesh.position.y = 0.35 + Math.sin(this.t * 3 + c.x) * 0.05;
      const d = Math.hypot(c.x - her.x, c.z - her.z);
      if (d < 1.1 && g.mode !== 'auto') {
        this.scene.remove(c.mesh);
        this.coins.splice(this.coins.indexOf(c), 1);
        this.progress.earn(c.value);
        g.onCoins(this.progress.coins, c.value);
        if (g.audio) g.audio.play('glass', { volume: 0.7, rate: 1.9 });
        if (Math.random() < 0.3) this.say('inaara', LINES.coin, 2);
        this.save();
      } else if (d > 110) {
        this.scene.remove(c.mesh);
        this.coins.splice(this.coins.indexOf(c), 1);
      }
    }
  }

  // ---------- People saying things now and then ----------

  chatter(dt) {
    this.chatTimer -= dt;
    if (this.chatTimer > 0) return;
    this.chatTimer = 2.5;
    const g = this.game, her = this.her;
    if (g.mode === 'auto' && Math.random() < 0.85) return;
    const near = g.people.list.filter(p => Math.hypot(p.x - her.x, p.z - her.z) < 6.5 && !p.controlled && (!p.spoke || this.t - p.spoke > 30));
    if (!near.length || Math.random() > 0.3) return;
    const p = near[(Math.random() * near.length) | 0];
    p.spoke = this.t;
    const kind = p.id === 'velu' ? 'tea' : p.kind === 'seller' || p.id === 'kunjamma' ? 'seller' : p.kind === 'shopkeeper' ? 'shopkeeper' : 'neighbour';
    this.say(p, pick(LINES[kind]), 4);
    if (Math.random() < 0.4) setTimeout(() => this.say('inaara', Math.random() < 0.5 ? LINES.inaara.hi : LINES.inaara.thanks, 2.5), 1500);
    // Her friends call out too, now and then.
    for (const k of Object.values(this.kids)) {
      if (Math.hypot(k.x - her.x, k.z - her.z) < 7 && Math.random() < 0.15 && !this.active) this.say(k.who, LINES[k.who].idle || LINES[k.who].play, 3);
    }
  }

  /** A driver calls out when she's in the way (when they hoot). */
  driverCalls(v) {
    if (Math.random() < 0.6) this.say(() => ({ x: v.x, y: 2.1, z: v.z }), LINES.driver[0], 2.5);
  }

  // ---------- The jasmine garland ----------

  callFinale() {
    this.finale = { stage: 'call' };
    this.game.onToast('Everyone is waiting at Kavala Junction!', 5);
    this.say('inaara', LINES.garland.call, 4);
  }

  updateFinale(dt) {
    const f = this.finale;
    if (!f) return;
    const g = this.game, her = this.her, J = this.P.junction;
    if (f.stage === 'call' && g.mode === 'foot' && Math.hypot(her.x - J.x, her.z - J.z) < 4.5) {
      f.stage = 'party';
      f.t = 0;
      // Her friends and the people she helped gather round her.
      const ring = ['atyb', 'aydin', 'aiza'];
      ring.forEach((w, i) => {
        const a = Math.PI + (i - 1) * 0.6;
        Object.assign(this.kids[w], { x: her.x + Math.sin(a) * 1.8, z: her.z + Math.cos(a) * 1.8, target: null, racing: false });
      });
      const helpers = ['velu', 'kunjamma', 'mariyamma', 'gopalan', 'lakshmi', 'sarada', 'leela'].map(id => this.posOf(id)).filter(Boolean);
      helpers.forEach((p, i) => {
        const a = (i / helpers.length) * Math.PI * 1.4 - 0.2;
        Object.assign(p, { x: her.x + Math.sin(a) * 3.2, z: her.z + Math.cos(a) * 3.2, controlled: true, moving: false, seat: false, y: 0 });
        p.heading = Math.atan2(her.x - p.x, her.z - p.z);
      });
      this.wearGarland();
      this.progress.p.garland = true;
      this.save();
      this.say('atyb', LINES.garland.cheer, 6);
      setTimeout(() => this.say('aiza', LINES.garland.friend, 6), 1800);
      setTimeout(() => this.say('inaara', LINES.inaara.thanks, 4), 3200);
      g.onFinale();
      if (g.audio) g.audio.play('bell', { volume: 0.8 });
    }
    if (f.stage === 'party') {
      f.t += dt;
      if (f.t > 20) {
        this.finale = null;
        for (const id of ['velu', 'kunjamma', 'mariyamma', 'gopalan', 'lakshmi', 'sarada', 'leela']) {
          const p = this.posOf(id);
          if (p) p.controlled = false;
        }
        this.sendKidsHome();
      }
    }
  }

  /** The jasmine garland round her neck: white flowers with a marigold one now and then. */
  wearGarland() {
    if (this.garland) return;
    const g = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: '#fbfbf2', roughness: 0.7 });
    const gold = new THREE.MeshStandardMaterial({ color: '#ff9f1c', roughness: 0.6 });
    const n = 30;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), i % 6 === 0 ? gold : white);
      // A loop round the neck that hangs lower at the front.
      const drop = Math.max(0, Math.cos(a)) * 0.16;
      f.position.set(Math.sin(a) * 0.11, 0.9 - drop, Math.cos(a) * 0.08 + 0.01);
      g.add(f);
    }
    this.game.hero.body.add(g);
    this.garland = g;
  }

  /** Bubbles to show this frame: where on the screen, what they say. */
  bubbleList() {
    return this.bubbles.map(b => ({ ...b, pos: b.at() })).filter(b => b.pos);
  }
}
