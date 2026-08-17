/* Victory — real score/coins/stars, confetti rain (real sprites tinted),
   NEXT LEVEL, DOUBLE COINS via rewarded ad (once per win, never removed). */

class VictoryScreen extends BaseScreen {
  constructor(game) {
    super(game, 'victory');
    this.lastData = null;
    this.doubleUsed = false;
    this.confettiFrame = null;
    this.confettiParticles = [];
  }

  build() {
    this.el = document.createElement('div');
    this.el.className = 'screen victory-screen';
    this.el.style.backgroundImage = `url("${this.game.config.backgrounds.menu}")`;

    this.confettiCanvas = document.createElement('canvas');
    this.confettiCanvas.className = 'confetti-canvas';
    this.confettiCanvas.width = 720;
    this.confettiCanvas.height = 1280;
    this.confettiCtx = this.confettiCanvas.getContext('2d');

    const panel = new Panel({ image: 'assets/ui/f.png' });
    panel.add(
      this.titleEl('VICTORY!'),
      this.starsEl(3),
      this.statsEl(),
      this.buttonsEl()
    );
    this.el.appendChild(this.confettiCanvas);
    this.el.appendChild(panel.el);

    this.onKeyDown((event) => {
      if (event.code === 'Enter' || event.code === 'Space') this.nextLevel();
    });
  }

  titleEl(text) {
    const h = document.createElement('h2');
    h.className = 'modal-title title-bounce';
    h.textContent = text;
    return h;
  }

  starsEl(count) {
    const row = document.createElement('div');
    row.className = 'modal-stars star-pop';
    for (let i = 0; i < 3; i += 1) {
      const img = document.createElement('img');
      img.src = i < count ? 'assets/ui/s1.png' : 'assets/ui/s2.png';
      img.alt = '';
      img.style.animationDelay = `${0.25 + i * 0.18}s`;
      row.appendChild(img);
    }
    return row;
  }

  statsEl() {
    const box = document.createElement('div');
    box.className = 'end-stats';
    box.innerHTML = `
      <div class="end-row"><span class="end-label">LEVEL</span><span class="end-value end-level">1</span></div>
      <div class="end-row"><span class="end-label">SCORE</span><span class="end-value end-score">0</span></div>
      <div class="end-row coins-row">
        <span class="end-label">COINS</span>
        <span class="end-value"><img src="assets/ui/c.png" alt="" draggable="false"><span class="end-coins">0</span></span>
      </div>
      <div class="end-sub">The garden is safe again! 🌸</div>
    `;
    return box;
  }

  buttonsEl() {
    const box = document.createElement('div');
    box.className = 'end-buttons';
    const next = new Button({ label: 'NEXT LEVEL', variant: 'primary', onClick: () => this.nextLevel() });
    const double = new Button({ label: 'DOUBLE COINS ▶', variant: 'secondary', onClick: () => this.doubleCoins() });
    const menu = new Button({ label: 'MENU', variant: 'back', onClick: () => this.menu() });
    box.appendChild(next.el);
    box.appendChild(double.el);
    box.appendChild(menu.el);
    this.doubleButton = double;
    return box;
  }

  enter(previous, options = {}) {
    const data = (options && options.data) || { level: 1, score: 0, coins: 0, stars: 3 };
    this.lastData = data;
    this.doubleUsed = false;

    const level = this.el.querySelector('.end-level');
    const score = this.el.querySelector('.end-score');
    const coins = this.el.querySelector('.end-coins');
    if (level) level.textContent = data.level;
    if (score) score.textContent = (data.score || 0).toLocaleString('en-US');
    if (coins) coins.textContent = (data.coins || 0).toLocaleString('en-US');

    const stars = this.el.querySelectorAll('.modal-stars img');
    stars.forEach((img, i) => {
      img.src = i < data.stars ? 'assets/ui/s1.png' : 'assets/ui/s2.png';
    });

    const canDouble = typeof SDK !== 'undefined' && SDK.isAvailable();
    if (this.doubleButton) this.doubleButton.el.style.display = canDouble ? '' : 'none';

    this.game.audio.playMusic('victory');
    this.startConfetti();
  }

  exit() {
    if (this.confettiFrame) {
      cancelAnimationFrame(this.confettiFrame);
      this.confettiFrame = null;
    }
  }

  /* ---- confetti (real star particles, tinted, falling) ---- */
  startConfetti() {
    const colors = ['#ff6b4a', '#ffd75e', '#7ee081', '#3fa9f5', '#c98a4b', '#ff8bd1', '#9be8ff'];
    const imgs = ['star_01.png', 'star_03.png', 'star_05.png', 'star_07.png', 'star_09.png'];
    for (let i = 0; i < 90; i += 1) {
      this.confettiParticles.push({
        img: imgs[i % imgs.length],
        x: Math.random() * 720,
        y: -40 - Math.random() * 900,
        vy: 120 + Math.random() * 160,
        vx: (Math.random() - 0.5) * 50,
        size: 9 + Math.random() * 15,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 7,
        color: colors[i % colors.length],
        life: 3 + Math.random() * 2.5
      });
    }
    const tintCache = {};
    const last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      const ctx = this.confettiCtx;
      ctx.clearRect(0, 0, 720, 1280);
      this.confettiParticles = this.confettiParticles.filter((p) => {
        p.life -= dt;
        if (p.life <= 0) return false;
        p.y += p.vy * dt;
        p.x += p.vx * dt + Math.sin(now / 400 + p.rot) * 0.6;
        p.rot += p.vr * dt;
        const img = sprite(`assets/particles/${p.img}`);
        if (!img.complete || img.naturalWidth === 0) return true; /* keep until loaded */
        const key = `${p.color}_${img.width}`;
        if (!tintCache[key]) {
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          const cctx = c.getContext('2d');
          cctx.drawImage(img, 0, 0);
          cctx.globalCompositeOperation = 'source-in';
          cctx.fillStyle = p.color;
          cctx.fillRect(0, 0, c.width, c.height);
          tintCache[key] = c;
        }
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.drawImage(tintCache[key], -p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
        return true;
      });
      if (this.confettiParticles.length > 0 || performance.now() - startTime < 5000) {
        this.confettiFrame = requestAnimationFrame(step);
      } else {
        this.confettiFrame = null;
      }
    };
    const startTime = performance.now();
    this.confettiFrame = requestAnimationFrame(step);
  }

  async nextLevel() {
    this.game.audio.click();
    /* deferred interstitial (decided in endRun): plays on the way to the
       next level, never while the victory screen is appearing */
    if (typeof SDK !== 'undefined' && SDK.isAvailable() && this.lastData && this.lastData.adNext) {
      await SDK.showInterstitial();
    }
    this.game.show(this.game.config.playTarget || 'gameplay');
  }

  async doubleCoins() {
    if (this.doubleUsed || !this.lastData) return;
    if (typeof SDK === 'undefined' || !SDK.isAvailable()) return;
    this.game.audio.click();
    const state = await SDK.showRewarded();
    if (state === 'rewarded') {
      this.doubleUsed = true;
      const bonus = this.lastData.coins || 0;
      this.game.addCoins(bonus);
      this.game.audio.confirm();
      const label = this.doubleButton && this.doubleButton.el.querySelector('.btn-label');
      if (label) label.textContent = `+${bonus.toLocaleString('en-US')} ✔`;
    }
    /* on 'closed'/'failed': keep the base coins, never remove them */
  }

  menu() {
    this.game.audio.click();
    this.game.show('menu');
  }
}
