// ============================================================
// raceCore.js — pure race simulation: cars, gates, boost pads,
// standings. Shared by the game and the Node test harness.
// ============================================================
import { createCarState, stepCar, collideCars, CAR } from './physics.js';
import { updateProgress, raceScore, respawnPose, buildSpawns } from './progress.js';
import { aiInput } from './ai.js';
import { VEHICLES } from './vehicles.js';

export class RaceCore {
  constructor(level, { laps = 3, playerIndex = 0, playerVehicle = 0, aiSkills = [0.985, 0.955, 0.92] } = {}) {
    this.level = level;
    this.laps = laps;
    this.time = 0;
    this.started = false;
    this.over = false;

    // the AI rivals drive the machines the player didn't pick
    const aiVehicles = VEHICLES.map((_, i) => i).filter(i => i !== (playerVehicle % VEHICLES.length));

    const spawns = buildSpawns(level.gates[0], 4);
    this.cars = [];
    for (let i = 0; i < 4; i++) {
      const s = spawns[i];
      const st = createCarState(s.x, s.z, s.heading);
      st.nextGate = 1;
      st.lastGate = 0;
      const isPlayer = i === playerIndex;
      const vehicle = VEHICLES[isPlayer ? playerVehicle : aiVehicles[i - 1] ?? aiVehicles[0]];
      st.tune = vehicle.tune;
      this.cars.push({
        state: st,
        name: isPlayer ? 'YOU' : vehicle.name,
        color: vehicle.color,
        vehicle,
        isPlayer,
        ai: isPlayer ? null : { lane: [-0.5, 0.5, -0.2][i - 1] || 0, skill: vehicle.aiSkill ?? aiSkills[i - 1] ?? 0.93, reverseT: 0, stuckT: 0 },
        padCooldown: 0,
        finished: false,
        wrongWayTimer: 0,
        segT: 0,          // time since last gate pass (auto-recovery)
      });
    }
    // boost pads runtime state
    this.pads = (level.boosts || []).map(b => ({ ...b, active: true, t: 0 }));
  }

  get player() { return this.cars.find(c => c.isPlayer); }

  standings() {
    return [...this.cars].sort((a, b) => {
      const fa = a.state.finished, fb = b.state.finished;
      if (fa && fb) return a.state.finishTime - b.state.finishTime;
      if (fa) return -1;
      if (fb) return 1;
      return raceScore(b.state, this.level) - raceScore(a.state, this.level);
    });
  }

  positionOf(car) { return this.standings().indexOf(car) + 1; }

  step(dt, playerInput) {
    const events = [];
    if (!this.started) return events;
    this.time += dt;

    // pad respawns
    for (const p of this.pads) {
      if (!p.active) { p.t -= dt; if (p.t <= 0) p.active = true; }
    }

    const standingsBefore = this.positionOf(this.player);

    for (const car of this.cars) {
      const st = car.state;
      let input;
      if (car.isPlayer) {
        input = playerInput;
      } else {
        const target = this.player;
        // rubber-band: behind player → slight speed up, ahead → ease off
        const gap = raceScore(st, this.level) - raceScore(target.state, this.level);
        const rubber = Math.max(-0.07, Math.min(0.16, -gap * 0.00055));
        input = aiInput(st, car.ai, this.level, dt, rubber);
        if (input.teleport) {
          const pose = respawnPose(st, this.level);
          st.x = pose.x; st.z = pose.z; st.heading = pose.heading; st.vx = st.vz = 0;
          events.push({ type: 'unstuck', car });
          continue;
        }
      }

      const ev = stepCar(st, input, this.level, dt);

      // auto-recovery: AI-driven cars stuck too long between gates get rescued
      if (car.ai && !st.falling && !st.finished) {
        car.segT += dt;
        if (car.segT > 5.0) {
          const pose = respawnPose(st, this.level);
          st.x = pose.x; st.z = pose.z; st.heading = pose.heading;
          st.vx = st.vz = 0; st.steer = 0;
          car.segT = 0;
          events.push({ type: 'unstuck', car });
          continue;
        }
      }

      if (ev.respawn) {
        const pose = respawnPose(st, this.level);
        st.x = pose.x; st.z = pose.z; st.heading = pose.heading;
        st.vx = st.vz = 0; st.steer = 0;
        st.falling = false; st.y = 0; st.boostT = 0;
        events.push({ type: 'respawn', car });
      } else if (ev.fellOff) {
        events.push({ type: 'fall', car });
      } else if (!st.falling) {
        if (ev.impact > 2.2) events.push({ type: 'impact', car, speed: ev.impact });
        if (ev.skid > 0.55 && Math.abs(st.speedF) > 2) events.push({ type: 'skid', car, amount: ev.skid });

        // gates
        const g = updateProgress(st, this.level);
        if (g) {
          car.segT = 0;
          events.push({ type: 'gate', car, gate: g.passed });
          if (st.nextGate === 1 && st.lap >= 1) events.push({ type: 'lap', car, lap: st.lap });
          if (!st.finished && st.lap >= this.laps) {
            st.finished = true; st.finishTime = this.time;
            car.finished = true;
            events.push({ type: 'finish', car });
          }
        }

        // boost pads
        for (const p of this.pads) {
          if (!p.active) continue;
          const dx = st.x - p.x, dz = st.z - p.z;
          if (dx * dx + dz * dz < 0.42 * 0.42) {
            p.active = false; p.t = 7;
            st.boostT = 1.15 * (car.vehicle?.special?.boostDur ?? 1);
            events.push({ type: 'boost', car });
          }
        }
      }
    }

    // car-car collisions (all pairs)
    for (let i = 0; i < this.cars.length; i++) {
      for (let j = i + 1; j < this.cars.length; j++) {
        const a = this.cars[i].state, b = this.cars[j].state;
        if (a.falling || b.falling) continue;
        const imp = collideCars(a, b);
        if (imp > 1.5) events.push({ type: 'rub', a: this.cars[i], b: this.cars[j], speed: imp });
      }
    }

    // wrong way detection (player): sustained race-score regression
    const p = this.player;
    const st = p.state;
    if (!st.falling && !st.finished && this.time > 2) {
      const score = raceScore(st, this.level);
      const speed = Math.hypot(st.vx, st.vz);
      const delta = p._lastScore !== undefined ? score - p._lastScore : 0;
      p._lastScore = score;
      if (speed > 1.6 && delta < -0.001 && delta > -50) p.wrongWayTimer += dt;
      else p.wrongWayTimer = Math.max(0, p.wrongWayTimer - dt * 2);
      p.wrongWay = p.wrongWayTimer > 1.1;
    } else {
      p._lastScore = raceScore(st, this.level);
      p.wrongWay = false;
    }

    const standingsAfter = this.positionOf(this.player);
    if (standingsAfter !== standingsBefore) {
      events.push({ type: 'position', from: standingsBefore, to: standingsAfter });
    }
    return events;
  }
}

export { CAR };
