// Verify boost chevron orientation: chevrons must point at track travel dir.
import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const root = new URL('..', import.meta.url).pathname;
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const M = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  fs.readFile(path.join(root, p), (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'Content-Type': M[path.extname(p)] || 'text/plain' }); res.end(d); } });
}).listen(8696);
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 600 });
page.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
await page.goto('http://localhost:8696/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 700));
// park the player exactly on the desktop boost pad (4.0,-5.15); gate dir there is (-9.8,-1.6)n ≈ (-0.99,-0.16)
await page.evaluate(() => {
  const g = window.__MM.game;
  g.startRace(0, { autopilot: false, skipCountdown: true });
  const s = g.race.player.state;
  s.x = 4.6; s.z = -5.1; s.vx = 0; s.vz = 0; s.heading = Math.PI / 2;
});
await new Promise(r => setTimeout(r, 900));
const buf = await page.screenshot({ path: path.join(root, 'shots/arrowcheck.png') });
// analyze cyan pixels (boost chevrons) around screen center
const png = PNG.sync.read(fs.readFileSync(path.join(root, "shots", "arrowcheck.png")));
const { width, height, data } = png;
let minX = 1e9, maxX = -1e9, cx = 0, cz = 0, count = 0;
const hits = [];
for (let y = 0; y < height; y += 2) {
  for (let x = 0; x < width; x += 2) {
    const i = (y * width + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (b > 170 && g > 140 && r < 130) { // cyan
      count++;
      cx += x; cz += y;
      hits.push([x, y]);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
  }
}
console.log('cyan pixels:', count, 'x-span:', minX, maxX);
// direction of travel should be screen-left & slightly down.
// A chevron pointing left has its TIP on the left: extremes: tip is a POINT (sparse rows at the very left).
// compute the x-center of mass of left edge vs right edge bands
cx /= count; cz /= count;
const leftY = hits.filter(h => h[0] < minX + 14).map(h => h[1]);
const rightY = hits.filter(h => h[0] > maxX - 14).map(h => h[1]);
const spread = a => a.length ? (Math.max(...a) - Math.min(...a)) : 0;
console.log('center of mass:', cx.toFixed(0), cz.toFixed(0), '| left edge y-spread:', spread(leftY), '| right edge y-spread:', spread(rightY));
console.log('A left-pointing chevron: left edge = narrow point (small spread), right edge = wide tails (big spread)');
await browser.close(); srv.close(); process.exit(0);
