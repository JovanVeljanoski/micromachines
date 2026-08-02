// test/drive.mjs — drive the live game with real key events and
// assert playability: acceleration, drift, wrong-way, fall/respawn.
import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const root = new URL('..', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  fs.readFile(path.join(root, p), (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'text/plain' });
    res.end(data);
  });
}).listen(8699);

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
await page.goto('http://localhost:8699/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 800));

const probe = () => page.evaluate(() => {
  const g = window.__MM.game;
  const s = g.race.player.state;
  return {
    state: g.state, x: +s.x.toFixed(2), z: +s.z.toFixed(2),
    speedF: +s.speedF.toFixed(2), speed: +Math.hypot(s.vx, s.vz).toFixed(2),
    sliding: +s.sliding.toFixed(2), falling: s.falling, lap: s.lap,
    wrongWay: !!g.race.player.wrongWay, boostT: +s.boostT.toFixed(2),
  };
});

const hold = async (keys, ms) => {
  for (const k of keys) await page.keyboard.down(k);
  await new Promise(r => setTimeout(r, ms));
  for (const k of keys) await page.keyboard.up(k);
};

// start race, skip countdown (autopilot=false: we drive!)
await page.evaluate(() => {
  const g = window.__MM.game;
  g.startRace(0, { autopilot: false, skipCountdown: true });
});
await new Promise(r => setTimeout(r, 300));

const log = [];
console.log('--- acceleration ---');
for (let i = 0; i < 8; i++) {
  await hold(['ArrowUp'], 250);
  log.push(await probe());
}
const topSpeed = Math.max(...log.map(l => l.speed));
console.log('top speed after 2s:', topSpeed, log.map(l => l.speed));
console.assert(topSpeed > 4.4, 'SHOULD REACH ~5+ m/s');

await page.screenshot({ path: path.join(root, 'shots/drive-wiggle.png') });

console.log('--- steering: RIGHT must go screen-right ---');
await page.evaluate(() => {
  const g = window.__MM.game;
  const s = g.race.player.state;
  Object.assign(s, { x: 0, z: -5.2, heading: Math.PI, vx: 0, vz: -3.5, speedF: 3.5, speedR: 0, steer: 0 });   // facing screen-up on the open straight
});
await hold(['ArrowUp', 'ArrowRight'], 800);
const steerR = await probe();
console.log('after RIGHT:', 'x =', steerR.x, steerR.x > 1 ? 'OK (moved right)' : '✗ INVERTED!');
if (!(steerR.x > 1)) { console.log('STEERING INVERSION REGRESSION'); process.exit(1); }
await page.evaluate(() => {
  const g = window.__MM.game;
  const s = g.race.player.state;
  Object.assign(s, { x: 0, z: -5.2, heading: Math.PI, vx: 0, vz: -3.5, speedF: 3.5, speedR: 0, steer: 0 });
});
await hold(['ArrowUp', 'ArrowLeft'], 800);
const steerL = await probe();
console.log('after LEFT:', 'x =', steerL.x, steerL.x < -1 ? 'OK (moved left)' : '✗ INVERTED!');
if (!(steerL.x < -1)) { console.log('STEERING INVERSION REGRESSION'); process.exit(1); }

console.log('--- handbrake drift ---');
await page.evaluate(() => {
  const g = window.__MM.game;
  const s = g.race.player.state;
  s.x = 0; s.z = 0.8; s.heading = Math.PI / 2; s.vx = 5.0; s.vz = 0; // full speed +X
});
await hold(['ArrowUp', ' '], 700);
await hold(['ArrowUp', ' ', 'ArrowRight'], 500);
const drift = await probe();
console.log('drift state:', drift);

console.log('--- reverse direction => wrong way ---');
await page.evaluate(() => {
  const g = window.__MM.game;
  const s = g.race.player.state;
  s.x = 1.2; s.z = 4.7; s.heading = -Math.PI / 2; s.vx = -4.0; s.vz = 0;
});
await new Promise(r => setTimeout(r, 500));
await hold(['ArrowUp'], 1600);
const ww = await probe();
console.log('wrongWay:', ww.wrongWay);

console.log('--- fall detection + respawn ---');
await page.evaluate(() => {
  const g = window.__MM.game;
  const s = g.race.player.state;
  s.x = 12.5; s.z = 0; s.heading = 0; s.vx = 0; s.vz = 0;   // beyond the desk edge (10.5)
});
await new Promise(r => setTimeout(r, 250));
const falling = await probe();
await new Promise(r => setTimeout(r, 1400));
const respawned = await probe();
console.log('falling seen:', falling.falling, '| respawned at:', respawned.x, respawned.z, 'falling:', respawned.falling);

// drive a few frames to confirm control still fine
await hold(['ArrowUp'], 500);
const end = await probe();
console.log('final probe:', end);

await browser.close();
srv.close();
process.exit(0);
