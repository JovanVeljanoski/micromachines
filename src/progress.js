// ============================================================
// progress.js — gate/lap tracking, ranking, respawns. Pure.
// Gates are directed planes: {x, z, dx, dz (unit travel dir), half}
// Crossing gate i (in travel direction) advances nextGate.
// ============================================================

export function updateProgress(car, level) {
  const gates = level.gates;
  const g = gates[car.nextGate];

  // signed distance along gate normal (travel dir)
  const s = (car.x - g.x) * g.dx + (car.z - g.z) * g.dz;
  const t = (car.x - g.x) * -g.dz + (car.z - g.z) * g.dx; // lateral

  // forward crossing: s transitions from <=0 to >0 within gate width
  const prevS = car._gs !== undefined ? car._gs : gateSide(car, level, car.nextGate);
  if (prevS <= 0 && s > 0 && Math.abs(t) <= g.half) {
    car.lastGate = car.nextGate;
    car.nextGate = (car.nextGate + 1) % gates.length;
    if (car.nextGate === 1) car.lap++;      // crossed start line after full loop
    car._gs = undefined;
    return { passed: car.lastGate, lap: car.lap };
  }
  car._gs = s;
  return null;
}

function gateSide(car, level, idx) {
  const g = level.gates[idx];
  return (car.x - g.x) * g.dx + (car.z - g.z) * g.dz;
}

// Race ranking score: bigger = further along
export function raceScore(car, level) {
  const gates = level.gates;
  const g = gates[car.nextGate];
  const dx = car.x - g.x, dz = car.z - g.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  return car.lap * 10000 + car.nextGate * 100 - dist;
}

// Where to respawn: at last passed gate, facing travel direction.
export function respawnPose(car, level) {
  const g = level.gates[car.lastGate];
  const back = 0.0;
  return {
    x: g.x - g.dx * back,
    z: g.z - g.dz * back,
    heading: Math.atan2(g.dx, g.dz),
  };
}

// Build gates from plain points: [{x, z, half}] in loop order.
// Direction = normalize(next - prev).
export function buildGates(points) {
  const n = points.length;
  return points.map((p, i) => {
    const prev = points[(i - 1 + n) % n], next = points[(i + 1) % n];
    let dx = next.x - prev.x, dz = next.z - prev.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    return { x: p.x, z: p.z, dx, dz, half: p.half || 1.4 };
  });
}

// Spawn grid: two columns straddling start line gate 0.
export function buildSpawns(gate0, count = 4, lateral = 0.42, back0 = 0.55, rowGap = 0.5) {
  const spawns = [];
  const heading = Math.atan2(gate0.dx, gate0.dz);
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / 2);
    const side = i % 2 === 0 ? -1 : 1;
    const back = back0 + row * rowGap;
    const lat = side * lateral;
    spawns.push({
      x: gate0.x - gate0.dx * back + (-gate0.dz) * lat,
      z: gate0.z - gate0.dz * back + gate0.dx * lat,
      heading,
    });
  }
  return spawns;
}
