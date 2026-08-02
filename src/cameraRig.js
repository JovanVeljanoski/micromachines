// ============================================================
// cameraRig.js — top-down chase camera with smoothing, look-ahead,
// speed zoom and screen shake. Fixed orientation (like the original).
// ============================================================
import * as THREE from 'three';

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.initialized = false;
    this.baseHeight = 4.35;
    this.baseBack = 1.55;
  }

  snapTo(x, z) {
    this.pos.set(x, this.baseHeight, z + this.baseBack);
    this.look.set(x, 0, z);
    this.initialized = true;
  }

  follow(target, speedNorm, shake, dt, orbitT = null) {
    const { x, z, vx, vz } = target;
    const zoom = 1 + speedNorm * 0.14;
    const h = this.baseHeight * zoom;
    const back = this.baseBack * zoom;

    let wantX = x + vx * 0.17;
    let wantZ = z + vz * 0.17;
    let camY = h, camBack = back;

    if (orbitT !== null) {
      // finish orbit
      const a = orbitT * 0.7;
      wantX = x; wantZ = z;
      this.pos.set(x + Math.sin(a) * 5.2, 3.4, z + Math.cos(a) * 5.2);
      this.look.lerp(new THREE.Vector3(x, 0.2, z), 1 - Math.exp(-6 * dt));
      this.camera.position.copy(this.pos);
      this.camera.lookAt(this.look);
      return;
    }

    if (!this.initialized) this.snapTo(x, z);

    // critically damped-ish smoothing
    const k = 1 - Math.exp(-8.5 * dt);
    this.look.x += (wantX - this.look.x) * k;
    this.look.z += (wantZ - this.look.z) * k;

    this.pos.set(this.look.x, camY, this.look.z + camBack);

    const sh = shake.offset();
    this.pos.x += sh.x; this.pos.z += sh.z;
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look.x, 0, this.look.z);
    this.camera.rotation.z += sh.rot;
  }
}
