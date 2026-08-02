// ============================================================
// props.js — procedural prop builders + PROPS registry.
// Every builder takes a level "solid" spec, so visuals always
// match collision data exactly.
// ============================================================
import * as THREE from 'three';
import * as TX from './textures.js';
import { makeArrowDecal } from './guidance.js';

const M = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...opts });

function shadowed(g) { g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; }

// ============================================================
// Table + room
// ============================================================
export function makeTable(w, d, topMat, { thick = 0.5, skirt = true } = {}) {
  const g = new THREE.Group();
  const sideMat = M(0x5a3d24, { roughness: 0.8 });
  const mats = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, thick, d), mats);
  top.position.y = -thick / 2;
  top.receiveShadow = true; top.castShadow = true;
  g.add(top);
  if (skirt) {
    const m = M(0x4a3018, { roughness: 0.85 });
    const sh = 0.22, inset = 0.12;
    for (const [bw, bd, x, z] of [
      [w - inset * 2, 0.12, 0, d / 2 - inset], [w - inset * 2, 0.12, 0, -d / 2 + inset],
      [0.12, d - inset * 2, w / 2 - inset, 0], [0.12, d - inset * 2, -w / 2 + inset, 0]]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(bw, sh, bd), m);
      s.position.set(x, -thick - sh / 2 + 0.02, z);
      s.castShadow = s.receiveShadow = true;
      g.add(s);
    }
  }
  const legMat = M(0x3c2812, { roughness: 0.85 });
  const lx = w / 2 - 0.6, lz = d / 2 - 0.6;
  for (const [x, z] of [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 4.4, 10), legMat);
    leg.position.set(x, -thick / 2 - 2.2, z);
    leg.castShadow = true;
    g.add(leg);
  }
  return g;
}

export function makeRoomFloor(theme) {
  const mat = new THREE.MeshStandardMaterial({ map: TX.floorBoards(), roughness: 0.9 });
  mat.map.repeat.set(12, 12);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), mat);
  f.rotation.x = -Math.PI / 2;
  f.position.y = -4.55;
  f.receiveShadow = true;
  return f;
}

// ============================================================
// Desk props
// ============================================================
function propBook(s) {
  const g = new THREE.Group();
  const { w, d, rot = 0, opts } = s;
  const h = opts.h || 0.4, lift = opts.lift || 0;
  const cover = new THREE.Mesh(
    new THREE.BoxGeometry(w, h * 0.62, d),
    [M(0xe8e0c8), M(0xe8e0c8),
     new THREE.MeshStandardMaterial({ map: TX.bookCover(opts.color, opts.title), roughness: 0.6 }),
     M(opts.color), M(opts.color), M(opts.color)]
  );
  cover.position.y = h * 0.69;
  const pages = new THREE.Mesh(new THREE.BoxGeometry(w * 0.97, h * 0.5, d * 0.96),
    new THREE.MeshStandardMaterial({ map: TX.pageLines(), roughness: 0.95 }));
  pages.position.y = h * 0.26;
  g.add(cover, pages);
  g.position.set(s.x, lift, s.z);
  g.rotation.y = rot;
  return shadowed(g);
}

function propMug(s) {
  const g = new THREE.Group();
  const col = M(s.opts?.color ?? 0x2f8f4e, { roughness: 0.22 });
  const r = s.r;
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, r * 1.7, 26), col);
  c.position.y = r * 0.85;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(r * 0.55, r * 0.14, 10, 20), col);
  const a = (s.x * 13 + s.z * 7) % 6.28;
  handle.position.set(Math.cos(a) * r * 1.05, r * 0.9, Math.sin(a) * r * 1.05);
  handle.rotation.y = -a + Math.PI / 2;
  handle.rotation.x = 0;
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(r * 0.82, 26), M(0x402512, { roughness: 0.15 }));
  coffee.rotation.x = -Math.PI / 2; coffee.position.y = r * 1.68;
  g.add(c, handle, coffee);
  g.position.set(s.x, 0, s.z);
  return shadowed(g);
}

