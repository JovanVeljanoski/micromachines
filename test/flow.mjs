// test/flow.mjs — capture UI/menus states.
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
}).listen(8695);

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
const shotsDir = path.join(root, 'shots');
fs.mkdirSync(shotsDir, { recursive: true });

await page.goto('http://localhost:8695/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1200));

// level select
await page.click('#btn-levels');
await new Promise(r => setTimeout(r, 400));
await page.screenshot({ path: path.join(shotsDir, 'ui-levels.png') });

// countdown (autopilot race)
await page.evaluate(() => window.__MM.startRace(0, true));
await new Promise(r => setTimeout(r, 1300));
await page.screenshot({ path: path.join(shotsDir, 'ui-countdown.png') });

// pause
await new Promise(r => setTimeout(r, 3500));
await page.keyboard.press('p');
await new Promise(r => setTimeout(r, 400));
await page.screenshot({ path: path.join(shotsDir, 'ui-pause.png') });
await page.click('#btn-resume');

// speed to results
await new Promise(r => setTimeout(r, 700));
await page.evaluate(() => window.__MM.setTimeScale(5));
await page.waitForFunction(() => window.__MM.state() === 'finished', { timeout: 90000 });
await page.evaluate(() => window.__MM.setTimeScale(1));
await new Promise(r => setTimeout(r, 700));
await page.screenshot({ path: path.join(shotsDir, 'ui-results.png') });

// help screen
await page.click('#btn-results-menu');
await new Promise(r => setTimeout(r, 400));
await page.click('#btn-help');
await new Promise(r => setTimeout(r, 300));
await page.screenshot({ path: path.join(shotsDir, 'ui-help.png') });

console.log('flow shots done');
await browser.close();
srv.close();
process.exit(0);
