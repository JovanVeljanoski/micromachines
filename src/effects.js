// ============================================================
// effects.js — particles, skid marks, screen shake, confetti.
// ============================================================
import * as THREE from 'three';

// ---------------- Particles ----------------
export class Particles {
  constructor(scene, max = 700) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.head = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, sizeAttenuation: true });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    for (let i = 0; i < max; i++) { this.pos[i * 3 + 1] = -999; }
  }

  spawn(x, y, z, vx, vy, vz, life, r, g, b, grav = 4) {
    const i = this.head; this.head = (this.head + 1) % this.max;
    this.pos.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.col.set([r, g, b], i * 3);
    this.life[i] = this.maxLife[i] = life;
    this.grav[i] = grav;
  }

  burst(x, y, z, n, opts) {
    const { speed = 2.4, up = 2.2, life = 0.6, color = [1, 0.8, 0.3], color2, grav = 5 } = opts;
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.9);
      const c = color2 && Math.random() < 0.5 ? color2 : color;
      this.spawn(x, y, z, Math.cos(a) * s, up * (0.4 + Math.random()), Math.sin(a) * s,
        life * (0.6 + Math.random() * 0.8), c[0], c[1], c[2], grav);
    }
  }

  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const j = i * 3;
      if (this.life[i] <= 0) { this.pos[j + 1] = -999; continue; }
      this.vel[j + 1] -= this.grav[i] * dt;
      this.pos[j] += this.vel[j] * dt;
      this.pos[j + 1] += this.vel[j + 1] * dt;
      this.pos[j + 2] += this.vel[j + 2] * dt;
      if (this.pos[j + 1] < 0.01 && this.vel[j + 1] < 0) { this.vel[j + 1] *= -0.4; this.pos[j + 1] = 0.01; }
      const f = this.life[i] / this.maxLife[i];
      this.col[j] *= (0.98); this.col[j + 1] *= 0.98; this.col[j + 2] *= 0.98;
      void f;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}

// ---------------- Skid marks ----------------
export class SkidMarks {
  constructor(scene, maxQuads = 900) {
    this.max = maxQuads;
    this.positions = new Float32Array(maxQuads * 4 * 3);
    this.alphas = new Float32Array(maxQuads * 4);
    this.born = new Float32Array(maxQuads);       // time created
    this.head = 0;
    this.lifespan = 7.0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    const idx = new Uint32Array(maxQuads * 6);
    for (let i = 0; i < maxQuads; i++) {
      const v = i * 4, k = i * 6;
      idx[k] = v; idx[k + 1] = v + 1; idx[k + 2] = v + 2;
      idx[k + 3] = v; idx[k + 4] = v + 2; idx[k + 5] = v + 3;
    }
    geo.setIndex(new THREE.BufferAttribute(idx, 1));

    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: {},
      vertexShader: `
        attribute float aAlpha;
        varying float vA;
        void main() {
          vA = aAlpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying float vA;
        void main() { gl_FragColor = vec4(0.05, 0.05, 0.07, vA); }`,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.last = new Map();  // per-car wheel pair last positions
  }

  // add marks for both rear wheels
  addFor(carId, x, z, heading, now) {
    const rx = Math.cos(heading), rz = -Math.sin(heading); // right vector
    const hw = 0.115;
    for (const side of [-1, 1]) {
      const wx = x + rx * hw * side, wz = z + rz * hw * side;
      const key = carId * 2 + (side + 1) / 2;
      const prev = this.last.get(key);
      this.last.set(key, { x: wx, z: wz });
      if (!prev) continue;
      const dx = wx - prev.x, dz = wz - prev.z;
      if (dx * dx + dz * dz > 0.16) continue; // too long jump
      const i = this.head; this.head = (this.head + 1) % this.max;
      const w = 0.045;
      // perpendicular of segment dir
      const len = Math.hypot(dx, dz) || 1;
      const px = -dz / len * w, pz = dx / len * w;
      const o = i * 12;
      this.positions.set([prev.x - px, 0.017, prev.z - pz, prev.x + px, 0.017, prev.z + pz,
        wx + px, 0.017, wz + pz, wx - px, 0.017, wz - pz], o);
      this.born[i] = now;
      this.alphas.fill(0.55, i * 4, i * 4 + 4);
    }
  }

  lift(carId) { this.last.delete(carId * 2); this.last.delete(carId * 2 + 1); }

  update(now) {
    const n = this.max * 4;
    let dirty = false;
    for (let i = 0; i < n; i++) {
      const quad = i >> 2;
      const age = now - this.born[quad];
      const a = age <= 0 ? 0 : Math.max(0, 0.55 * (1 - age / this.lifespan));
      if (Math.abs(this.alphas[i] - a) > 0.01) { this.alphas[i] = a; dirty = true; }
    }
    if (dirty) this.mesh.geometry.attributes.aAlpha.needsUpdate = true;
  }
}

// ---------------- Screen shake ----------------
export class Shake {
  constructor() { this.trauma = 0; this.t = 0; }
  add(amount) { this.trauma = Math.min(1.2, this.trauma + amount); }
  update(dt) { this.trauma = Math.max(0, this.trauma - dt * 2.1); this.t += dt * 34; }
  offset() {
    const s = this.trauma * this.trauma;
    return {
      x: s * 0.35 * (Math.sin(this.t * 1.1) + Math.sin(this.t * 2.7) * 0.4),
      z: s * 0.35 * (Math.cos(this.t * 1.7) + Math.cos(this.t * 3.1) * 0.4),
      rot: s * 0.03 * Math.sin(this.t * 2.3),
    };
  }
}

// helpers to spawn themed bursts
export function sparksFX(p, x, z, strength = 1) {
  p.burst(x, 0.12, z, Math.round(8 * strength), { speed: 2.6, up: 2.6, life: 0.45, color: [1, 0.75, 0.25], color2: [1, 0.4, 0.1], grav: 7 });
}
export function dustFX(p, x, z) {
  p.burst(x, 0.05, z, 3, { speed: 1.0, up: 0.9, life: 0.5, color: [0.75, 0.7, 0.6], grav: 1.5 });
}
export function boostFX(p, x, z) {
  p.burst(x, 0.15, z, 16, { speed: 2.6, up: 3.4, life: 0.5, color: [0.35, 0.85, 1], color2: [1, 0.65, 0.2], grav: 3 });
}
export function splashFX(p, x, z) {
  p.burst(x, 0.1, z, 26, { speed: 2.2, up: 4.2, life: 0.7, color: [0.35, 0.65, 1], color2: [0.7, 0.9, 1], grav: 9 });
}
export function confettiFX(p, x, z) {
  const cols = [[1, 0.25, 0.2], [1, 0.85, 0.2], [0.2, 0.5, 1], [0.3, 1, 0.4], [1, 0.4, 0.9]];
  for (let i = 0; i < 5; i++) p.burst(x, 0.4, z, 22, { speed: 3, up: 5, life: 1.4, color: cols[i], grav: 4.5 });
}
