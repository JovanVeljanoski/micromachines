// ============================================================
// ui.js — HUD updates + screen management.
// ============================================================

const $ = (id) => document.getElementById(id);

export function fmtTime(t) {
  if (!isFinite(t) || t == null) return '--:--.-';
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

const POS_SUFFIX = ['st', 'nd', 'rd', 'th'];

export class UI {
  constructor() {
    this.hud = $('hud');
    this.msgEl = $('hud-msg');
    this.screens = {
      title: $('title-screen'),
      levels: $('level-select'),
      help: $('help-screen'),
      pause: $('pause-screen'),
      results: $('results-screen'),
      car: $('car-select'),
    };
    this.msgTimer = 0;
  }

  showScreen(name) {
    for (const k in this.screens) this.screens[k].classList.toggle('hidden', k !== name);
    if (!name) for (const k in this.screens) this.screens[k].classList.add('hidden');
  }

  showHUD(v) { this.hud.classList.toggle('hidden', !v); }

  setLap(cur, max) {
    $('lap-cur').textContent = Math.min(cur, max);
    $('lap-max').textContent = max;
  }
  setTime(t) { $('hud-time').textContent = fmtTime(t); }
  setBestLap(t) { $('hud-bestlap').textContent = `BEST ${fmtTime(t)}`; }

  setPosition(pos, standings, playerName) {
    const el = $('hud-pos');
    el.textContent = `${pos}${POS_SUFFIX[pos - 1]}`;
    el.className = `p${pos}`;
    const ol = $('hud-standings');
    ol.innerHTML = '';
    for (const c of standings) {
      const li = document.createElement('li');
      if (c.name === playerName) li.classList.add('me');
      li.innerHTML = `<span>${c.name}</span><span class="dot" style="background:#${c.color.toString(16).padStart(6, '0')}"></span>`;
      ol.appendChild(li);
    }
  }

  setBoost(active) { $('hud-boost').classList.toggle('hidden', !active); }
  setWrongWay(v) { $('hud-wrongway').classList.toggle('hidden', !v); }

  message(text, gold = false) {
    const el = this.msgEl;
    el.textContent = text;
    el.classList.remove('pop', 'gold');
    void el.offsetWidth;           // restart animation
    if (gold) el.classList.add('gold');
    el.classList.add('pop');
  }

  countdown(n) {
    const cd = $('hud-countdown');
    cd.classList.remove('hidden');
    const lamps = [$('cd1'), $('cd2'), $('cd3')];
    lamps.forEach(l => { l.classList.remove('lit', 'go'); });
    if (n > 0) for (let i = 0; i < 4 - n; i++) lamps[i].classList.add('lit');
    else lamps.forEach(l => l.classList.add('go'));
  }
  hideCountdown() { $('hud-countdown').classList.add('hidden'); }

  showResults(race, playerPos) {
    const tbl = $('results-table');
    const stand = race.standings();
    let html = '<tr><th>POS</th><th>DRIVER</th><th>TIME</th></tr>';
    stand.forEach((c, i) => {
      const cls = c.isPlayer ? ' class="me"' : '';
      const time = c.state.finished ? fmtTime(c.state.finishTime) : 'DNF';
      html += `<tr${cls}><td>${i + 1}${POS_SUFFIX[i]}</td><td><span class="r-dot" style="background:#${c.color.toString(16).padStart(6, '0')}"></span>${c.name}</td><td>${time}</td></tr>`;
    });
    tbl.innerHTML = html;
    const title = $('results-title');
    title.textContent = playerPos === 1 ? 'VICTORY!' : playerPos === 4 ? 'LAST PLACE...' : 'RACE COMPLETE';
    title.classList.toggle('won', playerPos === 1);
    this.showScreen('results');
  }

  buildLevelCards(levels, bests, onPick) {
    const wrap = $('level-cards');
    wrap.innerHTML = '';
    levels.forEach((lv, i) => {
      const d = document.createElement('div');
      d.className = 'level-card';
      d.innerHTML = `
        <div class="lc-num">CIRCUIT ${lv.num}</div>
        <div class="lc-name">${lv.name}</div>
        <div class="lc-sub">${lv.subtitle}</div>
        <div class="lc-best">${bests[lv.id] ? 'BEST LAP ' + fmtTime(bests[lv.id]) : 'NOT RACED YET'}</div>`;
      d.addEventListener('click', () => onPick(i));
      wrap.appendChild(d);
    });
  }
}
