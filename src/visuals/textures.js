// ============================================================
// textures.js — procedural canvas textures. Zero external assets.
// ============================================================
import * as THREE from 'three';

function canvasTex(w, h, draw, { repeat = [1, 1], aniso = 4 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  return t;
}

function rnd(seedObj) { // tiny deterministic rng
  seedObj.s = (seedObj.s * 16807) % 2147483647;
  return (seedObj.s - 1) / 2147483646;
}

// ---------- surfaces ----------
export function wood(base = '#9a6b3f', dark = '#7c5230', planks = 7, w = 512) {
  return canvasTex(w, w, (ctx, W, H) => {
    const s = { s: 12345 };
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
    const ph = H / planks;
    for (let p = 0; p < planks; p++) {
      ctx.fillStyle = `rgba(0,0,0,${0.04 + rnd(s) * 0.08})`;
      ctx.fillRect(0, p * ph, W, ph);
      // grain
      ctx.strokeStyle = `rgba(60,30,10,${0.12 + rnd(s) * 0.1})`;
      for (let g = 0; g < 9; g++) {
        ctx.beginPath();
        const y0 = p * ph + rnd(s) * ph;
        ctx.moveTo(0, y0);
        for (let x = 0; x <= W; x += 32) ctx.lineTo(x, y0 + Math.sin(x * 0.02 + p + g) * 3 + (rnd(s) - 0.5) * 4);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(40,20,5,0.5)';
      ctx.fillRect(0, p * ph, W, 2);
    }
  });
}

export function floorBoards() {
  return canvasTex(512, 512, (ctx, W, H) => {
    const s = { s: 777 };
    ctx.fillStyle = '#241a12'; ctx.fillRect(0, 0, W, H);
    const pw = W / 4;
    for (let p = 0; p < 4; p++) {
      for (let y = 0; y < H; y += 128) {
        const off = (p % 2) * 64;
        ctx.fillStyle = `hsl(24, ${28 + rnd(s) * 10}%, ${13 + rnd(s) * 7}%)`;
        ctx.fillRect(p * pw + 1, (y + off) % H + 1, pw - 2, 126);
        ctx.strokeStyle = 'rgba(20,12,6,0.55)';
        for (let g = 0; g < 5; g++) {
          ctx.beginPath();
          ctx.moveTo(p * pw + rnd(s) * pw, (y + off) % H);
          ctx.lineTo(p * pw + rnd(s) * pw, (y + off) % H + 128);
          ctx.stroke();
        }
      }
    }
  });
}

export function gingham(size = 512, checks = 16) {
  return canvasTex(size, size, (ctx, W, H) => {
    const c = W / checks;
    ctx.fillStyle = '#f4ede2'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(196,45,38,0.55)';
    for (let i = 0; i < checks; i += 2) {
      ctx.fillRect(i * c, 0, c, H);
      ctx.fillRect(0, i * c, W, c);
    }
    ctx.fillStyle = 'rgba(150,20,15,0.45)';
    for (let i = 0; i < checks; i += 2)
      for (let j = 0; j < checks; j += 2)
        ctx.fillRect(i * c, j * c, c, c);
  });
}

export function felt(color = '#2e7d32') {
  return canvasTex(512, 512, (ctx, W, H) => {
    const s = { s: 42 };
    ctx.fillStyle = color; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) {
      const g = 100 + rnd(s) * 60;
      ctx.fillStyle = `rgba(${g * 0.4 | 0},${g | 0},${g * 0.45 | 0},0.16)`;
      ctx.fillRect(rnd(s) * W, rnd(s) * H, 1.6, 1.6);
    }
  });
}

export function grass() {
  return canvasTex(512, 512, (ctx, W, H) => {
    const s = { s: 99 };
    ctx.fillStyle = '#4a8a35'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 5200; i++) {
      const x = rnd(s) * W, y = rnd(s) * H;
      const g = 120 + rnd(s) * 90;
      ctx.strokeStyle = `rgba(${g * 0.55 | 0},${g | 0},${g * 0.4 | 0},0.7)`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd(s) - 0.5) * 3, y - 2 - rnd(s) * 4);
      ctx.stroke();
    }
    // mow stripes
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      ctx.fillRect(i * W / 4, 0, W / 8, H);
    }
  });
}

export function sand() {
  return canvasTex(256, 256, (ctx, W, H) => {
    const s = { s: 31415 };
    ctx.fillStyle = '#d9b878'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) {
      const v = rnd(s);
      ctx.fillStyle = v > 0.5 ? 'rgba(255,235,190,0.5)' : 'rgba(150,110,60,0.4)';
      ctx.fillRect(rnd(s) * W, rnd(s) * H, 1.4, 1.4);
    }
  });
}