function blobGeometry(r, seed) {
  const shape = new THREE.Shape();
  const pts = 16;
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const rr = r * (0.72 + 0.36 * Math.abs(Math.sin(i * 2.7 + seed)));
    const px = Math.cos(a) * rr, pz = Math.sin(a) * rr;
    if (i === 0) shape.moveTo(px, pz); else shape.lineTo(px, pz);
  }
  return new THREE.ShapeGeometry(shape);
}

function propSpill(s) {
  const mat = new THREE.MeshStandardMaterial({
    color: s.opts?.color ?? 0x3a2410, transparent: true,
    opacity: s.opts?.opacity ?? 0.85, roughness: 0.1, metalness: 0.08,
  });
  const m = new THREE.Mesh(blobGeometry(s.r, s.x + s.z), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(s.x, 0.012, s.z);
  m.receiveShadow = true;
  return m;
}

function propPencil(s) {
  const { x1, z1, x2, z2, opts } = s;
  const g = new THREE.Group();
  const len = Math.hypot(x2 - x1, z2 - z1);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, len - 0.5, 6), M(opts?.color ?? 0xf2b01e, { roughness: 0.4 }));
  body.rotation.z = Math.PI / 2;
  const tipW = new THREE.Mesh(new THREE.ConeGeometry(0.115, 0.34, 10), M(0xe8c990, { roughness: 0.7 }));
  tipW.rotation.z = -Math.PI / 2; tipW.position.x = len / 2 - 0.17;
  const lead = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.14, 8), M(0x2b2b33));
  lead.rotation.z = -Math.PI / 2; lead.position.x = len / 2 + 0.03;
  const eraser = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.118, 0.17, 10), M(0xe87a90));
  eraser.rotation.z = Math.PI / 2; eraser.position.x = -len / 2 + 0.07;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.123, 0.123, 0.1, 10), M(0xc0c6cc, { metalness: 0.8, roughness: 0.3 }));
  band.rotation.z = Math.PI / 2; band.position.x = -len / 2 + 0.2;
  g.add(body, tipW, lead, eraser, band);
  g.position.set((x1 + x2) / 2, 0.13, (z1 + z2) / 2);
  g.rotation.y = Math.atan2(-(z2 - z1), x2 - x1);
  return shadowed(g);
}

function propRuler(s) {
  const { x1, z1, x2, z2 } = s;
  const len = Math.hypot(x2 - x1, z2 - z1);
  const t = TX.rulerTicks();
  t.repeat.set(len / 2.4, 1);
  const mat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.07, 0.52), mat);
  m.position.set((x1 + x2) / 2, 0.1, (z1 + z2) / 2);
  m.rotation.y = Math.atan2(-(z2 - z1), x2 - x1);
  return shadowed(m);
}

function propKeyboard(s) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(s.w, 0.3, s.d), M(0x2f333c, { roughness: 0.5 }));
  base.position.y = 0.15;
  g.add(base);
  const keyM = M(0xe8e4da, { roughness: 0.5 });
  // accent keys
  const keyG = new THREE.BoxGeometry(0.34, 0.1, 0.3);
  const cols = Math.floor(s.w / 0.42), rows = Math.floor(s.d / 0.34) - 1;
  const keys = new THREE.InstancedMesh(keyG, keyM, cols * rows);
  let i = 0; const m4 = new THREE.Matrix4();
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      m4.makeTranslation(-s.w / 2 + 0.35 + c * ((s.w - 0.7) / (cols - 1)) + (r % 2) * 0.06, 0.35, -s.d / 2 + 0.3 + r * 0.4);
      keys.setMatrixAt(i++, m4);
    }
  keys.count = i;
  g.add(keys);
  g.position.set(s.x, 0, s.z);
  g.rotation.y = s.rot || 0;
  return shadowed(g);
}

function propMouse(s) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(s.r, 22, 16), M(0xd8dce4, { roughness: 0.28 }));
  body.scale.set(1, 0.6, 1.22);
  body.position.y = s.r * 0.5;
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 10), M(0x666a75));
  wheel.rotation.x = Math.PI / 2; wheel.position.set(0, s.r * 0.95, -s.r * 0.55);
  g.add(body, wheel);
  g.position.set(s.x, 0, s.z);
  g.rotation.y = 0.3;
  return shadowed(g);
}

