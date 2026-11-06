// The screens over the game: getting ready, the title, the pause menu, settings, how to play, about; and on phones,
// the thumb stick and the buttons. Plain web page parts, drawn crisp at any size.

export const ACCENT = '#ff9f1c'; // marigold, as in INAARA
export const VERSION = '0.3.0';

const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) el.append(k);
  return el;
};

export class UI {
  constructor(root) {
    this.root = root;
    this.screens = {};
    this.handlers = {};
  }

  on(name, fn) {
    this.handlers[name] = fn;
  }

  fire(name, ...a) {
    if (this.handlers[name]) this.handlers[name](...a);
  }

  loading(p) {
    if (!this.screens.loading) {
      this.bar = h('div', { class: 'bar-fill' });
      this.screens.loading = h('div', { class: 'screen loading' },
        h('div', { class: 'logo' }, 'KTOWN'),
        h('div', { class: 'bar' }, this.bar),
        h('div', { class: 'small' }, 'Getting the town ready...'));
      this.root.append(this.screens.loading);
    }
    this.bar.style.width = Math.round(p * 100) + '%';
  }

  failed(message) {
    this.hideAll();
    this.root.append(h('div', { class: 'screen card-screen' }, h('div', { class: 'card' },
      h('h2', {}, 'The town could not open'),
      h('p', {}, message),
      h('p', { class: 'small' }, 'KTOWN needs a browser that can show 3D (WebGL 2), like a recent Chrome, Edge, Firefox or Safari.'),
      h('button', { on: { click: () => location.reload() } }, 'Try again'))));
  }

  hideAll() {
    for (const s of Object.values(this.screens)) s.remove();
    this.screens = {};
  }

  title() {
    this.hideAll();
    this.screens.title = h('div', { class: 'screen title' },
      h('div', { class: 'title-box' },
        h('div', { class: 'logo big' }, 'KTOWN'),
        h('div', { class: 'tag' }, 'Walk, ride and help out in a little Kerala town'),
        h('div', { class: 'buttons' },
          h('button', { class: 'main', on: { click: () => this.fire('play') } }, 'Play'),
          h('button', { on: { click: () => this.help() } }, 'How to play'),
          h('button', { on: { click: () => this.settings() } }, 'Settings'),
          h('button', { on: { click: () => this.about() } }, 'About'))));
    this.root.append(this.screens.title);
  }

