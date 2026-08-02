// Verify: after group.rotation.y = facing + PI, the arrow's shape-space tip
// vertex (0, +S*0.42) projects to world direction facing. (Pure 3D math.)
import * as THREE from 'three';
import { makeArrowDecal } from '../src/visuals/guidance.js';

function testFacing(facingDeg) {
  const facing = facingDeg * Math.PI / 180;
  const arrow = makeArrowDecal(1.0, 0xffffff, 1);
  arrow.rotation.y = facing + Math.PI;
  arrow.updateMatrixWorld(true);
  // tip vertex in shape coords (0, +0.42, 0); wing vertex (0, -0.06)-ish center back
  const tip = new THREE.Vector3(0, 0.42, 0);
  const back = new THREE.Vector3(0, -0.02, 0);
  const t = tip.clone().applyMatrix4(arrow.children[0].matrixWorld);
  const b = back.clone().applyMatrix4(arrow.children[0].matrixWorld);
  const dir = t.sub(b); dir.y = 0; dir.normalize();
  const want = new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing));
  const dot = dir.dot(want);
  console.log(`facing=${facingDeg}°: arrow world dir=(${dir.x.toFixed(2)},${dir.z.toFixed(2)}) want=(${want.x.toFixed(2)},${want.z.toFixed(2)}) dot=${dot.toFixed(4)} ${dot > 0.999 ? 'OK' : 'WRONG'}`);
  return dot > 0.999;
}
let ok = true;
for (const d of [0, 45, 90, 180, 270, 321]) ok = testFacing(d) && ok;
console.log(ok ? 'ARROW ORIENTATION OK ✔' : 'ARROW ORIENTATION BROKEN ✗');
process.exit(ok ? 0 : 1);
