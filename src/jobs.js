// The jobs: 15 set jobs, one after another, each from someone in the town (her three friends, the tea shop's Velu,
// Kunjamma at the market, Mariyamma aunty, Gopalan, Lakshmi Stores, Sarada teacher, Leela aunty), then everyday jobs
// that keep coming. Also coins, prices and what's saved. Plain data and sums (tests/jobs.test.mjs checks them all).
import { rng } from './layout.js';

/** The people who give jobs, and where they are in the town. Called by buildTown (layout.js). */
export function placeGivers(T) {
  const take = (pred, id, name) => {
    const p = T.idlers.find(pred);
    if (p) Object.assign(p, { id, name });
    return p;
  };
  take(p => p.kind === 'shopkeeper' && Math.abs(p.x - 35) < 0.1, 'velu', 'Velu');
  const lak = T.shops.find(s => s.name === 'Lakshmi Stores'), book = T.shops.find(s => s.name === 'Book Stall');
  take(p => p.kind === 'shopkeeper' && Math.abs(p.x - (lak.x + 0.8)) < 0.1, 'lakshmi', 'Lakshmi');
  take(p => p.kind === 'shopkeeper' && Math.abs(p.x - (book.x + 0.8)) < 0.1, 'bookstall', 'Book Stall');
  take(p => p.kind === 'seller', 'kunjamma', 'Kunjamma');
  take(p => p.kind === 'waiting' && Math.abs(p.x - 2.2) < 0.1, 'mariyamma', 'Mariyamma aunty');
  T.idlers.push(
    { id: 'gopalan', name: 'Gopalan', kind: 'waiting', x: -20, z: -48.4, y: 0, heading: Math.PI },
    { id: 'sarada', name: 'Sarada teacher', kind: 'waiting', x: -62, z: -48.4, y: 0, heading: Math.PI },
    { id: 'leela', name: 'Leela aunty', kind: 'waiting', x: -27.6, z: 82, y: 0, heading: -Math.PI / 2 }
  );
}

/** Where things happen: worked out from the town plan. */
export function jobPlaces(T) {
  const gateOut = h => {
    // A point just outside a house's gate, on the lane.
    const f = { south: [0, 1], north: [0, -1], east: [1, 0], west: [-1, 0] }[h.facing];
    return { x: h.gate[0] + f[0] * 1.2, z: h.gate[1] + f[1] * 1.2 };
  };
  const giver = id => T.idlers.find(p => p.id === id);
  const fr = T.friends;
  const templeHouse = T.houses.filter(h => h.plot.facing === 'east' && h.plot.x0 === 2.6).sort((a, b) => Math.abs(a.gate[1] + 60) - Math.abs(b.gate[1] + 60))[0];
  const pondHouse = T.houses.filter(h => h.plot.facing === 'west' && h.plot.x0 === -23.4 && !h.home).sort((a, b) => b.gate[1] - a.gate[1])[0];
  const catHouse = T.houses.filter(h => h.plot.facing === 'east' && h.plot.x0 === -44 && !h.friends).sort((a, b) => b.gate[1] - a.gate[1])[0];
  const stall = T.stalls[5];
  const P = {
    friendsGate: gateOut(fr),
    friendsYard: { x: fr.sitX - 1.6, z: fr.sitZ + 2.2 },
    templeHouse: { ...gateOut(templeHouse), name: 'a house on Temple Road' },
    pondHouse: { ...gateOut(pondHouse), name: 'a house on Pond Lane' },
    teaShop: { x: 35, z: -9.6, name: 'the tea shop' },
    // In front of the Book Stall (that row faces north, towards the road).
    bookStall: (() => { const g = giver('bookstall'); return { x: g.x, z: g.z - 1.8, name: 'the Book Stall' }; })(),
    ball1: { x: -6.5, z: 8.6 },
    ball2: { x: stall.x + 2.75, z: stall.z + 2.6 },
    goat: { x: -38, z: -80 },
    cat: { x: catHouse.plot.x1 - 2.2, z: catHouse.gate[1] + 3.2 },
    aizaMarket: { x: -40, z: -8.3 },
    market: T.places.find(p => p.name === 'The Market'),
    junction: { x: 14, z: -5.2 }
  };
  for (const id of ['velu', 'kunjamma', 'mariyamma', 'gopalan', 'lakshmi', 'sarada', 'leela', 'bookstall']) {
    const g = giver(id);
    P[id] = { x: g.x, z: g.z };
  }
  // Atyb's three bicycle races: along lanes and roads, each longer than the last.
  P.races = [
    { start: { x: -26, z: 28 }, pts: [[-26, 28], [-26, 60], [-26, 94]], rival: 3.9 },
    { start: { x: -26, z: 20 }, pts: [[-26, 20], [-26, 5], [-10, 5], [12, 5], [19.8, 2], [19.8, -20], [19.8, -46]], rival: 4.6 },
    { start: { x: 19.8, z: 3 }, pts: [[19.8, 3], [19.8, -30], [19.8, -49], [0, -50], [-30, -50], [-62, -50]], rival: 4.8 }
  ];
  return P;
}

