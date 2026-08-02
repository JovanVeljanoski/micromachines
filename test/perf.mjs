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
}).listen(8691);
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://localhost:8691/?shot=0', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
for (let lv = 0; lv < 4; lv++) {
  const stats = await page.evaluate(async (i) => {
    window.__MM.startRace(i, true);
    await new Promise(r => setTimeout(r, 800));
    const g = window.__MM.game;
    const t0 = performance.now();
    let frames = 0;
    await new Promise(res => {
      const loop = () => { frames++; if (performance.now() - t0 < 3000) requestAnimationFrame(loop); else res(); };
      requestAnimationFrame(loop);
    });
    const info = g.renderer.info;
    return { fps: frames / 3, calls: info.render.calls, tris: info.render.triangles, geoms: info.memory.geometries, tex: info.memory.textures };
  }, lv);
  console.log(`level ${lv}: fps=${stats.fps.toFixed(0)} drawCalls=${stats.calls} tris=${stats.tris} geoms=${stats.geoms} tex=${stats.tex}`);
}
await browser.close(); srv.close(); process.exit(0);
