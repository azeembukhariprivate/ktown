// The map of the town: drawn once from the town plan (roads, lanes, yards, houses, shops, the market), then shown
// as a small round map in a corner that turns with the camera, and as a big map of the whole town (M, or a tap on
// the small map), where a tap sets a pin to head for.

const SIZE = 1024, SPAN = 260; // the picture covers 260 m each way
const PX = SIZE / SPAN;
const toPx = v => (v + SPAN / 2) * PX;

const GROUND = { sand: '#d9c9a3', stone: '#7b7f83', paving: '#c8c3ba', laterite: '#b0583a', yardpath: '#c98b6e', road: '#4a4a4f' };

/** Draws the town once, from above. */
export function drawTownMap(T) {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const g = c.getContext('2d');
  g.fillStyle = '#7fa35a';
  g.fillRect(0, 0, SIZE, SIZE);
  // Palms as darker dots, so the groves show.
  g.fillStyle = 'rgba(40,90,35,0.55)';
  for (const p of T.palms) {
    g.beginPath();
    g.arc(toPx(p.x), toPx(p.z), 4, 0, Math.PI * 2);
    g.fill();
  }
  for (const k of ['sand', 'stone', 'paving', 'laterite', 'yardpath', 'road']) {
    g.fillStyle = GROUND[k];
    for (const r of T.ground.filter(q => q.type === k)) g.fillRect(toPx(r.x0), toPx(r.z0), (r.x1 - r.x0) * PX, (r.z1 - r.z0) * PX);
  }
  // Buildings: houses cream, her home white, shops and the tea shop warm orange, stalls blue.
  for (const s of T.solids) {
    if (s.kind !== 'box' || s.top < 2) continue;
    const what = s.what || '';
    g.fillStyle = what === 'house' ? '#efe3c8' : what.includes('shop') ? '#f2a65a' : what.includes('bus') ? '#9fc3e6' : '#d8d0c0';
    if (what === 'compound wall') continue;
    g.fillRect(toPx(s.x - s.hw), toPx(s.z - s.hd), s.hw * 2 * PX, s.hd * 2 * PX);
  }
  if (T.home) {
    const h = T.home;
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#ff9f1c';
    g.lineWidth = 4;
    const w = (h.facing === 'east' || h.facing === 'west') ? h.d : h.w, d = (h.facing === 'east' || h.facing === 'west') ? h.w : h.d;
    g.fillRect(toPx(h.x - w / 2), toPx(h.z - d / 2), w * PX, d * PX);
    g.strokeRect(toPx(h.x - w / 2), toPx(h.z - d / 2), w * PX, d * PX);
  }
  for (const st of T.stalls) {
    g.fillStyle = '#4f86c6';
    g.fillRect(toPx(st.x - 2.5), toPx(st.z - 1.5), 5 * PX, 3 * PX);
  }
  return c;
}

const LABELS = [
  ['Kavala Junction', 62, -6], ['The Market', -54, -20], ['Temple Road', 36, -70], ['Pond Lane', -12, 70], ['School Lane', -40, -58],
  ['Autorickshaws', 76, 15], ['Tea shop', 35, -17], ['Bus stop', 0, 13]
];

export class TownMap {
  constructor(T) {
    this.T = T;
    this.picture = drawTownMap(T);
    this.pin = null;
  }

  /** Icons to show: her, her bicycle, where to go for the job, who has a job, the pin. */
  icons(game) {
    const her = game.her, jobs = game.jobs;
    const out = [{ kind: 'her', x: her.x, z: her.z, heading: her.heading }];
    if (game.mode !== 'bike') out.push({ kind: 'bike', x: game.bike.x, z: game.bike.z });
    const goal = jobs.goal();
    if (goal) out.push({ kind: 'goal', x: goal.x, z: goal.z });
    for (const j of jobs.offers()) {
      const p = jobs.giverSpot(j);
      if (p) out.push({ kind: 'giver', x: p.x, z: p.z });
    }
    if (this.pin) out.push({ kind: 'pin', x: this.pin.x, z: this.pin.z });
    return out;
  }