/** The 15 set jobs, in order. Each: who gives it, what kind, where, and how many coins it's worth. */
export function setJobs(P) {
  return [
    { id: 'ball1', giver: 'aydin', kind: 'find', thing: 'ball', at: P.ball1, back: 'aydin', reward: 15, title: "Find Aydin's football (near the bus stop)" },
    { id: 'snacks', giver: 'velu', kind: 'deliver', to: P.templeHouse, reward: 20, title: 'Take the tea shop snacks to a house on Temple Road' },
    { id: 'race1', giver: 'atyb', kind: 'race', race: 0, reward: 25, title: 'Race Atyb down Pond Lane (on your bicycle)' },
    { id: 'fritter', giver: 'aiza', kind: 'buy', item: 'pazhampori', reward: 12, title: 'Buy Aiza a banana fritter (tea shop or bakery)' },
    { id: 'bananas', giver: 'kunjamma', kind: 'deliver', to: P.pondHouse, reward: 20, title: "Take Kunjamma's bananas to a house on Pond Lane" },
    { id: 'aunty', giver: 'mariyamma', kind: 'passenger', place: 'The Market', reward: 25, title: 'Take Mariyamma aunty to the market by autorickshaw' },
    { id: 'aizahome', giver: 'aiza', kind: 'escort', at: P.aizaMarket, to: P.friendsGate, reward: 25, title: 'Aiza wandered to the market: walk her home' },
    { id: 'race2', giver: 'atyb', kind: 'race', race: 1, reward: 30, title: 'Race Atyb to Temple Road (on your bicycle)' },
    { id: 'goat', giver: 'gopalan', kind: 'find', thing: 'goat', at: P.goat, back: 'gopalan', reward: 30, title: "Find Gopalan's goat in the coconut grove" },
    { id: 'groceries', giver: 'lakshmi', kind: 'deliver', to: P.teaShop, reward: 20, title: 'Take the groceries from Lakshmi Stores to the tea shop' },
    { id: 'catch', giver: 'aydin', kind: 'catch', catches: 5, reward: 20, title: 'Play catch with Aydin (catch 5)' },
    { id: 'book', giver: 'sarada', kind: 'fetch', from: 'bookstall', at: P.bookStall, back: 'sarada', reward: 25, title: "Bring Sarada teacher's book from the Book Stall" },
    { id: 'cat', giver: 'leela', kind: 'find', thing: 'cat', at: P.cat, back: 'leela', reward: 30, title: "Find Leela aunty's cat in someone's yard" },
    { id: 'ball2', giver: 'aydin', kind: 'find', thing: 'ball', at: P.ball2, back: 'aydin', reward: 25, title: "Aydin's football again: it's somewhere in the market" },
    { id: 'race3', giver: 'atyb', kind: 'race', race: 2, reward: 40, title: 'The big race: Atyb to School Lane (on your bicycle)' }
  ];
}

/** Everyday jobs, made up as she goes: a delivery from a shop to a house, or a race with Atyb. */
export function everydayJob(P, T, n) {
  const r = rng(1000 + n);
  const houses = T.houses.filter(h => !h.home && !h.friends);
  if (r() < 0.25) return { id: 'day' + n, giver: 'atyb', kind: 'race', race: (r() * 2) | 0, reward: 15, title: 'Another race with Atyb', everyday: true };
  const from = ['velu', 'lakshmi', 'kunjamma'][(r() * 3) | 0];
  const h = houses[(r() * houses.length) | 0];
  const f = { south: [0, 1], north: [0, -1], east: [1, 0], west: [-1, 0] }[h.facing];
  const to = { x: h.gate[0] + f[0] * 1.2, z: h.gate[1] + f[1] * 1.2, name: 'a house' };
  const d = Math.hypot(to.x - P[from].x, to.z - P[from].z);
  return { id: 'day' + n, giver: from, kind: 'deliver', to, reward: Math.round(8 + Math.min(12, d / 15)), title: 'A quick delivery', everyday: true };
}

// ---------- Coins, prices, what's saved ----------

