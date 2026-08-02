// ============================================================
// LEVEL 3 — "Garden Gauntlet"
// Raised lawn bed: sandbox, hose slalom, pond (water hazard),
// flower pots, puddles, hedges & fences.
// ============================================================
import { buildGates } from '../progress.js';

const solids = [
  // sandbox (top-left block)
  { prop: 'sandbox', kind: 'box', x: -8.1, z: -5.6, w: 6.4, d: 3.8, rot: 0 },
  // boundary greenery
  { prop: 'hedge', kind: 'seg', x1: -2.2, z1: -6.7, x2: 11.4, z2: -6.7, r: 0.42 },
  { prop: 'hedge', kind: 'seg', x1: -11.45, z1: 1.25, x2: -11.45, z2: 7.1, r: 0.42 },
  { prop: 'fence', kind: 'seg', x1: 5.0, z1: 7.2, x2: 11.4, z2: 7.2, r: 0.34 },
  // garden hose slalom (mid-left)
  { prop: 'hose', kind: 'multi', points: [[-2.6, -2.3], [-1.4, -0.75], [-2.3, 0.95], [-1.05, 2.5], [-2.0, 3.85]], r: 0.3 },
  // pots & cans
  { prop: 'flowerpot', kind: 'circle', x: 3.1, z: 4.0, r: 0.72, opts: { color: 0xe2543e } },
  { prop: 'flowerpot', kind: 'circle', x: 0.95, z: -3.7, r: 0.72, opts: { color: 0xd44e9a } },
  { prop: 'flowerpot', kind: 'circle', x: 9.1, z: 0.1, r: 0.72, opts: { color: 0xf2b01e } },
  { prop: 'flowerpot', kind: 'circle', x: -8.45, z: 5.25, r: 0.72, opts: { color: 0xa04ec2 } },
  { prop: 'wateringcan', kind: 'circle', x: -5.6, z: 0.75, r: 0.5 },
  { prop: 'trowel', kind: 'box', x: 6.8, z: 5.9, w: 1.7, d: 0.45, rot: -0.5 },
  { prop: 'gnome', kind: 'deco', x: -9.9, z: 6.2 },
  // water
  { prop: 'pond', kind: 'hole', x: 7.45, z: 2.3, r: 1.5 },
  { prop: 'puddle', kind: 'zone', x: 2.5, z: 0.6, r: 1.45, grip: 0.28, zoneKind: 'puddle' },
  { prop: 'puddle', kind: 'zone', x: -5.5, z: -2.5, r: 1.3, grip: 0.28, zoneKind: 'puddle' },
  // sandy apron below the sandbox: slow
  { prop: 'sandstripe', kind: 'zone', shape: { type: 'rect', x: -8.1, z: -3.1, w: 6.6, d: 1.5, rot: 0 }, grip: 0.92, drag: 4.0, zoneKind: 'sand' },
  // pebbles (corner-cutting deterrents)
  { prop: 'pebble', kind: 'circle', x: 2.3, z: -6.15, r: 0.2 },
  { prop: 'pebble', kind: 'circle', x: 3.55, z: -6.12, r: 0.24 },
  { prop: 'pebble', kind: 'circle', x: 9.6, z: -6.2, r: 0.19 },
];

const boosts = [
  { x: -0.6, z: 5.5 },
  { x: 6.4, z: -5.3 },
  { x: -4.4, z: 0.0 },
];

const gates = buildGates([
  { x: -3.7, z: 5.45, half: 2.2 },
  { x: 1.25, z: 5.6, half: 2.2 },
  { x: 5.6, z: 5.4, half: 2.0 },
  { x: 9.3, z: 4.8, half: 2.0 },
  { x: 10.1, z: 1.4, half: 1.8, vmax: 3.4 },
  { x: 10.05, z: -2.5, half: 1.8, vmax: 3.4 },
  { x: 8.05, z: -5.1, half: 2.0 },
  { x: 3.4, z: -5.5, half: 2.2 },
  { x: -0.75, z: -5.55, half: 2.2 },
  { x: -4.0, z: -5.2, half: 2.0 },
  { x: -4.3, z: -1.85, half: 1.9 },
  { x: -4.5, z: 1.85, half: 1.9 },
  { x: -5.55, z: 4.5, half: 2.0 },
]);

export const data = {
  id: 'garden',
  num: 3,
  name: 'GARDEN GAUNTLET',
  subtitle: "Don't feed the pond",
  width: 23, depth: 15.2,
  laps: 3,
  solids, gates, boosts,
  theme: {
    sky: 0xbfe8ff, ground: 0x4a7a3a,
    hemiSky: 0xd8f0ff, hemiGround: 0x5d8a48, hemiInt: 0.75,
    sunColor: 0xfff4d8, sunInt: 2.2,
    floorColor: 0x33424c,
  },
};
