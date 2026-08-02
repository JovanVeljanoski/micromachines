// ============================================================
// carVisual.js — the four machines, each a distinct toy model.
// All face +Z; update() animates wheels/roll/flames.
// ============================================================
import * as THREE from 'three';

let _blobTex = null;
function blobTexture() {
  if (_blobTex) return _blobTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(0,0,0,0.5)');
  grad.addColorStop(0.75, 'rgba(0,0,0,0.25)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  _blobTex = new THREE.CanvasTexture(c);
  return _blobTex;
}

const dark = () => new THREE.MeshStandardMaterial({ color: 0x14171f, roughness: 0.6 });
const bodyM = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.26, metalness: 0.28 });

function addShadowBlob(g, sx = 0.62, sz = 0.5) {
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.008;
  blob.renderOrder = 1;
  blob.castShadow = blob.receiveShadow = false;
  g.add(blob);
}

function mkWheelKit() {
  const hubM = new THREE.MeshStandardMaterial({ color: 0xd8dce2, metalness: 0.7, roughness: 0.3 });
  const tireM = dark();
  return { hubM, tireM };
}
function mkWheel(kit, r, w) {
  const pivot = new THREE.Group();
  const spin = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 14), kit.tireM);
  tire.rotation.z = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.002, 10), kit.hubM);
  hub.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  spin.add(tire, hub);
  pivot.add(spin);
  return { pivot, spin, r };
}
function mkFlames(z, x = 0.05) {
  const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.3, 8),
    new THREE.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  f1.rotation.x = Math.PI / 2;
  f1.position.set(-x, 0.07, z);
  const f2 = f1.clone();
  f2.material = f1.material.clone();
  f2.material.color.set(0xffa040);
  f2.position.x = x;
  f1.visible = f2.visible = false;
  f1.castShadow = f2.castShadow = false;
  return [f1, f2];
}

// ============ MODEL 0: BLAZE GT (balanced sports) ============
function buildSports(color, accent) {
  const g = new THREE.Group();
  const bm = bodyM(color);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.075, 0.36), bm);
  body.position.y = 0.085;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.055, 0.09), bm);
  nose.position.set(0, 0.075, 0.205);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.075, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x1a2436, roughness: 0.08, metalness: 0.4 }));
  cabin.position.set(0, 0.15, -0.02);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.3 }));
  helmet.position.set(0, 0.175, -0.045);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.078, 0.345), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.3 }));
  stripe.position.set(0.055, 0.086, 0.01);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.016, 0.07), bm);
  wing.position.set(0, 0.185, -0.185);
  const sL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.05), dark());
  sL.position.set(-0.09, 0.15, -0.185);
  const sR = sL.clone(); sR.position.x = 0.09;
  g.add(body, nose, cabin, helmet, stripe, wing, sL, sR);

  const kit = mkWheelKit();
  const wheels = [];
  for (const [x, z, front] of [[-0.115, 0.125, true], [0.115, 0.125, true], [-0.115, -0.125, false], [0.115, -0.125, false]]) {
    const w = mkWheel(kit, 0.052, 0.05);
    w.pivot.position.set(x, 0.052, z);
    g.add(w.pivot);
    wheels.push({ ...w, isFront: front });
  }
  const flames = mkFlames(-0.32);
  g.add(...flames);
  addShadowBlob(g);
  return { group: g, wheels, flames };
}

