// ============================================================
// guidance.js — track guidance decals baked from level data:
//  • dashed racing line along the gate polyline
//  • chevron arrows on corners (>0.3 rad turn)
//  • red/white warning stripes near open table edges
// All flat meshes; merged/occluded against collision geometry.
// ============================================================
import * as THREE from 'three';

function distToSeg(x, z, ax, az, bx, bz) {
  const abx = bx - ax, abz = bz - az;
  const len2 = abx * abx + abz * abz;
  let t = len2 > 1e-9 ? ((x - ax) * abx + (z - az) * abz) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (ax + abx * t), z - (az + abz * t));
}

function clearance(level, x, z, cushion = 0.32) {
  for (const c of level.circles) if (Math.hypot(x - c.x, z - c.z) < c.r + cushion) return false;
  for (const w of level.walls) if (distToSeg(x, z, w[0], w[1], w[2], w[3]) < (w[4] || 0) + cushion) return false;
  for (const h of (level.holes || [])) if (Math.hypot(x - h.x, z - h.z) < h.r + cushion) return false;
  return true;
}

// flat chevron arrow: tip at +Y in shape space. Use group.rotation.y = facing + PI.
export function makeArrowDecal(size, color, opacity) {
  const s = size;
  const shape = new THREE.Shape();
  shape.moveTo(0, s * 0.42);
  shape.lineTo(s * 0.34, -s * 0.06);
  shape.lineTo(s * 0.15, -s * 0.02);
  shape.lineTo(0, s * 0.2);
  shape.lineTo(-s * 0.15, -s * 0.02);
  shape.lineTo(-s * 0.34, -s * 0.06);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  const g = new THREE.Group();
  g.add(m);
  return g;
}

function warningStripeTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f2efe6';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#c9302c';
  for (let i = -2; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 48, 64);
    ctx.lineTo(i * 48 + 40, 0);
    ctx.lineTo(i * 48 + 72, 0);
    ctx.lineTo(i * 48 + 32, 64);
    ctx.closePath();
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
let _stripeTex = null;

function makeWarningStripe(w, d) {
  if (!_stripeTex) _stripeTex = warningStripeTexture();
  const mat = new THREE.MeshBasicMaterial({ map: _stripeTex, transparent: true, opacity: 0.92, depthWrite: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2;
  const g = new THREE.Group();
  g.add(m);
  return g;
}

export function buildGuidance(level) {
  const group = new THREE.Group();
  const gates = level.gates;
  const n = gates.length;

  // ---------- 1) dashed racing line (merged quads) ----------
  const dashLen = 0.58, dashW = 0.14, step = 1.35;
  const positions = [];
  for (let i = 0; i < n; i++) {
    const a = gates[i], b = gates[(i + 1) % n];
    const dx = b.x - a.x, dz = b.z - a.z;
    const segLen = Math.hypot(dx, dz);
    const ux = dx / segLen, uz = dz / segLen;         // along
    const px = -uz, pz = ux;                           // perpendicular
    const count = Math.max(1, Math.floor(segLen / step));
    for (let k = 0; k < count; k++) {
      const t = (k + 0.5) / count;
      const cx = a.x + dx * t, cz = a.z + dz * t;
      if (!clearance(level, cx, cz, 0.4)) continue;
      const hl = dashLen / 2, hw = dashW / 2;
      // quad corners
      const c1 = [cx - ux * hl - px * hw, 0.01, cz - uz * hl - pz * hw];
      const c2 = [cx + ux * hl - px * hw, 0.01, cz + uz * hl - pz * hw];
      const c3 = [cx + ux * hl + px * hw, 0.01, cz + uz * hl + pz * hw];
      const c4 = [cx - ux * hl + px * hw, 0.01, cz - uz * hl + pz * hw];
      positions.push(...c1, ...c2, ...c3, ...c1, ...c3, ...c4);
    }
  }
  const dashGeo = new THREE.BufferGeometry();
  dashGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  const dashes = new THREE.Mesh(dashGeo, new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false,
  }));
  dashes.renderOrder = 1;
  group.add(dashes);

  // ---------- 2) corner chevrons ----------
  for (let i = 0; i < n; i++) {
    const prev = gates[(i - 1 + n) % n], next = gates[(i + 1) % n];
    const a = Math.atan2(gates[i].x - prev.x, gates[i].z - prev.z);
    const b = Math.atan2(next.x - gates[i].x, next.z - gates[i].z);
    let turn = b - a;
    while (turn > Math.PI) turn -= 2 * Math.PI;
    while (turn < -Math.PI) turn += 2 * Math.PI;
    if (Math.abs(turn) < 0.3) continue;
    if (!clearance(level, gates[i].x, gates[i].z, 0.3)) continue;
    const arrow = makeArrowDecal(1.05, 0xffffff, 0.5);
    arrow.position.set(gates[i].x, 0.015, gates[i].z);
    arrow.rotation.y = Math.atan2(gates[i].dx, gates[i].dz) + Math.PI;
    arrow.renderOrder = 2;
    group.add(arrow);
  }

  // ---------- 3) edge warning stripes (open-edge tables only) ----------
  if (level.id !== 'pool') {
    const hw = level.width / 2, hd = level.depth / 2;
    const placed = [];
    for (const g of gates) {
      let outX = 0, outZ = 0;
      if (Math.abs(g.x) > hw - 1.6) outX = Math.sign(g.x);
      if (Math.abs(g.z) > hd - 1.6) outZ = Math.sign(g.z);
      if (!outX && !outZ) continue;
      const len = Math.hypot(outX, outZ);
      outX /= len; outZ /= len;
      const sx = g.x + outX * 1.35, sz = g.z + outZ * 1.35;
      // skip if there's already a wall covering this edge here
      let walled = false;
      for (const w of level.walls) {
        if (distToSeg(sx, sz, w[0], w[1], w[2], w[3]) < 0.9) { walled = true; break; }
      }
      if (walled) continue;
      if (placed.some(([px, pz]) => Math.hypot(px - sx, pz - sz) < 1.8)) continue;
      placed.push([sx, sz]);
      const alongX = Math.abs(outZ) > Math.abs(outX); // stripe runs perpendicular to outward dir
      const stripe = makeWarningStripe(alongX ? 2.6 : 0.36, alongX ? 0.36 : 2.6);
      stripe.position.set(sx, 0.012, sz);
      stripe.renderOrder = 1;
      group.add(stripe);
    }
  }

  return group;
}
