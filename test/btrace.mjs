import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
const root = '/Users/jovan/Work/micromachines';
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const M = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  fs.readFile(path.join(root, p), (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'Content-Type': M[path.extname(p)] || 'text/plain' }); res.end(d); } });
}).listen(8693);
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 600 });
await page.goto('http://localhost:8693/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 600));
await page.evaluate(() => {
  const g = window.__MM.game;
  g.startRace(0, { autopilot: false, skipCountdown: true });
  const s = g.race.player.state;
  s.x = 0; s.z = -1; s.heading = Math.PI; s.vx = 0; s.vz = -3.5; s.speedF = 3.5; s.speedR = 0; s.steer = 0;
});
await page.keyboard.down('ArrowUp');
await page.keyboard.down('ArrowLeft');
for (let i = 0; i < 8; i++) {
  await new Promise(r => setTimeout(r, 100));
  const p = await page.evaluate(() => {
    const s = window.__MM.game.race.player.state;
    return { x: +s.x.toFixed(2), z: +s.z.toFixed(2), speedF: +s.speedF.toFixed(2), steer: +s.steer.toFixed(2), heading: +s.heading.toFixed(2) };
  });
  console.log(JSON.stringify(p));
}
await page.keyboard.up('ArrowLeft'); await page.keyboard.up('ArrowUp');
await browser.close(); srv.close(); process.exit(0);