/** Everything that can be bought, in which shop, for how many coins. */
export const ITEMS = [
  { id: 'bike-blue', shop: 'Hardware', name: 'Blue bicycle paint', ml: 'നീല നിറം', price: 30, kind: 'bike', value: '#1e88e5' },
  { id: 'bike-green', shop: 'Hardware', name: 'Green bicycle paint', ml: 'പച്ച നിറം', price: 30, kind: 'bike', value: '#43a047' },
  { id: 'bike-yellow', shop: 'Hardware', name: 'Yellow bicycle paint', ml: 'മഞ്ഞ നിറം', price: 30, kind: 'bike', value: '#fdd835' },
  { id: 'horn', shop: 'Hardware', name: 'A horn that plays a tune', ml: 'പാട്ടുള്ള ഹോൺ', price: 40, kind: 'horn' },
  { id: 'basket', shop: 'Hardware', name: 'A bigger basket', ml: 'വലിയ കൊട്ട', price: 25, kind: 'basket' },
  { id: 'flower', shop: 'Fancy Store', name: 'A jasmine flower clip', ml: 'മുല്ലപ്പൂ ക്ലിപ്പ്', price: 25, kind: 'wear' },
  { id: 'sunglasses', shop: 'Fancy Store', name: 'Sunglasses', ml: 'കൂളിങ് ഗ്ലാസ്', price: 35, kind: 'wear' },
  { id: 'handbag', shop: 'Fancy Store', name: 'A little handbag', ml: 'ചെറിയ ബാഗ്', price: 30, kind: 'wear' },
  { id: 'pazhampori', shop: 'Fresh Bakery', name: 'Banana fritter (pazhampori)', ml: 'പഴംപൊരി', price: 4, kind: 'snack' },
  { id: 'unniyappam', shop: 'Fresh Bakery', name: 'Unniyappam', ml: 'ഉണ്ണിയപ്പം', price: 3, kind: 'snack' },
  { id: 'tea', shop: 'Tea Shop', name: 'A cup of tea', ml: 'ചായ', price: 3, kind: 'snack' },
  { id: 'pazhampori-tea', shop: 'Tea Shop', name: 'Banana fritter (pazhampori)', ml: 'പഴംപൊരി', price: 4, kind: 'snack', same: 'pazhampori' },
  { id: 'pots', shop: 'Lakshmi Stores', name: 'Flower pots for her yard', ml: 'പൂച്ചട്ടികൾ', price: 50, kind: 'yard' },
  { id: 'swing', shop: 'Lakshmi Stores', name: 'A swing for her yard', ml: 'ഊഞ്ഞാൽ', price: 50, kind: 'yard' }
];
export const SNACK_SECONDS = 60; // how long a snack makes her a little faster
export const SNACK_BOOST = 1.25;

/** What an autorickshaw ride costs: 5 coins, more for further, up to 15. */
export function fare(dist) {
  return Math.max(5, Math.min(15, Math.round(5 + dist / 25)));
}

/** Can she pay for a ride there? Home is always possible: the driver takes her for free if she can't pay. */
export function rideCost(coins, dist, toHome) {
  const f = fare(dist);
  if (coins >= f) return { pay: f, ok: true };
  return toHome ? { pay: 0, ok: true, free: true } : { pay: f, ok: false };
}

export const freshProgress = () => ({
  coins: 10, done: [], everyday: 0, owned: [], wearing: [], bikeColour: '#e85d8f', bike: null, garland: false
});

/** Her progress in the game: coins, jobs done, things bought. Kept in the browser (save.js). */
export class Progress {
  constructor(saved, total = 15) {
    this.p = { ...freshProgress(), ...(saved || {}) };
    this.total = total;
  }

  get coins() { return this.p.coins; }

  earn(n) {
    this.p.coins += Math.max(0, Math.round(n));
  }

  /** Spends coins if there are enough; never goes below zero. */
  spend(n) {
    if (n <= 0) return true;
    if (this.p.coins < n) return false;
    this.p.coins -= n;
    return true;
  }

  buy(item) {
    if (item.kind !== 'snack' && this.owns(item.id)) return false;
    if (!this.spend(item.price)) return false;
    if (item.kind !== 'snack') this.p.owned.push(item.id);
    if (item.kind === 'bike') this.p.bikeColour = item.value;
    if (item.kind === 'wear') this.p.wearing.push(item.id);
    return true;
  }

  owns(id) { return this.p.owned.includes(id); }

  /** The next set job (in order), or null when all are done. */
  next(jobs) { return jobs.find(j => !this.p.done.includes(j.id)) || null; }

  finish(job) {
    if (!job.everyday && !this.p.done.includes(job.id)) this.p.done.push(job.id);
    if (job.everyday) this.p.everyday++;
    this.earn(job.reward);
  }

  /** Jasmine flowers on her garland: one for each set job done. */
  get flowers() { return Math.min(this.total, this.p.done.length); }
  get allDone() { return this.p.done.length >= this.total; }
}