  /** Draws the small round map: centred on her, turned so the camera's forward is up. */
  drawMini(canvas, game) {
    const g = canvas.getContext('2d'), W = canvas.width, R = W / 2, her = game.her;
    const scale = (W / 95) / PX; // about 95 m across
    g.save();
    g.clearRect(0, 0, W, W);
    g.beginPath();
    g.arc(R, R, R - 2, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#7fa35a';
    g.fillRect(0, 0, W, W);
    g.translate(R, R);
    // Forward (away from the camera) is up: turn the map by the camera's angle.
    const up = game.yaw;
    g.rotate(up);
    g.scale(scale, scale);
    g.drawImage(this.picture, -toPx(her.x), -toPx(her.z));
    g.setTransform(1, 0, 0, 1, 0, 0);
    for (const ic of this.icons(game)) {
      const dx = ic.x - her.x, dz = ic.z - her.z, c = Math.cos(up), s = Math.sin(up);
      let x = (dx * c - dz * s) * scale * PX, y = (dx * s + dz * c) * scale * PX;
      const d = Math.hypot(x, y), max = R - 10;
      if (d > max) {
        // Off the map: shown at its edge, so you know which way.
        if (ic.kind === 'bike' || ic.kind === 'giver') continue;
        x = (x / d) * max;
        y = (y / d) * max;
      }
      this.icon(g, ic, R + x, R + y, ic.kind === 'her' ? ic.heading - up : 0);
    }
    g.restore();
    g.strokeStyle = 'rgba(255,207,94,0.9)';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(R, R, R - 2, 0, Math.PI * 2);
    g.stroke();
  }

  /** Draws the whole town into a canvas of any size (the big map). */
  drawBig(canvas, game) {
    const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    const s = Math.min(W, H) / SIZE * 1.0;
    this.bigScale = s;
    this.bigOrigin = { x: (W - SIZE * s) / 2, y: (H - SIZE * s) / 2 };
    g.fillStyle = '#5f7f45';
    g.fillRect(0, 0, W, H);
    g.drawImage(this.picture, this.bigOrigin.x, this.bigOrigin.y, SIZE * s, SIZE * s);
    g.font = `600 ${Math.max(13, 30 * s)}px Fredoka, sans-serif`;
    g.textAlign = 'center';
    for (const [name, x, z] of LABELS) {
      const [px, py] = this.toBig(x, z);
      g.lineWidth = 4;
      g.strokeStyle = 'rgba(20,12,6,0.8)';
      g.strokeText(name, px, py);
      g.fillStyle = '#fff6e6';
      g.fillText(name, px, py);
    }
    const [hx, hy] = this.toBig(this.T.home.x, this.T.home.z);
    g.fillStyle = '#ffcf5e';
    g.strokeText('Home', hx, hy - 14);
    g.fillText('Home', hx, hy - 14);
    for (const ic of this.icons(game)) {
      const [px, py] = this.toBig(ic.x, ic.z);
      this.icon(g, ic, px, py, ic.kind === 'her' ? ic.heading : 0, 1.4);
    }
  }

  toBig(x, z) {
    return [this.bigOrigin.x + toPx(x) * this.bigScale, this.bigOrigin.y + toPx(z) * this.bigScale];
  }

  fromBig(px, py) {
    return { x: (px - this.bigOrigin.x) / this.bigScale / PX - SPAN / 2, z: (py - this.bigOrigin.y) / this.bigScale / PX - SPAN / 2 };
  }

  icon(g, ic, x, y, rot, k = 1) {
    g.save();
    g.translate(x, y);
    if (ic.kind === 'her') {
      // An arrow pointing the way she faces (screen up is -z).
      g.rotate(Math.PI - rot);
      g.fillStyle = '#ff9f1c';
      g.strokeStyle = '#2a1505';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, -9 * k);
      g.lineTo(6 * k, 7 * k);
      g.lineTo(0, 3 * k);
      g.lineTo(-6 * k, 7 * k);
      g.closePath();
      g.fill();
      g.stroke();
    } else {
      const colour = { bike: '#e85d8f', goal: '#ffd23a', giver: '#ffcf3a', pin: '#3fa9f5' }[ic.kind];
      g.fillStyle = colour;
      g.strokeStyle = '#2a1505';
      g.lineWidth = 2;
      g.beginPath();
      if (ic.kind === 'goal') {
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = (i % 2 ? 4 : 9) * k;
          g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        g.closePath();
      } else g.arc(0, 0, (ic.kind === 'giver' ? 5 : 6) * k, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      if (ic.kind === 'giver') {
        g.fillStyle = '#2a1505';
        g.font = `700 ${9 * k}px sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('!', 0, 0.5);
      }
    }
    g.restore();
  }
}
