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
}).listen(8689);
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
await page.goto('http://localhost:8689/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 800));
await page.click('#btn-garage');
await new Promise(r => setTimeout(r, 700));
for (let i = 0; i < 4; i++) {
  const info = await page.evaluate(() => ({
    name: document.getElementById('car-name').textContent,
    desc: document.getElementById('car-desc').textContent,
    pips: [...document.querySelectorAll('.stat .pips')].map(p => p.querySelectorAll('.pip.on').length).join('/'),
    stored: localStorage.getItem('mm_car'),
    state: window.__MM.state(),
  }));
  console.log(i, JSON.stringify(info));
  if (i < 3) { await page.click('#car-next'); await new Promise(r => setTimeout(r, 500)); }
}
// keyboard nav wrap-around
await page.click('#car-next');
await new Promise(r => setTimeout(r, 500));
console.log('after wrap:', await page.evaluate(() => document.getElementById('car-name').textContent));
// ESC back to title
await page.keyboard.press('Escape');
await new Promise(r => setTimeout(r, 400));
console.log('after ESC state:', await page.evaluate(() => window.__MM.state()));
// confirm via Enter keyboard
await page.click('#btn-garage');
await new Promise(r => setTimeout(r, 400));
await page.keyboard.press('Enter');
await new Promise(r => setTimeout(r, 500));
console.log('after ENTER state:', await page.evaluate(() => window.__MM.state()));
console.log('player vehicle in race:', await page.evaluate(() => window.__MM.game.race.player.vehicle.id));
console.log('rivals:', await page.evaluate(() => window.__MM.game.race.cars.slice(1).map(c => c.name).join(', ')));
await browser.close(); srv.close(); process.exit(0);
