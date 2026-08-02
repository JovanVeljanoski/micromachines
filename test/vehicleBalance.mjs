// ============================================================
// test/vehicleBalance.mjs — same driver, four machines:
// measures finish time per vehicle per level with an IDENTICAL
// AI pilot (skill 1.0). Pass if max/min finish-time spread
// is within BAND per level.
// ============================================================
import { LEVELS } from '../src/levels/index.js';
import { RaceCore } from '../src/raceCore.js';
import { aiInput, createAI } from '../src/ai.js';
import { VEHICLES } from '../src/vehicles.js';

const DT = 1 / 120;
const BAND = 1.12;   // max/min finish time ratio allowed

function runSolo(level, vehicleIdx, seconds = 200) {
  const level2 = { ...level, boosts: [] };   // no pad luck: pure vehicle pace
  const race = new RaceCore(level2, { laps: 3, playerIndex: 0, playerVehicle: vehicleIdx, aiSkills: [0, 0, 0] });
  // rivals retire instantly & coast to a stop: measured car runs alone
  for (let i = 1; i < 4; i++) { race.cars[i].state.finished = true; race.cars[i].finished = true; }
  race.started = true;
  const pilot = createAI(0, 1.0);
  let t = 0;
  while (t < seconds) {
    if (race.player.state.finished) break;
    const input = aiInput(race.player.state, pilot, level2, DT, 0);
    race.step(DT, input);
    t += DT;
  }
  return race.player.state.finished ? race.player.state.finishTime : Infinity;
}

let allOk = true;
const rows = [];
LEVELS.forEach((level, li) => {
  const times = VEHICLES.map((v, vi) => runSolo(level, vi));
  const min = Math.min(...times), max = Math.max(...times);
  const ratio = max / min;
  const ok = ratio <= BAND;
  allOk = allOk && ok;
  console.log(`\n${level.name}`);
  VEHICLES.forEach((v, vi) => console.log(`  ${ok ? ' ' : '!'} ${v.name.padEnd(12)} ${times[vi] === Infinity ? '  DNF ' : times[vi].toFixed(1) + 's'}`));
  console.log(`  spread: min=${min.toFixed(1)} max=${max.toFixed(1)} ratio=${ratio.toFixed(3)} (limit ${BAND}) ${ok ? 'OK' : '✗ UNBALANCED'}`);
  rows.push({ level: li, times, ratio, ok });
});
console.log('\n' + (allOk ? 'BALANCE OK ✔' : 'BALANCE FAILED ✗'));
process.exit(allOk ? 0 : 1);
