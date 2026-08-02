// ============================================================
// audio.js — 100% synthesized WebAudio: engine, skids, impacts,
// UI, fanfare. No audio files.
// ============================================================

export class AudioBank {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('mm_muted') === '1';
    this.engineNodes = null;
    this.skidGain = null;
  }

  ensure() {
    if (this.ctx) return true;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      this._buildEngine();
      this._buildSkid();
      return true;
    } catch (e) { return false; }
  }

  setMuted(m) {
    this.muted = m;
    localStorage.setItem('mm_muted', m ? '1' : '0');
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
  }
  toggleMuted() { this.setMuted(!this.muted); return this.muted; }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  // ---------- engine (player) ----------
  _buildEngine() {
    const ctx = this.ctx;
    this.engineGain = ctx.createGain(); this.engineGain.gain.value = 0;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 900; filt.Q.value = 2;
    this.engineFilt = filt;

    this.osc1 = ctx.createOscillator(); this.osc1.type = 'sawtooth';
    this.osc2 = ctx.createOscillator(); this.osc2.type = 'square';
    const g2 = ctx.createGain(); g2.gain.value = 0.4;
    this.osc1.frequency.value = 70;
    this.osc2.frequency.value = 35;
    this.osc1.connect(filt);
    this.osc2.connect(g2); g2.connect(filt);
    filt.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.osc1.start(); this.osc2.start();
  }

  setEngine(speedNorm, throttle, boosting) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const base = 62 + speedNorm * 165 + (boosting ? 60 : 0);
    const wob = Math.sin(t * 31) * 3.5 * speedNorm;
    this.osc1.frequency.setTargetAtTime(base + wob, t, 0.03);
    this.osc2.frequency.setTargetAtTime(base / 2 + wob, t, 0.03);
    this.engineFilt.frequency.setTargetAtTime(500 + speedNorm * 1600 + Math.abs(throttle) * 700, t, 0.05);
    const vol = speedNorm > 0.02 || throttle ? 0.055 + speedNorm * 0.05 : 0.0;
    this.engineGain.gain.setTargetAtTime(vol, t, 0.06);
  }

  // ---------- skid ----------
  _buildSkid() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 1.2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.value = 1400; filt.Q.value = 1.4;
    this.skidGain = ctx.createGain(); this.skidGain.gain.value = 0;
    src.connect(filt); filt.connect(this.skidGain); this.skidGain.connect(this.master);
    src.start();
  }
  setSkid(amount) {
    if (!this.ctx) return;
    this.skidGain.gain.setTargetAtTime(Math.min(0.14, amount * 0.16), this.ctx.currentTime, 0.05);
  }

  // ---------- one-shots ----------
  _tone(freq0, freq1, dur, type = 'square', vol = 0.12, when = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq0, t);
    if (freq1 !== freq0) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  _noise(dur, vol = 0.2, freq = 300, q = 1, when = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + when;
    const len = Math.max(1, ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  }

  crash(strength = 1) {
    const v = Math.min(0.5, 0.12 + strength * 0.06);
    this._noise(0.16, v, 500 + strength * 120, 0.8);
    this._tone(140, 60, 0.12, 'triangle', v * 0.8);
  }
  rub() { this._noise(0.07, 0.06, 700, 1); }
  beep(final = false) { this._tone(final ? 880 : 440, final ? 880 : 440, final ? 0.5 : 0.22, 'square', 0.14); }
  checkpoint() { this._tone(660, 990, 0.09, 'sine', 0.1); }
  lap() { [523, 659, 784].forEach((f, i) => this._tone(f, f, 0.12, 'square', 0.1, i * 0.07)); }
  boost() {
    this._noise(0.5, 0.16, 2400, 0.6);
    this._tone(220, 880, 0.4, 'sawtooth', 0.1);
  }
  fall() { this._tone(700, 90, 0.8, 'sine', 0.16); }
  splash() { this._noise(0.5, 0.25, 800, 0.7); this._tone(300, 80, 0.35, 'sine', 0.1, 0.05); }
  respawn() { this._tone(300, 700, 0.18, 'sine', 0.09); }
  position(up) { this._tone(up ? 760 : 330, up ? 990 : 260, 0.14, 'square', 0.09); }
  uiMove() { this._tone(500, 500, 0.05, 'square', 0.06); }
  uiSelect() { this._tone(700, 900, 0.1, 'square', 0.09); }
  fanfare() {
    const notes = [[523, 0], [523, 0.12], [523, 0.24], [659, 0.36], [784, 0.6], [659, 0.78], [784, 0.9]];
    for (const [f, d] of notes) this._tone(f, f, 0.16, 'square', 0.12, d);
    this._tone(262, 262, 0.8, 'triangle', 0.07, 0);
  }
  sadTrombone() {
    [392, 370, 349, 330].forEach((f, i) => this._tone(f, f * 0.96, 0.3, 'sawtooth', 0.07, i * 0.3));
  }
}
