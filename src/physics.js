// ============================================================
// physics.js — pure top-down arcade car physics + collisions.
// No DOM / three.js imports: fully testable in Node.
//
// Convention: 2D plane (x, z). Heading θ: forward = (sinθ, cosθ).
// ============================================================

export const CAR = {
  radius: 0.155,          // collision circle radius
  engine: 10.5,           // forward acceleration m/s^2
  boostEngine: 9.0,       // extra accel while boosting
  maxSpeed: 5.2,
  boostMax: 7.3,
  brake: 13.0,
  reverseMax: 2.2,
  drag: 0.3,              // proportional drag
  roll: 0.5,              // constant rolling resistance
  grip: 8.5,              // lateral velocity decay rate (road)
  maxSteer: 0.62,         // radians
  wheelBase: 0.27,
  steerHighSpeedLoss: 0.17, // how fast steering authority decays with speed
  wallRestitution: 0.42,
  wallFriction: 0.965,
  carRestitution: 0.45,
  gravity: 22.0,          // fall animation gravity
};

export function createCarState(x, z, heading) {
  return {
    x, z, y: 0, heading,
    vx: 0, vz: 0,
    speedF: 0, speedR: 0,      // cached decomposition (for HUD/AI)
    steer: 0,
    boostT: 0,                 // remaining boost time
    sliding: 0,                // 0..1 how much we're sliding (for fx)
    impacting: 0,              // impact speed of last collision this step (0 = none)
    falling: false, fallT: 0,
    airSpin: 0,
    lap: 0, nextGate: 1,       // gate indices: gates[0] is start line
    lastGate: 0,
    finished: false, finishTime: 0,
    wrongWayT: 0,
    stuckT: 0, reversing: 0,
  };
}

// ----------------------------------------------------------
// Surface sampling: zones modify grip/drag
// ----------------------------------------------------------
export function sampleSurface(level, x, z) {
  let gripMul = 1, extraDrag = 0, kind = 'road';
  const zones = level.zones;
  for (let i = 0; i < zones.length; i++) {
    const zn = zones[i];
    let inside = false;
    if (zn.shape.type === 'circle') {
      const dx = x - zn.shape.x, dz = z - zn.shape.z;
      inside = (dx * dx + dz * dz) < zn.shape.r * zn.shape.r;
    } else { // rect (rot)
      const c = Math.cos(-zn.shape.rot || 0), s = Math.sin(-zn.shape.rot || 0);
      const dx = x - zn.shape.x, dz = z - zn.shape.z;
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      inside = Math.abs(lx) < zn.shape.w / 2 && Math.abs(lz) < zn.shape.d / 2;
    }
    if (inside) {
      if (zn.grip !== undefined) gripMul = Math.min(gripMul, zn.grip);
      if (zn.drag !== undefined) extraDrag += zn.drag;
      kind = zn.kind || kind;
    }
  }
  return { gripMul, extraDrag, kind };
}

// ----------------------------------------------------------
// One physics step for a car. input: {throttle -1..1, steer -1..1, handbrake}
// Returns events { impact, fellOff } for fx/audio.
// ----------------------------------------------------------
export function stepCar(car, input, level, dt) {
  const ev = { impact: 0, skid: 0, fellOff: false };

  if (car.falling) {
    car.fallT += dt;
    car.y -= CAR.gravity * car.fallT * dt;
    car.airSpin += dt * 9;
    if (car.y < -6) ev.respawn = true;
    return ev;
  }

  if (car.finished) { input = { throttle: 0, steer: input.steer * 0.5, handbrake: false, boost: false }; }

  const T = car.tune || {};
  const surf = sampleSurface(level, car.x, car.z);
  // x-factor: off-road tires bite through hazards
  if (T.zoneGripFloor) surf.gripMul = Math.max(surf.gripMul, T.zoneGripFloor);
  if (T.zoneDragMul && surf.extraDrag > 0) surf.extraDrag *= T.zoneDragMul;

  const sf0 = car.speedF;   // previous forward speed for steering authority
  const steerLoss = T.steerHighSpeedLoss ?? CAR.steerHighSpeedLoss;
  const maxSteer = T.maxSteer ?? CAR.maxSteer;
  const gripBase = T.grip ?? CAR.grip;

  // --- steering (bicycle-ish, authority decays with speed) ---
  const steerAuthority = 1 / (1 + Math.abs(sf0) * steerLoss);
  const targetSteer = input.steer * maxSteer * steerAuthority * (input.handbrake ? 1.35 : 1);
  const slew = 14 * dt;
  car.steer += Math.max(-slew, Math.min(slew, targetSteer - car.steer));

  // positive steer = turn toward the DRIVER'S RIGHT.
  // In our convention (fwd = (sinθ,cosθ), camera looks -Z, screen-right=+X)
  // that means heading DECREASES.
  let yaw = (sf0 / CAR.wheelBase) * Math.tan(car.steer);
  const yawMax = 10;
  yaw = Math.max(-yawMax, Math.min(yawMax, yaw));
  car.heading -= yaw * dt;

  // --- decompose world velocity in the NEW heading frame ---
  // (yaw rotation converts forward speed into lateral slip; grip then
  // bleeds the slip off — this IS the drift mechanism)
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
  let sf = car.vx * fx + car.vz * fz;
  let sr = -car.vx * fz + car.vz * fx;

  // --- longitudinal ---
  const boosting = car.boostT > 0;
  if (boosting) car.boostT -= dt;
  const engine = (T.engine ?? CAR.engine) + (boosting ? CAR.boostEngine : 0);
  const topSpeed = (boosting ? CAR.boostMax : (T.maxSpeed ?? CAR.maxSpeed));

  if (input.throttle > 0) {
    if (sf < topSpeed * (boosting ? 1 : surf.gripMul >= 1 ? 1 : 0.92)) {
      sf += input.throttle * engine * dt;
    }
  } else if (input.throttle < 0) {
    if (sf > 0.4) sf += input.throttle * CAR.brake * dt;        // braking
    else sf = Math.max(-CAR.reverseMax, sf + input.throttle * engine * 0.65 * dt); // reverse
  }
  // drag + rolling resistance + surface drag
  sf -= sf * (CAR.drag + surf.extraDrag) * dt;
  const roll = CAR.roll * (input.throttle === 0 ? 2.2 : 1) * dt;
  sf = Math.abs(sf) <= roll ? 0 : sf - Math.sign(sf) * roll;

  // --- lateral grip (drift) ---
  let gripEff = gripBase * surf.gripMul;
  if (input.handbrake) {
    gripEff *= 0.16;
    sf -= sf * 0.55 * dt; // handbrake scrubs speed gently
  }
  sr *= Math.exp(-gripEff * dt);
  sr = Math.max(-9, Math.min(9, sr));

  car.speedF = sf; car.speedR = sr;
  car.sliding = Math.min(1, Math.abs(sr) / 3.0 + (input.handbrake && Math.abs(sf) > 2.5 ? 0.4 : 0));
  ev.skid = car.sliding;

  // --- recompose ---
  car.vx = fx * sf - fz * sr;
  car.vz = fz * sf + fx * sr;

  car.x += car.vx * dt;
  car.z += car.vz * dt;

  // --- collisions ---
  ev.impact = collideWorld(car, level);

  // --- fell off the table? ---
  const hw = level.width / 2 - 0.05, hd = level.depth / 2 - 0.05;
  if (Math.abs(car.x) > hw || Math.abs(car.z) > hd) {
    ev.fellOff = true;
    car.falling = true; car.fallT = 0; car.y = 0; car.airSpin = 0;
    return ev;
  }
  // holes (pool pockets etc.)
  if (level.holes) {
    for (const h of level.holes) {
      const dx = car.x - h.x, dz = car.z - h.z;
      if (dx * dx + dz * dz < h.r * h.r) {
        ev.fellOff = true; ev.hole = true;
        car.falling = true; car.fallT = 0; car.y = 0; car.airSpin = 0;
        return ev;
      }
    }
  }

  return ev;
}