// ---------- props ----------
export function rulerTicks() {
  return canvasTex(512, 64, (ctx, W, H) => {
    ctx.fillStyle = '#e8c56a'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#7a5215';
    for (let i = 0; i <= 60; i++) {
      const x = i * W / 60;
      ctx.fillRect(x, 0, 1.4, i % 5 === 0 ? H * 0.5 : H * 0.28);
    }
    ctx.font = 'bold 20px Arial';
    for (let i = 5; i < 60; i += 5) ctx.fillText(String(i / 5), i * W / 60 + 2, H * 0.85);
  });
}

export function bookCover(color, title) {
  return canvasTex(256, 192, (ctx, W, H) => {
    ctx.fillStyle = color; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, W - 20, H - 20);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '900 34px Arial'; ctx.textAlign = 'center';
    ctx.fillText(title, W / 2, H / 2 - 30);
    ctx.font = '700 16px Arial';
    ctx.fillText('A. UTHOR', W / 2, H / 2 + 40);
  });
}

export function cerealBox() {
  return canvasTex(256, 256, (ctx, W, H) => {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#ff8c1a'); grad.addColorStop(1, '#e2543e');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = '900 italic 44px Arial'; ctx.textAlign = 'center';
    ctx.save(); ctx.translate(W / 2, 90); ctx.rotate(-0.06);
    ctx.fillText('TURBO', 0, 0);
    ctx.fillText('OATS!', 0, 48);
    ctx.restore();
    // racing car doodle
    ctx.fillStyle = '#2f6fd4';
    ctx.fillRect(W / 2 - 55, H - 80, 110, 34);
    ctx.beginPath(); ctx.arc(W / 2 - 35, H - 42, 14, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(W / 2 + 35, H - 42, 14, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd23a';
    ctx.font = '900 24px Arial';
    ctx.fillText('VROOM VROOM', W / 2, H - 100);
  });
}

export function checkered() {
  return canvasTex(256, 64, (ctx, W, H) => {
    const c = 32;
    for (let x = 0; x < W / c; x++)
      for (let y = 0; y < H / c; y++) {
        ctx.fillStyle = (x + y) % 2 ? '#111' : '#f5f5f5';
        ctx.fillRect(x * c, y * c, c, c);
      }
  });
}

export function waffle() {
  return canvasTex(256, 256, (ctx, W, H) => {
    ctx.fillStyle = '#d99a3d'; ctx.fillRect(0, 0, W, H);
    const c = 42;
    ctx.fillStyle = '#b4762027';
    for (let x = 0; x < W; x += c) for (let y = 0; y < H; y += c) {
      ctx.fillStyle = '#a5661e';
      ctx.fillRect(x + 5, y + 5, c - 10, c - 10);
    }
  });
}

export function boostChevron() {
  return canvasTex(128, 128, (ctx, W, H) => {
    ctx.fillStyle = 'rgba(10,40,60,0.0)'; ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = '#54e9ff'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    for (const off of [-14, 22, 58]) {
      ctx.beginPath();
      ctx.moveTo(22, 18 + off * 0);
      ctx.lineTo(W / 2, 46 + off * 0);
      ctx.lineTo(W - 22, 18 + off * 0);
      ctx.stroke();
      ctx.translate(0, 0);
      ctx.beginPath();
      ctx.moveTo(22, 52 + off * 0);
      ctx.lineTo(W / 2, 80 + off * 0);
      ctx.lineTo(W - 22, 52 + off * 0);
      ctx.stroke();
    }
  });
}

export function stickyNote(text, bg = '#fff36e') {
  return canvasTex(128, 128, (ctx, W, H) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#333';
    ctx.font = 'italic 700 20px Comic Sans MS, cursive';
    ctx.textAlign = 'center';
    const lines = text.split('\n');
    lines.forEach((l, i) => ctx.fillText(l, W / 2, 52 + i * 26));
  });
}

export function poolFelt() { return felt('#2f8f3e'); }

// Road-ish track surface for desk edge runner? (unused surfaces kept minimal)
export function pageLines() {
  return canvasTex(256, 256, (ctx, W, H) => {
    ctx.fillStyle = '#f2ecd9'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c9c2a8';
    for (let y = 8; y < H; y += 10) ctx.fillRect(0, y, W, 1.5);
  });
}