  hud(touch) {
    this.hideAll();
    this.touch = touch;
    const pause = h('button', { class: 'pause-btn', 'aria-label': 'Pause', on: { click: () => this.fire('pause') } }, '❚❚');
    this.toastEl = h('div', { class: 'toast' });
    // What she can do here: a prompt (with its key on a computer, a button on a phone).
    this.promptEl = h('button', { class: 'prompt', on: { click: e => { e.stopPropagation(); this.fire('action'); } } });
    this.promptEl.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); this.fire('action'); }, { passive: false });
    this.bellEl = h('button', { class: 'bell-btn', 'aria-label': 'Ring the bell' }, '🔔');
    this.bellEl.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); this.fire('bell'); }, { passive: false });
    this.bellEl.addEventListener('click', e => { e.stopPropagation(); this.fire('bell'); });
    // Coins, the job she's doing, the small map (tap it for the big map).
    this.coinsEl = h('div', { class: 'coins', 'aria-label': 'Coins' }, h('span', { class: 'coin-icon' }), this.coinCount = h('span', {}, '0'));
    this.jobEl = h('div', { class: 'jobline' });
    this.mini = h('canvas', { class: 'minimap', width: '170', height: '170', 'aria-label': 'Map (tap for the big map)' });
    this.mini.addEventListener('click', e => { e.stopPropagation(); this.fire('bigmap'); });
    this.mini.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); this.fire('bigmap'); }, { passive: false });
    this.bubbleLayer = h('div', { class: 'bubbles' });
    const kids = [this.bubbleLayer, pause, this.toastEl, this.promptEl, this.bellEl, this.coinsEl, this.jobEl, this.mini];
    this.prompt(null);
    this.riding(false);
    if (touch) {
      this.stickBase = h('div', { class: 'stick-base' }, this.stickKnob = h('div', { class: 'stick-knob' }));
      const jump = h('button', { class: 'jump-btn', 'aria-label': 'Jump' }, 'Jump');
      jump.addEventListener('touchstart', e => {
        e.preventDefault();
        e.stopPropagation();
        this.fire('jump');
      }, { passive: false });
      kids.push(this.stickBase, jump);
    }
    this.screens.hud = h('div', { class: 'hud' }, ...kids);
    this.root.append(this.screens.hud);
  }

  /** Shows where the thumb stick is (phones). */
  stick(s) {
    if (!this.stickBase) return;
    if (!s) {
      this.stickBase.style.opacity = '0.35';
      this.stickBase.style.left = '';
      this.stickBase.style.top = '';
      this.stickKnob.style.transform = '';
      return;
    }
    const R = Math.min(70, innerWidth * 0.09);
    this.stickBase.style.opacity = '0.8';
    this.stickBase.style.left = s.x0 + 'px';
    this.stickBase.style.top = s.y0 + 'px';
    const dx = Math.max(-R, Math.min(R, s.x - s.x0)), dy = Math.max(-R, Math.min(R, s.y - s.y0));
    this.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  coins(n, delta = 0) {
    if (!this.coinCount) return;
    this.coinCount.textContent = String(n);
    if (delta) {
      this.coinsEl.classList.remove('bump');
      void this.coinsEl.offsetWidth;
      this.coinsEl.classList.add('bump');
    }
  }

  job(text) {
    if (!this.jobEl) return;
    this.jobEl.textContent = text || '';
    this.jobEl.style.display = text ? '' : 'none';
  }

  /** Speech bubbles: Malayalam, with the meaning in English underneath, over whoever is talking. */
  bubbles(list, project) {
    if (!this.bubbleLayer) return;
    this.bubbleEls = this.bubbleEls || [];
    while (this.bubbleEls.length < list.length) {
      const el = h('div', { class: 'bubble' }, h('div', { class: 'ml', lang: 'ml' }), h('div', { class: 'en' }));
      this.bubbleLayer.append(el);
      this.bubbleEls.push(el);
    }
    // Bubbles that would cover each other are moved up, so both can be read.
    const placed = [];
    this.bubbleEls.forEach((el, i) => {
      const b = list[i];
      const p = b && project(b.pos);
      if (!p) {
        el.style.display = 'none';
        return;
      }
      el.style.display = '';
      const w = el.offsetWidth || 160, ht = el.offsetHeight || 50;
      for (let k = 0; k < 4; k++) {
        const hit = placed.find(q => Math.abs(q.x - p.x) < (q.w + w) / 2 + 4 && Math.abs(q.y - p.y) < (q.h + ht) / 2 + 4);
        if (!hit) break;
        p.y = hit.y - (hit.h + ht) / 2 - 6;
      }
      placed.push({ x: p.x, y: p.y, w, h: ht });
      el.classList.toggle('hers', !!b.her);
      if (el.firstChild.textContent !== b.ml) {
        el.firstChild.textContent = b.ml;
        el.lastChild.textContent = b.en;
      }
      el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`;
    });
  }

  /** A shop's list: things to buy (or put on, if she has them already). */
  shop(shop, items, game, done) {
    const pr = () => game.jobs.progress;
    let close;
    const list = h('div', { class: 'buttons shoplist' });
    const draw = () => {
      list.replaceChildren(...items.map(it => {
        const owned = it.kind !== 'snack' && pr().owns(it.id);
        const wearing = it.kind === 'wear' && pr().p.wearing.includes(it.id);
        const chosen = it.kind === 'bike' && pr().p.bikeColour === it.value;
        const label = owned
          ? (it.kind === 'wear' ? (wearing ? 'Take off' : 'Put on') : it.kind === 'bike' ? (chosen ? 'Chosen' : 'Choose') : 'Yours')
          : `${it.price} coins`;
        const b = h('button', {
          class: 'item' + (owned ? ' owned' : '') + (!owned && pr().coins < it.price ? ' short' : ''),
          on: { click: () => {
            if (owned) game.choose(it);
            else {
              const r = game.buy(it);
              if (r === 'short') this.toast('Not enough coins yet: jobs and coins on the ground give more');
            }
            draw();
          } }
        }, h('span', { class: 'iname' }, h('span', { lang: 'ml', class: 'iml' }, it.ml), ' ', it.name), h('span', { class: 'iprice' }, label));
        return b;
      }));
    };
    draw();
    close = this.card('shop', shop.name === 'Tea Shop' ? 'The tea shop' : shop.name,
      h('p', { class: 'small' }, ''),
      list);
    const coinsLine = this.screens.shop.querySelector('p.small');
    coinsLine.textContent = 'Your coins: ' + pr().coins;
    const obs = setInterval(() => { if (!this.screens.shop) { clearInterval(obs); done(); } else coinsLine.textContent = 'Your coins: ' + pr().coins; }, 300);
    return close;
  }

  /** The big map of the whole town; a tap sets a pin (or, when choosing a ride, picks where to go). */
  bigMap(map, game, { pick = false } = {}, done = () => {}) {
    const c = h('canvas', { class: 'bigmap' });
    const el = h('div', { class: 'screen mapscreen' },
      c,
      h('div', { class: 'maptext' }, pick ? 'Tap where the autorickshaw should take you' : 'Tap the map to set a pin to head for'),
      h('div', { class: 'mapbuttons' },
        !pick && map.pin ? h('button', { on: { click: () => { map.pin = null; close(null); } } }, 'Take the pin away') : null,
        h('button', { class: 'main', on: { click: () => close(null) } }, 'Back')));
    const close = v => {
      el.remove();
      delete this.screens.map;
      done(v);
    };
    this.screens.map = el;
    this.root.append(el);
    const draw = () => {
      c.width = Math.round(innerWidth * Math.min(2, devicePixelRatio || 1));
      c.height = Math.round(innerHeight * Math.min(2, devicePixelRatio || 1));
      map.drawBig(c, game);
    };
    draw();
    c.addEventListener('click', e => {
      const r = c.getBoundingClientRect();
      const p = map.fromBig((e.clientX - r.left) * (c.width / r.width), (e.clientY - r.top) * (c.height / r.height));
      if (Math.abs(p.x) > 125 || Math.abs(p.z) > 125) return;
      if (pick) close(p);
      else {
        map.pin = p;
        draw();
        setTimeout(() => close(p), 350);
      }
    });
    return close;
  }

  /** The end of the jobs: the town gives her the jasmine garland. */
  finale() {
    const flowers = h('div', { class: 'garland big' }, ...Array.from({ length: 15 }, () => h('span', { class: 'f on' })));
    this.card('finale', 'Friend of KTOWN!',
      flowers,
      h('p', {}, 'Inaara helped everyone in the town: all 15 jobs done. Atyb, Aydin, Aiza and all the people she helped gave her the jasmine garland!'),
      h('p', { class: 'small' }, 'She can keep playing: everyday jobs keep coming, and there are coins to find and things to buy.'));
  }

  prompt(p) {
    if (!this.promptEl) return;
    this.promptEl.style.display = p ? '' : 'none';
    this.promptEl.replaceChildren(...(p ? [this.touch ? '' : h('span', { class: 'key' }, 'E'), p.text] : []));
  }

  /** On the bicycle there's a bell to ring (B on a keyboard). */
  riding(on) {
    if (this.bellEl) this.bellEl.style.display = on && this.touch ? '' : 'none';
  }

  /** The list of places an autorickshaw can take her. `done(place)`; null if she changes her mind. */
  places(list, done) {
    let finished = false;
    const finish = place => {
      if (finished) return;
      finished = true;
      el.remove();
      delete this.screens.places;
      done(place);
    };
    const el = h('div', { class: 'screen card-screen' }, h('div', { class: 'card' },
      h('h2', {}, 'Where to?'),
      h('p', { class: 'small' }, 'The driver will take you there. You can get off on the way too.'),
      h('div', { class: 'buttons places' }, ...list.map(p => {
        const c = p.cost || { ok: true, pay: 0 };
        const label = c.aunty ? 'aunty pays' : c.free ? 'free' : `${c.pay} coins`;
        return h('button', { class: c.ok ? '' : 'short', on: { click: () => finish(p) } }, h('span', {}, p.name), h('span', { class: 'iprice' }, label));
      }),
      this.pickOnMap ? h('button', { on: { click: () => { const m = this.pickOnMap; finished = true; el.remove(); delete this.screens.places; m(done); } } }, 'Somewhere on the map...') : null),
      h('button', { class: 'main', on: { click: () => finish(null) } }, 'Not now')));
    this.screens.places = el;
    this.root.append(el);
    const first = el.querySelector('.places button');
    if (first) first.focus();
    return () => finish(null);
  }

  toast(text, secs = 2.6) {
    if (!this.toastEl) return;
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl && this.toastEl.classList.remove('show'), secs * 1000);
  }

  card(name, title, ...body) {
    if (this.screens[name]) this.screens[name].remove();
    // The pause menu (or title) underneath is hidden while this card is open.
    const under = [this.screens.paused, this.screens.title].filter(Boolean);
    for (const u of under) u.style.visibility = 'hidden';
    const close = () => {
      el.remove();
      delete this.screens[name];
      for (const u of under) u.style.visibility = '';
      this.fire('closed', name);
    };
    const el = h('div', { class: 'screen card-screen', on: { click: e => { if (e.target === el) close(); } } },
      h('div', { class: 'card' }, h('h2', {}, title), ...body, h('button', { class: 'main', on: { click: close } }, 'Back')));
    this.screens[name] = el;
    this.root.append(el);
    return close;
  }

  paused(info = {}) {
    if (this.screens.paused) return;
    const n = info.flowers || 0;
    this.screens.paused = h('div', { class: 'screen card-screen' }, h('div', { class: 'card' },
      h('h2', {}, 'Paused'),
      h('div', { class: 'garland' }, ...Array.from({ length: 15 }, (_, i) => h('span', { class: 'f' + (i < n ? ' on' : '') }))),
      h('p', { class: 'small' }, n >= 15 ? 'Jasmine garland complete: Friend of KTOWN!' : `Jasmine garland: ${n} of 15 flowers. Each job adds one.`),
      info.job ? h('p', { class: 'small' }, 'Now: ' + info.job) : null,
      h('div', { class: 'buttons' },
        h('button', { class: 'main', on: { click: () => this.fire('resume') } }, 'Carry on'),
        h('button', { on: { click: () => this.fire('bigmap') } }, 'Map'),
        info.job ? h('button', { on: { click: () => { this.fire('giveup'); this.unpause(); this.fire('resume'); } } }, 'Leave this job for now') : null,
        h('button', { on: { click: () => this.help() } }, 'How to play'),
        h('button', { on: { click: () => this.settings() } }, 'Settings'),
        h('button', { on: { click: () => this.about() } }, 'About'),
        h('button', { on: { click: () => this.fire('title') } }, 'Back to the start'))));
    this.root.append(this.screens.paused);
  }

  unpause() {
    if (this.screens.paused) this.screens.paused.remove();
    delete this.screens.paused;
  }

  help() {
    this.card('help', 'How to play',
      h('div', { class: 'cols' },
        h('div', {}, h('h3', {}, 'Keyboard and mouse'),
          h('ul', {},
            h('li', {}, h('b', {}, 'W A S D'), ' or the arrow keys: walk'),
            h('li', {}, 'Hold ', h('b', {}, 'Shift'), ': run'),
            h('li', {}, h('b', {}, 'Space'), ': jump'),
            h('li', {}, h('b', {}, 'E'), ': get on or off your bicycle, take an autorickshaw (when it says so)'),
            h('li', {}, h('b', {}, 'B'), ': ring the bicycle bell'),
            h('li', {}, h('b', {}, 'M'), ': the big map (tap it to set a pin)'),
            h('li', {}, 'Click, then move the ', h('b', {}, 'mouse'), ': look around (Esc gives the mouse back)'),
            h('li', {}, h('b', {}, 'Mouse wheel'), ': camera nearer or further'),
            h('li', {}, h('b', {}, 'P'), ': pause'))),
        h('div', {}, h('h3', {}, 'Phone or tablet'),
          h('ul', {},
            h('li', {}, 'Left thumb on the left side: walk. Push it all the way to run.'),
            h('li', {}, 'Drag on the right side: look around.'),
            h('li', {}, h('b', {}, 'Jump'), ' button: jump.'),
            h('li', {}, 'The button at the bottom does what it says: get on your bicycle, take an autorickshaw...'),
            h('li', {}, '🔔 rings the bicycle bell.')),
          h('h3', {}, 'Game controller'),
          h('ul', {}, h('li', {}, 'Left stick to walk, right stick to look, A to jump, right trigger to run, Y for the prompt, X for the bell.')))),
      h('h3', {}, 'Jobs and coins'),
      h('p', { class: 'small' }, 'People with a gold marker over their head have a job for you: walk up and talk to them. Each job adds a jasmine flower to your garland (15 in all) and gives coins. Coins also lie about on the paths. Spend them in the shops (bicycle paint, a horn, things to wear, snacks that make you faster, things for your yard) and on autorickshaw rides; a ride home is always free if you can\'t pay.'),
      h('p', { class: 'small' }, 'Your bicycle waits in the porch of your home on Pond Lane: ride it anywhere, and leave it where you like (a marker shows where). Autorickshaws wait at the stand past the shops, or wave one down on the road: pick a place and the driver takes you there.'));
  }

  settings(save, apply) {
    save = save || this.save;
    apply = apply || this.apply;
    const s = save.settings;
    const choice = (label, key, options) => h('div', { class: 'setting' }, h('span', {}, label),
      h('div', { class: 'choices' }, ...options.map(([v, text]) => h('button', {
        class: s[key] === v ? 'chosen' : '',
        on: { click: e => { s[key] = v; [...e.target.parentNode.children].forEach(b => b.classList.toggle('chosen', b === e.target)); apply(key); } }
      }, text))));
    const slider = h('input', { type: 'range', min: '0.4', max: '2', step: '0.1', value: String(s.camSpeed), 'aria-label': 'Camera speed' });
    slider.addEventListener('input', () => { s.camSpeed = Number(slider.value); apply('camSpeed'); });
    const kids = [
      choice('Time of day', 'time', [['day', 'Day'], ['evening', 'Evening']]),
      choice('Picture', 'quality', [['auto', 'Automatic'], ['high', 'Best'], ['low', 'Faster']]),
      h('div', { class: 'setting' }, h('span', {}, 'Camera speed'), slider),
      choice('Camera up and down', 'invertY', [[false, 'Normal'], [true, 'Upside down']]),
      choice('Sound', 'sound', [[true, 'On'], [false, 'Off']])
    ];
    const vol = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(s.volume ?? 0.8), 'aria-label': 'Loudness' });
    vol.addEventListener('input', () => { s.volume = Number(vol.value); apply('volume'); });
    kids.push(h('div', { class: 'setting' }, h('span', {}, 'Loudness'), vol));
    if (this.fullscreen && this.fullscreen.available) kids.push(h('div', { class: 'setting' }, h('span', {}, 'Full screen'),
      h('div', { class: 'choices' }, h('button', { on: { click: () => this.fullscreen.toggle() } }, 'On / off'))));
    kids.push(h('p', { class: 'small' }, 'A change of picture setting takes effect the next time the game opens.'));
    this.card('settings', 'Settings', ...kids);
  }

  about() {
    const heart = h('span', { class: 'heart' }, '♥');
    this.card('about', 'About KTOWN',
      h('p', {}, 'Walk around a little Kerala town with Inaara. Version ' + VERSION + '.'),
      h('p', { class: 'credit' }, 'Made by Azeem, with Claude and ', heart),
      h('p', {}, 'Free and open source (MIT licence): ', h('a', { href: 'https://github.com/azeembukhariprivate/ktown', target: '_blank', rel: 'noopener' }, 'github.com/azeembukhariprivate/ktown')),
      h('p', { class: 'small' }, 'Inaara, Atyb, Aydin and Aiza, the townspeople and their faces are all made up and drawn by the game. The ground, walls, roofs, skies and things in the town are free (CC0) from Poly Haven (polyhaven.com), by the artists listed in THIRD-PARTY-NOTICES.txt. 3D drawing by three.js (MIT). Letters in the Fredoka font (SIL Open Font License).'),
      h('p', { class: 'small' }, 'Nothing about you leaves this device: there are no adverts and nothing is tracked.'));
  }
}
