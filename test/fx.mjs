// test/fx.mjs — capture drift skid marks, boost flames, pond splash.
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
}).listen(8694);

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
const shotsDir = path.join(root, 'shots');
await page.goto('http://localhost:8694/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 700));

// 1) drift marks on desktop
await page.evaluate(() => {
  const g = window.__MM.game;
  g.startRace(0, { autopilot: false, skipCountdown: true });
  const s = g.race.player.state;
  s.x = 0; s.z = -4.6; s.heading = Math.PI / 2; s.vx = 5.2; s.vz = 0; // top straight, fast
});
await page.keyboard.down('ArrowLeft');
await page.keyboard.down(' ');
await new Promise(r => setTimeout(r, 900));
await page.keyboard.up(' ');
await page.keyboard.down('ArrowRight');
await page.keyboard.down(' ');
await new Promise(r => setTimeout(r, 700));
await page.keyboard.up(' ');
await page.keyboard.up('ArrowRight');
await page.keyboard.up('ArrowLeft');
await new Promise(r => setTimeout(r, 300));
await page.screenshot({ path: path.join(shotsDir, 'fx-drift.png') });

// 2) boost: teleport just before a pad with aimed speed
await page.evaluate(() => {
  const g = window.__MM.game;
  const s = g.race.player.state;
  s.x = 2.5; s.z = -5.15; s.heading = Math.PI / 2; s.vx = 4.0; s.vz = 0; // toward pad at (4.0,-5.15)
});
await new Promise(r => setTimeout(r, 700));
await page.screenshot({ path: path.join(shotsDir, 'fx-boost.png') });

// 3) pond splash on garden
await page.evaluate(() => {
  const g = window.__MM.game;
  g.startRace(2, { autopilot: false, skipCountdown: true });
  const s = g.race.player.state;
  s.x = 6.2; s.z = 2.3; s.heading = Math.PI / 2; s.vx = 3.5; s.vz = 0; // drive into the pond at (7.45,2.3)
});
await new Promise(r => setTimeout(r, 500));
await page.screenshot({ path: path.join(shotsDir, 'fx-splash.png') });
const st = await page.evaluate(() => {
  const s = window.__MM.game.race.player.state;
  return { falling: s.falling };
});
console.log('pond fall registered:', st.falling);

console.log('fx shots done');
await browser.close();
srv.close();
process.exit(0);