// ============ MODEL 1: SLIPSTREAM (dragster) ============
function buildDragster(color, accent) {
  const g = new THREE.Group();
  const bm = bodyM(color);
  // long chassis
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 0.42), bm);
  frame.position.y = 0.06;
  // exposed engine
  const engine = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.11, 0.14), dark());
  engine.position.set(0, 0.105, -0.12);
  const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.07), dark());
  scoop.position.set(0, 0.185, -0.1);
  // side exhausts
  const pipeL = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8), dark());
  pipeL.rotation.x = Math.PI / 2;
  pipeL.position.set(-0.085, 0.075, -0.05);
  const pipeR = pipeL.clone(); pipeR.position.x = 0.085;
  // cockpit + driver
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.12), bm);
  cockpit.position.set(0, 0.1, 0.02);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.3 }));
  helmet.position.set(0, 0.155, 0.02);
  // long thin nose
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.045, 0.24, 8), bm);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.055, 0.31);
  const noseTip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.06), bm);
  noseTip.position.set(0, 0.05, 0.43);
  // giant high rear wing
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.1), bm);
  wing.position.set(0, 0.26, -0.24);
  const sL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.17, 0.05), dark());
  sL.position.set(-0.13, 0.17, -0.24);
  const sR = sL.clone(); sR.position.x = 0.13;
  g.add(frame, engine, scoop, pipeL, pipeR, cockpit, helmet, nose, noseTip, wing, sL, sR);

  const kit = mkWheelKit();
  const wheels = [];
  // big rear wheels, skinny fronts
  const defs = [
    [-0.13, 0.27, true, 0.042, 0.035], [0.13, 0.27, true, 0.042, 0.035],
    [-0.155, -0.19, false, 0.078, 0.06], [0.155, -0.19, false, 0.078, 0.06],
  ];
  for (const [x, z, front, r, wwd] of defs) {
    const w = mkWheel(kit, r, wwd);
    w.pivot.position.set(x, r, z);
    g.add(w.pivot);
    wheels.push({ ...w, isFront: front });
  }
  const flames = mkFlames(-0.34, 0.09);
  flames.forEach(f => f.position.y = 0.075);
  g.add(...flames);
  addShadowBlob(g, 0.6, 0.78);
  return { group: g, wheels, flames };
}

// ============ MODEL 2: DIRT DEVIL (buggy) ============
function buildBuggy(color, accent) {
  const g = new THREE.Group();
  const bm = bodyM(color);
  const tub = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.3), bm);
  tub.position.y = 0.12;
  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.12), bm);
  hood.position.set(0, 0.16, 0.11);
  // roll cage
  const cage = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.016, 8, 12, Math.PI), dark());
  cage.position.set(0, 0.18, -0.05);
  // driver
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.08), dark());
  seat.position.set(0, 0.17, -0.06);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.3 }));
  helmet.position.set(0, 0.21, -0.05);
  // roof light bar
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.03), dark());
  bar.position.set(0, 0.27, 0.0);
  const lL = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xffee99, emissiveIntensity: 1 }));
  lL.position.set(-0.05, 0.29, 0.0);
  const lR = lL.clone(); lR.position.x = 0.05;
  // rear spare wheel
  const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 12), dark());
  spare.rotation.z = Math.PI / 2;
  spare.rotation.y = Math.PI / 2;
  spare.position.set(0, 0.16, -0.165);
  // mudguards
  const gL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.14), dark());
  gL.position.set(-0.14, 0.16, 0.12);
  const gR = gL.clone(); gR.position.x = 0.14;
  const gL2 = gL.clone(); gL2.position.z = -0.14;
  const gR2 = gL.clone(); gR2.position.set(0.14, 0.16, -0.14);
  g.add(tub, hood, cage, seat, helmet, bar, lL, lR, spare, gL, gR, gL2, gR2);

  const kit = mkWheelKit();
  const wheels = [];
  for (const [x, z, front] of [[-0.14, 0.12, true], [0.14, 0.12, true], [-0.14, -0.14, false], [0.14, -0.14, false]]) {
    const w = mkWheel(kit, 0.072, 0.062);
    w.pivot.position.set(x, 0.072, z);
    g.add(w.pivot);
    wheels.push({ ...w, isFront: front });
  }
  const flames = mkFlames(-0.3, 0.06);
  flames.forEach(f => f.position.y = 0.1);
  g.add(...flames);
  addShadowBlob(g, 0.66, 0.56);
  return { group: g, wheels, flames };
}

