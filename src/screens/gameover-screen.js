/* Game Over — animated, real score/coins from the run.
   REVIVE uses the rewarded ad (reward ONLY on 'rewarded'),
   resumes EXACTLY where the run stopped, once per run. */

class GameOverScreen extends BaseScreen {
  constructor(game) {
    super(game, 'gameover');
    this.lastOptions = null;
  }

  build() {
    this.el = document.createElement('div');
    this.el.className = 'screen gameover-screen';
    this.el.style.backgroundImage = `url("${this.game.config.backgrounds.menu}")`;

    const panel = new Panel({ image: 'assets/ui/f.png' });
    panel.add(
      this.titleEl('GAME OVER'),
      this.statsEl(),
      this.buttonsEl()
    );
    this.el.appendChild(panel.el);

    this.onKeyDown((event) => {
      if (event.code === 'Enter' || event.code === 'Space') this.retry();
    });
  }

  titleEl(text) {
    const h = document.createElement('h2');
    h.className = 'modal-title title-pop';
    h.textContent = text;
    return h;
  }

  statsEl() {
    const box = document.createElement('div');
    box.className = 'end-stats';
    box.innerHTML = `
      <div class="end-row"><span class="end-label">LEVEL</span><span class="end-value end-level">1</span></div>
      <div class="end-row"><span class="end-label">SCORE</span><span class="end-value end-score">0</span></div>
      <div class="end-row coins-row">
        <span class="end-label">EARNED</span>
        <span class="end-value"><img src="assets/ui/c.png" alt="" draggable="false"><span class="end-coins">0</span></span>
      </div>
      <div class="end-sub">Nice try! Plants grow back 🌱</div>
    `;
    return box;
  }

  buttonsEl() {
    const box = document.createElement('div');
    box.className = 'end-buttons';
    const retry = new Button({ label: 'RETRY', variant: 'primary', onClick: () => this.retry() });
    const revive = new Button({ label: 'REVIVE ▶', variant: 'secondary', onClick: () => this.revive() });
    const menu = new Button({ label: 'MENU', variant: 'back', onClick: () => this.menu() });
    box.appendChild(retry.el);
    box.appendChild(revive.el);
    box.appendChild(menu.el);
    this.reviveButton = revive;
    return box;
  }

  enter(previous, options = {}) {
    const data = (options && options.data) || { level: 1, score: 0, coins: 0 };
    this.lastOptions = options;

    const level = this.el.querySelector('.end-level');
    const score = this.el.querySelector('.end-score');
    const coins = this.el.querySelector('.end-coins');
    if (level) level.textContent = data.level;
    if (score) score.textContent = (data.score || 0).toLocaleString('en-US');
    if (coins) coins.textContent = (data.coins || 0).toLocaleString('en-US');

    const canRevive = typeof SDK !== 'undefined'
      && SDK.isAvailable()
      && options.resumeState
      && !options.resumeState.reviveUsed;
    if (this.reviveButton) {
      this.reviveButton.el.style.display = canRevive ? '' : 'none';
    }

    this.game.audio.playMusic('gameover');
  }

  retry() {
    this.game.audio.click();
    this.game.show(this.game.config.playTarget || 'gameplay');
  }

  async revive() {
    if (!this.lastOptions || !this.lastOptions.resumeState) return;
    if (typeof SDK === 'undefined' || !SDK.isAvailable()) return;
    this.game.audio.click();
    const state = await SDK.showRewarded();
    if (state === 'rewarded') {
      this.game.audio.confirm();
      this.game.show('gameplay', { resumeState: this.lastOptions.resumeState });
    }
    /* on 'closed'/'failed' the player keeps the game over screen — no reward */
  }

  menu() {
    this.game.audio.click();
    this.game.show('menu');
  }
}
