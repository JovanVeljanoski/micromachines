// ============================================================
// LEVEL 1 — "Desktop Derby"
// A huge wooden desk: book stack, mug + coffee spill, keyboard,
// pencils, ruler, stapler, mouse... Open edges = falling off.
// ============================================================
import { buildGates } from '../progress.js';

const solids = [
  // --- center: book stack ---
  { prop: 'book', kind: 'box', x: -0.3, z: -0.45, w: 4.8, d: 3.4, rot: 0.04, opts: { h: 0.5, color: 0x2f6fd4, title: 'RACING LEGENDS' } },
  { prop: 'book', kind: 'box', x: -0.5, z: -0.1, w: 4.2, d: 3.0, rot: -0.07, opts: { h: 0.44, lift: 0.5, color: 0xc23b2e, title: 'TURBO TALES' } },
  // --- right corridor ---
  { prop: 'mug', kind: 'circle', x: 6.75, z: -1.3, r: 0.75, opts: { color: 0x2f8f4e } },
  { prop: 'spill', kind: 'zone', x: 5.95, z: -2.75, r: 1.5, grip: 0.3, zoneKind: 'coffee', opts: { color: 0x3a2410, opacity: 0.8 } },
  { prop: 'ring', kind: 'deco', x: 3.1, z: -3.9, r: 0.85 },
  { prop: 'ring', kind: 'deco', x: -4.9, z: 3.6, r: 0.7 },
  { prop: 'ring', kind: 'deco', x: 8.1, z: 5.6, r: 0.95 },
  { prop: 'stapler', kind: 'box', x: 4.5, z: 1.95, w: 1.9, d: 0.7, rot: 0.5 },
  // --- top edge ---
  { prop: 'keyboard', kind: 'box', x: 0.9, z: -6.6, w: 7.1, d: 1.4, rot: 0.01 },
  { prop: 'cd', kind: 'deco', x: 3.4, z: -6.55 },
  { prop: 'note', kind: 'deco', x: -5.1, z: -6.05, rot: 0.2, opts: { text: 'BUY\nMILK', bg: '#fff36e' } },
  // --- left corridor ---
  { prop: 'mouse', kind: 'circle', x: -4.6, z: 0.85, r: 0.6 },
  { prop: 'pencable', kind: 'deco', x: 0, z: 0 },   // mouse cable
  { prop: 'pen', kind: 'seg', x1: -7.35, z1: 0.6, x2: -5.95, z2: 2.9, r: 0.11, opts: { color: 0x3046c2 } },
  { prop: 'eraser', kind: 'box', x: -2.0, z: 2.3, w: 1.05, d: 0.62, rot: -0.3 },
  // --- bottom / edges ---
  { prop: 'pencil', kind: 'seg', x1: -9.1, z1: 6.5, x2: -4.0, z2: 6.7, r: 0.14, opts: { color: 0xf2b01e } },
  { prop: 'pencil', kind: 'seg', x1: 2.0, z1: 6.6, x2: 7.6, z2: 6.1, r: 0.14, opts: { color: 0x3f8f4a } },
  { prop: 'ruler', kind: 'seg', x1: 10.05, z1: -5.4, x2: 10.05, z2: 1.9, r: 0.23 },
  { prop: 'paperstack', kind: 'box', x: -9.35, z: 5.65, w: 2.3, d: 1.7, rot: 0.15 },
  { prop: 'note', kind: 'deco', x: 9.2, z: 4.5, rot: -0.4, opts: { text: 'RACE\nDAY!', bg: '#ffb3c7' } },
];

const boosts = [
  { x: 4.0, z: -5.15 },
  { x: 8.45, z: -2.5 },
  { x: -8.5, z: 0.3 },
];

const gates = buildGates([
  { x: 0.0, z: 4.7, half: 2.2 },
  { x: 5.0, z: 4.95, half: 2.2 },
  { x: 8.3, z: 3.6, half: 2.0 },
  { x: 8.6, z: 0.3, half: 2.0 },
  { x: 7.6, z: -3.6, half: 2.0 },
  { x: 3.1, z: -5.1, half: 2.2 },
  { x: -2.2, z: -5.2, half: 2.2 },
  { x: -6.7, z: -4.5, half: 2.0 },
  { x: -8.55, z: -1.55, half: 2.0 },
  { x: -8.6, z: 2.0, half: 2.0 },
  { x: -6.5, z: 4.35, half: 2.2 },
  { x: -2.8, z: 4.9, half: 2.2 },
]);

export const data = {
  id: 'desktop',
  num: 1,
  name: 'DESKTOP DERBY',
  subtitle: 'Coffee rings & pencil curves',
  width: 21, depth: 14.5,
  laps: 3,
  solids, gates, boosts,
  theme: {
    sky: 0xbfd4f2, ground: 0x6b4f35,
    hemiSky: 0xcfe0f7, hemiGround: 0x7a5c40, hemiInt: 0.65,
    sunColor: 0xfff2dd, sunInt: 2.0,
    floorColor: 0x3a2e24,
  },
};
