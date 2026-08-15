class ScreenManager {
  constructor(game) {
    this.game = game;
    this.container = game.container;
    this.screens = new Map();
    this.current = null;
  }

  register(screen) {
    this.screens.set(screen.name, screen);
    return this;
  }

  show(name, options = {}) {
    const next = this.screens.get(name);
    if (!next) return;
    const previous = this.current;
    if (previous && previous !== next) previous.exit(next);
    next.build();
    this.container.appendChild(next.el);
    if (typeof UI !== 'undefined') UI.setupLoaded(next.el);
    next.enter(previous, options);
    if (previous && previous !== next) requestAnimationFrame(() => previous.destroy());
    this.current = next;
  }
}
