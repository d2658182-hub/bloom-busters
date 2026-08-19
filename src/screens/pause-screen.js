class PauseScreen extends BaseScreen {
  constructor(game) {
    super(game, 'pause');
  }

  build() {
    this.el = document.createElement('div');
    this.el.className = 'screen pause-screen';
    this.el.innerHTML = `
      <div class="pause-overlay"></div>
    `;

    const panel = new Panel({ image: 'assets/ui/f.png' });
    panel.add(
      this.titleEl('PAUSE'),
      this.buttonEl('RESUME', 'primary', () => this.resume()),
      this.buttonEl('RESTART', 'secondary', () => this.restart()),
      this.buttonEl('QUIT', 'back', () => this.quit())
    );
    this.el.appendChild(panel.el);

    this.onKeyDown((event) => {
      if (event.code === 'Escape') this.resume();
    });
  }

  titleEl(text) {
    const h = document.createElement('h2');
    h.className = 'modal-title';
    h.textContent = text;
    return h;
  }

  buttonEl(label, variant, onClick) {
    return new Button({ label, variant, onClick });
  }

  enter() {
    if (typeof SDK !== 'undefined') SDK.levelMessage('level_paused');
    /* duck the music (soft, still playing) instead of cutting it: no
       jarring stop/restart when resuming */
    this.game.audio.setDuck(0.14);
  }

  resume() {
    this.game.audio.click();
    this.game.audio.setDuck(0);
    this.game.show('gameplay', { keep: true, resume: true });
  }

  restart() {
    this.game.audio.click();
    this.game.audio.setDuck(0);
    this.game.show('gameplay');
  }

  quit() {
    this.game.audio.click();
    this.game.audio.setDuck(0);
    this.game.show('menu');
  }
}
