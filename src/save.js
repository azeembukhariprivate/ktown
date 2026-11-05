// Settings, kept in the browser on this device.

const KEY = 'ktown-save-v1';

const fresh = () => ({ settings: { time: 'day', quality: 'auto', camSpeed: 1, invertY: false, sound: true, volume: 0.8 }, seenHelp: false });

export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') return { ...fresh(), ...s, settings: { ...fresh().settings, ...(s.settings || {}) } };
  } catch {
    // Storage switched off or damaged: start fresh.
  }
  return fresh();
}

export function store(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Private browsing: settings just aren't kept.
  }
}