function propMouseCable(s) {
  void s;
  const pts = [
    new THREE.Vector3(-4.6 + 0.6 * 1.2 * Math.cos(2.5), 0.05, 0.85 + 0.6 * 1.22 * Math.sin(2.5)),
    new THREE.Vector3(-3.6, 0.05, 0.6), new THREE.Vector3(-2.9, 0.05, 1.1),
    new THREE.Vector3(-2.5, 0.05, 0.3), new THREE.Vector3(-2.2, 0.05, -0.7),
  ];
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.045, 8), M(0x222630, { roughness: 0.5 }));
  cable.castShadow = true;
  return cable;
}

function propRing(s) {
  // faint coffee ring stain
  const mat = new THREE.MeshStandardMaterial({ color: 0x4a2c14, transparent: true, opacity: 0.28, roughness: 0.6 });
  const m = new THREE.Mesh(new THREE.RingGeometry(s.r * 0.72, s.r, 30), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(s.x, 0.008, s.z);
  m.receiveShadow = true;
  return m;
}

function propStapler(s) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(s.w, 0.13, s.d * 0.9), M(0x30323a));
  base.position.y = 0.065;
  const top = new THREE.Mesh(new THREE.BoxGeometry(s.w * 0.94, 0.24, s.d * 0.82), M(0xc23b2e, { roughness: 0.32 }));
  top.position.set(-s.w * 0.03, 0.29, 0);
  top.rotation.z = 0.05;
  g.add(base, top);
  g.position.set(s.x, 0, s.z);
  g.rotation.y = s.rot || 0;
  return shadowed(g);
}

function propEraser(s) {
  const g = new THREE.Group();
  const m1 = new THREE.Mesh(new THREE.BoxGeometry(s.w, 0.3, s.d), M(0x4a7ec2));
  const m2 = new THREE.Mesh(new THREE.BoxGeometry(s.w, 0.3, s.d * 0.48), M(0xef8fa8));
  m2.position.z = s.d * 0.26;
  g.add(m1, m2);
  g.position.set(s.x, 0.15, s.z);
  g.rotation.y = s.rot || 0;
  return shadowed(g);
}

function propPaperStack(s) {
  const g = new THREE.Group();
  const st = new THREE.Mesh(new THREE.BoxGeometry(s.w, 0.2, s.d), new THREE.MeshStandardMaterial({ map: TX.pageLines(), roughness: 0.95 }));
  const top = new THREE.Mesh(new THREE.PlaneGeometry(s.w * 0.96, s.d * 0.95), M(0xfbf8ec, { roughness: 0.9 }));
  top.rotation.x = -Math.PI / 2; top.position.y = 0.105;
  const doodle = new THREE.Mesh(new THREE.PlaneGeometry(s.w * 0.8, s.d * 0.8),
    new THREE.MeshStandardMaterial({ map: TX.stickyNote('TAXES\n1987', '#fbf8ec'), roughness: 0.9 }));
  doodle.rotation.x = -Math.PI / 2; doodle.position.y = 0.11; doodle.rotation.z = 0.06;
  g.add(st, top, doodle);
  g.position.set(s.x, 0.1, s.z);
  g.rotation.y = s.rot || 0;
  return shadowed(g);
}

function propPen(s) {
  return propPencil({ ...s, r: 0.09, opts: { color: s.opts?.color ?? 0x3046c2 } });
}

function propCD(s) {
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xd8e4f0, roughness: 0.12, metalness: 0.85, iridescence: 0.9, iridescenceIOR: 1.8 });
  const disc = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.85, 40), mat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(s.x, 0.015, s.z);
  disc.receiveShadow = true;
  return disc;
}

function propNote(s) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9),
    new THREE.MeshStandardMaterial({ map: TX.stickyNote(s.opts?.text ?? 'NOTE', s.opts?.bg ?? '#fff36e'), roughness: 0.9 }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = s.rot || 0;
  m.position.set(s.x, 0.012, s.z);
  m.receiveShadow = true;
  return m;
}

// ============================================================
// Breakfast props
// ============================================================
function propCerealBox(s) {
  const front = new THREE.MeshStandardMaterial({ map: TX.cerealBox(), roughness: 0.55 });
  const side = M(0xd6552f, { roughness: 0.55 });
  const topM = M(0xc04a28, { roughness: 0.6 });
  const h = s.w * 0.72;
  const m = new THREE.Mesh(new THREE.BoxGeometry(s.w, h, s.d), [front, front, topM, side, front, side]);
  m.position.set(s.x, h / 2, s.z);
  m.rotation.y = s.rot || 0;
  return shadowed(m);
}