// ============ MODEL 3: APEX JR (formula) ============
function buildF1(color, accent) {
  const g = new THREE.Group();
  const bm = bodyM(color);
  // monocoque
  const tub = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.3), bm);
  tub.position.set(0, 0.055, -0.02);
  // long nose
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.2), bm);
  nose.position.set(0, 0.05, 0.22);
  const noseTip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.05), bm);
  noseTip.position.set(0, 0.035, 0.31);
  // sidepods
  const podL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.16), bm);
  podL.position.set(-0.11, 0.05, 0.0);
  const podR = podL.clone(); podR.position.x = 0.11;
  // cockpit + halo + driver
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.1), dark());
  cockpit.position.set(0, 0.1, -0.04);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.3 }));
  helmet.position.set(0, 0.14, -0.04);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.011, 6, 12, Math.PI * 1.2), dark());
  halo.position.set(0, 0.12, -0.03);
  halo.rotation.z = Math.PI * 0.9;
  // engine cover fin
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.09, 0.18), bm);
  fin.position.set(0, 0.13, -0.14);
  // swept rear wing
  const wingC = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.014, 0.06), bm);
  wingC.position.set(0, 0.2, -0.24);
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.014, 0.06), bm);
  wingL.position.set(-0.1, 0.2, -0.24);
  wingL.rotation.y = 0.4;
  const wingR = wingL.clone(); wingR.position.x = 0.1; wingR.rotation.y = -0.4;
  const sL = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.11, 0.04), dark());
  sL.position.set(-0.06, 0.14, -0.24);
  const sR = sL.clone(); sR.position.x = 0.06;
  g.add(tub, nose, noseTip, podL, podR, cockpit, helmet, halo, fin, wingC, wingL, wingR, sL, sR);

  const kit = mkWheelKit();
  const wheels = [];
  const defs = [
    [-0.135, 0.14, true, 0.052, 0.05], [0.135, 0.14, true, 0.052, 0.05],
    [-0.14, -0.16, false, 0.06, 0.055], [0.14, -0.16, false, 0.06, 0.055],
  ];
  for (const [x, z, front, r, wwd] of defs) {
    const w = mkWheel(kit, r, wwd);
    w.pivot.position.set(x, r, z);
    g.add(w.pivot);
    wheels.push({ ...w, isFront: front });
  }
  const flames = mkFlames(-0.34, 0.04);
  g.add(...flames);
  addShadowBlob(g, 0.6, 0.66);
  return { group: g, wheels, flames };
}

const BUILDERS = [buildSports, buildDragster, buildBuggy, buildF1];

export function buildCar(vehicle, accentOverride) {
  const built = BUILDERS[vehicle.model](vehicle.color, accentOverride ?? vehicle.accent);
  const { group: g, wheels, flames } = built;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  for (const f of flames) f.castShadow = false;
  // shadow blob shouldn't cast
  for (const o of g.children) if (o.renderOrder === 1) o.castShadow = false;

  return {
    group: g, wheels, flames,
    update(state, dt, time) {
      g.position.set(state.x, state.y, state.z);
      g.rotation.y = state.heading + (state.falling ? state.airSpin + state.fallT * 7 : 0);
      for (const w of wheels) {
        w.spin.rotation.x += (state.speedF / w.r) * dt;
        if (w.isFront) w.pivot.rotation.y = -state.steer * 0.9;
      }
      g.rotation.z = -state.steer * Math.min(1, Math.abs(state.speedF) / 6) * 0.12;
      g.rotation.x = state.sliding * 0.03 * Math.sin(time * 40);
      const boosting = state.boostT > 0;
      flames.forEach(f => {
        f.visible = boosting;
        if (boosting) {
          const s = 0.75 + Math.random() * 0.6;
          f.scale.set(s, 0.8 + Math.random() * 0.7, s);
        }
      });
    },
  };
}
