// ============================================================
// test/controls.mjs — steering direction regression test.
// Camera convention: screen-up = -Z, screen-right = +X.
// "Car facing screen-up, press RIGHT" must veer screen-RIGHT (+X).
// ============================================================
import { LEVELS } from '../src/levels/index.js';
import { createCarState, stepCar } from '../src/physics.js';

const level = LEVELS[0];
const DT = 1 / 120;
let failures = 0;

function drive(steer, seconds = 0.7) {
  const car = createCarState(0, -1, Math.PI);   // heading PI = forward (0,-1) = screen-up
  car.speedF = 3.5;
  car.vz = -3.5;
  for (let t = 0; t < seconds; t += DT) stepCar(car, { throttle: 1, steer, handbrake: false }, level, DT);
  return car;
}

const right = drive(1);
const left = drive(-1);
console.log(`RIGHT key: endX=${right.x.toFixed(2)} (want > 0.35)`);
console.log(`LEFT key:  endX=${left.x.toFixed(2)} (want < -0.35)`);
if (!(right.x > 0.35)) { console.log('  ✗ RIGHT turns left — INVERTED'); failures++; }
if (!(left.x < -0.35)) { console.log('  ✗ LEFT turns right — INVERTED'); failures++; }

// reversing sanity: still steers (no NaN)
const rev = createCarState(0, -1, Math.PI);
for (let t = 0; t < 0.8; t += DT) stepCar(rev, { throttle: -1, steer: 1, handbrake: false }, level, DT);
if (!isFinite(rev.x + rev.z + rev.heading)) { console.log('  ✗ NaN in reverse steering'); failures++; }
console.log(`reverse+steer ok (x=${rev.x.toFixed(2)})`);

console.log(failures ? `FAILURES: ${failures}` : 'CONTROLS OK ✔');
process.exit(failures ? 1 : 0);
