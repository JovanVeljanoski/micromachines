// ============================================================
// levelScene.js — assembles the full 3D scene for a level:
// room, table, all solid props (via PROPS registry), pool rails,
// start line, boost pads.
// ============================================================
import * as THREE from 'three';
import * as TX from './textures.js';
import * as P from './props.js';
import { buildGuidance } from './guidance.js';

const M = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...opts });

export function buildLevelScene(level) {
  const root = new THREE.Group();
  const th = level.theme;

  // ---- room floor ----
  if (!th.spot) {
    root.add(P.makeRoomFloor(th));
  } else {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshBasicMaterial({ color: th.floorColor }));
    f.rotation.x = -Math.PI / 2; f.position.y = -6.2;
    root.add(f);
  }

  // ---- table top ----
  root.add(makeTableFor(level));

  // ---- pool rails/cushions (structural, drawn around cushions) ----
  if (level.id === 'pool') buildPoolRails(root, level);

  // ---- solids → props ----
  for (const s of level.solids) {
    const builder = P.PROPS[s.prop];
    if (!builder) continue;             // e.g. cushion/jaw: visuals in buildPoolRails
    const obj = builder(s);
    if (obj) root.add(obj);
  }

  // ---- start line + boost pads ----
  root.add(P.makeStartLine(level.gates[0]));
  const boostPads = level.boosts.map(b => P.makeBoostPad(b.x, b.z, boostFacing(level, b)));
  for (const bp of boostPads) root.add(bp);

  // ---- track guidance (dashed line, corner chevrons, edge warnings) ----
  root.add(buildGuidance(level));

  return { root, boostPads };
}

function makeTableFor(level) {
  const { width: w, depth: d } = level;
  let topMat, opts = { thick: 0.5, skirt: true };
  if (level.id === 'desktop') {
    topMat = new THREE.MeshStandardMaterial({ map: TX.wood('#9a6b3f', '#7c5230', 9, 1024), roughness: 0.45 });
    topMat.map.repeat.set(5.0, 3.5);
  } else if (level.id === 'breakfast') {
    topMat = new THREE.MeshStandardMaterial({ map: TX.gingham(512, 14), roughness: 0.75 });
    topMat.map.repeat.set(7.4, 5.1);
  } else if (level.id === 'garden') {
    topMat = new THREE.MeshStandardMaterial({ map: TX.grass(), roughness: 0.95 });
    topMat.map.repeat.set(9.5, 6.5);
    opts = { thick: 0.9, skirt: false };
    const g = new THREE.Group();
    g.add(P.makeTable(w, d, topMat, opts));
    // wooden surround + soil sides
    const soilM = M(0x4a3520, { roughness: 1 });
    const rimM = M(0x6b4a28, { roughness: 0.8 });
    for (const [bw, bd, x, z] of [
      [w + 1, 0.5, 0, -d / 2 - 0.25], [w + 1, 0.5, 0, d / 2 + 0.25],
      [0.5, d + 1, -w / 2 - 0.25, 0], [0.5, d + 1, w / 2 + 0.25, 0]]) {
      const rim = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.5, bd), rimM);
      rim.position.set(x, -0.3, z);
      rim.castShadow = rim.receiveShadow = true;
      g.add(rim);
    }
    const soil = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 1.2, d + 0.4), soilM);
    soil.position.y = -0.95;
    soil.castShadow = true;
    g.add(soil);
    return g;
  } else if (level.id === 'pool') {
    topMat = new THREE.MeshStandardMaterial({ map: TX.poolFelt(), roughness: 0.95 });
    topMat.map.repeat.set(2.6, 1.6);
    opts = { thick: 0.55, skirt: false };
  }
  return P.makeTable(w, d, topMat, opts);
}

