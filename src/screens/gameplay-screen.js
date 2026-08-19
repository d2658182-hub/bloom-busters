/* ============================================================
   GAMEPLAY — Deduction Garden.
   Pieces at the top neutralize pieces at the bottom. EVERY level
   hides ONE matching rule (color, symbol, creature, number, motif,
   element, opposite pair, position). The player deduces it by
   testing drops: a hit explodes, a miss costs a heart. The rule is
   NEVER revealed — but the design guarantees it is discoverable:
   only the active attribute aligns the two rows (anti-trap).
   Canvas logical space: 720x1280 (9:16), scaled by CSS.
   ============================================================ */

/* ---- shared image cache (populated by the loading screen, reused here) ---- */
const IMG = (window.IMG = window.IMG || {});
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

/* ---- which attributes each family exposes (for anti-trap scrambling) ---- */
const FAMILY_ATTRS = {
  plant:  ['element', 'color'],
  fruit:  ['color', 'type'],
  animal: ['type'],
  gem:    ['color'],
  symbol: ['symbol', 'color'],
  domino: ['number', 'motif']
};

const ATTR_POOLS = {
  element: ['water', 'light', 'fire', 'wind', 'earth', 'frost'],
  color: Object.keys(COLOR_HEX),
  type: ['apple', 'banana', 'blackberries', 'blueberries', 'cherries', 'coconut_01',
         'grapes', 'kiwi', 'lemon', 'olive', 'orange', 'pear', 'pineapple_01', 'plum',
         'raspberries', 'strawberry', 'elephant', 'giraffe', 'hippo', 'monkey', 'panda',
         'parrot', 'penguin', 'pig', 'rabbit', 'snake'],
  symbol: ['star', 'trophy', 'medal1', 'medal2', 'target', 'cross', 'exclamation',
           'question', 'checkmark', 'power', 'warning', 'plus', 'minus', 'gear',
           'arrowUp', 'arrowDown', 'arrowLeft', 'arrowRight', 'locked', 'unlocked',
           'musicOn', 'musicOff'],
  number: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  motif: ['stars', 'hearts', 'gingerbread']
};

