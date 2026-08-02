import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
const root = '/Users/jovan/Work/micromachines';
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const M = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  fs.readFile(path.join(root, p), (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': M[path.extname(p)] || 'text/plain' });
    res.end(d);
  });
}).listen(8692);
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 600 });
await page.goto('http://localhost:8692/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 600));
await page.evaluate(() => {
  const g = window.__MM.game;
  g.startRace(0, { autopilot: false, skipCountdown: true });
  const s = g.race.player.state;
  Object.assign(s, { x: 0, z: -1, heading: Math.PI, vx: 0, vz: -3.5, speedF: 3.5, speedR: 0, steer: 0 });
  // park AI cars far away so only physics is in play
  for (const c of g.race.cars.slice(1)) { c.state.x = 8; c.state.z = 6; c.state.vx = 0; c.state.vz = 0; }
});
for (let i = 0; i < 12; i++) {
  await new Promise(r => setTimeout(r, 17));
  const p = await page.evaluate(() => {
    const s = window.__MM.game.race.player.state;
    return [s.x.toFixed(2), s.z.toFixed(2), s.speedF.toFixed(2), s.vx.toFixed(2), s.vz.toFixed(2), s.steer.toFixed(2)].join(' ');
  });
  console.log(i, p);
}
await browser.close(); srv.close(); process.exit(0);
