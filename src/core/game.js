class Game {
  constructor(config) {
    this.config = config;
    this.container = document.getElementById('game-root');
    this.storage = new Storage(config.id || 'game');
    this.audio = new AudioEngine(this);
    this.input = new Input(this);
    this.screens = new ScreenManager(this);
    this.platformPaused = false;
    this.language = 'en';
  }

  register(screen) {
    this.screens.register(screen);
    return this;
  }

  show(name, options) {
    this.screens.show(name, options);
  }

  start() {
    this.storage.init().then(() => {
      const settings = this.storage.get('settings', null);
      if (settings) Object.assign(this.audio.settings, settings);
      this.audio.load(this.config.audio);
      this.show(this.config.firstScreen);
    });
  }

  getLevel() {
    const value = this.storage.get('level', 1);
    return Math.max(1, Math.min(this.config.totalLevels, Number(value) || 1));
  }

  setLevel(n) {
    const clamped = Math.max(1, Math.min(this.config.totalLevels, Number(n) || 1));
    const current = this.getLevel();
    if (clamped > current) this.storage.set('level', clamped);
  }

  getCoins() { return this.storage.get('coins', 0); }

  addCoins(amount) {
    const coins = Math.max(0, Math.round((this.getCoins() || 0) + amount));
    this.storage.set('coins', coins);
    return coins;
  }

  spendCoins(amount) {
    const coins = this.getCoins();
    if (coins < amount) return false;
    this.storage.set('coins', coins - amount);
    return true;
  }

  getStarsMap() {
    const map = this.storage.get('stars', {});
    return map && typeof map === 'object' ? map : {};
  }

  getStars(level) { return Number(this.getStarsMap()[level]) || 0; }

  setStars(level, stars) {
    const map = this.getStarsMap();
    if ((map[level] || 0) < stars) {
      map[level] = stars;
      this.storage.set('stars', map);
    }
  }

  getTotalStars() {
    return Object.keys(this.getStarsMap()).reduce((sum, level) => sum + (Number(this.getStarsMap()[level]) || 0), 0);
  }

  getItems() {
    const items = this.storage.get('items', []);
    return Array.isArray(items) ? items : [];
  }

  hasItem(id) { return this.getItems().includes(id); }

  addItem(id) {
    const items = this.getItems();
    if (!items.includes(id)) {
      items.push(id);
      this.storage.set('items', items);
    }
  }

  getStreak() { return this.storage.get('streak', null); }

  pushStreak(outcome) {
    const streak = this.getStreak();
    const count = streak && streak.outcome === outcome ? Number(streak.count) + 1 : 1;
    this.storage.set('streak', { outcome, count });
    return count;
  }

  resetStreak() { this.storage.set('streak', null); }
}
