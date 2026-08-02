// ============================================================
// helpers.js — level data compiler.
// Levels declare SOLIDS: physical objects that generate BOTH the
// collision geometry (walls/circles/zones/holes) and (via the
// visuals props registry) the 3D props. Single source of truth.
//
// Solid kinds:
//   box    {x, z, w, d, rot}        -> 4 wall segments
//   circle {x, z, r}                -> circle obstacle
//   seg    {x1, z1, x2, z2, r}      -> wall with radius
//   zone   {x,z,r} | {x,z,w,d,rot}  -> surface modifier
//   hole   {x, z, r}                -> fall hole
//   deco   any                      -> visual only
// ============================================================

export function boxWalls(cx, cz, w, d, rot = 0, r = 0) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const hw = w / 2, hd = d / 2;
  const pts = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, z]) => [
    cx + x * c - z * s, cz + x * s + z * c,
  ]);
  const walls = [];
  for (let i = 0; i < 4; i++) {
    const a = pts[i], b = pts[(i + 1) % 4];
    walls.push([a[0], a[1], b[0], b[1], r]);
  }
  return walls;
}

export function compileLevel(data) {
  const walls = [], circles = [], zones = [], holes = [];
  for (const s of data.solids) {
    switch (s.kind) {
      case 'box': walls.push(...boxWalls(s.x, s.z, s.w, s.d, s.rot || 0, s.r || 0)); break;
      case 'circle': circles.push({ x: s.x, z: s.z, r: s.r }); break;
      case 'seg': walls.push([s.x1, s.z1, s.x2, s.z2, s.r || 0]); break;
      case 'multi': for (const [px, pz] of s.points) circles.push({ x: px, z: pz, r: s.r }); break;
      case 'zone':
        zones.push(s.shape
          ? { shape: s.shape, grip: s.grip, drag: s.drag, kind: s.zoneKind }
          : { shape: { type: 'circle', x: s.x, z: s.z, r: s.r }, grip: s.grip, drag: s.drag, kind: s.zoneKind });
        break;
      case 'hole': holes.push({ x: s.x, z: s.z, r: s.r }); break;
      case 'deco': break;
    }
  }
  return { ...data, walls, circles, zones, holes };
}
