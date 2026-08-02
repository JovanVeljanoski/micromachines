// crop ascii: node script file x0 y0 w h outw
import fs from 'fs';
import { PNG } from 'pngjs';
const [file, x0, y0, cw, ch, W] = [process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5], +process.argv[6], +process.argv[7] || 120];
const png = PNG.sync.read(fs.readFileSync(file));
const { width, data } = png;
const H = Math.round(W * (ch / cw) * 0.5);
function classify(r, g, b) {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / (Math.max(r, g, b) + 1);
  if (lum > 55 && sat > 0.45) {
    if (r > 140 && r > g * 1.9 && r > b * 1.9) return 'R';
    if (b > r * 1.4 && b > g * 1.15) return 'B';
    if (g > r * 1.15 && g > b * 1.3) return 'V';
    if (r > 170 && g > 120 && g > b * 1.6) return 'Y';
    if (r > 120 && r > g * 1.35 && g > b * 1.4) return 'w';
  }
  const ramp = ' .:-=+*#%@';
  return ramp[Math.min(9, Math.floor(lum / 25.6))];
}
let out = '';
for (let y = 0; y < H; y++) {
  let line = '';
  for (let x = 0; x < W; x++) {
    const sx = Math.floor(x0 + x * cw / W), sy = Math.floor(y0 + y * ch / H);
    const i = (sy * width + sx) * 4;
    line += classify(data[i], data[i + 1], data[i + 2]);
  }
  out += line + '\n';
}
console.log(out);
