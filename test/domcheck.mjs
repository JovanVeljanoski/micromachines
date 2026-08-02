import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
const root = new URL('/Users/jovan/Work/micromachines/', import.meta.url + '/..').pathname;
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const M = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  fs.readFile(path.join(root, p), (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'Content-Type': M[path.extname(p)] || 'text/plain' }); res.end(d); } });
}).listen(8697);
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
await page.goto('http://localhost:8697/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 800));

// level select content
await page.click('#btn-levels');
await new Promise(r => setTimeout(r, 300));
const cards = await page.$$eval('.level-card', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
console.log('CARDS:', JSON.stringify(cards, null, 1));

// countdown values
await page.evaluate(() => window.__MM.startRace(0, true));
await new Promise(r => setTimeout(r, 400));
const cd = await page.$$eval('.cd-lamp', els => els.map(e => e.className));
console.log('countdown lamps @0.4s:', cd);
await new Promise(r => setTimeout(r, 2300));
console.log('state after 2.7s:', await page.evaluate(() => window.__MM.state()));

// HUD during race
await new Promise(r => setTimeout(r, 4000));
const hud = await page.evaluate(() => ({
  lap: document.getElementById('hud-lap').textContent,
  time: document.getElementById('hud-time').textContent,
  pos: document.getElementById('hud-pos').textContent,
  standings: document.getElementById('hud-standings').textContent,
}));
console.log('HUD:', JSON.stringify(hud));

// finish quickly
await page.evaluate(() => window.__MM.setTimeScale(6));
await page.waitForFunction(() => window.__MM.state() === 'finished', { timeout: 90000 });
await page.evaluate(() => window.__MM.setTimeScale(1));
await new Promise(r => setTimeout(r, 400));
const res = await page.evaluate(() => ({
  title: document.getElementById('results-title').textContent,
  table: document.getElementById('results-table').textContent.replace(/\s+/g, ' '),
  best: document.getElementById('results-best').textContent,
}));
console.log('RESULTS:', JSON.stringify(res, null, 1));
await browser.close(); srv.close(); process.exit(0);
