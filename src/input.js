// ============================================================
// input.js — keyboard state + menu key events.
// ============================================================

export class Input {
  constructor() {
    this.keys = new Set();
    this.handlers = new Map();   // key -> [fn]
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) {
        this.keys.add(e.key.toLowerCase());
        const fns = this.handlers.get(e.key.toLowerCase());
        if (fns) for (const fn of fns) fn(e);
        const anyFns = this.handlers.get('*');
        if (anyFns) for (const fn of anyFns) fn(e);
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  on(key, fn) {
    if (!this.handlers.has(key)) this.handlers.set(key, []);
    this.handlers.get(key).push(fn);
  }

  get state() {
    const k = this.keys;
    const up = k.has('arrowup') || k.has('w');
    const down = k.has('arrowdown') || k.has('s');
    const left = k.has('arrowleft') || k.has('a');
    const right = k.has('arrowright') || k.has('d');
    return {
      throttle: (up ? 1 : 0) - (down ? 1 : 0),
      steer: (left ? -1 : 0) + (right ? 1 : 0),
      handbrake: k.has(' '),
    };
  }
}
