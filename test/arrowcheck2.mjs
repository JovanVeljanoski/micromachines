// Corner chevron at desktop gate 2 (8.3,3.6): travel dir atan2(3.6,-4.65)=2.48 rad (screen ~up-right).
// Verify arrow tip (sparse extreme row) is on the up-right side.
import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
const root = '/Users/jovan/Work/micromachines';
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const M = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  fs.readFile(path.join(root, p), (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'Content-Type': M[path.extname(p)] || 'text/plain' }); res.end(d); } });
}).listen(8691);
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 600 });
await page.goto('http://localhost:8691/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 700));
await page.evaluate(() => {
  const g = window.__MM.game;
  g.startRace(0, { autopilot: false, skipCountdown: true });
  const s = g.race.player.state;
  Object.assign(s, { x: 8.3, z: 4.9, heading: Math.PI, vx: 0, vz: 0, speedF: 0 });   // park just below the arrow
});
await new Promise(r => setTimeout(r, 900));
const buf = await page.screenshot({ path: 'shots/arrowcheck2.png' });
const png = PNG.sync.read(fs.readFileSync('shots/arrowcheck2.png'));
const { width, height, data } = png;
// find near-white pixels (arrow)
const hits = [];
for (let y = 0; y < height; y += 2)
  for (let x = 0; x < width; x += 2) {
    const i = (y * width + x) * 4;
    if (data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235) hits.push([x, y]);
  }
console.log('white pixels:', hits.length);
if (hits.length > 30) {
  const cx = hits.reduce((a, h) => a + h[0], 0) / hits.length;
  const cy = hits.reduce((a, h) => a + h[1], 0) / hits.length;
  const minY = Math.min(...hits.map(h => h[1])), maxY = Math.max(...hits.map(h => h[1]));
  const minX = Math.min(...hits.map(h => h[0])), maxX = Math.max(...hits.map(h => h[0]));
  console.log(`bbox x[${minX}..${maxX}] y[${minY}..${maxY}] com(${cx.toFixed(0)},${cy.toFixed(0)})`);
  // count pixels in quadrants relative to COM: travel ~ up-right → more mass top-left (tails), tip top-right
  const q = { tl: 0, tr: 0, bl: 0, br: 0 };
  for (const [x, y] of hits) q[(x < cx ? 'l' : 'r') === 'l' ? (y < cy ? 'tl' : 'bl') : (y < cy ? 'tr' : 'br')]++;
  console.log('quadrants tl,tr,bl,br:', q.tl, q.tr, q.bl, q.br);
}
await browser.close(); srv.close(); process.exit(0);