// ----------------------------------------------------------
// Static world collision: wall segments + circle obstacles.
// Resolves penetration & reflects velocity. Returns max impact speed.
// ----------------------------------------------------------
export function collideWorld(car, level) {
  let impact = 0;
  const r = CAR.radius;

  // circle obstacles
  const circs = level.circles;
  for (let i = 0; i < circs.length; i++) {
    const c = circs[i];
    const dx = car.x - c.x, dz = car.z - c.z;
    const rr = c.r + r;
    const d2 = dx * dx + dz * dz;
    if (d2 < rr * rr && d2 > 1e-9) {
      const d = Math.sqrt(d2);
      const nx = dx / d, nz = dz / d;
      const push = rr - d;
      car.x += nx * push; car.z += nz * push;
      impact = Math.max(impact, reflect(car, nx, nz));
    }
  }

  // wall segments (optionally with own radius)
  const walls = level.walls;
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    const ax = w[0], az = w[1], bx = w[2], bz = w[3];
    const wr = (w[4] || 0) + r;
    const abx = bx - ax, abz = bz - az;
    const len2 = abx * abx + abz * abz;
    let t = len2 > 1e-9 ? ((car.x - ax) * abx + (car.z - az) * abz) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const px = ax + abx * t, pz = az + abz * t;
    const dx = car.x - px, dz = car.z - pz;
    const d2 = dx * dx + dz * dz;
    if (d2 < wr * wr && d2 > 1e-9) {
      const d = Math.sqrt(d2);
      const nx = dx / d, nz = dz / d;
      car.x += nx * (wr - d); car.z += nz * (wr - d);
      impact = Math.max(impact, reflect(car, nx, nz));
    }
  }
  car.impacting = impact;
  return impact;
}

function reflect(car, nx, nz) {
  const vn = car.vx * nx + car.vz * nz;   // velocity into surface
  if (vn >= 0) return 0;
  const imp = -vn;
  // remove normal component, bounce a bit, keep most tangent
  car.vx -= (1 + CAR.wallRestitution) * vn * nx;
  car.vz -= (1 + CAR.wallRestitution) * vn * nz;
  car.vx *= CAR.wallFriction; car.vz *= CAR.wallFriction;
  return imp;
}

// ----------------------------------------------------------
// Car vs car (elastic-ish circles). Both cars get pushed.
// ----------------------------------------------------------
export function collideCars(a, b) {
  const minD = CAR.radius * 2.15;
  const dx = b.x - a.x, dz = b.z - a.z;
  const d2 = dx * dx + dz * dz;
  if (d2 >= minD * minD || d2 < 1e-9) return 0;
  const d = Math.sqrt(d2);
  const nx = dx / d, nz = dz / d;
  const overlap = (minD - d) / 2;
  a.x -= nx * overlap; a.z -= nz * overlap;
  b.x += nx * overlap; b.z += nz * overlap;
  const rvx = b.vx - a.vx, rvz = b.vz - a.vz;
  const rel = rvx * nx + rvz * nz;
  if (rel < 0) {
    const j = -(1 + CAR.carRestitution) * rel / 2;
    a.vx -= j * nx; a.vz -= j * nz;
    b.vx += j * nx; b.vz += j * nz;
    return -rel;
  }
  return 0;
}