function propToast(s) {
  const g = new THREE.Group();
  const w = s.w, d = s.d;
  const crust = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, d), M(0x9a5a20, { roughness: 0.9 }));
  const crumb = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, 0.235, d * 0.84), M(0xe0b060, { roughness: 0.95 }));
  crumb.position.y = 0.006;
  g.add(crust, crumb);
  g.position.set(s.x, 0.11, s.z);
  g.rotation.y = s.rot || 0;
  return shadowed(g);
}

function propBowl(s) {
  const r = s.r;
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push(new THREE.Vector2(r * (0.18 + Math.sin(t * Math.PI / 2) * 0.86), t * r * 0.6));
  }
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 30), M(0x3a6fc2, { roughness: 0.28, side: THREE.DoubleSide }));
  const milk = new THREE.Mesh(new THREE.CircleGeometry(r * 0.85, 30), M(0xfdf6e8, { roughness: 0.22 }));
  milk.rotation.x = -Math.PI / 2; milk.position.y = r * 0.52;
  g.add(bowl, milk);
  const cM = M(0xd9a74e, { roughness: 0.8 });
  for (let i = 0; i < 7; i++) {
    const o = new THREE.Mesh(new THREE.TorusGeometry(r * 0.09, r * 0.045, 8, 14), cM);
    const a = i * 1.95;
    o.position.set(Math.cos(a) * r * 0.45, r * 0.525, Math.sin(a) * r * 0.45);
    o.rotation.x = -Math.PI / 2;
    g.add(o);
  }
  g.position.set(s.x, 0, s.z);
  return shadowed(g);
}

function propMilkBottle(s) {
  const r = s.r;
  const g = new THREE.Group();
  const glassM = M(0xf6f2e6, { roughness: 0.18 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 2.7, 20), glassM);
  body.position.y = r * 1.35;
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, r * 0.8, 20), M(0x2f8fd4, { roughness: 0.3 }));
  stripe.position.y = r * 1.2;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.48, r * 0.8, r * 0.85, 20), glassM);
  neck.position.y = r * 3.1;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, r * 0.22, 20), M(0xd43a2f, { roughness: 0.35 }));
  cap.position.y = r * 3.6;
  g.add(body, stripe, neck, cap);
  g.position.set(s.x, 0, s.z);
  return shadowed(g);
}

function propJamJar(s) {
  const r = s.r;
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.94, r * 1.75, 22),
    new THREE.MeshPhysicalMaterial({ color: 0xd2457a, roughness: 0.14, transmission: 0.3, transparent: true, opacity: 0.88 }));
  glass.position.y = r * 0.9;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.96, r, r * 0.3, 22), M(0xc0a022, { metalness: 0.6, roughness: 0.35 }));
  lid.position.y = r * 1.9;
  const label = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, r * 0.75, 22, 1, true), M(0xf8f4e0, { roughness: 0.8 }));
  label.position.y = r * 0.9;
  g.add(glass, lid, label);
  g.position.set(s.x, 0, s.z);
  return shadowed(g);
}

function propOJGlass(s) {
  const r = s.r;
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, r * 2.3, 26, 1, true),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.06, transmission: 0.7, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
  glass.position.y = r * 1.15;
  const juice = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.8, r * 1.9, 26), M(0xf7941e, { roughness: 0.3 }));
  juice.position.y = r * 0.97;
  g.add(juice, glass);
  g.position.set(s.x, 0, s.z);
  return shadowed(g);
}

function propButterDish(s) {
  const g = new THREE.Group();
  const dish = new THREE.Mesh(new THREE.BoxGeometry(s.w, 0.1, s.d), M(0xeef2f6, { roughness: 0.22 }));
  dish.position.y = 0.05;
  const butter = new THREE.Mesh(new THREE.BoxGeometry(s.w * 0.62, 0.42, s.d * 0.56), M(0xffe066, { roughness: 0.35 }));
  butter.position.y = 0.31; butter.rotation.y = 0.04;
  g.add(dish, butter);
  g.position.set(s.x, 0, s.z);
  g.rotation.y = s.rot || 0;
  return shadowed(g);
}