function boostFacing(level, b) {
  let best = null, bd = Infinity;
  for (const g of level.gates) {
    const d2 = (g.x - b.x) ** 2 + (g.z - b.z) ** 2;
    if (d2 < bd) { bd = d2; best = g; }
  }
  return best ? Math.atan2(best.dx, best.dz) : 0;
}

// Pool table furniture beyond the playfield
function buildPoolRails(root, level) {
  const HX = level.width / 2, HZ = level.depth / 2;
  const cushW = 0.5;
  const feltM = M(0x2f8f3e, { roughness: 0.95 });
  const railMat = M(0x6b4226, { roughness: 0.38 });

  const box = (w, d, x, z, y, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, y * 2, d), mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    root.add(m);
    return m;
  };

  // corner pocket mouth angles (45° cushion nubs)
  const nub = (x, z, rot) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.5), feltM);
    m.position.set(x, 0.21, z); m.rotation.y = rot;
    m.castShadow = m.receiveShadow = true;
    root.add(m);
  };

  // cushion covers (visual shell over collision segs) — top/bottom pairs split at side pockets
  for (const zs of [-1, 1]) {
    box(4.4, cushW, -3.9 - 0.7, zs * (HZ + cushW / 2), 0.21, feltM);
    box(4.4, cushW, 3.9 + 0.7, zs * (HZ + cushW / 2), 0.21, feltM);
  }
  box(cushW, HZ * 2 - 1.7, -HX - cushW / 2, 0, 0.21, feltM);
  box(cushW, HZ * 2 - 1.7, HX + cushW / 2, 0, 0.21, feltM);

  // jaws at side pockets
  nub(-1.55, -HZ - 0.28, -0.66); nub(1.55, -HZ - 0.28, 0.66);
  nub(-1.55, HZ + 0.28, 0.66); nub(1.55, HZ + 0.28, -0.66);

  // wooden rail frame
  const railW = 0.66, railH = 0.26;
  const off = cushW + railW / 2;
  box(HX * 2 + cushW * 2 + railW * 2, railW, 0, -HZ - off, railH, railMat);
  box(HX * 2 + cushW * 2 + railW * 2, railW, 0, HZ + off, railH, railMat);
  box(railW, HZ * 2 + cushW * 2, -HX - off, 0, railH, railMat);
  box(railW, HZ * 2 + cushW * 2, HX + off, 0, railH, railMat);

  // diamond sights
  const sightM = M(0xd8cdb0, { roughness: 0.3 });
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    for (const zs of [-1, 1]) {
      const s = new THREE.Mesh(new THREE.CircleGeometry(0.07, 4), sightM);
      s.rotation.x = -Math.PI / 2; s.rotation.z = Math.PI / 4;
      s.position.set(i * 2.15, railH * 2 + 0.002, zs * (HZ + off));
      root.add(s);
    }
  }
  for (let i = -1; i <= 1; i++) {
    if (i === 0) continue;
    for (const xs of [-1, 1]) {
      const s = new THREE.Mesh(new THREE.CircleGeometry(0.07, 4), sightM);
      s.rotation.x = -Math.PI / 2; s.rotation.z = Math.PI / 4;
      s.position.set(xs * (HX + off), railH * 2 + 0.002, i * 1.5);
      root.add(s);
    }
  }

  // hanging lamp trio with glowing bulbs (decor: casts NO shadow)
  const lampG = new THREE.Group();
  const shadeM = M(0x1e5f3a, { roughness: 0.3, side: THREE.DoubleSide });
  for (let i = -1; i <= 1; i++) {
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.7, 20, 1, true), shadeM);
    shade.position.set(i * 4.2, 5.8, 0);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff2cc }));
    bulb.position.set(i * 4.2, 5.55, 0);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 5, 6), M(0x111111));
    cord.position.set(i * 4.2, 8.3, 0);
    lampG.add(shade, bulb, cord);
  }
  lampG.traverse(o => { o.castShadow = false; o.receiveShadow = false; });
  root.add(lampG);
}
