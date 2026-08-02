// ============================================================
// test/simulate.mjs — headless race validation.
// Runs AI-driven races in Node on every level and reports:
// lap completion, lap times, falls, stuck events, wall impacts.
// Usage: node test/simulate.mjs [levelIdx] [--verbose]
// ============================================================
import { LEVELS } from '../src/levels/index.js';
import { RaceCore } from '../src/raceCore.js';
import { aiInput, createAI } from '../src/ai.js';
import { CAR } from '../src/physics.js';

const DT = 1 / 120;
const verbose = process.argv.includes('--verbose');
const onlyLevel = process.argv.find(a => /^\d+$/.test(a));

function simulateLevel(level, playerSkill = 0.97) {
  const race = new RaceCore(level, { laps: 3, playerIndex: 0, aiSkills: [0.985, 0.955, 0.92] });
  // player slot driven by AI controller for the test
  const playerAI = createAI(0, playerSkill);
  race.started = true;

  const stats = {
    level: level.id,
    laps: [], falls: 0, impacts: 0, bigImpacts: 0, unstucks: 0, boosts: 0,
    maxSpeed: 0, avSpeed: 0, samples: 0,
    finished: false, finishTime: 0, finalPositions: null,
    aiFalls: [0, 0, 0, 0], aiUnstuck: [0, 0, 0, 0], aiFinished: [false, false, false, false],
    nanGuard: false,
  };

  const T_MAX = 240; // seconds
  while (race.time < T_MAX) {
    const input = race.player.state.finished
      ? { throttle: 0, steer: 0, handbrake: false }
      : aiInput(race.player.state, playerAI, level, DT, 0);
    const events = race.step(DT, input);
    for (const ev of events) {
      const idx = race.cars.indexOf(ev.car);
      if (ev.type === 'lap' && ev.car === race.player) stats.laps.push(ev.lap);
      if (ev.type === 'fall' || ev.type === 'respawn') {
        if (ev.type === 'fall') { stats.falls++; stats.aiFalls[idx]++; }
      }
      if (ev.type === 'impact') { stats.impacts++; if (ev.speed > 4) stats.bigImpacts++; }
      if (ev.type === 'unstuck') { stats.unstucks++; stats.aiUnstuck[idx]++; }
      if (ev.type === 'boost' && ev.car === race.player) stats.boosts++;
      if (ev.type === 'finish') stats.aiFinished[idx] = true;
    }
    const st = race.player.state;
    if (!isFinite(st.x) || !isFinite(st.z) || !isFinite(st.heading)) { stats.nanGuard = true; break; }
    if (!st.falling) {
      const sp = Math.hypot(st.vx, st.vz);
      stats.maxSpeed = Math.max(stats.maxSpeed, sp);
      stats.avSpeed += sp; stats.samples++;
    }
    if (race.player.state.finished && !stats.finished) { stats.finished = true; stats.finishTime = race.player.state.finishTime; }
    if (stats.finished && race.cars.every(c => c.state.finished)) break;
  }
  stats.avSpeed = stats.samples ? stats.avSpeed / stats.samples : 0;
  stats.finalPositions = race.standings().map(c => `${c.name}${c.state.finished ? '(' + c.state.finishTime.toFixed(1) + 's)' : '(DNF)'} P${race.cars.indexOf(c) + 1}`);

  // per-lap times derived from events would be nicer; approximate: finishTime/3 if even
  return { race, stats };
}

const MARGIN = 0.155 + 0.28; // car radius + steering wiggle allowance

function distToSeg(x, z, ax, az, bx, bz) {
  const abx = bx - ax, abz = bz - az;
  const len2 = abx * abx + abz * abz;
  let t = len2 > 0 ? ((x - ax) * abx + (z - az) * abz) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (ax + abx * t), z - (az + abz * t));
}

function checkGates(level) {
  const problems = [];
  const obstacles = [
    ...level.circles.map(c => ({ kind: 'circle', x: c.x, z: c.z, r: c.r })),
    ...level.walls.map(w => ({ kind: 'wall', seg: w, r: w[4] || 0 })),
  ].filter(o => !o.decor);

  level.gates.forEach((g, i) => {
    for (const o of obstacles) {
      const d = o.kind === 'circle' ? Math.hypot(g.x - o.x, g.z - o.z) - o.r
        : distToSeg(g.x, g.z, o.seg[0], o.seg[1], o.seg[2], o.seg[3]) - o.r;
      if (d < MARGIN - 0.18) problems.push(`gate ${i} clearance ${d.toFixed(2)} vs ${o.kind}@(${o.kind === 'circle' ? o.x + ',' + o.z : o.seg.join(',')})`);
    }
  });

  // corridor sweep: sample along consecutive gate segments
  for (let i = 1; i <= level.gates.length; i++) {
    const a = level.gates[i % level.gates.length];
    const b = level.gates[(i + 1) % level.gates.length];
    const segLen = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.ceil(segLen / 0.4);
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      for (const o of obstacles) {
        const d = o.kind === 'circle' ? Math.hypot(x - o.x, z - o.z) - o.r
          : distToSeg(x, z, o.seg[0], o.seg[1], o.seg[2], o.seg[3]) - o.r;
        if (d < MARGIN - 0.28) {
          problems.push(`corridor g${i % level.gates.length}->g${(i + 1) % level.gates.length} @(${x.toFixed(1)},${z.toFixed(1)}) clearance ${d.toFixed(2)} vs ${o.kind}@(${o.kind === 'circle' ? o.x + ',' + o.z + ',r' + o.r : o.seg.join(',')})`);
          break;
        }
      }
    }
  }
  // dedupe-ish: collapse corridor runs is overkill; keep raw count via unique key
  return [...new Set(problems)];
}

let allOk = true;
LEVELS.forEach((level, i) => {
  if (onlyLevel !== undefined && String(i) !== onlyLevel) return;
  console.log(`\n=== ${level.num}. ${level.name} (${level.id}) ===`);
  const gateProblems = checkGates(level);
  if (gateProblems.length) {
    allOk = false;
    console.log('  GATE CLEARANCE PROBLEMS:');
    gateProblems.forEach(p => console.log('   - ' + p));
  }
  const { stats } = simulateLevel(level);
  console.log(`  player-AI: finished=${stats.finished} time=${stats.finishTime.toFixed(1)}s maxSpeed=${stats.maxSpeed.toFixed(2)} avSpeed=${stats.avSpeed.toFixed(2)}`);
  console.log(`  lapCount=${stats.laps.length} falls/AI=${stats.aiFalls.join('/')} unstucks=${stats.aiUnstuck.join('/')} impacts=${stats.impacts} big=${stats.bigImpacts} boosts=${stats.boosts}`);
  console.log(`  finish order: ${stats.finalPositions.join(', ')}`);
  if (stats.nanGuard) { console.log('  !!! NaN detected'); allOk = false; }
  if (!stats.finished) { console.log('  !!! player-AI did NOT finish in time'); allOk = false; }
  if (stats.finished && stats.finishTime > 150) { console.log('  !!! race too slow'); allOk = false; }
  if (stats.maxSpeed < CAR.maxSpeed * 0.8) { console.log('  !!! never reached near top speed'); allOk = false; }
});
console.log('\n' + (allOk ? 'ALL CHECKS PASSED ✔' : 'CHECKS FAILED ✗'));
process.exit(allOk ? 0 : 1);