function propNapkin(s) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(s.w, 0.07, s.d), M(0xeef0f4, { roughness: 0.92 }));
  m.position.set(s.x, 0.035, s.z);
  m.rotation.y = s.rot || 0;
  return shadowed(m);
}

function propPlateWaffle(s) {
  const r = s.r;
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.82, 0.12, 34), M(0xf4f6f8, { roughness: 0.18 }));
  plate.position.y = 0.06;
  const waffle = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.68, r * 0.68, 0.13, 28),
    new THREE.MeshStandardMaterial({ map: TX.waffle(), roughness: 0.85 }));
  waffle.position.y = 0.18;
  const butterPat = new THREE.Mesh(new THREE.BoxGeometry(r * 0.22, 0.12, r * 0.22), M(0xffe066));
  butterPat.position.y = 0.3;
  g.add(plate, waffle, butterPat);
  g.position.set(s.x, 0, s.z);
  return shadowed(g);
}

function propSpoon(s) {
  const g = new THREE.Group();
  const mat = M(0xc9ced6, { metalness: 0.9, roughness: 0.22 });
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 1.4, 4, 10), mat);
  handle.rotation.z = Math.PI / 2; handle.scale.z = 0.35;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 12), mat);
  head.scale.set(1, 0.26, 1.25); head.position.x = 1.0;
  g.add(handle, head);
  g.position.set(s.x, 0.06, s.z);
  g.rotation.y = s.rot || 0;
  return shadowed(g);
}

function propToastDeco(s) {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.25, 0.12, 30), M(0xdfe8f2, { roughness: 0.2 }));
  plate.position.y = 0.06;
  g.add(plate);
  const t1 = propToast({ ...s, w: 1.3, d: 1.3, x: 0, z: 0, rot: 0.2 });
  t1.position.set(0, 0.12, 0);
  const t2 = propToast({ ...s, w: 1.2, d: 1.2, x: 0, z: 0, rot: 1.2 });
  t2.position.set(0.15, 0.34, -0.1);
  g.add(t1, t2);
  g.position.set(s.x, 0, s.z);
  return shadowed(g);
}

// ============================================================
// Garden props
// ============================================================
function propSandbox(s) {
  const g = new THREE.Group();
  const { w, d } = s;
  const frameM = M(0x8a6238, { roughness: 0.8 });
  for (const [bw, bd, px, pz] of [
    [w, 0.5, 0, -d / 2 + 0.25], [w, 0.5, 0, d / 2 - 0.25],
    [0.5, d, -w / 2 + 0.25, 0], [0.5, d, w / 2 - 0.25, 0]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.65, bd), frameM);
    m.position.set(px, 0.32, pz);
    g.add(m);
  }
  const sandMat = new THREE.MeshStandardMaterial({ map: TX.sand(), roughness: 0.95 });
  sandMat.map.repeat.set(w / 1.6, d / 1.6);
  const sandTop = new THREE.Mesh(new THREE.BoxGeometry(w - 1, 0.45, d - 1), sandMat);
  sandTop.position.y = 0.2;
  g.add(sandTop);
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.55, 16), M(0xe23a8e, { roughness: 0.4 }));
  bucket.position.set(w * 0.2, 0.55, d * 0.05);
  bucket.rotation.z = 0.45;
  g.add(bucket);
  g.position.set(s.x, 0, s.z);
  g.rotation.y = s.rot || 0;
  return shadowed(g);
}

function propHedge(s) {
  const { x1, z1, x2, z2, r } = s;
  const len = Math.hypot(x2 - x1, z2 - z1);
  const g = new THREE.Group();
  const hedgeM = M(0x2e6b28, { roughness: 0.9 });
  const n = Math.ceil(len / (r * 1.3));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const b = new THREE.Mesh(new THREE.SphereGeometry(r * (1.08 + 0.16 * Math.sin(i * 3.3)), 10, 8), hedgeM);
    b.position.set(x1 + (x2 - x1) * t, r * 0.85, z1 + (z2 - z1) * t);
    g.add(b);
  }
  return shadowed(g);
}

