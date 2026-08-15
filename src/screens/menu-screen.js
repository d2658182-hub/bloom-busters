class MenuScreen extends BaseScreen {
  constructor(game) {
    super(game, 'menu');
  }

  build() {
    const config = this.game.config;

    this.el = document.createElement('div');
    this.el.className = 'screen menu-screen';
    this.el.style.backgroundImage = `url("${config.backgrounds.menu}")`;
    this.el.innerHTML = `
      <div class="menu-content">
        <div class="menu-title">
          <h1 class="game-title">${config.title}</h1>
          <div class="menu-subtitle">Magic Garden Match</div>
        </div>
        <div class="menu-progress"></div>
        <div class="menu-buttons">
          ${this.playButton()}
          ${config.features.shop ? this.shopButton() : ''}
          <div class="menu-sound">${this.soundButton()}</div>
        </div>
      </div>
    `;

    this.el.querySelector('.btn-play').addEventListener('click', () => this.startGame());
    const shopButton = this.el.querySelector('.btn-shop');
    if (shopButton) shopButton.addEventListener('click', () => this.openShop());
    this.el.querySelector('.btn-sound').addEventListener('click', (event) => this.toggleSound(event));

    this.onKeyDown((event) => {
      if (event.code === 'Enter' || event.code === 'Space') this.startGame();
    });
  }

  playButton() {
    return `
      <button type="button" class="btn btn-primary btn-play" aria-label="Play">
        <img src="assets/ui/b_4.png" alt="" draggable="false">
        <span class="btn-label">PLAY</span>
      </button>
    `;
  }

  shopButton() {
    return `
      <button type="button" class="btn btn-secondary btn-shop" aria-label="Shop">
        <img src="assets/ui/b_5.png" alt="" draggable="false">
        <span class="btn-label">SHOP</span>
      </button>
    `;
  }

  soundButton() {
    const on = this.game.audio.settings.sound;
    return `
      <button type="button" class="btn btn-square btn-sound" aria-label="Sound">
        <img src="assets/ui/b_8.png" alt="" draggable="false">
        <span class="btn-icon">${on ? '🔊' : '🔇'}</span>
      </button>
    `;
  }

  enter() {
    if (typeof SDK !== 'undefined') SDK.gameplayStop();
    this.game.audio.playMusic('menu');
    this.updateProgress();
  }

  updateProgress() {
    const box = this.el.querySelector('.menu-progress');
    if (!box) return;
    const level = this.game.getLevel();
    const world = this.worldOf(level);
    const coins = this.game.getCoins();
    box.innerHTML = `
      <div class="progress-chip">World: <b>${world.name}</b></div>
      <div class="progress-chip">Level <b>${level}</b></div>
      <div class="progress-chip coins-chip">
        <img src="assets/ui/c.png" alt="" draggable="false">
        <span>${coins.toLocaleString('en-US')}</span>
      </div>
    `;
  }

  worldOf(level) {
    const config = this.game.config;
    let acc = 0;
    for (let i = 0; i < config.worlds.length; i += 1) {
      acc += config.worlds[i].levels;
      if (level <= acc) return config.worlds[i];
    }
    return config.worlds[config.worlds.length - 1];
  }

  startGame() {
    this.game.audio.click();
    this.game.show(this.game.config.playTarget || 'gameplay');
  }

  openShop() {
    this.game.audio.click();
    this.game.show('shop');
  }

  toggleSound(event) {
    event.stopPropagation();
    this.game.audio.click();
    const on = this.game.audio.toggleSound();
    event.currentTarget.querySelector('.btn-icon').textContent = on ? '🔊' : '🔇';
  }
}
