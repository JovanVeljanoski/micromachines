// ============================================================
// test/shoot.mjs — headless screenshots of the actual game.
// Captures: title screen, each level mid-race (autopilot), HUD.
// Usage: node test/shoot.mjs [--title-only]
// ============================================================
import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const root = new URL('..', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const PORT = 8688;

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p === '/') p = '/index.html';
      fs.readFile(path.join(root, p), (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    srv.listen(PORT, () => resolve(srv));
  });
}

const srv = await serve();
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--enable-unsafe-swiftshader', '--window-size=1280,800'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('console', m => { const t = m.text(); if (!t.includes('GroupMarkerNotSet')) console.log('[browser]', m.type(), t.slice(0, 300)); });
page.on('pageerror', e => console.log('[PAGE ERROR]', e.message));

const shotsDir = path.join(root, 'shots');
fs.mkdirSync(shotsDir, { recursive: true });

console.log('loading title...');
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 3500));   // let attract mode run
await page.screenshot({ path: path.join(shotsDir, '00-title.png') });

if (!process.argv.includes('--title-only')) {
  for (let lv = 0; lv < 4; lv++) {
    console.log('level', lv);
    await page.evaluate((i) => window.__MM.startRace(i, true), lv);
    // let it race ~5 seconds of game time
    await new Promise(r => setTimeout(r, 5200));
    await page.screenshot({ path: path.join(shotsDir, `lvl${lv}-a.png`) });
    await new Promise(r => setTimeout(r, 4200));
    await page.screenshot({ path: path.join(shotsDir, `lvl${lv}-b.png`) });
  }
}

console.log('done.');
await browser.close();
srv.close();
process.exit(0);
