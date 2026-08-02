// ============================================================
// main.js — game orchestration: renderer, states, HUD, fx, audio.
// States: title(attract) -> countdown -> racing -> paused/finished
// ============================================================
import * as THREE from 'three';
import { LEVELS } from './levels/index.js';
import { RaceCore } from './raceCore.js';
import { buildLevelScene } from './visuals/levelScene.js';
import { buildCar } from './visuals/carVisual.js';
import { Particles, SkidMarks, Shake, sparksFX, dustFX, boostFX, splashFX, confettiFX } from './effects.js';
import { AudioBank } from './audio.js';
import { Input } from './input.js';
import { UI, fmtTime } from './ui.js';
import { CameraRig } from './cameraRig.js';
import { createAI, aiInput } from './ai.js';
import { VEHICLES } from './vehicles.js';

// ---- turntable preview for the garage screen ----
class CarPreview {
  constructor() {
    this.canvas = document.getElementById('car-preview');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(560, 340, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 560 / 340, 0.01, 10);
    this.camera.position.set(0.42, 0.34, 0.5);
    this.camera.lookAt(0, 0.09, 0);
    const hemi = new THREE.HemisphereLight(0xcfe0f7, 0x3a3128, 1.15);
    const key = new THREE.DirectionalLight(0xfff2dd, 3.0);
    key.position.set(1.2, 2.2, 1.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const rim = new THREE.DirectionalLight(0x88aaff, 1.1);
    rim.position.set(-1.4, 1.2, -1.2);
    this.scene.add(hemi, key, rim);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.03, 40),
      new THREE.MeshStandardMaterial({ color: 0x232a44, roughness: 0.4, metalness: 0.3 }));
    disc.position.y = -0.015;
    disc.receiveShadow = true;
    this.scene.add(disc);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.44, 0.46, 48),
      new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.7 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.001;
    this.scene.add(ring);
    this.turntable = new THREE.Group();
    this.scene.add(this.turntable);
    this.model = null;
  }
  setVehicle(v) {
    if (this.model) { this.turntable.remove(this.model.group); }
    this.model = buildCar(v);
    this.turntable.add(this.model.group);
  }
  render(dt) {
    this.turntable.rotation.y += dt * 0.9;
    this.renderer.render(this.scene, this.camera);
  }
}

