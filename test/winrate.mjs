import { LEVELS } from '../src/levels/index.js';
import { RaceCore } from '../src/raceCore.js';
import { aiInput, createAI } from '../src/ai.js';
import { VEHICLES } from '../src/vehicles.js';
const DT = 1/120;
function race(level, vidx, skill) {
  const r = new RaceCore(level, { laps: 3, playerIndex: 0, playerVehicle: vidx });
  r.started = true;
  const pilot = createAI(0, skill);
  let t = 0;
  while (t < 120 && !r.player.state.finished) {
    r.step(DT, aiInput(r.player.state, pilot, level, DT, 0));
    t += DT;
  }
  return r.player.state.finished ? r.positionOf(r.player) : 0;
}
for (const level of LEVELS) {
  const row = VEHICLES.map((v, vi) => {
    const pos = race(level, vi, 0.995);
    return `${v.name}:${pos === 0 ? 'DNF' : 'P' + pos}`;
  });
  console.log(level.id.padEnd(10), row.join('  '));
}
console.log('(player pilot skill=0.995 — finishing position vs 3 AI rivals)');