function propFence(s) {
  const { x1, z1, x2, z2 } = s;
  const len = Math.hypot(x2 - x1, z2 - z1);
  const g = new THREE.Group();
  const fenceM = M(0xb59a72, { roughness: 0.85 });
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, len, 8), fenceM);
  rail.rotation.z = Math.PI / 2;
  rail.position.y = 0.42;
  g.add(rail);
  const n = Math.ceil(len / 0.55);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.5, 0.15), fenceM);
    p.position.set((x2 - x1) * t, 0.25, (z2 - z1) * t);
    g.add(p);
  }
  g.position.set(x1, 0, z1);
  g.rotation.y = Math.atan2(-(z2 - z1), x2 - x1);
  return shadowed(g);
}

function propHose(s) {
  const pts = s.points.map(([x, z]) => new THREE.Vector3(x, s.r, z));
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, s.r, 12);
  const m = new THREE.Mesh(geo, M(0x2e6b34, { roughness: 0.55 }));
  // nozzle
  const last = pts[pts.length - 1];
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(s.r * 0.5, s.r * 0.8, 0.5, 10), M(0xd4a017, { metalness: 0.6, roughness: 0.35 }));
  nozzle.position.set(last.x + 0.2, s.r, last.z + 0.15);
  nozzle.rotation.z = 1.2;
  const g = new THREE.Group();
  g.add(m, nozzle);
  return shadowed(g);
}

function propFlowerPot(s) {
  const r = s.r;
  const g = new THREE.Group();
  const pts = [
    new THREE.Vector2(r * 0.6, 0), new THREE.Vector2(r * 0.84, r * 0.35),
    new THREE.Vector2(r, r * 0.78), new THREE.Vector2(r * 1.08, r * 0.82),
    new THREE.Vector2(r * 1.08, r), new THREE.Vector2(r * 0.9, r),
    new THREE.Vector2(r * 0.86, r * 0.86),
  ];
  const pot = new THREE.Mesh(new THREE.LatheGeometry(pts, 22), M(0xb56a3a, { roughness: 0.85 }));
  const soil = new THREE.Mesh(new THREE.CircleGeometry(r * 0.88, 22), M(0x3a2a18, { roughness: 1 }));
  soil.rotation.x = -Math.PI / 2; soil.position.y = r * 0.95;
  g.add(pot, soil);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, r * 1.3, 8), M(0x3f7a2c));
  stem.position.y = r * 1.55;
  const head = new THREE.Group();
  const petalM = M(s.opts?.color ?? 0xe2543e, { roughness: 0.5 });
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), petalM);
    const a = i * Math.PI / 3;
    p.position.set(Math.cos(a) * 0.19, 0, Math.sin(a) * 0.19);
    p.scale.set(1, 0.4, 1);
    head.add(p);
  }
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), M(0xffd23a)));
  head.position.y = r * 2.2;
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), M(0x3f7a2c));
  leaf.scale.set(2, 0.3, 1); leaf.rotation.z = 0.5;
  leaf.position.set(0.18, r * 1.35, 0);
  g.add(stem, head, leaf);
  g.position.set(s.x, 0, s.z);
  return shadowed(g);
}

function propWateringCan(s) {
  const g = new THREE.Group();
  const mat = M(0x3f7fbf, { metalness: 0.5, roughness: 0.35 });
  const r = s.r;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r * 0.78, r * 1.1, 18), mat);
  body.position.y = r * 0.55;
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.12, r * 0.2, r * 1.3, 8), mat);
  spout.rotation.z = -1.0; spout.position.set(r * 0.95, r * 0.75, 0);
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.3, r * 0.18, r * 0.18, 10), mat);
  rose.rotation.z = -1.0; rose.position.set(r * 1.5, r * 0.47, 0);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(r * 0.45, r * 0.1, 8, 14, Math.PI), mat);
  handle.position.set(-r * 0.65, r * 1.1, 0); handle.rotation.z = 0.35;
  g.add(body, spout, rose, handle);
  g.position.set(s.x, 0, s.z);
  g.rotation.y = 1.9;
  return shadowed(g);
}

