// The screens over the game: getting ready, the title, the pause menu, settings, how to play, about; and on phones,
// the thumb stick and the buttons. Plain web page parts, drawn crisp at any size.

export const ACCENT = '#ff9f1c'; // marigold, as in INAARA
export const VERSION = '0.2.0';

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
        h('img', { class: 'portrait', src: 'assets/faces/portrait.png', alt: '' }),
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
        h('div', { class: 'tag' }, 'Walk around a little Kerala town with Inaara'),
        h('div', { class: 'buttons' },
          h('button', { class: 'main', on: { click: () => this.fire('play') } }, 'Play'),
          h('button', { on: { click: () => this.help() } }, 'How to play'),
          h('button', { on: { click: () => this.settings() } }, 'Settings'),
          h('button', { on: { click: () => this.about() } }, 'About'))),
      h('img', { class: 'title-portrait', src: 'assets/faces/portrait.png', alt: 'Inaara' }));
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
    const kids = [pause, this.toastEl, this.promptEl, this.bellEl];
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
      h('div', { class: 'buttons places' }, ...list.map(p => h('button', { on: { click: () => finish(p) } }, p.name))),
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

  paused() {
    if (this.screens.paused) return;
    this.screens.paused = h('div', { class: 'screen card-screen' }, h('div', { class: 'card' },
      h('h2', {}, 'Paused'),
      h('div', { class: 'buttons' },
        h('button', { class: 'main', on: { click: () => this.fire('resume') } }, 'Carry on'),
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
      h('p', { class: 'small' }, 'Your bicycle waits in your yard on Pond Lane: ride it anywhere, and leave it where you like (a marker shows where). Autorickshaws wait at the stand past the shops, or wave one down on the road: pick a place and the driver takes you there. Jobs to do in the town come next.'));
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
      h('p', { class: 'small' }, 'Inaara\'s face is from her own picture sheet. The ground, walls, roofs, skies and things in the town are free (CC0) from Poly Haven (polyhaven.com), by the artists listed in THIRD-PARTY-NOTICES.txt. 3D drawing by three.js (MIT). Letters in the Fredoka font (SIL Open Font License).'),
      h('p', { class: 'small' }, 'Nothing about you leaves this device: there are no adverts and nothing is tracked.'));
  }
}
