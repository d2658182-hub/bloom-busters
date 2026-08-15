class Game {
  constructor(config) {
    this.config = config;
    this.container = document.getElementById('game-root');
    this.storage = new Storage(config.id || 'game');
    this.audio = new AudioEngine(this);
    this.input = new Input(this);
    this.screens = new ScreenManager(this);
  }

  register(screen) {
    this.screens.register(screen);
    return this;
  }

  show(name, options) {
    this.screens.show(name, options);
  }

  start() {
    if (this.storage.pullFromCloud) this.storage.pullFromCloud();
    this.audio.load(this.config.audio);
    this.show(this.config.firstScreen);
  }

  /* ============ progression helpers ============ */

  getLevel() {
    const value = this.storage.get('level', 1);
    return Math.max(1, Math.min(this.config.totalLevels, Number(value) || 1));
  }

  setLevel(n) {
    const clamped = Math.max(1, Math.min(this.config.totalLevels, Number(n) || 1));
    const current = this.getLevel();
    if (clamped > current) this.storage.set('level', clamped);
  }

  getCoins() {
    return this.storage.get('coins', 0);
  }

  addCoins(amount) {
    const coins = Math.max(0, Math.round((this.storage.get('coins', 0) || 0) + amount));
    this.storage.set('coins', coins);
    return coins;
  }

  spendCoins(amount) {
    const coins = this.storage.get('coins', 0);
    if (coins < amount) return false;
    this.storage.set('coins', coins - amount);
    return true;
  }

  getItems() {
    return this.storage.get('items', []);
  }

  hasItem(id) {
    return this.getItems().includes(id);
  }

  addItem(id) {
    const items = this.getItems();
    if (!items.includes(id)) {
      items.push(id);
      this.storage.set('items', items);
    }
  }

  /* run streak: { outcome, count } | null — used for the interstitial rule */
  getStreak() {
    return this.storage.get('streak', null);
  }

  pushStreak(outcome) {
    const streak = this.getStreak();
    if (streak && typeof streak === 'object' && streak.outcome === outcome) {
      const next = { outcome, count: Number(streak.count) + 1 };
      this.storage.set('streak', next);
      return next.count;
    }
    const next = { outcome, count: 1 };
    this.storage.set('streak', next);
    return next.count;
  }

  resetStreak() {
    this.storage.set('streak', null);
  }
}
