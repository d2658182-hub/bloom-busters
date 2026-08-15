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
    /* idempotent: a repeated show() of the screen already on stage must be a no-op.
       Otherwise build() appends a second copy that nothing ever destroys -> the
       screens pile up infinitely (same menu re-rendered forever). */
    if (next === this.current) return;
    const previous = this.current;
    /* synchronous destroy (no rAF deferral): a deferred destroy can fire AFTER the
       same screen was re-shown and then remove the NEW element, leaving zero screens. */
    if (previous) {
      previous.exit(next);
      previous.destroy();
    }
    next.build();
    this.container.appendChild(next.el);
    if (typeof UI !== 'undefined') UI.setupLoaded(next.el);
    next.enter(previous, options);
    this.current = next;
  }
}