const OBJECTIVE_NAMES = {
  clear: 'CLEAR THE GARDEN',
  score: 'SCORE RUSH',
  time: 'TIME ATTACK',
  collect: 'TARGETED PICK',
  protect: 'PROTECT THE BLOOM',
  boss: 'BOSS'
};

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

  /* deterministic per-level RNG: splitmix32-hash of the level, then LCG draws. */
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

  /* pick this level's family (seeded; worlds may offer several) */
  pickFamily(world, level, rand) {
    const families = world.families || ['plant'];
    return families[Math.floor(rand() * families.length)];
  }

  /* pick this level's hidden rule: seed by level so neighbours differ */
  pickRule(family, level, rand) {
    const rules = PIECES_DATA[family].rules;
    const offset = Math.floor(rand() * rules.length);
    return rules[offset];
  }

  /* ---------------- level building ---------------- */

  buildLevel(level) {
    const config = this.game.config;
    const world = this.worldOf(level);
    const rand = this.levelRand(level);

    const family = this.pickFamily(world, level, rand);
    const rule = this.pickRule(family, level, rand);
    const pool = PIECES_DATA[family].pool[rule];

    /* piece count: base curve + seeded jitter */
    let count = 2 + Math.floor((level - 1) / config.pestStep);
    if (level > 2) count += Math.floor(rand() * 3) - 1;
    count = Math.max(2, Math.min(config.maxPests, count, pool.length));
    /* position rule stays readable: keep rows aligned, still works for any n */

    const objective = this.pickObjective(world, level, rand, count, pool);

    /* entries: distinct rule values (or repeats for collect/boss) */
    let entries;
    if (objective.type === 'collect') {
      /* 2-3 values repeated so the target value appears 2-3 times */
      const m = Math.max(2, Math.min(3, Math.floor(count / 2)));
      const base = seededShuffle(pool, level * 53 + 11).slice(0, m);
      entries = [];
      for (let i = 0; i < count; i += 1) entries.push(base[i % base.length]);
      objective.value = base[0].value;
      objective.need = entries.filter((e) => e.value === objective.value).length;
    } else {
      entries = seededShuffle(pool, level * 53 + 11).slice(0, count);
      if (objective.type === 'boss') {
        /* first entry becomes the boss (multi-HP), rest are minions */
        objective.value = entries[0].value;
        objective.bossHp = Math.min(5, 3 + Math.floor(level / 60));
      }
    }

    /* attribute scrambling (anti-trap): only the ACTIVE rule aligns rows */
    const scram = this.scrambleAttrs(family, rule, entries, rand);

    const objects = [];
    const pests = [];
    entries.forEach((entry, i) => {
      const oattrs = scram.objects[i];
      const pattrs = scram.pests[i];
      if (rule === 'opposite') {
        oattrs.pairId = entry.value;
        pattrs.pairId = entry.value;
      } else if (rule === 'position') {
        oattrs.position = i;
        pattrs.position = i;
      } else {
        oattrs[rule] = entry.value;
        pattrs[rule] = entry.value;
      }
      objects.push({
        id: i, family, rule, entry,
        value: entry.value,
        attrs: oattrs,
        imgs: entry.imgs,
        tintable: !!entry.tintable,
        tint: entry.color || null,
        x: 0, y: 0, slotX: 0, slotY: 0,
        state: 'idle', fallT: 0, target: null,
        wobble: Math.random() * Math.PI * 2, scale: 1
      });
      const isBoss = objective.type === 'boss' && i === 0;
      pests.push({
        id: i, family, rule, entry,
        value: entry.value,
        attrs: pattrs,
        imgs: entry.timgs,
        tintable: !!entry.tintable,
        tint: entry.color || null,
        x: 0, y: 0, w: 118, h: 118,
        alive: true, state: 'idle',
        boss: isBoss,
        hp: isBoss ? objective.bossHp : 1,
        tremble: 0, flash: 0, scale: 1, frame: 0, wobble: Math.random() * Math.PI * 2,
        vy: 0
      });
    });

    /* layout: position rule aligns rows (same order); others shuffle independently */
    if (rule === 'position') {
      this.layoutObjects(objects, rand, 1);
      this.layoutPests(pests, rand, 1, objective);
    } else {
      this.layoutObjects(seededShuffle(objects, level * 7 + 1), rand, 1);
      this.layoutPests(seededShuffle(pests, level * 13 + 5), rand, 1, objective);
    }

    const heartsMax = config.hearts.max + (this.game.hasItem('extra-heart') ? config.hearts.extraHeartBonus : 0);

    return {
      level, world, family, rule,
      objects, pests,
      objective,
      combo: this.game.hasItem('mega-seeds') ? 1 : 0,
      maxCombo: this.game.hasItem('mega-seeds') ? 1 : 0,
      comboCount: 0,
      score: 0,
      hearts: heartsMax,
      heartsMax,
      phase: 'play',        // play | resolving | won | lost
      reviveUsed: false,
      rainbow: false,
      tool: null,
      endDelay: 0,
      shake: 0, flash: 0, time: 0,
      particles: [], popups: [],
      cloudOffsetA: 0, cloudOffsetB: 0, groundOffset: 0,
      dust: this.makeDust(),
      tutorial: null
    };
  }

  /* anti-trap: for every non-active attribute, give objects and pests
     DIFFERENT value multisets so the level cannot be solved by that
     attribute — the active rule is the only one that aligns the rows. */
  scrambleAttrs(family, rule, entries, rand) {
    const n = entries.length;
    const objects = [];
    const pests = [];
    for (let i = 0; i < n; i += 1) objects.push({});
    for (let i = 0; i < n; i += 1) pests.push({});
    const attrs = (FAMILY_ATTRS[family] || []).filter((a) => a !== rule && a !== 'position');
    attrs.forEach((attr) => {
      const pool = ATTR_POOLS[attr];
      let oVals = [], pVals = [];
      for (let attempt = 0; attempt < 50; attempt += 1) {
        oVals = [];
        pVals = [];
        for (let i = 0; i < n; i += 1) oVals.push(pool[Math.floor(rand() * pool.length)]);
        for (let i = 0; i < n; i += 1) pVals.push(pool[Math.floor(rand() * pool.length)]);
        if (JSON.stringify([...oVals].sort()) !== JSON.stringify([...pVals].sort())) break;
      }
      for (let i = 0; i < n; i += 1) {
        objects[i][attr] = oVals[i];
        pests[i][attr] = pVals[i];
      }
    });
    return { objects, pests };
  }

  /* pick the level objective (boss overrides at bossEvery intervals) */
  pickObjective(world, level, rand, count, pool) {
    const bossEvery = world.bossEvery || 10;
    if (level >= 10 && level % bossEvery === 0) return { type: 'boss' };
    const list = world.objectives || ['clear'];
    const type = list[Math.floor(rand() * list.length)];
    if (type === 'score') {
      return { type, scoreTarget: 10 * count * 3 + Math.floor(level / 2), attempts: count * 2 + 4 };
    }
    if (type === 'time') {
      return { type, timeLeft: 28 + 6 * count, timeLimit: 28 + 6 * count, killBonus: 4 };
    }
    if (type === 'collect') {
      return { type, value: null, need: 0 };
    }
    if (type === 'protect') {
      return { type, flowerHearts: 3, drift: 22 + count * 3 };
    }
    return { type: 'clear' };
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

  layoutObjects(objects, rand, rows) {
    const total = objects.length;
    const perRow = total <= 4 ? total : 4;
    const slot = 130;
    const rowCount = Math.ceil(total / perRow);
    const startY = 140 + (rowCount - 1) * (slot - 30);
    objects.forEach((obj, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const rowCountNow = Math.min(perRow, total - row * perRow);
      const x = 360 + (col - (rowCountNow - 1) / 2) * (slot + 26) + (rand() - 0.5) * 18;
      const y = startY + row * (slot - 6) + (rand() - 0.5) * 12;
      obj.slotX = x;
      obj.slotY = y;
      obj.x = x;
      obj.y = y;
    });
  }

  layoutPests(pests, rand, rows, objective) {
    const total = pests.length;
    const perRow = total <= 4 ? total : 4;
    const slot = 150;
    const rowCount = Math.ceil(total / perRow);
    const protect = objective && objective.type === 'protect';
    const bossLevel = objective && objective.type === 'boss';
    let startY = total > 4 ? 900 : 1010;
    if (protect) startY = 680;
    if (bossLevel) startY = total > 4 ? 820 : 950;
    pests.forEach((pest, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const rowCountNow = Math.min(perRow, total - row * perRow);
      const x = 360 + (col - (rowCountNow - 1) / 2) * (slot + 26) + (rand() - 0.5) * 18;
      const y = startY + row * (slot - 34) + (rand() - 0.5) * 12;
      pest.x = x;
      pest.y = y;
      if (protect) pest.vy = objective.drift;
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
      ${this.heartsElement()}
      ${this.scoreElement()}
      ${this.levelElement()}
      <div class="hud-right">
        <button type="button" class="btn btn-square btn-help" aria-label="How to play">
          <img src="assets/ui/b_8.png" alt="" draggable="false">
          <span class="btn-icon">❓</span>
        </button>
        <button type="button" class="btn btn-square btn-pause" aria-label="Pause">
          <img src="assets/ui/b_8.png" alt="" draggable="false">
          <span class="btn-icon">⏸</span>
        </button>
      </div>
    `;
    this.toolBtn = null;

    this.objectiveStrip = document.createElement('div');
    this.objectiveStrip.className = 'objective-strip';

    this.banner = document.createElement('div');
    this.banner.className = 'level-banner';
    this.banner.style.display = 'none';

    this.helpOverlay = document.createElement('div');
    this.helpOverlay.className = 'help-overlay';
    this.helpOverlay.style.display = 'none';
    this.helpOverlay.innerHTML = this.helpHtml();
    this.helpOverlay.addEventListener('click', () => { this.helpOverlay.style.display = 'none'; });

    this.el.appendChild(this.canvas);
    this.el.appendChild(this.hud);
    this.el.appendChild(this.objectiveStrip);
    this.el.appendChild(this.banner);
    this.el.appendChild(this.helpOverlay);

    this.hud.querySelector('.btn-pause').addEventListener('click', () => this.pause());
    this.hud.querySelector('.btn-help').addEventListener('click', () => {
      this.game.audio.click();
      this.helpOverlay.style.display = 'flex';
    });

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
      SDK.onPause(() => {
        if (this.frameId) this.pause();
      });
    }
  }

  helpHtml() {
    const rules = Object.keys(RULES_DATA).map((key) => {
      const r = RULES_DATA[key];
      return `<li><b>${r.title}</b> — ${r.desc}</li>`;
    }).join('');
    return `
      <div class="help-panel">
        <div class="help-title">HOW TO PLAY</div>
        <p>Every level has a <b>hidden logic</b>: the pieces at the top
           neutralize the ones at the bottom — but WHAT matches WHAT
           changes every level.</p>
        <p>Test a drop: if it works the target explodes. If not, you lose
           a heart (❤). Watch the <b>colors, shapes, runes, numbers and
           kinds</b> to deduce the rule before your hearts run out.</p>
        <p>The hidden logic is one of:</p>
        <ul>${rules}</ul>
        <p class="help-stars">Deduce fast: <b>1 mistake = 3★, 2-3 = 2★, more = 1★.</b>
           Every 3 perfect matches in a row grants a tool (bomb or rainbow).</p>
        <div class="help-close">TAP TO CLOSE</div>
      </div>
    `;
  }

  heartsElement() {
    return `
      <div class="hud-hearts"><span class="hud-hearts-row"></span></div>
    `;
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
      this.showBanner(this.state.level, this.state.world, this.state.objective);
      this.state.newLevel = false;
      /* start visual tutorial on first level of each world */
      const tutInfo = this.shouldTutorial(this.state.level);
      if (tutInfo && !this.game.storage.get('tutorialDone_' + this.state.level)) {
        this.startTutorial(this.state.level, this.state.world);
        this.game.storage.set('tutorialDone_' + this.state.level, true);
      }
    }

    if (typeof SDK !== 'undefined') {
      if (options.resume) SDK.levelMessage('level_resumed');
      else SDK.levelMessage('level_started');
    }
    this.game.audio.playMusic('gameplay');
    this.lastTime = 0;
    this.frameId = requestAnimationFrame(this.loop.bind(this));
    this.updateHud();
  }

  exit(next) {
    cancelAnimationFrame(this.frameId);
    this.frameId = null;
    if (typeof SDK !== 'undefined') SDK.levelMessage('level_paused');
    /* going to the pause screen: keep the music playing (it gets ducked
       by PauseScreen.enter) so resuming never cuts/restarts it */
    if (!next || next.name !== 'pause') {
      this.game.audio.stopMusic();
    }
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

  endRun(won) {
    const state = this.state;
    state.phase = won ? 'won' : 'lost';

    const streak = this.game.pushStreak(won ? 'win' : 'loss');
    const adNext = typeof SDK !== 'undefined' && streak >= 2 && streak % 2 === 0;
    if (adNext) this.game.resetStreak();

    const stars = won ? this.computeStars() : 0;
    if (won) this.game.setStars(state.level, stars);

    const data = {
      level: state.level,
      score: state.score,
      combo: state.maxCombo,
      coins: won ? this.winCoins(stars) : this.game.config.economy.lossConsolation,
      stars,
      heartsLeft: state.hearts,
      objective: OBJECTIVE_NAMES[state.objective.type] || '',
      adNext
    };
    this.game.addCoins(data.coins);
    if (won) this.game.setLevel(state.level + 1);

    if (won && typeof SDK !== 'undefined') SDK.levelMessage('level_completed');
    if (!won && typeof SDK !== 'undefined') SDK.levelMessage('level_failed');

    this.game.show(won ? 'victory' : 'gameover', { data, resumeState: won ? null : this.snapshot() });
    this.state = null;
  }

  winCoins(stars) {
    const cfg = this.game.config.economy;
    let coins = cfg.winBase + Math.floor(this.state.level * cfg.winPerLevel);
    if (this.state.level % 10 === 0) coins += cfg.milestoneBonus;
    if (this.game.hasItem('bloom-bonus')) coins *= 1.25;
    if (this.game.hasItem('double')) coins *= 2;
    coins += (stars || 0) * cfg.starBonus;
    return Math.max(1, Math.round(coins));
  }

  computeStars() {
    const s = this.state;
    if (s.hearts >= s.heartsMax - 1) return 3;
    if (s.hearts >= s.heartsMax - 3) return 2;
    return 1;
  }

  snapshot() {
    return {
      level: this.state.level,
      world: this.state.world,
      family: this.state.family,
      rule: this.state.rule,
      objective: this.state.objective,
      combo: this.state.combo,
      maxCombo: this.state.maxCombo,
      comboCount: this.state.comboCount,
      score: this.state.score,
      hearts: this.state.hearts,
      heartsMax: this.state.heartsMax,
      rainbow: this.state.rainbow,
      tool: this.state.tool,
      reviveUsed: this.state.reviveUsed,
      objects: this.state.objects.map((o) => ({
        id: o.id, value: o.value, attrs: o.attrs, entry: o.entry,
        imgs: o.imgs, tintable: o.tintable, tint: o.tint,
        slotX: o.slotX, slotY: o.slotY, x: o.slotX, y: o.slotY,
        state: o.wasWrong ? 'idle' : (o.state === 'idle' ? 'idle' : 'gone')
      })),
      pests: this.state.pests.map((p) => ({
        id: p.id, value: p.value, attrs: p.attrs, entry: p.entry,
        imgs: p.imgs, tintable: p.tintable, tint: p.tint,
        x: p.x, y: p.y, w: p.w, h: p.h,
        alive: p.alive, state: p.alive ? 'idle' : 'dead',
        boss: p.boss, hp: p.hp, vy: p.vy
      }))
    };
  }

  restoreState(snap) {
    const state = {
      level: snap.level,
      world: snap.world,
      family: snap.family,
      rule: snap.rule,
      objective: snap.objective,
      objects: snap.objects,
      pests: snap.pests,
      combo: snap.combo || 0,
      maxCombo: snap.maxCombo || 0,
      comboCount: snap.comboCount || 0,
      score: snap.score || 0,
      hearts: snap.hearts != null ? snap.hearts : snap.heartsMax,
      heartsMax: snap.heartsMax || 5,
      rainbow: !!snap.rainbow,
      tool: snap.tool || null,
      phase: 'play',
      reviveUsed: true,
      endDelay: 0,
      shake: 0, flash: 0, time: 0,
      particles: [], popups: [],
      cloudOffsetA: 0, cloudOffsetB: 0, groundOffset: 0,
      dust: this.makeDust()
    };
    const objective = state.objective || { type: 'clear' };
    /* re-layout deterministically: same level -> same seeded RNG -> same positions */
    if (state.rule === 'position') {
      this.layoutObjects(state.objects, this.levelRand(snap.level + 1), 1);
      this.layoutPests(state.pests, this.levelRand(snap.level + 2), 1, objective);
    } else {
      this.layoutObjects(seededShuffle(state.objects, snap.level * 7 + 1), this.levelRand(snap.level + 1), 1);
      this.layoutPests(seededShuffle(state.pests, snap.level * 13 + 5), this.levelRand(snap.level + 2), 1, objective);
    }
    state.objects.forEach((o) => {
      o.wobble = Math.random() * Math.PI * 2;
      o.fallT = 0;
      o.target = null;
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
      p.frame = 0;
      p.scale = 1;
      p.state = p.alive ? 'idle' : 'dead';
      if (objective.type === 'protect') p.vy = objective.drift;
    });
    return state;
  }

  /* ---------------- banner + hud ---------------- */

  showBanner(level, world, objective) {
    const prevWorldIndex = this.worldOf(Math.max(1, level - 1)).index;
    let sub = OBJECTIVE_NAMES[objective.type] || 'GOAL';
    if (world.index > prevWorldIndex) sub = 'NEW WORLD';
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

  /* ---------------- visual tutorial ---------------- */

  /* First level of each world (1, 41, 81, 121, 161) gets a tutorial */
  shouldTutorial(level) {
    const config = this.game.config;
    let acc = 0;
    for (let i = 0; i < config.worlds.length; i += 1) {
      if (level === acc + 1) return { full: i === 0, worldIndex: i };
      acc += config.worlds[i].levels;
    }
    return null;
  }

  startTutorial(level, world) {
    const state = this.state;
    const objects = state.objects.filter((o) => o.state === 'idle');
    const pests = state.pests.filter((p) => p.alive);
    if (objects.length < 2 || pests.length < 2) { state.tutorial = null; return; }

    /* find the first pair that matches (correct drop) and one that doesn't */
    let correctObj = null, correctPest = null, wrongObj = null, wrongPest = null;
    for (let i = 0; i < objects.length; i += 1) {
      for (let j = 0; j < pests.length; j += 1) {
        if (this.matches(objects[i], pests[j])) {
          if (!correctObj) { correctObj = objects[i]; correctPest = pests[j]; }
        } else {
          if (!wrongObj) { wrongObj = objects[i]; wrongPest = pests[j]; }
        }
      }
    }
    if (!correctObj || !wrongObj) { state.tutorial = null; return; }

    const isFull = world.index === 0;
    state.tutorial = {
      phase: isFull ? 'point-correct' : 'point-new',
      timer: 0,
      handX: correctObj.x,
      handY: correctObj.y - 80,
      targetObj: correctObj,
      targetPest: correctPest,
      wrongObj: wrongObj,
      wrongPest: wrongPest,
      handImg: sprite('assets/ui/tutorial-hand.png'),
      isFull
    };
    this.hud.style.display = 'none';
    this.objectiveStrip.style.display = 'none';
  }

  updateTutorial(dt) {
    const tut = this.state.tutorial;
    if (!tut) return false;
    const obj = tut.targetObj;
    const pest = tut.targetPest;
    const wObj = tut.wrongObj;
    const wPest = tut.wrongPest;
    tut.timer += dt;

    if (tut.phase === 'point-correct') {
      /* hand hovers above the correct object, bobbing */
      tut.handX = obj.x;
      tut.handY = obj.y - 80 + Math.sin(tut.timer * 3) * 8;
      if (tut.timer > 1.8) { tut.phase = 'drag-correct'; tut.timer = 0; }
    } else if (tut.phase === 'drag-correct') {
      /* hand drags the object down to the matching pest */
      const t = Math.min(1, tut.timer / 0.8);
      const ease = 1 - Math.pow(1 - t, 3);
      tut.handX = obj.x + (pest.x - obj.x) * ease;
      tut.handY = (obj.y - 80) + (pest.y - obj.y - 80) * ease + Math.sin(tut.timer * 4) * 3;
      obj.x = tut.handX;
      obj.y = tut.handY + 80;
      obj.state = 'dragging';
      if (t >= 1) {
        /* trigger the correct drop */
        this.resolveDrop(obj, pest);
        tut.phase = 'show-explode';
        tut.timer = 0;
      }
    } else if (tut.phase === 'show-explode') {
      /* wait for explosion to play, then show the hand on wrong pair */
      if (tut.timer > 1.0) {
        if (!tut.isFull) {
          /* mini-tutorial: just show the hand pointing at new piece, then done */
          tut.phase = 'done';
          tut.timer = 0;
        } else {
          tut.phase = 'point-wrong';
          tut.timer = 0;
        }
      }
    } else if (tut.phase === 'point-wrong') {
      /* hand hovers above a wrong object */
      tut.handX = wObj.x;
      tut.handY = wObj.y - 80 + Math.sin(tut.timer * 3) * 8;
      if (tut.timer > 1.8) { tut.phase = 'drag-wrong'; tut.timer = 0; }
    } else if (tut.phase === 'drag-wrong') {
      /* hand drags to a WRONG pest */
      const t = Math.min(1, tut.timer / 0.8);
      const ease = 1 - Math.pow(1 - t, 3);
      tut.handX = wObj.x + (wPest.x - wObj.x) * ease;
      tut.handY = (wObj.y - 80) + (wPest.y - wObj.y - 80) * ease + Math.sin(tut.timer * 4) * 3;
      wObj.x = tut.handX;
      wObj.y = tut.handY + 80;
      wObj.state = 'dragging';
      if (t >= 1) {
        this.resolveDrop(wObj, wPest);
        tut.phase = 'show-wrong';
        tut.timer = 0;
      }
    } else if (tut.phase === 'show-wrong') {
      if (tut.timer > 1.2) { tut.phase = 'done'; tut.timer = 0; }
    } else if (tut.phase === 'done') {
      /* fade out hand */
      tut.timer += dt;
      if (tut.timer > 0.5) {
        this.state.tutorial = null;
        this.hud.style.display = '';
        this.objectiveStrip.style.display = '';
        this.updateHud();
        return false;
      }
    }
    return true; /* tutorial still active */
  }

  renderTutorial(ctx) {
    const tut = this.state && this.state.tutorial;
    if (!tut || !tut.handImg || !tut.handImg.complete || tut.handImg.naturalWidth === 0) return;
    const alpha = tut.phase === 'done' ? Math.max(0, 1 - tut.timer * 2) : 1;
    const bob = tut.phase.startsWith('point') ? Math.sin(tut.timer * 3) * 8 : 0;
    const x = tut.handX;
    const y = tut.handY + bob;
    const w = 90, h = 90;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(tut.handImg, x - w / 2, y - h / 2, w, h);
    /* pulse ring around the hand when pointing */
    if (tut.phase.startsWith('point')) {
      const pulse = 0.5 + 0.5 * Math.sin(tut.timer * 4);
      ctx.globalAlpha = alpha * 0.3 * pulse;
      ctx.beginPath();
      ctx.arc(x, y, 50 + pulse * 10, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffd75e';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  }

  updateHud() {
    const state = this.state;
    if (!state) return;
    /* hearts */
    const heartsRow = this.hud.querySelector('.hud-hearts-row');
    if (heartsRow) {
      let html = '';
      for (let i = 0; i < state.heartsMax; i += 1) {
        html += `<span class="heart ${i < state.hearts ? 'on' : 'off'}">${i < state.hearts ? '❤' : '🤍'}</span>`;
      }
      heartsRow.innerHTML = html;
    }
    /* score + combo */
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

    /* tool button */
    this.updateToolBtn();

    /* objective strip */
    const strip = this.objectiveStrip;
    const obj = state.objective || { type: 'clear' };
    let html = '';
    if (obj.type === 'score') {
      const left = Math.max(0, obj.attempts);
      html = `<div class="obj-chip">🎯 SCORE <b>${state.score.toLocaleString('en-US')}/${obj.scoreTarget.toLocaleString('en-US')}</b> · ${left} moves</div>`;
    } else if (obj.type === 'time') {
      const t = Math.max(0, Math.ceil(state.objective.timeLeft));
      html = `<div class="obj-chip ${t <= 10 ? 'obj-urgent' : ''}">⏱ <b>${t}</b>s</div>`;
    } else if (obj.type === 'collect') {
      html = `<div class="obj-chip">🎯 ${this.valueChip(obj.value, state.rule)} <b>${obj.need - obj.done}</b> left</div>`;
    } else if (obj.type === 'protect') {
      let fh = '';
      for (let i = 0; i < 3; i += 1) fh += i < obj.flowerHearts ? '❤' : '🤍';
      html = `<div class="obj-chip">🌸 BLOOM ${fh}</div>`;
    } else if (obj.type === 'boss') {
      const boss = state.pests.find((p) => p.boss && p.alive);
      const hp = boss ? boss.hp : 0;
      let bar = '';
      for (let i = 0; i < (state.objective.bossHp || 3); i += 1) bar += i < hp ? '█' : '░';
      html = `<div class="obj-chip">👑 BOSS ${bar}</div>`;
    } else {
      html = `<div class="obj-chip">🌸 Clear all ${state.pests.filter((p) => p.alive).length}</div>`;
    }
    if (state.rainbow) html += `<div class="obj-chip obj-rainbow">🌈 NEXT DROP MATCHES</div>`;
    strip.innerHTML = html;
  }

  /* small chip showing a rule value (color swatch / icon / number) */
  valueChip(value, rule) {
    if (rule === 'color' && COLOR_HEX[value]) {
      return `<span class="value-swatch" style="background:${COLOR_HEX[value]}"></span> ${value}`;
    }
    return `<b>${value}</b>`;
  }

  updateToolBtn() {
    const state = this.state;
    if (!state) return;
    const right = this.hud.querySelector('.hud-right');
    if (state.tool && !this.toolBtn) {
      this.toolBtn = document.createElement('button');
      this.toolBtn.type = 'button';
      this.toolBtn.className = 'btn btn-square btn-tool';
      this.toolBtn.setAttribute('aria-label', 'Use tool');
      this.toolBtn.innerHTML = `<span class="btn-icon">${state.tool === 'bomb' ? '💣' : '🌈'}</span>`;
      this.toolBtn.addEventListener('click', () => this.useTool());
      right.appendChild(this.toolBtn);
    } else if (!state.tool && this.toolBtn) {
      this.toolBtn.remove();
      this.toolBtn = null;
    }
  }

  /* ---------------- combo tools ---------------- */

  useTool() {
    const state = this.state;
    if (!state || state.phase !== 'play' || !state.tool) return;
    this.game.audio.confirm();
    if (state.tool === 'bomb') {
      const alive = state.pests.filter((p) => p.alive);
      const targets = seededShuffle(alive, Math.floor(Math.random() * 1e9)).slice(0, this.game.config.tools.bombTargets);
      targets.forEach((pest) => {
        pest.state = 'dead';
        pest.alive = false;
        state.score += 10;
        this.spawnBurst(pest.x, pest.y, this.burstColor(pest), 16);
        this.addPopup(pest.x, pest.y - 70, '+10', '');
      });
    } else if (state.tool === 'rainbow') {
      state.rainbow = true;
      this.addPopup(360, 300, 'RAINBOW READY!', 'combo');
    }
    state.tool = null;
    this.updateHud();
    this.checkWin();
  }

  burstColor(pest) {
    if (pest.attrs && pest.attrs.color && COLOR_HEX[pest.attrs.color]) return COLOR_HEX[pest.attrs.color];
    if (pest.tint) return pest.tint;
    return '#ffd75e';
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
      if (Math.abs(x - o.x) < 62 && Math.abs(y - o.y) < 72) return o;
    }
    return null;
  }

  hitPest(x, y) {
    const state = this.state;
    if (!state) return null;
    for (const p of state.pests) {
      if (!p.alive) continue;
      const w = p.boss ? p.w * 1.45 : p.w;
      const h = p.boss ? p.h * 1.45 : p.h;
      if (Math.abs(x - p.x) < w / 2 + 12 && Math.abs(y - p.y) < h / 2 + 12) return p;
    }
    return null;
  }

  onPointerDown(event) {
    if (!this.state || this.state.phase !== 'play' || this.state.tutorial) return;
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
    /* near-miss tremble on non-matching pests (indirect feedback only) */
    for (const p of this.state.pests) {
      if (!p.alive) continue;
      if (this.matches(dragging, p)) continue;
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

  /* THE hidden rule: a drop is correct iff the active attribute matches */
  matches(obj, pest) {
    if (this.state.rainbow) return true;
    const rule = this.state.rule;
    if (rule === 'opposite') return obj.attrs.pairId === pest.attrs.pairId;
    return obj.attrs[rule] === pest.attrs[rule];
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
    const correct = this.matches(obj, pest);
    obj.state = 'falling';
    obj.target = { x: pest.x, y: pest.y, pest, correct };
    obj.fallT = 0;
    state.phase = 'resolving';
    this.game.audio.drop();
    if (state.objective.type === 'score') {
      state.objective.attempts = Math.max(0, state.objective.attempts - 1);
    }
    if (state.rainbow) state.rainbow = false;
  }

  completeDrop(obj) {
    const state = this.state;
    const t = obj.target;
    state.phase = 'play';

    if (!t.pest || t.correct === null) {
      obj.state = 'idle';
      obj.x = obj.slotX;
      obj.y = obj.slotY;
      obj.scale = 1;
      return;
    }

    if (t.correct) {
      this.onCorrect(obj, t.pest);
    } else {
      this.onWrong(obj, t.pest);
    }
  }

  onCorrect(obj, pest) {
    const state = this.state;
    state.combo += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    state.comboCount += 1;
    state.score += 10 * state.combo;
    state.shake = Math.min(8, 3 + state.combo);
    this.spawnBurst(pest.x, pest.y - 20, this.burstColor(pest), 14 + state.combo * 3);
    this.addPopup(pest.x, pest.y - 90, `+${10 * state.combo}`, state.combo >= 2 ? 'combo' : '');
    if (state.combo >= 2) {
      this.addPopup(pest.x, pest.y - 130, `COMBO x${state.combo + 1}`, 'combo');
    }
    this.game.audio.destroy(state.combo);
    this.game.audio.match(state.combo);

    if (pest.boss) {
      pest.hp -= 1;
      /* the piece bounces back to its slot: the boss is a multi-hit
         target and can always be beaten with the pieces available */
      obj.state = 'falling';
      obj.target = { x: obj.slotX, y: obj.slotY, pest: null, correct: null };
      obj.fallT = 0;
      obj.scale = 1;
      pest.tremble = 0.8;
      pest.flash = 0.8;
      state.shake = Math.min(14, 8 + state.combo * 2);
      this.spawnBurst(pest.x, pest.y, '#ff6b4a', 22);
      this.addPopup(pest.x, pest.y - 120, `BOSS -1`, 'combo');
      this.game.audio.destroy(state.combo + 2);
      if (pest.hp <= 0) {
        pest.state = 'dead';
        pest.alive = false;
        this.spawnBurst(pest.x, pest.y, '#ffd75e', 34);
        this.addPopup(pest.x, pest.y - 160, 'BOSS DOWN!', 'combo');
      } else {
        this.spawnMinion();
      }
    } else {
      obj.state = 'gone';
      obj.scale = 0;
      pest.state = 'hit';
      setTimeout(() => {
        if (pest.alive) {
          pest.state = 'dead';
          pest.alive = false;
          this.spawnBurst(pest.x, pest.y, this.burstColor(pest), 20);
          if (state.objective.type === 'collect' && this.isTargetValue(pest)) {
            state.objective.done = (state.objective.done || 0) + 1;
          }
          if (state.objective.type === 'time') {
            state.objective.timeLeft = Math.min(state.objective.timeLimit, state.objective.timeLeft + state.objective.killBonus);
          }
        }
        this.updateHud();
        this.checkWin();
      }, 220);
    }

    /* combo tool: every N consecutive correct matches grants one */
    const every = this.game.config.tools.comboEvery;
    if (state.comboCount > 0 && state.comboCount % every === 0 && !state.tool && !state.rainbow) {
      state.tool = Math.random() < 0.5 ? 'bomb' : 'rainbow';
      this.addPopup(360, 260, state.tool === 'bomb' ? '💣 BOMB READY!' : '🌈 RAINBOW READY!', 'combo');
    }
    this.updateHud();
    this.checkWin();
  }

  isTargetValue(pest) {
    const obj = this.state.objective;
    const rule = this.state.rule;
    if (rule === 'opposite') return pest.attrs.pairId === obj.value;
    return pest.attrs[rule] === obj.value;
  }

  spawnMinion() {
    const state = this.state;
    if (state.pests.filter((p) => p.alive).length >= 8) return;
    const rand = this.levelRand(state.level + 7);
    const candidates = state.pests.filter((p) => !p.alive && !p.boss);
    if (!candidates.length) return;
    const p = candidates[Math.floor(rand() * candidates.length)];
    p.alive = true;
    p.state = 'idle';
    p.hp = 1;
    p.flash = 0.6;
    p.tremble = 0.5;
    p.x = 80 + rand() * 560;
    p.y = 700 + rand() * 200;
    this.spawnBurst(p.x, p.y, '#9be8ff', 10);
    this.addPopup(p.x, p.y - 70, 'MINION!', '');
    this.updateHud();
  }

  onWrong(obj, pest) {
    const state = this.state;
    pest.state = 'wrong';
    pest.tremble = 0.9;
    pest.flash = 1;
    state.flash = 0.5;
    state.shake = 12;
    state.combo = 0;
    state.comboCount = 0;
    state.hearts = Math.max(0, state.hearts - 1);
    this.game.audio.wrong();
    this.addPopup(obj.x, obj.y - 60, '-1 ❤', '');
    /* the object returns to its slot — the player keeps experimenting */
    obj.wasWrong = true;
    this.returnObject(obj);
    this.updateHud();
    if (state.hearts <= 0) {
      setTimeout(() => this.endRun(false), 420);
    }
  }

  checkWin() {
    const state = this.state;
    if (!state || state.phase !== 'play') return;
    const obj = state.objective || { type: 'clear' };
    if (obj.type === 'boss') {
      const boss = state.pests.find((p) => p.boss);
      if (!boss || !boss.alive) {
        state.phase = 'resolving';
        setTimeout(() => this.endRun(true), 500);
      }
      return;
    }
    if (obj.type === 'collect') {
      if ((obj.done || 0) >= obj.need) {
        state.phase = 'resolving';
        setTimeout(() => this.endRun(true), 500);
      }
      return;
    }
    if (obj.type === 'score') {
      if (state.score >= obj.scoreTarget) {
        state.phase = 'resolving';
        setTimeout(() => this.endRun(true), 500);
        return;
      }
      if (obj.attempts <= 0) {
        state.phase = 'resolving';
        setTimeout(() => this.endRun(false), 420);
        return;
      }
    }
    if (state.pests.every((p) => !p.alive)) {
      state.phase = 'resolving';
      setTimeout(() => this.endRun(true), 400);
    }
  }

  /* ---------------- fx helpers ---------------- */

  addPopup(x, y, text, cls) {
    this.state.popups.push({ x, y, text, cls, life: 1.0 });
  }

  spawnBurst(x, y, color, count) {
    const imgs = ['star_03.png', 'star_05.png', 'spark_01.png', 'spark_03.png', 'circle_01.png'];
    for (let i = 0; i < count; i += 1) {
      const ang = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 180;
      this.state.particles.push({
        img: imgs[i % imgs.length],
        x, y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 60,
        life: 0.55 + Math.random() * 0.5,
        maxLife: 1,
        size: 10 + Math.random() * 16,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 6,
        color,
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

    /* tutorial mode: only update tutorial + ambient, skip game logic */
    if (state.tutorial) {
      this.updateTutorial(dt);
      state.cloudOffsetA = (state.cloudOffsetA - 6 * dt) % 1440;
      state.cloudOffsetB = (state.cloudOffsetB + 10 * dt) % 1440;
      state.groundOffset = (state.groundOffset - 22 * dt) % 205;
      state.objects.forEach((o) => { o.wobble += dt * 3; });
      state.pests.forEach((p) => { p.wobble += dt * 2; });
      state.particles = state.particles.filter((p) => {
        p.life -= dt; if (p.life <= 0) return false;
        p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        p.rot += p.vr * dt; return true;
      });
      return;
    }

    /* ambient */
    state.cloudOffsetA = (state.cloudOffsetA - 6 * dt) % 1440;
    state.cloudOffsetB = (state.cloudOffsetB + 10 * dt) % 1440;
    state.groundOffset = (state.groundOffset - 22 * dt) % 205;
    state.dust.forEach((d) => {
      d.y -= d.speed * dt;
      d.phase += dt;
      if (d.y < 150) d.y = 1200;
    });

    /* objective timers / movement */
    if (state.phase === 'play') {
      if (state.objective.type === 'time') {
        state.objective.timeLeft = Math.max(0, state.objective.timeLeft - dt);
        if (state.objective.timeLeft <= 0) {
          state.phase = 'resolving';
          setTimeout(() => this.endRun(false), 420);
          return;
        }
        this.updateHud();
      }
      if (state.objective.type === 'protect') {
        state.pests.forEach((p) => {
          if (!p.alive) return;
          p.y += (p.vy || 0) * dt;
          if (p.y >= 1145) {
            state.objective.flowerHearts -= 1;
            p.y = 640;
            p.x = 80 + Math.random() * 560;
            p.flash = 0.8;
            this.spawnBurst(p.x, p.y, '#ff6b4a', 8);
            this.addPopup(p.x, p.y - 60, 'BLOOM -1 ❤', '');
            if (state.objective.flowerHearts <= 0) {
              state.phase = 'resolving';
              setTimeout(() => this.endRun(false), 420);
            }
          }
        });
        this.updateHud();
      }
    }

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
      p.tremble = Math.max(0, p.tremble - dt * 2.2);
      p.flash = Math.max(0, p.flash - dt * 3);
      if (p.alive && p.state === 'idle') {
        if (p.imgs && p.imgs.length > 1) p.frame += dt * 6;
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

    /* protect objective: the bloom at the center-bottom */
    if (state.objective.type === 'protect') {
      this.renderBloom(ctx, 360, 1140, state.objective.flowerHearts);
    }

    /* pests */
    state.pests.forEach((p) => {
      if (!p.alive) return;
      this.renderPiece(ctx, p, true);
    });

    /* objects */
    state.objects.forEach((o) => {
      if (o.state === 'gone') return;
      this.renderPiece(ctx, o, false);
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

    /* tutorial hand overlay */
    this.renderTutorial(ctx);

    /* red flash on wrong */
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,40,40,${Math.min(0.35, state.flash * 0.7)})`;
      ctx.fillRect(0, 0, 720, 1280);
    }
  }

  renderBloom(ctx, x, y, hearts) {
    /* a small magic flower (drawn from the light plant sprite) */
    const img = sprite('assets/game/plant-light-1.png');
    if (img.complete && img.naturalWidth) {
      const s = 0.9;
      ctx.save();
      ctx.translate(x, y - 30);
      ctx.scale(s, s);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();
    } else {
      ctx.save();
      ctx.font = '60px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🌸', x, y);
      ctx.restore();
    }
    /* hearts above the bloom */
    ctx.save();
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    let text = '';
    for (let i = 0; i < 3; i += 1) text += i < hearts ? '❤' : '🤍';
    ctx.strokeStyle = 'rgba(40,20,0,0.8)';
    ctx.lineWidth = 5;
    ctx.strokeText(text, x, y - 60);
    ctx.fillText(text, x, y - 60);
    ctx.restore();
  }

  /* draw one piece (object or pest). pest=true adds a red "menace" aura. */
  renderPiece(ctx, p, isPest) {
    const state = this.state;
    const img = this.pieceImage(p);
    if (!img) return;
    const isBoss = !!p.boss;
    const w = p.w || 118;
    const h = p.h || 118;
    const scale = isBoss ? 1.45 : 1;
    const iw = img.naturalWidth || w;
    const ih = img.naturalHeight || h;
    const fit = Math.min((w * scale) / iw, (h * scale) / ih);
    const dw = iw * fit;
    const dh = ih * fit;
    const lift = p.state === 'dragging' ? 18 : 0;
    const px = p.x - dw / 2 + (p.tremble > 0 ? (Math.random() - 0.5) * 10 * p.tremble : 0);
    const py = p.y - dh / 2 + Math.sin(p.wobble) * 3 - lift;

    /* shadow */
    ctx.save();
    ctx.translate(p.x, p.y + dh / 2 - 6);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 6, dw * 0.42, dh * 0.10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    /* attribute glow (the color is ALWAYS visible) */
    const colorHex = this.attrColor(p);
    if (colorHex) {
      ctx.save();
      ctx.globalAlpha = isPest ? 0.22 : 0.30;
      ctx.fillStyle = colorHex;
      ctx.beginPath();
      ctx.arc(p.x, p.y, dw * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    /* menace aura for pests */
    if (isPest) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = '#ff4040';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, dw * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    if (p.state === 'hit') {
      ctx.translate(p.x, p.y);
      ctx.scale(p.scale, p.scale);
      ctx.globalAlpha = Math.max(0, 1 - (p.scale - 1) * 3);
      this.drawImageTinted(ctx, img, p, -dw / 2, -dh / 2, dw, dh);
    } else {
      this.drawImageTinted(ctx, img, p, px, py, dw, dh);
    }
    if (p.state === 'dragging') {
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.ellipse(0, 0, dw * 0.6, dh * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    /* color ring (non-tintable pieces) */
    if (colorHex && !p.tintable) {
      ctx.save();
      ctx.globalAlpha = isPest ? 0.9 : 1;
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(dw, dh) / 2 + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    /* element badge (plant family) */
    if (p.attrs && p.attrs.element && p.family === 'plant' && !isPest) {
      const badge = sprite(`assets/game/badge-${p.attrs.element}.png`);
      ctx.drawImage(badge, p.x + dw / 2 - 26, p.y - dh / 2 - 18, 44, 44);
    }

    /* number chip (domino family) */
    if (p.attrs && p.attrs.number != null) {
      this.renderNumberChip(ctx, p, dw, dh);
    }

    /* rainbow ready indicator on objects */
    if (!isPest && state.rainbow && p.state === 'idle') {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,120,220,0.95)';
      ctx.lineWidth = 5;
      ctx.setLineDash([10, 7]);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, Math.max(dw, 100), Math.max(dh, 100), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    /* boss HP bar */
    if (isBoss) {
      this.renderBossBar(ctx, p);
    }

    /* wrong flash */
    if (p.flash > 0 && isPest) {
      ctx.save();
      ctx.globalAlpha = p.flash * 0.5;
      ctx.drawImage(sprite('assets/particles/circle_03.png'), p.x - dw, p.y - dh, dw * 2, dh * 2);
      ctx.restore();
    }
  }

  pieceImage(p) {
    const frames = p.imgs || [];
    if (!frames.length) return null;
    const idx = frames.length > 1 ? Math.floor(p.frame || 0) % frames.length : 0;
    return sprite(frames[idx]);
  }

  drawImageTinted(ctx, img, p, x, y, w, h) {
    if (p.tintable && p.tint) {
      const tinted = this.tinted(img, p.tint);
      if (tinted && tinted.complete && tinted.naturalWidth) {
        ctx.drawImage(tinted, x, y, w, h);
        return;
      }
    }
    ctx.drawImage(img, x, y, w, h);
  }

  attrColor(p) {
    if (p.attrs && p.attrs.color && COLOR_HEX[p.attrs.color]) return COLOR_HEX[p.attrs.color];
    return p.tint || null;
  }

  renderNumberChip(ctx, p, dw, dh) {
    ctx.save();
    const cx = p.x + dw / 2 - 8;
    const cy = p.y - dh / 2 - 4;
    ctx.fillStyle = 'rgba(30,20,60,0.85)';
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 22px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(p.attrs.number), cx, cy + 1);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  renderBossBar(ctx, p) {
    const maxHp = this.state.objective.bossHp || 3;
    const w = 150;
    const x = p.x - w / 2;
    const y = p.y - p.h * 1.45 / 2 - 26;
    ctx.save();
    ctx.fillStyle = 'rgba(20,10,0,0.75)';
    ctx.fillRect(x - 3, y - 3, w + 6, 18);
    const frac = Math.max(0, p.hp / maxHp);
    ctx.fillStyle = frac > 0.5 ? '#ff6b4a' : '#ff3030';
    ctx.fillRect(x, y, w * frac, 12);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, 12);
    ctx.font = '900 18px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 4;
    ctx.strokeText('BOSS', p.x, y - 8);
    ctx.fillText('BOSS', p.x, y - 8);
    ctx.restore();
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
