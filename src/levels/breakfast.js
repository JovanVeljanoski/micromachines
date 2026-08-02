// ============================================================
// LEVEL 2 — "Breakfast Grand Prix"
// Gingham tablecloth, cereal box, toast chicane, milk spill,
// sticky jam, waffle plate. Runs CLOCKWISE for variety.
// ============================================================
import { buildGates } from '../progress.js';

const solids = [
  { prop: 'cerealbox', kind: 'box', x: 0.6, z: -0.9, w: 3.9, d: 2.3, rot: -0.06 },
  // toast chicane (right) — staggered, with room to breathe
  { prop: 'toast', kind: 'box', x: 5.9, z: 2.0, w: 1.45, d: 1.45, rot: 0.7 },
  { prop: 'toast', kind: 'box', x: 7.05, z: -0.6, w: 1.45, d: 1.45, rot: -0.35 },
  { prop: 'bowl', kind: 'circle', x: 4.1, z: -2.9, r: 1.35 },
  { prop: 'milkbottle', kind: 'circle', x: -4.0, z: -2.3, r: 0.62 },
  { prop: 'jamjar', kind: 'circle', x: -6.75, z: 1.65, r: 0.66 },
  { prop: 'ojglass', kind: 'circle', x: 9.35, z: -5.7, r: 0.78 },
  { prop: 'butterdish', kind: 'box', x: -7.2, z: 6.2, w: 3.0, d: 1.2, rot: 0.02 },
  { prop: 'napkin', kind: 'box', x: 9.15, z: 6.05, w: 2.0, d: 1.5, rot: 0.3 },
  { prop: 'platewaffle', kind: 'zone', x: 7.6, z: -5.3, r: 1.65, grip: 1, drag: 3.0, zoneKind: 'plate' },
  // surface hazards / decorations
  // hazards hug the inside lane: cut the corner = risk the goo
  { prop: 'spill', kind: 'zone', x: 1.6, z: 2.5, r: 1.8, grip: 0.28, zoneKind: 'milk', opts: { color: 0xf7f2e2, opacity: 0.92 } },
  { prop: 'spill', kind: 'zone', x: -3.9, z: 3.6, r: 1.15, grip: 0.5, drag: 2.6, zoneKind: 'jam', opts: { color: 0xc24577, opacity: 0.9 } },
  { prop: 'spoon', kind: 'deco', x: -1.85, z: -4.5, rot: 0.5 },
  { prop: 'spoon', kind: 'deco', x: 2.6, z: 5.9, rot: -1.1 },
  { prop: 'toastdeco', kind: 'deco', x: -9.3, z: -5.4 },
];

const boosts = [
  { x: -0.3, z: -5.2 },
  { x: 5.0, z: 4.55 },
  { x: -8.5, z: 2.2 },
];

// clockwise: start travels toward -X
const gates = buildGates([
  { x: 0.5, z: 4.7, half: 2.2 },
  { x: -5.3, z: 4.95, half: 2.2 },
  { x: -8.35, z: 3.4, half: 2.0 },
  { x: -8.7, z: -0.6, half: 2.0 },
  { x: -7.1, z: -4.2, half: 2.0 },
  { x: -2.8, z: -5.2, half: 2.2 },
  { x: 2.5, z: -5.1, half: 2.2 },
  { x: 6.8, z: -4.3, half: 2.0, vmax: 3.1 },
  { x: 8.6, z: -1.6, half: 2.0, vmax: 3.3 },
  { x: 8.7, z: 1.9, half: 2.0 },
  { x: 6.2, z: 4.25, half: 2.2 },
  { x: 3.4, z: 4.8, half: 2.2 },
]);

export const data = {
  id: 'breakfast',
  num: 2,
  name: 'BREAKFAST GRAND PRIX',
  subtitle: 'Mind the milk spill!',
  width: 21, depth: 14.5,
  laps: 3,
  solids, gates, boosts,
  theme: {
    sky: 0xffe8c9, ground: 0x8a4a3a,
    hemiSky: 0xfff1dd, hemiGround: 0x9a5c46, hemiInt: 0.7,
    sunColor: 0xffe6b8, sunInt: 1.9,
    floorColor: 0x50372b,
  },
};
