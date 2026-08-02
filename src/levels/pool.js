// ============================================================
// LEVEL 4 — "Pool Hall Hustle"
// Green felt arena under the hanging lamp: cushions, six hungry
// pockets, billiard-ball slalom. Fully enclosed - except pockets!
// ============================================================
import { buildGates } from '../progress.js';

const HX = 7.7, HZ = 4.45;   // playfield half-extents (cushion faces)

const solids = [
  // top/bottom cushions (split at side pockets)
  { prop: 'cushion', kind: 'seg', x1: -6.75, z1: -HZ, x2: -1.0, z2: -HZ, r: 0 },
  { prop: 'cushion', kind: 'seg', x1: 1.0, z1: -HZ, x2: 6.75, z2: -HZ, r: 0 },
  { prop: 'cushion', kind: 'seg', x1: -6.75, z1: HZ, x2: -1.0, z2: HZ, r: 0 },
  { prop: 'cushion', kind: 'seg', x1: 1.0, z1: HZ, x2: 6.75, z2: HZ, r: 0 },
  // left/right cushions
  { prop: 'cushion', kind: 'seg', x1: -HX, z1: -3.4, x2: -HX, z2: 3.4, r: 0 },
  { prop: 'cushion', kind: 'seg', x1: HX, z1: -3.4, x2: HX, z2: 3.4, r: 0 },
  // side-pocket jaws (45°)
  { prop: 'jaw', kind: 'seg', x1: -2.1, z1: -HZ + 0.85, x2: -1.0, z2: -HZ, r: 0 },
  { prop: 'jaw', kind: 'seg', x1: 1.0, z1: -HZ, x2: 2.1, z2: -HZ + 0.85, r: 0 },
  { prop: 'jaw', kind: 'seg', x1: -2.1, z1: HZ - 0.85, x2: -1.0, z2: HZ, r: 0 },
  { prop: 'jaw', kind: 'seg', x1: 1.0, z1: HZ, x2: 2.1, z2: HZ - 0.85, r: 0 },
  // ball slalom
  { prop: 'poolball', kind: 'circle', x: 0, z: 0, r: 0.4, opts: { color: 0x141414 } },
  { prop: 'poolball', kind: 'circle', x: 2.3, z: 0.85, r: 0.38, opts: { color: 0xd43a2f } },
  { prop: 'poolball', kind: 'circle', x: 3.4, z: -0.7, r: 0.38, opts: { color: 0xf2b01e } },
  { prop: 'poolball', kind: 'circle', x: 4.5, z: 0.75, r: 0.38, opts: { color: 0x2f6fd4 } },
  { prop: 'poolball', kind: 'circle', x: -2.3, z: -0.85, r: 0.38, opts: { color: 0x7a3ac2 } },
  { prop: 'poolball', kind: 'circle', x: -3.4, z: 0.7, r: 0.38, opts: { color: 0xe07a2a } },
  { prop: 'poolball', kind: 'circle', x: -4.5, z: -0.75, r: 0.38, opts: { color: 0x2e8f5a } },
  // extras
  { prop: 'rack', kind: 'box', x: -6.9, z: -3.6, w: 1.15, d: 0.95, rot: 0.5 },
  { prop: 'chalk', kind: 'box', x: 6.7, z: 3.5, w: 0.42, d: 0.42, rot: 0.3 },
  { prop: 'cue', kind: 'deco', x: 8.9, z: 0.6, rot: 0.12 },
  // pockets! fall holes
  { prop: 'pocket', kind: 'hole', x: -7.35, z: -4.1, r: 0.55 },
  { prop: 'pocket', kind: 'hole', x: 7.35, z: -4.1, r: 0.55 },
  { prop: 'pocket', kind: 'hole', x: -7.35, z: 4.1, r: 0.55 },
  { prop: 'pocket', kind: 'hole', x: 7.35, z: 4.1, r: 0.55 },
  { prop: 'pocket', kind: 'hole', x: 0, z: -4.62, r: 0.52 },
  { prop: 'pocket', kind: 'hole', x: 0, z: 4.62, r: 0.52 },
];

const boosts = [
  { x: 5.3, z: -3.1 },
  { x: -7.1, z: 0.15 },
  { x: -0.8, z: 3.3 },
];

const gates = buildGates([
  { x: 0, z: 3.15, half: 2.0 },
  { x: 4.3, z: 3.3, half: 2.0 },
  { x: 6.75, z: 2.1, half: 1.8 },
  { x: 7.0, z: -0.3, half: 1.8 },
  { x: 6.4, z: -2.65, half: 1.8 },
  { x: 3.5, z: -3.4, half: 2.0 },
  { x: -1.35, z: -3.45, half: 2.0 },
  { x: -5.9, z: -2.85, half: 1.8 },
  { x: -6.95, z: -1.1, half: 1.8 },
  { x: -6.75, z: 1.6, half: 1.8 },
  { x: -4.7, z: 3.05, half: 2.0 },
  { x: -2.15, z: 3.3, half: 2.0 },
]);

export const data = {
  id: 'pool',
  num: 4,
  name: 'POOL HALL HUSTLE',
  subtitle: 'Eight ball, corner pocket',
  width: HX * 2, depth: HZ * 2,
  laps: 4,
  solids, gates, boosts,
  theme: {
    sky: 0x0f1a14, ground: 0x1c3a2a,
    hemiSky: 0xb8d8c8, hemiGround: 0x2a4030, hemiInt: 0.8,
    sunColor: 0xfff0d0, sunInt: 1.5,
    floorColor: 0x17110c,
    spot: true,
  },
};
