// ============================================================
// ai.js — opponent drivers. Pure functions of car state + level.
// Follow gate racing line with corner speed planning,
// rubber-banding, and basic unstuck behavior.
// ============================================================
import { CAR } from './physics.js';

export function createAI(lane, skill) {
  return { lane, skill, reverseT: 0, stuckT: 0, wobble: 0 };
}

export function aiInput(car, ai, level, dt, rubberBand = 0) {
  const gates = level.gates;
  const n = gates.length;
  const g0 = gates[car.nextGate];
  const g1 = gates[(car.nextGate + 1) % n];
  const g2 = gates[(car.nextGate + 2) % n];

  // ---- unstuck: reverse out ----
  const speed = Math.hypot(car.vx, car.vz);
  if (ai.reverseT > 0) {
    ai.reverseT -= dt;
    return { throttle: -0.9, steer: -ai._revSteer || 0.6, handbrake: false };
  }
  if (speed < 0.6) {
    ai.stuckT += dt;
    if (ai.stuckT > 0.85) {
      ai.reverseT = 0.6;
      ai.stuckT = 0;
      ai._revSteer = Math.random() > 0.5 ? 0.75 : -0.75;
      return { throttle: -0.9, steer: -ai._revSteer, handbrake: false };
    }
  } else {
    // slow crawling also counts toward being stuck (wedge against walls)
    if (speed < 1.3) ai.stuckT += dt * 0.4;
    else ai.stuckT = 0;
  }
  if (ai.stuckT > 4.5) { ai.stuckT = 0; return { teleport: true }; }

  // ---- aim point: blend current gate with next, with lane offset ----
  const tx = -g0.dz, tz = g0.dx; // track tangent (screen-right of travel)
  const dist0 = Math.hypot(g0.x - car.x, g0.z - car.z);
  const k = Math.max(0, Math.min(1, 1 - dist0 / 3.5)); // blend toward next gate as we approach
  let ax = g0.x * (1 - k) + g1.x * k;
  let az = g0.z * (1 - k) + g1.z * k;
  const lane = ai.lane * (1 - k * 0.7);
  ax += tx * lane; az += tz * lane;

  // ---- steering ----
  const wantAngle = Math.atan2(ax - car.x, az - car.z);
  const headAng = car.heading;
  let diff = wantAngle - headAng;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  // positive steer reduces heading (toward driver's right) — see physics.js
  const steer = Math.max(-1, Math.min(1, -diff * 2.4));

  // ---- corner speed planning ----
  // angle change at upcoming gate
  let d1 = Math.atan2(g1.x - g0.x, g1.z - g0.z) - Math.atan2(g0.dx, g0.dz);
  while (d1 > Math.PI) d1 -= 2 * Math.PI;
  while (d1 < -Math.PI) d1 += 2 * Math.PI;
  let d2 = Math.atan2(g2.x - g1.x, g2.z - g1.z) - Math.atan2(g1.dx, g1.dz);
  while (d2 > Math.PI) d2 -= 2 * Math.PI;
  while (d2 < -Math.PI) d2 += 2 * Math.PI;
  const sharp1 = Math.min(1, Math.abs(d1) / 1.2);
  const sharp2 = Math.min(1, Math.abs(d2) / 1.2);
  const top = (car.tune?.maxSpeed ?? CAR.maxSpeed) * (ai.skill + rubberBand);
  let cornerSpeed = top * (1 - 0.55 * sharp1) * (1 - 0.18 * sharp2);
  // level-authored speed limits (hazardous corners)
  if (g0.vmax && dist0 < 2.2) cornerSpeed = Math.min(cornerSpeed, g0.vmax);
  if (g1.vmax) cornerSpeed = Math.min(cornerSpeed, g1.vmax * 1.15);

  const brakeDist = (car.speedF * car.speedF - cornerSpeed * cornerSpeed) / (2 * (CAR.brake * 0.7));
  const needBrake = dist0 < brakeDist + 0.5 && car.speedF > cornerSpeed + 0.3;

  let throttle = 1;
  if (needBrake) throttle = car.speedF > cornerSpeed + 0.9 ? -0.85 : 0.12;
  else if (car.speedF > cornerSpeed + 1.1 && dist0 < 1.8) throttle = 0;

  const handbrake = Math.abs(diff) > 1.15 && car.speedF > 3.4;

  return { throttle, steer, handbrake };
}