function propPond(s) {
  const r = s.r;
  const g = new THREE.Group();
  const stoneM = M(0x9aa0a8, { roughness: 0.9 });
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 0.16 + (i % 3) * 0.05), stoneM);
    stone.position.set(Math.cos(a) * (r + 0.22), 0.1, Math.sin(a) * (r + 0.22));
    stone.rotation.set(i * 1.3, i * 2.1, 0);
    g.add(stone);
  }
  const water = new THREE.Mesh(new THREE.CircleGeometry(r, 40),
    new THREE.MeshPhysicalMaterial({ color: 0x3f9fd8, roughness: 0.04, metalness: 0.15, transparent: true, opacity: 0.95 }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.015;
  water.receiveShadow = true;
  const lily = new THREE.Mesh(new THREE.CircleGeometry(r * 0.2, 10), M(0x3f8a44, { roughness: 0.7 }));
  lily.rotation.x = -Math.PI / 2; lily.position.set(r * 0.4, 0.03, -r * 0.3);
  const lily2 = lily.clone(); lily2.scale.setScalar(0.6); lily2.position.set(-r * 0.35, 0.03, r * 0.4);
  g.add(water, lily, lily2);
  g.position.set(s.x, 0, s.z);
  return g;
}

function propPuddle(s) {
  const m = propSpill({ ...s, opts: { color: 0x7fb8dd, opacity: 0.85 } });
  m.material.roughness = 0.04;
  return m;
}

function propSandStripe(s) {
  const { shape } = s;
  const mat = new THREE.MeshStandardMaterial({ map: TX.sand(), roughness: 0.95 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(shape.w, shape.d), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(shape.x, 0.009, shape.z);
  m.receiveShadow = true;
  return m;
}

function propPebble(s) {
  const r = s.r;
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), M(0x9a938a, { roughness: 0.95 }));
  m.position.set(s.x, r * 0.6, s.z);
  m.scale.y = 0.6;
  m.rotation.set(s.x * 3, s.z * 2, 0);
  return shadowed(m);
}

function propTrowel(s) {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 10), M(0x8a4a2a, { roughness: 0.6 }));
  handle.rotation.z = Math.PI / 2;
  const blade = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.85, 4), M(0xb8bec6, { metalness: 0.85, roughness: 0.3 }));
  blade.rotation.z = -Math.PI / 2; blade.position.x = 0.75;
  blade.scale.set(1, 0.45, 1);
  g.add(handle, blade);
  g.position.set(s.x, 0.12, s.z);
  g.rotation.y = s.rot || 0;
  return shadowed(g);
}

function propGnome(s) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.75, 14), M(0x3a5fc2));
  body.position.y = 0.375;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 10), M(0xf0c8a0));
  face.position.y = 0.83;
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 10), M(0xf4f4f4));
  beard.position.set(0, 0.65, 0.14); beard.rotation.x = 0.45;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 14), M(0xd43a2f));
  hat.position.y = 1.15; hat.rotation.z = 0.12;
  g.add(body, face, beard, hat);
  g.position.set(s.x, 0, s.z);
  return shadowed(g);
}

// ============================================================
// Pool props
// ============================================================
function propPoolBall(s) {
  const r = s.r;
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18),
    new THREE.MeshStandardMaterial({ color: s.opts?.color ?? 0xffffff, roughness: 0.1, metalness: 0.05 }));
  m.position.set(s.x, r, s.z);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(r * 0.42, 14), M(0xffffff, { roughness: 0.2 }));
  dot.position.set(0, r * 0.96, 0);
  dot.rotation.x = -Math.PI / 2;
  m.add(dot);
  return shadowed(m);
}

function propRack(s) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(s.w, s.d) * 0.62, Math.max(s.w, s.d) * 0.62, 0.12, 3),
    M(0x8a5a2a, { roughness: 0.55 }));
  m.position.set(s.x, 0.06, s.z);
  m.rotation.y = s.rot || 0;
  return shadowed(m);
}

function propChalk(s) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(s.w, 0.4, s.d), M(0x2f54c2, { roughness: 0.9 }));
  m.position.set(s.x, 0.2, s.z);
  m.rotation.y = s.rot || 0;
  const wrap = new THREE.Mesh(new THREE.BoxGeometry(s.w * 0.9, 0.12, s.d * 0.9), M(0xb8c4d8, { metalness: 0.6, roughness: 0.4 }));
  wrap.position.y = 0.14;
  m.add(wrap);
  return shadowed(m);
}

