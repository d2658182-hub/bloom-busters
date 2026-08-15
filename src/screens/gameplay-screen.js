/* ============================================================
   GAMEPLAY — Drop & Match in the Magic Garden.
   Objects (magic plants) at the top, pests (targets) at the
   bottom. Each object neutralizes EXACTLY one element of pest.
   One wrong drop = level failed (sacred concept).
   Canvas logical space: 720x1280 (9:16), scaled by CSS.
   ============================================================ */

/* ---- shared image cache (images preloaded by the loading screen) ---- */
const IMG = {};
function sprite(src) {
  if (!IMG[src]) {
    const img = new Image();
    img.src = src;
    IMG[src] = img;
  }
  return IMG[src];
}

/* ---- seeded shuffle (deterministic levels) ---- */
function seededShuffle(items, seed) {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

class GameplayScreen extends BaseScreen {
  constructor(game) {
    super(game, 'gameplay');
    this.canvas = null;
    this.ctx = null;
    this.frameId = null;
    this.lastTime = 0;
    this.state = null;       // current level state (survives pause/rebuild)
    this.bannerTimer = null;
  }

  /* ---------------- level data ---------------- */

  worldOf(level) {
    const config = this.game.config;
    let acc = 0;
    for (let i = 0; i < config.worlds.length; i += 1) {
      acc += config.worlds[i].levels;
      if (level <= acc) return { index: i, ...config.worlds[i] };
    }
    const last = config.worlds[config.worlds.length - 1];
    return { index: config.worlds.length - 1, ...last };
  }

  /* deterministic per-level RNG: splitmix32-hash of the level, then LCG draws.
     (plain LCG seeds ramp on consecutive levels; splitmix32 decorrelates them.) */
  levelRand(level) {
    let z = (level + 0x9E3779B9) >>> 0;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
    z = (z ^ (z >>> 15)) >>> 0;
    let s = z;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  buildLevel(level) {
    const config = this.game.config;
    const world = this.worldOf(level);
    const unlocked = config.elements.slice(0, world.unlock);
    const rand = this.levelRand(level);

    /* pest count: base curve + seeded jitter (-1..+1) so neighbour levels differ */
    let count = 2 + Math.floor((level - 1) / config.pestStep);
    if (level > 2) count += Math.floor(rand() * 3) - 1;
    count = Math.max(2, Math.min(config.maxPests, count));

    /* element multiset: every element of the pool evenly + random remainder,
       then shuffled — objects and pests share the multiset, so every level
       is guaranteed solvable (each pest has exactly one matching object). */
    let pool = unlocked;
    /* ~30% of levels past world 1 are "focused": a random subset of the
       unlocked elements, so duplicates dominate — a different feel (fewer
       options, repetition pressure) instead of always the same full set. */
    if (level > 40 && rand() < 0.3) {
      const focusCount = Math.max(2, Math.min(unlocked.length - 1, 3 + Math.floor(rand() * 2)));
      pool = seededShuffle(unlocked, level * 53 + 11).slice(0, focusCount);
    }
    const per = Math.floor(count / pool.length);
    const base = [];
    for (let i = 0; i < pool.length; i += 1) {
      for (let j = 0; j < per; j += 1) base.push(pool[i]);
    }
    const extra = seededShuffle(pool, level * 37 + 3);
    /* compute the number of extras FIRST: the loop condition must not re-evaluate
       a growing base.length (it would stop early and truncate the level) */
    const need = count - base.length;
    for (let i = 0; i < need; i += 1) base.push(extra[i]);
    const elements = seededShuffle(base, level * 41 + 9);

    const objects = elements.map((element, i) => ({
      id: i,
      element,
      x: 0, y: 0,
      slotX: 0, slotY: 0,
      state: 'idle',        // idle | dragging | falling | gone
      fallT: 0,
      target: null,
      wobble: Math.random() * Math.PI * 2,
      scale: 1
    }));
    const pests = elements.map((element, i) => ({
      id: i,
      element,
      x: 0, y: 0,
      w: 0, h: 0,
      alive: true,
      state: 'idle',        // idle | hit | wrong | dead
      tremble: 0,
      flash: 0,
      scale: 1,
      frame: 0,
      wobble: Math.random() * Math.PI * 2
    }));

    const oShuffle = seededShuffle(objects, level * 7 + 1);
    const pShuffle = seededShuffle(pests, level * 13 + 5);
    /* one RNG instance per layout so their draws never interfere */
    this.layoutObjects(oShuffle, this.levelRand(level + 1));
    this.layoutPests(pShuffle, this.levelRand(level + 2));

    return {
      level,
      world,
      objects: oShuffle,
      pests: pShuffle,
      combo: this.game.hasItem('mega-seeds') ? 1 : 0,
      maxCombo: this.game.hasItem('mega-seeds') ? 1 : 0,
      score: 0,
      phase: 'play',        // play | resolving | won | lost
      reviveUsed: false,
      hintsUsed: 0,
      endDelay: 0,
      shake: 0,
      flash: 0,
      time: 0,
      particles: [],
      popups: [],
      cloudOffsetA: 0,
      cloudOffsetB: 0,
      groundOffset: 0,
      dust: this.makeDust()
    };
  }

  makeDust() {
    const dust = [];
    const imgs = ['magic_01.png', 'magic_02.png', 'magic_05.png'];
    for (let i = 0; i < 12; i += 1) {
      dust.push({
        img: imgs[i % imgs.length],
        x: Math.random() * 720,
        y: 200 + Math.random() * 800,
        speed: 8 + Math.random() * 14,
        phase: Math.random() * Math.PI * 2,
        amp: 10 + Math.random() * 22,
        size: 10 + Math.random() * 14,
        alpha: 0.35 + Math.random() * 0.4
      });
    }
    return dust;
  }

  layoutObjects(objects, rand) {
    const total = objects.length;
    const perRow = total <= 4 ? 4 : 3 + Math.floor(rand() * 2);
    const slot = 150;
    const rows = Math.ceil(total / perRow);
    const startY = 150 + (rows - 1) * slot;
    objects.forEach((obj, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const rowCount = Math.min(perRow, total - row * perRow);
      const x = 360 + (col - (rowCount - 1) / 2) * (slot + 8) + (rand() - 0.5) * 26;
      const y = startY + row * (slot + 6) + (rand() - 0.5) * 16;
      obj.slotX = x;
      obj.slotY = y;
      obj.x = x;
      obj.y = y;
    });
  }

  layoutPests(pests, rand) {
    const total = pests.length;
    const perRow = total <= 4 ? 4 : 3 + Math.floor(rand() * 2);
    const slot = 156;
    const rows = Math.ceil(total / perRow);
    const startY = total > 4 ? 860 : 1000;
    pests.forEach((pest, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const rowCount = Math.min(perRow, total - row * perRow);
      const x = 360 + (col - (rowCount - 1) / 2) * (slot + 10) + (rand() - 0.5) * 26;
      const y = startY + row * (slot - 34) + (rand() - 0.5) * 16;
      pest.x = x;
      pest.y = y;
      pest.w = 128;
      pest.h = 128;
    });
  }

  /* ---------------- build (DOM + canvas) ---------------- */

  build() {
    const config = this.game.config;

    this.el = document.createElement('div');
    this.el.className = 'screen gameplay-screen';
    this.el.style.backgroundImage = `url("${config.backgrounds.gameplay}")`;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'game-canvas';
    this.canvas.width = 720;
    this.canvas.height = 1280;
    this.ctx = this.canvas.getContext('2d');

    this.hud = document.createElement('div');
    this.hud.className = 'gameplay-hud';
    this.hud.innerHTML = `
      ${this.scoreElement()}
      ${this.levelElement()}
      <div class="hud-right">
        ${this.hintElement()}
        <button type="button" class="btn btn-square btn-pause" aria-label="Pause">
          <img src="assets/ui/b_8.png" alt="" draggable="false">
          <span class="btn-icon">⏸</span>
        </button>
      </div>
    `;

    this.banner = document.createElement('div');
    this.banner.className = 'level-banner';
    this.banner.style.display = 'none';

    this.el.appendChild(this.canvas);
    this.el.appendChild(this.hud);
    this.el.appendChild(this.banner);

    this.hud.querySelector('.btn-pause').addEventListener('click', () => this.pause());
    const hintBtn = this.hud.querySelector('.btn-hint');
    if (hintBtn) hintBtn.addEventListener('click', () => this.useHint());

    /* pointer interaction */
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    this.cleanups.push(() => {
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('pointerup', this.onPointerUp);
    });

    this.onKeyDown((event) => {
      if (event.code === 'Escape' || event.code === 'KeyP') this.pause();
    });

    /* auto-pause when the platform pauses (bridge onPause) */
    if (typeof SDK !== 'undefined') {
      const offPause = SDK.onPause(() => {
        if (this.frameId) this.pause();
      });
      this.cleanups.push(offPause);
    }
  }

  scoreElement() {
    return `
      <div class="hud-score">
        <img src="assets/ui/c.png" alt="" draggable="false">
        <span class="hud-score-value">0</span>
        <span class="hud-combo">x1</span>
      </div>
    `;
  }

  levelElement() {
    return `<div class="hud-level"><span class="hud-level-value">LV 1</span></div>`;
  }

  hintElement() {
    if (!this.game.hasItem('hint')) return '';
    return `
      <button type="button" class="btn btn-square btn-hint" aria-label="Hint">
        <img src="assets/ui/b_8.png" alt="" draggable="false">
        <span class="btn-icon">❓</span>
      </button>
    `;
  }

  /* ---------------- enter / exit (loop lifecycle) ---------------- */

  enter(previous, options = {}) {
    if (options.resumeState && !this.state) {
      this.state = this.restoreState(options.resumeState);
      this.state.newLevel = false;
    } else if (!this.state || !options.keep) {
      const level = options.level || this.game.getLevel();
      this.state = this.buildLevel(level);
      this.state.newLevel = true;
    }
    if (this.state.newLevel) {
      this.showBanner(this.state.level, this.state.world);
      this.state.newLevel = false;
    }

    if (typeof SDK !== 'undefined') {
      if (options.resume) SDK.gameplayResume();
      else SDK.gameplayStart();
    }
    this.game.audio.playMusic('gameplay');
    this.lastTime = 0;
    this.frameId = requestAnimationFrame(this.loop.bind(this));
    this.updateHud();
  }

  exit() {
    cancelAnimationFrame(this.frameId);
    this.frameId = null;
    if (typeof SDK !== 'undefined') SDK.gameplayPause();
    this.game.audio.stopMusic();
    if (this.bannerTimer) {
      clearTimeout(this.bannerTimer);
      this.bannerTimer = null;
    }
  }

  /* ---------------- pause / resume ---------------- */

  pause() {
    this.game.audio.click();
    this.game.show('pause');
  }

  /* ---------------- SDK + end-of-run ---------------- */

  async endRun(won) {
    const state = this.state;
    state.phase = won ? 'won' : 'lost';

    const streak = this.game.pushStreak(won ? 'win' : 'loss');
    if (typeof SDK !== 'undefined' && SDK.isAvailable() && streak >= 2 && streak % 2 === 0) {
      /* freeze gameplay during the fullscreen ad */
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
      await SDK.showInterstitial();
      this.game.resetStreak();
    }

    const data = {
      level: state.level,
      score: state.score,
      combo: state.maxCombo,
      coins: won ? this.winCoins() : this.game.config.economy.lossConsolation,
      stars: won ? this.computeStars() : 0,
      pestCount: state.pests.length
    };
    this.game.addCoins(data.coins);
    if (won) this.game.setLevel(state.level + 1);

    if (won && typeof SDK !== 'undefined') SDK.gameplayStop();
    if (!won && typeof SDK !== 'undefined') SDK.gameplayFail();

    this.game.show(won ? 'victory' : 'gameover', { data, resumeState: won ? null : this.snapshot() });
    /* clear level state so the next entry builds/restores cleanly */
    this.state = null;
  }

  winCoins() {
    const cfg = this.game.config.economy;
    let coins = cfg.winBase + Math.floor(this.state.level * cfg.winPerLevel);
    if (this.state.level % 10 === 0) coins += cfg.milestoneBonus;
    if (this.game.hasItem('bloom-bonus')) coins *= 1.25;
    if (this.game.hasItem('double')) coins *= 2;
    return Math.max(1, Math.round(coins));
  }

  computeStars() {
    const count = this.state.pests.length;
    if (this.state.maxCombo >= count) return 3;
    if (this.state.maxCombo >= 3) return 2;
    return 1;
  }

  snapshot() {
    /* a wrongly-dropped object is undone (back to its slot);
       already-matched objects/pests stay matched */
    return {
      level: this.state.level,
      world: this.state.world,
      combo: this.state.combo,
      maxCombo: this.state.maxCombo,
      score: this.state.score,
      reviveUsed: this.state.reviveUsed,
      hintsUsed: this.state.hintsUsed,
      objects: this.state.objects.map((o) => ({
        id: o.id,
        element: o.element,
        slotX: o.slotX,
        slotY: o.slotY,
        x: o.slotX,
        y: o.slotY,
        state: o.wasWrong ? 'idle' : (o.state === 'idle' ? 'idle' : 'gone')
      })),
      pests: this.state.pests.map((p) => ({
        id: p.id,
        element: p.element,
        x: p.x,
        y: p.y,
        w: p.w,
        h: p.h,
        alive: p.alive,
        state: p.alive ? 'idle' : 'dead'
      }))
    };
  }

  restoreState(snap) {
    const state = {
      level: snap.level,
      world: snap.world,
      objects: snap.objects,
      pests: snap.pests,
      combo: snap.combo || 0,
      maxCombo: snap.maxCombo || 0,
      score: snap.score || 0,
      phase: 'play',
      reviveUsed: true,
      hintsUsed: snap.hintsUsed || 0,
      endDelay: 0,
      shake: 0,
      flash: 0,
      time: 0,
      particles: [],
      popups: [],
      cloudOffsetA: 0,
      cloudOffsetB: 0,
      groundOffset: 0,
      dust: this.makeDust()
    };
    /* re-layout deterministically: same level -> same seeded RNG -> same positions */
    this.layoutObjects(state.objects, this.levelRand(snap.level + 1));
    this.layoutPests(state.pests, this.levelRand(snap.level + 2));
    state.objects.forEach((o) => {
      o.wobble = Math.random() * Math.PI * 2;
      o.fallT = 0;
      o.target = null;
      o.flashHint = 0;
      o.wasWrong = false;
      o.scale = 1;
      if (o.state === 'idle') {
        o.x = o.slotX;
        o.y = o.slotY;
      } else {
        o.state = 'gone';
        o.scale = 0;
      }
    });
    state.pests.forEach((p) => {
      p.wobble = Math.random() * Math.PI * 2;
      p.tremble = 0;
      p.flash = 0;
      p.flashHint = 0;
      p.frame = 0;
      p.scale = 1;
      p.state = p.alive ? 'idle' : 'dead';
    });
    return state;
  }

  /* ---------------- banner + hud ---------------- */

  showBanner(level, world) {
    let sub = 'GOAL';
    const prevWorldIndex = this.worldOf(Math.max(1, level - 1)).index;
    if (world.index > prevWorldIndex) sub = 'NEW ELEMENT';
    else if (level % 10 === 0) sub = 'MILESTONE';
    else if (level === 1) sub = 'GOAL';
    this.banner.innerHTML = `
      <div class="lb-title">LEVEL ${level}</div>
      <div class="lb-sub">${sub}</div>
      <div class="lb-world">${world.name}</div>
    `;
    this.banner.style.display = 'block';
    this.banner.classList.remove('lb-anim');
    void this.banner.offsetWidth;
    this.banner.classList.add('lb-anim');
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.banner.style.display = 'none';
    }, 1700);
    if (level % 10 === 0) this.game.audio.milestone();
  }

  updateHud() {
    const state = this.state;
    if (!state) return;
    const score = this.hud.querySelector('.hud-score-value');
    if (score) score.textContent = state.score.toLocaleString('en-US');
    const combo = this.hud.querySelector('.hud-combo');
    if (combo) {
      const mult = state.combo + 1;
      combo.textContent = `x${mult}`;
      combo.classList.toggle('combo-hot', state.combo >= 2);
    }
    const level = this.hud.querySelector('.hud-level-value');
    if (level) level.textContent = `LV ${state.level}`;
  }

  /* ---------------- pointer interaction ---------------- */

  toLocal(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 720;
    const y = ((event.clientY - rect.top) / rect.height) * 1280;
    return { x, y };
  }

  hitObject(x, y) {
    const state = this.state;
    if (!state || state.phase !== 'play') return null;
    for (let i = state.objects.length - 1; i >= 0; i -= 1) {
      const o = state.objects[i];
      if (o.state !== 'idle') continue;
      if (Math.abs(x - o.x) < 66 && Math.abs(y - o.y) < 78) return o;
    }
    return null;
  }

  hitPest(x, y) {
    const state = this.state;
    if (!state) return null;
    for (const p of state.pests) {
      if (!p.alive) continue;
      if (Math.abs(x - p.x) < p.w / 2 + 12 && Math.abs(y - p.y) < p.h / 2 + 12) return p;
    }
    return null;
  }

  onPointerDown(event) {
    if (!this.state || this.state.phase !== 'play') return;
    const { x, y } = this.toLocal(event);
    const obj = this.hitObject(x, y);
    if (obj) {
      obj.state = 'dragging';
      obj.dragX = x;
      obj.dragY = y;
      obj.x = x;
      obj.y = y;
      obj.scale = 1.18;
      try { this.canvas.setPointerCapture(event.pointerId); } catch (error) { /* noop */ }
      this.game.audio.drop();
    }
  }

  onPointerMove(event) {
    if (!this.state) return;
    const { x, y } = this.toLocal(event);
    const dragging = this.state.objects.find((o) => o.state === 'dragging');
    if (!dragging) return;
    dragging.x = Math.max(60, Math.min(660, x));
    dragging.y = Math.max(120, Math.min(1240, y));
    /* near-miss tremble on wrong pests */
    for (const p of this.state.pests) {
      if (!p.alive || p.element === dragging.element) continue;
      if (Math.abs(x - p.x) < p.w / 2 + 34 && Math.abs(y - p.y) < p.h / 2 + 34) {
        p.tremble = 0.35;
      }
    }
  }

  onPointerUp(event) {
    if (!this.state || this.state.phase !== 'play') return;
    const dragging = this.state.objects.find((o) => o.state === 'dragging');
    if (!dragging) return;
    const { x, y } = this.toLocal(event);
    const pest = this.hitPest(x, y);
    if (pest) {
      this.resolveDrop(dragging, pest);
    } else {
      this.returnObject(dragging);
    }
  }

  returnObject(obj) {
    obj.state = 'falling';
    obj.target = { x: obj.slotX, y: obj.slotY, pest: null, correct: null };
    obj.fallT = 0;
    obj.scale = 1;
  }

  /* ---------------- match resolution ---------------- */

  resolveDrop(obj, pest) {
    const state = this.state;
    const correct = obj.element === pest.element;
    obj.state = 'falling';
    obj.target = { x: pest.x, y: pest.y, pest, correct };
    obj.fallT = 0;
    state.phase = 'resolving';
    this.game.audio.drop();
  }

  completeDrop(obj) {
    const state = this.state;
    const t = obj.target;
    state.phase = 'play';

    if (!t.pest || t.correct === null) {
      /* dropped on empty ground — the object returns to its slot */
      obj.state = 'idle';
      obj.x = obj.slotX;
      obj.y = obj.slotY;
      obj.scale = 1;
      return;
    }

    if (t.correct) {
      const pest = t.pest;
      pest.state = 'hit';
      state.combo += 1;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.score += 10 * state.combo;
      state.shake = Math.min(8, 3 + state.combo);
      this.spawnBurst(pest.x, pest.y - 20, pest.element, 14 + state.combo * 3);
      this.addPopup(pest.x, pest.y - 90, `+${10 * state.combo}`, state.combo >= 2 ? 'combo' : '');
      if (state.combo >= 2) {
        this.addPopup(pest.x, pest.y - 130, `COMBO x${state.combo + 1}`, 'combo');
      }
      this.game.audio.destroy(state.combo);
      this.game.audio.match(state.combo);
      obj.state = 'gone';
      obj.scale = 0;
      this.updateHud();

      setTimeout(() => {
        if (pest.alive) {
          pest.state = 'dead';
          pest.alive = false;
          this.spawnBurst(pest.x, pest.y, pest.element, 20);
        }
        this.updateHud();
        if (state.pests.every((p) => !p.alive)) {
          this.endRun(true);
        }
      }, 320);
    } else {
      const pest = t.pest;
      pest.state = 'wrong';
      pest.tremble = 0.9;
      pest.flash = 1;
      state.flash = 0.5;
      state.shake = 12;
      obj.wasWrong = true;
      obj.state = 'gone';
      obj.scale = 0;
      this.game.audio.wrong();
      setTimeout(() => {
        this.endRun(false);
      }, 650);
    }
  }

  /* ---------------- hint ---------------- */

  useHint() {
    const state = this.state;
    if (!state || state.phase !== 'play' || !this.game.hasItem('hint') || state.hintsUsed >= 3) return;
    const target = state.pests.find((p) => p.alive);
    if (!target) return;
    const object = state.objects.find((o) => o.state === 'idle' && o.element === target.element);
    state.hintsUsed += 1;
    if (object) {
      object.flashHint = 1.3;
      target.flashHint = 1.3;
    }
    this.game.audio.confirm();
    this.addPopup(target.x, target.y - 120, 'HINT!', 'hint');
  }

  /* ---------------- fx helpers ---------------- */

  addPopup(x, y, text, cls) {
    this.state.popups.push({ x, y, text, cls, life: 1.0 });
  }

  spawnBurst(x, y, element, count) {
    const colors = {
      water: '#3fa9f5',
      light: '#ffd75e',
      fire: '#ff6b4a',
      wind: '#7ee081',
      earth: '#c98a4b',
      frost: '#9be8ff'
    };
    const imgs = ['star_03.png', 'star_05.png', 'spark_01.png', 'spark_03.png', 'circle_01.png'];
    for (let i = 0; i < count; i += 1) {
      const ang = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 180;
      this.state.particles.push({
        img: imgs[i % imgs.length],
        x,
        y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 60,
        life: 0.55 + Math.random() * 0.5,
        maxLife: 1,
        size: 10 + Math.random() * 16,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 6,
        color: colors[element] || '#ffffff',
        tinted: true,
        grav: 260
      });
    }
  }

  spawnConfetti() {
    const colors = ['#ff6b4a', '#ffd75e', '#7ee081', '#3fa9f5', '#c98a4b', '#ff8bd1', '#9be8ff'];
    const imgs = ['star_01.png', 'star_03.png', 'star_05.png', 'star_07.png', 'star_09.png'];
    for (let i = 0; i < 60; i += 1) {
      this.state.particles.push({
        img: imgs[i % imgs.length],
        x: Math.random() * 720,
        y: -30 - Math.random() * 500,
        vx: (Math.random() - 0.5) * 60,
        vy: 90 + Math.random() * 120,
        life: 2.2 + Math.random() * 1.4,
        maxLife: 3.6,
        size: 8 + Math.random() * 14,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 7,
        color: colors[i % colors.length],
        tinted: true,
        grav: 40,
        sway: 0.6 + Math.random()
      });
    }
  }

  tintCache = {};
  tinted(img, color) {
    if (!img.complete || img.naturalWidth === 0) return null; /* not decoded yet */
    const key = `${color}_${img.width}x${img.height}`;
    if (!this.tintCache[key]) {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      this.tintCache[key] = canvas;
    }
    return this.tintCache[key];
  }

  /* ---------------- loop ---------------- */

  loop(time) {
    const delta = this.lastTime ? (time - this.lastTime) / 1000 : 0;
    this.lastTime = time;
    this.update(Math.min(0.05, delta));
    this.render();
    this.frameId = requestAnimationFrame(this.loop.bind(this));
  }

  update(dt) {
    const state = this.state;
    if (!state) return;
    state.time += dt;

    /* ambient */
    state.cloudOffsetA = (state.cloudOffsetA - 6 * dt) % 1440;
    state.cloudOffsetB = (state.cloudOffsetB + 10 * dt) % 1440;
    state.groundOffset = (state.groundOffset - 22 * dt) % 205;
    state.dust.forEach((d) => {
      d.y -= d.speed * dt;
      d.phase += dt;
      if (d.y < 150) d.y = 1200;
    });

    /* particles */
    state.particles = state.particles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.sway) p.x += Math.sin(p.phase || 0) * 0.5;
      p.rot += p.vr * dt;
      return true;
    });
    if (state.phase === 'won' && Math.random() < 0.08) this.spawnConfetti();

    /* popups */
    state.popups = state.popups.filter((p) => {
      p.life -= dt * 1.6;
      p.y -= 40 * dt;
      return p.life > 0;
    });

    /* shake / flash decay */
    state.shake = Math.max(0, state.shake - 40 * dt);
    state.flash = Math.max(0, state.flash - 1.2 * dt);

    /* idle animations */
    state.objects.forEach((o) => {
      o.wobble += dt * 3;
      if (o.flashHint) o.flashHint = Math.max(0, o.flashHint - dt);
      if (o.state === 'falling') {
        o.fallT += dt * 3.4;
        const t = Math.min(1, o.fallT);
        const ease = 1 - Math.pow(1 - t, 3);
        o.x = o.slotX + (o.target.x - o.slotX) * ease;
        o.y = o.slotY + (o.target.y - o.slotY) * ease;
        o.scale = 1 - t * 0.2;
        if (t >= 1) this.completeDrop(o);
      }
    });
    state.pests.forEach((p) => {
      p.wobble += dt * 2;
      if (p.flashHint) p.flashHint = Math.max(0, p.flashHint - dt);
      p.tremble = Math.max(0, p.tremble - dt * 2.2);
      p.flash = Math.max(0, p.flash - dt * 3);
      if (p.alive && p.state === 'idle') {
        const frames = this.game.config.pestSprites[p.element];
        if (frames && frames.length > 1) {
          p.frame += dt * 6;
        }
      }
      if (p.state === 'hit') {
        p.scale = Math.min(1.25, p.scale + dt * 1.6);
      }
    });
  }

  /* ---------------- render ---------------- */

  render() {
    const state = this.state;
    const ctx = this.ctx;
    if (!state) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, 720, 1280);

    const sx = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
    const sy = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
    ctx.save();
    ctx.translate(sx, sy);

    /* background (pre-composed image) */
    ctx.drawImage(sprite(this.game.config.backgrounds.gameplay), 0, 0, 720, 1280);

    /* parallax clouds */
    const top = sprite('assets/game/clouds-top.png');
    const mid = sprite('assets/game/clouds-mid.png');
    for (let i = 0; i < 2; i += 1) {
      ctx.drawImage(top, state.cloudOffsetA + i * 1440, 40, 1440, 420);
      ctx.drawImage(mid, -state.cloudOffsetB + i * 1440, 420, 1440, 420);
    }

    /* scrolling ground */
    const tile = sprite('assets/game/ground-tile.png');
    for (let x = state.groundOffset; x < 720; x += 205) {
      ctx.drawImage(tile, x, 1145, 205, 135);
    }

    /* magic dust */
    ctx.save();
    state.dust.forEach((d) => {
      const img = sprite(`assets/particles/${d.img}`);
      ctx.globalAlpha = d.alpha;
      const bob = Math.sin(d.phase) * d.amp;
      ctx.drawImage(img, d.x - d.size / 2, d.y + bob - d.size / 2, d.size, d.size);
    });
    ctx.restore();

    /* pests */
    state.pests.forEach((p) => {
      if (!p.alive) return;
      const frames = this.game.config.pestSprites[p.element];
      const file = frames[Math.floor(p.frame) % frames.length];
      const img = sprite(`assets/game/${file}`);
      const w = p.w, h = p.h;
      const iw = img.naturalWidth || w, ih = img.naturalHeight || h;
      const scale = Math.min(w / iw, h / ih);
      const dw = iw * scale, dh = ih * scale;
      const px = p.x - dw / 2 + (p.tremble > 0 ? (Math.random() - 0.5) * 10 * p.tremble : 0);
      const py = p.y - dh / 2 + Math.sin(p.wobble) * 3;
      ctx.save();
      ctx.translate(p.x, p.y + dh / 2 - 6);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(0, 6, dw * 0.42, dh * 0.10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      if (p.state === 'hit') {
        ctx.translate(p.x, p.y);
        ctx.scale(p.scale, p.scale);
        ctx.globalAlpha = Math.max(0, 1 - (p.scale - 1) * 3);
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      } else {
        ctx.drawImage(img, px, py, dw, dh);
      }
      ctx.restore();

      /* element badge */
      const badge = sprite(`assets/game/badge-${p.element}.png`);
      const bw = 44, bh = 44;
      ctx.drawImage(badge, p.x + dw / 2 - 26, p.y - dh / 2 - 18, bw, bh);
      if (p.flashHint > 0) this.drawHintRing(p.x, p.y, dw, dh);

      /* wrong flash */
      if (p.flash > 0) {
        ctx.save();
        ctx.globalAlpha = p.flash * 0.5;
        ctx.drawImage(sprite('assets/particles/circle_03.png'), p.x - dw, p.y - dh, dw * 2, dh * 2);
        ctx.restore();
      }
    });

    /* objects */
    state.objects.forEach((o) => {
      if (o.state === 'gone') return;
      const frame = o.state === 'dragging' ? 1 : (Math.floor(o.wobble * 0.8) % 2) + 1;
      const img = sprite(`assets/game/plant-${o.element}-${frame}.png`);
      const targetW = 130, targetH = 150;
      const iw = img.naturalWidth || targetW, ih = img.naturalHeight || targetH;
      const scale = Math.min(targetW / iw, targetH / ih) * o.scale;
      const dw = iw * scale, dh = ih * scale;
      const lift = o.state === 'dragging' ? 18 : 0;

      ctx.save();
      ctx.translate(o.x, o.y + dh / 2 - 8);
      ctx.fillStyle = 'rgba(0,0,0,0.30)';
      ctx.beginPath();
      ctx.ellipse(0, 8, dw * 0.42, dh * 0.10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(o.x, o.y - lift);
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      if (o.state === 'dragging') {
        ctx.strokeStyle = 'rgba(255,255,255,0.65)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.ellipse(0, 0, dw * 0.6, dh * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      /* element badge */
      const badge = sprite(`assets/game/badge-${o.element}.png`);
      ctx.drawImage(badge, o.x + dw / 2 - 30, o.y - dh / 2 - 26 + (o.state === 'dragging' ? -lift : 0), 40, 40);
      if (o.flashHint > 0) this.drawHintRing(o.x, o.y, dw, dh);
    });

    /* particles */
    state.particles.forEach((p) => {
      const img = sprite(`assets/particles/${p.img}`);
      const src = p.tinted ? this.tinted(img, p.color) : img;
      if (!src || !src.complete || src.naturalWidth === 0) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 0.4));
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.drawImage(src, -p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });

    /* popups */
    ctx.save();
    state.popups.forEach((p) => {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.font = '900 34px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(40,20,0,0.85)';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.cls === 'combo' ? '#ffd75e' : p.cls === 'hint' ? '#9be8ff' : '#ffffff';
      ctx.fillText(p.text, p.x, p.y);
    });
    ctx.restore();

    ctx.restore();

    /* red flash on wrong */
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,40,40,${Math.min(0.35, state.flash * 0.7)})`;
      ctx.fillRect(0, 0, 720, 1280);
    }
  }

  drawHintRing(x, y, w, h) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,120,0.95)';
    ctx.lineWidth = 5;
    ctx.setLineDash([10, 7]);
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(w, 110), Math.max(h, 110), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}