const FIXED_DT = 1 / 120;
const POS_SUFFIX = ['st', 'nd', 'rd', 'th'];

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 200);
    this.cameraRig = new CameraRig(this.camera);

    this.ui = new UI();
    this.audio = new AudioBank();
    this.input = new Input();
    this.shake = new Shake();

    this.state = 'title';
    this.levelIndex = 0;
    this.levelScenes = new Map();   // levelId -> {scene, boostPads}
    this.race = null;
    this.carVisuals = [];
    this.particles = null;
    this.skids = null;
    this.acc = 0;
    this.clock = new THREE.Clock();
    this.now = 0;
    this.bestLap = Infinity;
    this.lapStartTime = 0;
    this.playerBestByLevel = JSON.parse(localStorage.getItem('mm_best') || '{}');
    this.attractAI = null;
    this.resultsTimer = -1;
    this.finishOrbit = null;
    this.hudAccumulator = 0;
    this.newBest = false;
    this.playerVehicle = parseInt(localStorage.getItem('mm_car') || '0', 10) % VEHICLES.length;
    this.carSelectReturn = 'race';   // 'race' | 'level-restart'
    this.preview = new CarPreview();
    this.preview.setVehicle(VEHICLES[this.playerVehicle]);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.bindMenus();
    this.enterTitle();

    // test hooks
    window.__MM = {
      game: this,
      startRace: (i = 0, autopilot = true) => { this.startRace(i, { autopilot }); },
      setTimeScale: (s) => { this.timeScale = s; },
      state: () => this.state,
      race: () => this.race,
      camera: this.camera,
    };
    this.timeScale = 1;
    const q = new URLSearchParams(location.search);
    if (q.has('shot')) {
      const lv = parseInt(q.get('shot') || '0', 10) || 0;
      this.startRace(lv, { autopilot: true, skipCountdown: true });
    }

    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ---------------- scenes ----------------
  getLevelScene(level) {
    if (!this.levelScenes.has(level.id)) {
      const scene = new THREE.Scene();
      // lights per theme
      const th = level.theme;
      const hemi = new THREE.HemisphereLight(th.hemiSky, th.hemiGround, th.hemiInt);
      scene.add(hemi);
      const sun = new THREE.DirectionalLight(th.sunColor, th.sunInt);
      sun.position.set(6, 11, 5);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      const ext = Math.max(level.width, level.depth) * 0.75;
      sun.shadow.camera.left = -ext; sun.shadow.camera.right = ext;
      sun.shadow.camera.top = ext; sun.shadow.camera.bottom = -ext;
      sun.shadow.camera.far = 40;
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.015;
      scene.add(sun);
      if (th.spot) {
        // pool hall: warm overheads above the table
        for (let i = -1; i <= 1; i++) {
          const sp = new THREE.PointLight(0xffeec0, 20, 20, 1.7);
          sp.position.set(i * 3.0, 5.2, 0);
          scene.add(sp);
        }
      }
      scene.fog = new THREE.Fog(th.sky ?? 0x000000, 26, 90);
      const { root, boostPads } = buildLevelScene(level);
      scene.add(root);
      const particles = new Particles(scene);
      const skids = new SkidMarks(scene);
      this.levelScenes.set(level.id, { scene, particles, skids, boostPads });
    }
    return this.levelScenes.get(level.id);
  }

  // ---------------- state transitions ----------------
  enterTitle() {
    this.state = 'title';
    this.ui.showScreen('title');
    this.ui.showHUD(false);
    // attract mode: AI demo on the desktop level
    this.setupRace(0, { attract: true });
  }

  startRace(levelIdx, { autopilot = false, skipCountdown = false } = {}) {
    this.audio.ensure(); this.audio.resume();
    this.levelIndex = levelIdx;
    this.setupRace(levelIdx, { attract: false, autopilot });
    this.ui.showScreen(null);
    this.ui.showHUD(true);
    this.autopilot = autopilot;
    this.autopilotAI = autopilot ? createAI(0, 1.0) : null;

    if (skipCountdown) {
      this.race.started = true;
      this.state = 'racing';
      this.ui.hideCountdown();
    } else {
      this.state = 'countdown';
      this.countdownT = 3.2;
      this.cdStage = 3;
      this.ui.countdown(3);
    }
  }

  setupRace(levelIdx, { attract = false, autopilot = false } = {}) {
    this.newBest = false;
    const level = LEVELS[levelIdx];
    this.level = level;
    const ls = this.getLevelScene(level);
    this.scene = ls.scene;
    this.particles = ls.particles;
    this.skids = ls.skids;
    this.boostPads = ls.boostPads;

    // remove old car visuals (from whichever scene they lived in)
    for (const cv of this.carVisuals) if (cv.sceneAdded) cv.sceneAdded.remove(cv.group);
    this.carVisuals = [];

    this.race = new RaceCore(level, { laps: level.laps || 3, playerIndex: 0, playerVehicle: this.playerVehicle });
    if (attract) {
      // everyone is AI; "player" slot becomes AI too
      for (let i = 0; i < this.race.cars.length; i++) {
        const c = this.race.cars[i];
        c.ai = { lane: [-0.5, 0.5, -0.15, 0.15][i], skill: [1.0, 0.98, 0.95, 0.93][i], reverseT: 0, stuckT: 0 };
        c.isPlayer = i === 0; // camera target only
      }
      this.race.laps = 99;
      this.race.started = true;
    }
    for (const car of this.race.cars) {
      const cv = buildCar(car.vehicle);
      cv.group.position.set(car.state.x, 0, car.state.z);
      cv.group.rotation.y = car.state.heading;
      cv.sceneAdded = this.scene;
      this.scene.add(cv.group);
      this.carVisuals.push(cv);
      car.visual = cv;
    }
    const p = this.race.player.state;
    this.cameraRig.snapTo(p.x, p.z);
    this.bestLap = Infinity;
    this.lapStartTime = 0;
    this.resultsTimer = -1;
    this.finishOrbit = null;
    this.ui.setLap(1, 3);
    this.ui.setTime(0);
    this.ui.setBestLap(this.playerBestByLevel[level.id] || Infinity);
    this.updateStandingsHUD();
  }

  // ---------------- menus ----------------
  bindMenus() {
    const click = (id, fn) => document.getElementById(id).addEventListener('click', () => { this.audio.ensure(); this.audio.resume(); this.audio.uiSelect(); fn(); });
    click('btn-start', () => this.startRace(this.levelIndex));
    click('btn-garage', () => this.showCarSelect('race'));
    click('btn-levels', () => { this.ui.showScreen('levels'); this.refreshLevelCards(); });
    click('btn-help', () => this.ui.showScreen('help'));
    click('btn-mute', () => {
      const m = this.audio.toggleMuted();
      document.getElementById('btn-mute').textContent = `SOUND: ${m ? 'OFF' : 'ON'}`;
    });
    click('btn-levels-back', () => this.ui.showScreen('title'));
    click('btn-help-back', () => this.ui.showScreen('title'));
    click('btn-resume', () => this.resume());
    click('btn-restart', () => this.startRace(this.levelIndex, { autopilot: this.autopilot }));
    click('btn-quit', () => this.enterTitle());
    click('btn-retry', () => this.startRace(this.levelIndex, { autopilot: this.autopilot }));
    click('btn-next', () => this.startRace((this.levelIndex + 1) % LEVELS.length, { autopilot: this.autopilot }));
    click('btn-results-menu', () => this.enterTitle());
    click('btn-results-car', () => this.showCarSelect('level-restart'));

    document.getElementById('btn-mute').textContent = `SOUND: ${this.audio.muted ? 'OFF' : 'ON'}`;

    this.input.on('p', () => this.togglePause());
    this.input.on('escape', () => this.togglePause());
    this.input.on('m', () => {
      const m = this.audio.toggleMuted();
      document.getElementById('btn-mute').textContent = `SOUND: ${m ? 'OFF' : 'ON'}`;
    });
    this.input.on('enter', () => {
      if (this.state === 'carselect') { this.confirmCarSelect(); return; }
      if (this.state === 'title' && !document.getElementById('title-screen').classList.contains('hidden')) this.startRace(this.levelIndex);
      else if (this.state === 'title' && !document.getElementById('level-select').classList.contains('hidden')) {
        this.levelIndex = this.levelFocus;
        this.startRace(this.levelFocus, { autopilot: this.autopilot });
      }
      else if (this.state === 'finished') this.startRace((this.levelIndex + 1) % LEVELS.length, { autopilot: this.autopilot });
    });
    this.input.on('escape', () => {
      if (this.state === 'carselect') { this.state = 'title'; this.ui.showScreen('title'); }
    });
    this.input.on('r', () => {
      if (this.state === 'finished' || this.state === 'paused' || this.state === 'racing') {
        this.startRace(this.levelIndex, { autopilot: this.autopilot });
      }
    });
    // level select keyboard nav
    this.levelFocus = 0;
    this.input.on('arrowleft', () => { this.moveLevelFocus(-1); this.moveCarSelect(-1); });
    this.input.on('arrowright', () => { this.moveLevelFocus(1); this.moveCarSelect(1); });
    this.input.on('a', () => { this.moveLevelFocus(-1); this.moveCarSelect(-1); });
    this.input.on('d', () => { this.moveLevelFocus(1); this.moveCarSelect(1); });
    // garage buttons
    click('car-prev', () => this.moveCarSelect(-1));
    click('car-next', () => this.moveCarSelect(1));
    click('btn-car-race', () => this.confirmCarSelect());
    click('btn-car-back', () => { this.state = 'title'; this.ui.showScreen('title'); });
  }

  refreshLevelCards() {
    this.ui.buildLevelCards(LEVELS, this.playerBestByLevel, (i) => {
      this.audio.uiSelect();
      this.levelIndex = i;
      this.startRace(i, { autopilot: this.autopilot });
    });
    this.applyLevelFocus();
  }

  showCarSelect(returnMode = 'race') {
    this.state = 'carselect';
    this.carSelectReturn = returnMode;
    this.ui.showScreen('car');
    this.refreshCarSelectUI();
  }

  moveCarSelect(dir) {
    if (this.state !== 'carselect') return;
    this.playerVehicle = (this.playerVehicle + dir + VEHICLES.length) % VEHICLES.length;
    localStorage.setItem('mm_car', String(this.playerVehicle));
    this.audio.uiMove();
    this.refreshCarSelectUI();
  }

  refreshCarSelectUI() {
    const v = VEHICLES[this.playerVehicle];
    document.getElementById('car-name').textContent = v.name;
    document.getElementById('car-desc').textContent = v.desc;
    const stats = document.getElementById('car-stats');
    stats.innerHTML = ['speed', 'accel', 'grip'].map(k => `
      <div class="stat">
        <div class="stat-label">${k.toUpperCase()}</div>
        <div class="pips">${[1, 2, 3, 4, 5].map(i => `<div class="pip${i <= v.bars[k] ? ' on' : ''}"></div>`).join('')}</div>
      </div>`).join('');
    this.preview.setVehicle(v);
  }

  confirmCarSelect() {
    localStorage.setItem('mm_car', String(this.playerVehicle));
    this.startRace(this.levelIndex, { autopilot: this.autopilot, skipCountdown: false });
  }

  moveLevelFocus(dir) {
    if (document.getElementById('level-select').classList.contains('hidden')) return;
    this.levelFocus = (this.levelFocus + dir + LEVELS.length) % LEVELS.length;
    this.audio.uiMove();
    this.applyLevelFocus();
  }

  applyLevelFocus() {
    const cards = document.querySelectorAll('.level-card');
    cards.forEach((c, i) => c.classList.toggle('kb-focus', i === this.levelFocus));
  }

  togglePause() {
    if (this.state === 'racing') {
      this.state = 'paused';
      this.ui.showScreen('pause');
      this.audio.setSkid(0);
      this.audio.setEngine(0, 0, false);
    } else if (this.state === 'paused') this.resume();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'racing';
    this.ui.showScreen(null);
  }

  // ---------------- frame ----------------
  frame() {
    const rawDt = Math.min(this.clock.getDelta(), 0.05);
    const dt = rawDt * this.timeScale;
    this.now += dt;
    this.shake.update(dt);

    if (this.state === 'countdown') {
      this.countdownT -= dt;
      const stage = Math.ceil(Math.max(0, this.countdownT));
      if (stage !== this.cdStage && stage > 0) {
        this.cdStage = stage;
        this.ui.countdown(stage);
        this.audio.beep(false);
      }
      if (this.countdownT <= 0) {
        this.state = 'racing';
        this.race.started = true;
        this.ui.countdown(0);
        this.ui.message('GO!', true);
        this.audio.beep(true);
        setTimeout(() => this.ui.hideCountdown(), 900);
      }
      this.simulate(dt, 'ghost');  // pre-race: cars frozen, engines rev
    } else if (this.state === 'racing') {
      this.simulate(dt);
    } else if (this.state === 'finishing') {
      this.finishOrbit += dt;
      this.resultsTimer -= dt;
      this.simulate(dt);  // race keeps living during the finish orbit
      if (this.resultsTimer <= 0) {
        this.state = 'finished';
        this.showResults();
      }
    } else if (this.state === 'title') {
      this.simulate(dt, 'attract');   // attract mode runs
    } else if (this.state === 'carselect') {
      // keep the world rolling behind the garage (attract demo from title,
      // or live field after a finished race)
      this.simulate(dt, this.race.cars[0].ai ? 'attract' : 'ghost');
      this.preview.render(dt);
    }

    // visuals always update
    if (this.race) {
      for (const car of this.race.cars) car.visual.update(car.state, dt, this.now);
      this.particles.update(dt);
      this.skids.update(this.now);
      this.animateBoostPads(dt);
      this.updateCamera(dt);
      this.updateAudio();
      this.hudUpdate(rawDt);
    }

    this.renderer.render(this.scene, this.camera);
  }

  simulate(dt, mode = 'race') {
    const playerIn = this.input.state;

    this.acc += dt;
    if (this.acc > 0.12) this.acc = 0.12;   // avoid sim spiral on slow frames
    let steps = 0;
    while (this.acc >= FIXED_DT && steps < 15) {
      this.acc -= FIXED_DT; steps++;
      let input;
      if (mode === 'attract') {
        input = aiInput(this.race.cars[0].state, this.race.cars[0].ai, this.level, FIXED_DT, 0);
      } else if (this.autopilot && mode !== 'ghost') {
        input = aiInput(this.race.player.state, this.autopilotAI, this.level, FIXED_DT, 0);
      } else if (mode === 'ghost') {
        input = { throttle: 0, steer: 0, handbrake: false };
      } else {
        input = playerIn;
      }
      const events = this.race.step(FIXED_DT, input);
      for (const ev of events) this.handleEvent(ev);
    }
  }

  handleEvent(ev) {
    const isPlayer = ev.car && ev.car.isPlayer;
    switch (ev.type) {
      case 'impact': {
        const st = ev.car.state;
        sparksFX(this.particles, st.x, st.z, Math.min(2, ev.speed / 3));
        if (isPlayer) {
          this.audio.crash(ev.speed);
          this.shake.add(Math.min(0.7, ev.speed * 0.09));
        }
        break;
      }
      case 'rub':
        this.audio.rub();
        break;
      case 'skid': {
        const st = ev.car.state;
        if (Math.random() < 0.4) dustFX(this.particles, st.x, st.z);
        this.skids.addFor(this.race.cars.indexOf(ev.car), st.x, st.z, st.heading, this.now);
        break;
      }
      case 'boost': {
        const st = ev.car.state;
        boostFX(this.particles, st.x, st.z);
        if (isPlayer) this.audio.boost();
        break;
      }
      case 'fall': {
        const st = ev.car.state;
        if (this.level.holes && ev.hole !== false) splashFX(this.particles, st.x, st.z);
        if (isPlayer) {
          this.audio.fall();
          this.shake.add(0.35);
          this.ui.message(ev.hole ? 'SPLASH!' : 'OFF THE TABLE!');
        }
        break;
      }
      case 'respawn': {
        if (isPlayer) this.audio.respawn();
        const st = ev.car.state;
        this.particles.burst(st.x, 0.2, st.z, 14, { speed: 1.6, up: 2.4, life: 0.5, color: [1, 1, 0.6], grav: 3 });
        this.skids.lift(this.race.cars.indexOf(ev.car));
        break;
      }
      case 'lap':
        if (isPlayer) {
          const lapTime = this.race.time - this.lapStartTime;
          this.lapStartTime = this.race.time;
          if (ev.lap >= 1 && lapTime < this.bestLap && this.race.time > 1) {
            this.bestLap = lapTime;
            this.ui.setBestLap(lapTime);
          }
          if (ev.lap === this.race.laps - 1 && !ev.car.state.finished) {
            this.ui.message('FINAL LAP!', true);
            this.audio.lap();
          } else if (!ev.car.state.finished && this.race.time > 1) {
            this.ui.message(`LAP TIME  ${fmtTime(lapTime)}`);
          }
        }
        break;
      case 'position':
        if (this.state === 'racing') this.audio.position(ev.to < ev.from);
        break;
      case 'finish':
        if (isPlayer) this.onPlayerFinish();
        break;
    }
  }

  onPlayerFinish() {
    const pos = this.race.positionOf(this.race.player);
    this.state = 'finishing';
    this.resultsTimer = 2.2;
    this.finishOrbit = 0;
    this.ui.message(pos === 1 ? 'YOU WIN!' : 'FINISH!', pos === 1);
    confettiFX(this.particles, this.race.player.state.x, this.race.player.state.z);
    if (pos === 1) this.audio.fanfare(); else this.audio.sadTrombone();
    // persist best lap
    this.newBest = false;
    if (this.bestLap < Infinity) {
      const bests = this.playerBestByLevel;
      if (!bests[this.level.id] || this.bestLap < bests[this.level.id]) {
        bests[this.level.id] = this.bestLap;
        this.playerBestByLevel = bests;
        this.newBest = true;
        localStorage.setItem('mm_best', JSON.stringify(bests));
      }
    }
  }

  showResults() {
    const pos = this.race.positionOf(this.race.player);
    this.ui.setWrongWay(false);
    this.ui.setBoost(false);
    this.ui.showResults(this.race, pos);
    const best = this.playerBestByLevel[this.level.id];
    document.getElementById('results-best').textContent =
      (this.newBest && best) ? `★ NEW COURSE RECORD: ${fmtTime(best)} ★` : (best ? `course record: ${fmtTime(best)}` : '');
  }

  animateBoostPads(dt) {
    if (!this.race) return;
    const t = this.now;
    this.race.pads.forEach((pad, i) => {
      const vis = this.boostPads[i];
      if (!vis) return;
      vis.position.y = 0.02 + Math.sin(t * 3 + i * 1.7) * 0.012;
      const s = pad.active ? 1 : 0.45;
      vis.scale.setScalar(s);
      if (vis.userData.chevMat) vis.userData.chevMat.opacity = pad.active ? (0.72 + Math.sin(t * 5 + i) * 0.28) : 0.18;
    });
  }

  updateCamera(dt) {
    const p = this.race.player.state;
    let target = p;
    if (this.state === 'title') {
      // attract: follow the leader
      const lead = this.race.standings()[0].state;
      target = lead;
    }
    const speedNorm = Math.min(1, Math.abs(p.speedF) / 8);
    this.cameraRig.follow(target, speedNorm, this.shake, dt,
      (this.state === 'finishing' || this.state === 'finished') ? this.finishOrbit : null);
  }

  updateStandingsHUD() {
    this.ui.setPosition(this.race.positionOf(this.race.player), this.race.standings(), 'YOU');
  }

  updateAudio() {
    if (this.state === 'racing' || this.state === 'finishing' || this.state === 'countdown') {
      const p = this.race.player.state;
      const speedNorm = this.state === 'countdown'
        ? Math.min(0.35, Math.abs(this.input.state.throttle) * 0.35)
        : Math.min(1, Math.abs(p.speedF) / 8.5);
      this.audio.setEngine(speedNorm, this.input.state.throttle, p.boostT > 0);
      this.audio.setSkid(p.sliding * (Math.abs(p.speedF) > 2 ? 1 : 0));
    } else {
      this.audio.setEngine(0, 0, false);
      this.audio.setSkid(0);
    }
  }

  hudAccumulator = 0;

  hudUpdate(dt) {
    this.hudAccumulator += dt;
    if (this.hudAccumulator < 0.12) return;
    this.hudAccumulator = 0;
    if (this.state === 'racing' || this.state === 'countdown' || this.state === 'finishing') {
      this.ui.setTime(this.race.time);
      this.ui.setLap(Math.min(this.race.player.state.lap + 1, this.race.laps), this.race.laps);
      this.updateStandingsHUD();
      this.ui.setWrongWay(!!this.race.player.wrongWay && this.state === 'racing');
      this.ui.setBoost(this.race.player.state.boostT > 0);
    }
  }
}

// boot
new Game();
