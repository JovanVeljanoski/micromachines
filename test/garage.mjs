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
}).listen(8690);
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
await page.goto('http://localhost:8690/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 800));
await page.click('#btn-garage');
await new Promise(r => setTimeout(r, 1200));
for (let i = 0; i < 4; i++) {
  await page.screenshot({ path: `shots/garage-${i}.png` });
  await page.click('#car-next');
  await new Promise(r => setTimeout(r, 700));
}
await browser.close(); srv.close(); process.exit(0);
