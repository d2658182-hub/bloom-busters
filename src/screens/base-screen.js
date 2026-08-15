class BaseScreen {
  constructor(game, name) {
    this.game = game;
    this.name = name;
    this.el = null;
    this.cleanups = [];
  }

  build() {
    if (this.el) this.el.remove(); /* never leave a stale copy in the DOM */
    this.el = document.createElement('div');
    this.el.className = 'screen';
  }

  enter(previous, options) {}

  exit(next) {}

  destroy() {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
  }

  onKeyDown(handler) {
    const off = this.game.input.on('keydown', handler);
    this.cleanups.push(off);
  }
}