function propCue(s) {
  const g = new THREE.Group();
  const len = 7.2;
  const cue = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, len, 10), M(0xb58140, { roughness: 0.45 }));
  cue.rotation.z = Math.PI / 2;
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.085, 0.14, 10), M(0x2f54c2));
  tip.rotation.z = Math.PI / 2; tip.position.x = len / 2 + 0.06;
  const wrapM = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, len * 0.4, 10), M(0x3a2a1a, { roughness: 0.7 }));
  wrapM.rotation.z = Math.PI / 2; wrapM.position.x = -len * 0.3;
  g.add(cue, tip, wrapM);
  g.position.set(s.x, 0.12, s.z);
  g.rotation.y = s.rot || 0;
  return shadowed(g);
}

function propPocket(s) {
  const g = new THREE.Group();
  const hole = new THREE.Mesh(new THREE.CircleGeometry(s.r * 1.2, 26), new THREE.MeshBasicMaterial({ color: 0x030303 }));
  hole.rotation.x = -Math.PI / 2; hole.position.y = 0.008;
  const rim = new THREE.Mesh(new THREE.RingGeometry(s.r * 1.2, s.r * 1.2 + 0.14, 26), M(0x191008, { roughness: 0.4 }));
  rim.rotation.x = -Math.PI / 2; rim.position.y = 0.012;
  rim.receiveShadow = true;
  g.add(hole, rim);
  g.position.set(s.x, 0, s.z);
  return g;
}

// ============================================================
// Race dressing
// ============================================================
export function makeStartLine(gate) {
  const mat = new THREE.MeshBasicMaterial({ map: TX.checkered(), transparent: true, opacity: 0.92 });
  const geo = new THREE.PlaneGeometry(gate.half * 2, 0.6);
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  const g = new THREE.Group();
  g.add(m);
  g.position.set(gate.x, 0.014, gate.z);
  g.rotation.y = Math.atan2(gate.dx, gate.dz);
  return g;
}

export function makeBoostPad(x, z, facing = 0) {
  const g = new THREE.Group();
  const chevMat = new THREE.MeshBasicMaterial({ color: 0x54e9ff, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  for (let i = 0; i < 3; i++) {
    const arrow = makeArrowDecal(0.85, 0x54e9ff, 0.95);
    arrow.children[0].material = chevMat;
    arrow.position.set(0, 0.001 * i, i * 0.42 - 0.42);
    g.add(arrow);
  }
  const base = new THREE.Mesh(new THREE.CircleGeometry(0.78, 26),
    new THREE.MeshBasicMaterial({ color: 0x0d5e85, transparent: true, opacity: 0.6, depthWrite: false }));
  base.rotation.x = -Math.PI / 2; base.position.y = -0.004;
  g.add(base);
  g.position.set(x, 0.02, z);
  g.rotation.y = facing + Math.PI;   // arrows drawn with tip at +shape-Y => group -Z = tip; flip
  g.userData.chevMat = chevMat;
  return g;
}

// ============================================================
// PROPS registry — levelScene renders every solid through this.
// ============================================================
export const PROPS = {
  book: propBook, mug: propMug, spill: propSpill, pencil: propPencil, ruler: propRuler,
  keyboard: propKeyboard, mouse: propMouse, pencable: propMouseCable, stapler: propStapler,
  eraser: propEraser, paperstack: propPaperStack, pen: propPen, cd: propCD, note: propNote, ring: propRing,
  cerealbox: propCerealBox, toast: propToast, bowl: propBowl, milkbottle: propMilkBottle,
  jamjar: propJamJar, ojglass: propOJGlass, butterdish: propButterDish, napkin: propNapkin,
  platewaffle: propPlateWaffle, spoon: propSpoon, toastdeco: propToastDeco,
  sandbox: propSandbox, hedge: propHedge, fence: propFence, hose: propHose,
  flowerpot: propFlowerPot, wateringcan: propWateringCan, pond: propPond, puddle: propPuddle,
  sandstripe: propSandStripe, pebble: propPebble, trowel: propTrowel, gnome: propGnome,
  poolball: propPoolBall, rack: propRack, chalk: propChalk, cue: propCue, pocket: propPocket,
};
