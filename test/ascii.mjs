// test/ascii.mjs — render a PNG as ASCII art (luminance) + color-class map.
// Usage: node test/ascii.mjs shots/lvl0-a.png [width]
import fs from 'fs';
import { PNG } from 'pngjs';

const file = process.argv[2];
const W = parseInt(process.argv[3] || '110', 10);
const png = PNG.sync.read(fs.readFileSync(file));
const { width, height, data } = png;
const H = Math.round(W * (height / width) * 0.5);   // chars are ~2:1

// classify pixel to a symbol by luminance + hue
function classify(r, g, b) {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / (Math.max(r, g, b) + 1);
  // chromatic classes for saturated bright pixels
  if (lum > 55 && sat > 0.45) {
    if (r > 140 && r > g * 1.9 && r > b * 1.9) return 'R';   // hot red
    if (b > r * 1.4 && b > g * 1.15) return 'B';             // blue
    if (g > r * 1.15 && g > b * 1.3) return 'V';             // green/veg
    if (r > 170 && g > 120 && g > b * 1.6) return 'Y';       // yellow/gold
    if (r > 120 && r > g * 1.35 && g > b * 1.4) return 'w';  // warm brown (wood/leather)
  }
  const ramp = ' .:-=+*#%@';
  return ramp[Math.min(9, Math.floor(lum / 25.6))];
}

let out = '';
for (let y = 0; y < H; y++) {
  let line = '';
  for (let x = 0; x < W; x++) {
    const sx = Math.floor(x * width / W), sy = Math.floor(y * height / H);
    const i = (sy * width + sx) * 4;
    line += classify(data[i], data[i + 1], data[i + 2]);
  }
  out += line + '\n';
}
console.log(out);

// coarse color histogram
const seen = {};
for (let i = 0; i < data.length; i += 4 * 997) {
  const k = `${data[i] >> 5},${data[i + 1] >> 5},${data[i + 2] >> 5}`;
  seen[k] = (seen[k] || 0) + 1;
}
const top = Object.entries(seen).sort((a, b) => b[1] - a[1]).slice(0, 6);
console.log('dominant colors:', top.map(([k, n]) => `#${k.split(',').map(v => (v << 5).toString(16).padStart(2, '0')).join('')} ${(n * 100 / Object.values(seen).reduce((a, b) => a + b, 0)).toFixed(0)}%`).join('  '));
