class Input {
  constructor(game) {
    this.game = game;
    this.keys = new Set();
    this.listeners = { keydown: [], keyup: [] };
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  handleKeyDown(event) {
    if (!this.keys.has(event.code)) {
      this.keys.add(event.code);
      this.emit('keydown', event);
    }
  }

  handleKeyUp(event) {
    this.keys.delete(event.code);
    this.emit('keyup', event);
  }

  isDown(code) {
    return this.keys.has(code);
  }

  on(type, handler) {
    if (!this.listeners[type]) return () => {};
    this.listeners[type].push(handler);
    return () => {
      this.listeners[type] = this.listeners[type].filter((item) => item !== handler);
    };
  }

  emit(type, event) {
    this.listeners[type].forEach((handler) => handler(event));
  }
}
