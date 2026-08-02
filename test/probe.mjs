import fs from 'fs';
import { PNG } from 'pngjs';
const png = PNG.sync.read(fs.readFileSync(process.argv[2]));
const { width, height, data } = png;
const p = (x, y, label) => {
  const i = (Math.floor(y) * width + Math.floor(x)) * 4;
  console.log(label, `(${x},${y})`, `rgb(${data[i]},${data[i+1]},${data[i+2]})`);
};
// probe the dark band region of lvl3-b
for (let y = 100; y <= 700; y += 100) {
  let row = '';
  for (let x = 50; x <= 1250; x += 50) {
    const i = (y * width + x) * 4;
    const lum = (0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2]) | 0;
    row += String(lum).padStart(3) + ' ';
  }
  console.log(`y=${y}:`, row);
}
p(640, 400, 'center');
p(400, 300, 'darkband?');
