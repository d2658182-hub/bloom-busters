/* ============================================================
   AudioEngine — REAL downloaded music + SFX (see CREDITS.md).
   - one music track per screen (menu/gameplay/victory/gameover)
   - SFX files with playbackRate for rising combo pitch
   - mute toggle persisted, platform audio state respected
   - unlock on first user gesture (autoplay policy)
   ============================================================ */

class AudioEngine {
  constructor(game) {
    this.game = game;
    this.tracks = {};   // name -> HTMLAudioElement (music)
    this.sfx = {};      // name -> HTMLAudioElement
    this.currentMusic = null;
    this.unlocked = false;
    this.pendingMusic = null;
    this.settings = { sound: true };
    const saved = game.storage.get('settings', null);
    if (saved) Object.assign(this.settings, saved);

    // respect the platform audio state when the bridge provides one
    if (typeof SDK !== 'undefined') {
      const platformAudio = SDK.isAudioEnabled;
      if (platformAudio !== null && platformAudio === false) this.settings.sound = false;
      const offAudio = SDK.onAudio((enabled) => {
        this.settings.sound = !!enabled;
        if (!enabled) this.stopMusic();
      });
      window.addEventListener('beforeunload', offAudio, { once: true });
    }

    window.addEventListener('pointerdown', () => this.unlock(), { once: true });
    window.addEventListener('keydown', () => this.unlock(), { once: true });
    window.addEventListener('touchstart', () => this.unlock(), { once: true });
  }

  /* create all elements (called by the loading screen after files are known) */
  load(files) {
    const music = files.music || {};
    const sfx = files.sfx || {};
    Object.keys(music).forEach((name) => {
      this.tracks[name] = this.makeAudio(music[name], true);
    });
    Object.keys(sfx).forEach((name) => {
      this.sfx[name] = this.makeAudio(sfx[name], false);
    });
  }

  makeAudio(src, loop) {
    const el = new Audio();
    el.src = src;
    el.loop = !!loop;
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
    return el;
  }

  unlock() {
    this.unlocked = true;
    if (this.pendingMusic) {
      const name = this.pendingMusic;
      this.pendingMusic = null;
      this.playMusic(name);
    }
  }

  get muted() {
    return !this.settings.sound;
  }

  /* ---- music ---- */
  playMusic(name) {
    if (this.muted) { this.pendingMusic = name; return; }
    const track = this.tracks[name];
    if (!track) return;
    this.stopMusic();
    this.currentMusic = name;
    if (!this.unlocked) { this.pendingMusic = name; return; }
    try {
      const p = track.play();
      if (p && p.catch) p.catch(() => { this.pendingMusic = name; });
    } catch (error) {
      this.pendingMusic = name;
    }
  }

  stopMusic() {
    Object.keys(this.tracks).forEach((name) => {
      try { this.tracks[name].pause(); this.tracks[name].currentTime = 0; } catch (error) { /* noop */ }
    });
    this.currentMusic = null;
    this.pendingMusic = null;
  }

  /* ---- sfx ---- */
  play(name, rate = 1) {
    if (this.muted) return;
    const el = this.sfx[name];
    if (!el) return;
    try {
      el.preservesPitch = false;
      el.playbackRate = Math.max(0.5, Math.min(2, rate));
      el.currentTime = 0;
      const p = el.play();
      if (p && p.catch) p.catch(() => {});
    } catch (error) {
      /* noop */
    }
  }

  click() { this.play('click'); }
  drop() { this.play('drop'); }
  match(combo = 1) { this.play('match', 0.85 + Math.min(1.15, (combo - 1) * 0.12)); }
  destroy(combo = 1) { this.play('destroy', 0.9 + Math.min(1.1, (combo - 1) * 0.1)); }
  wrong() { this.play('wrong', 0.9); }
  milestone() { this.play('milestone', 1); }
  confirm() { this.play('confirm', 1); }

  /* ---- sound toggle (music + sfx together, persisted) ---- */
  toggleSound() {
    this.settings.sound = !this.settings.sound;
    this.game.storage.set('settings', this.settings);
    if (!this.settings.sound) this.stopMusic();
    return this.settings.sound;
  }
}
