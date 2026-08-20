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

    /* never keep playing when the tab/browser is hidden or closed */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseMusic();
        this.duck(0);
      } else {
        this.duck(this.duckLevel);
        if (this.pausedMusic) this.resumeMusic();
      }
    });
    window.addEventListener('pagehide', () => {
      this.pauseMusic();
      this.duck(0);
    });
    window.addEventListener('pageshow', () => {
      if (!document.hidden) this.duck(this.duckLevel);
    });

    window.addEventListener('pointerdown', () => this.unlock(), { once: true });
    window.addEventListener('keydown', () => this.unlock(), { once: true });
    window.addEventListener('touchstart', () => this.unlock(), { once: true });
  }

  /* comfortable loudness: everything is capped well below 1.0 */
  musicVolume() { return 0.32; }
  sfxVolume() { return 0.38; }

  /* ducking: music plays softly (pause screen / tab hidden) instead of
     stopping and restarting from the top — no jarring cut/resume.
     duckLevel = 0 means "no ducking": the track plays at musicVolume(). */
  duckLevel = 0;
  duck(level) {
    Object.keys(this.tracks).forEach((name) => {
      try { this.tracks[name].volume = level; } catch (error) { /* noop */ }
    });
  }

  /* apply the current volume policy to the playing track */
  applyMusicVolume() {
    if (!this.currentMusic) return;
    const track = this.tracks[this.currentMusic];
    if (!track) return;
    try { track.volume = this.duckLevel > 0 ? this.duckLevel : this.musicVolume(); } catch (error) { /* noop */ }
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
    el.volume = loop ? this.musicVolume() : this.sfxVolume();
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
    /* already playing the same track (e.g. resuming after pause): keep the
       position and just re-apply the volume — no jarring cut/restart */
    if (this.currentMusic === name && !track.paused) {
      this.applyMusicVolume();
      return;
    }
    this.stopMusic();
    this.currentMusic = name;
    this.applyMusicVolume();
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

  /* soft-pause: keep the position, silence the track (tab hidden / quit) */
  pauseMusic() {
    if (this.currentMusic && this.tracks[this.currentMusic]) {
      this.pausedMusic = this.currentMusic;
      try { this.tracks[this.currentMusic].pause(); } catch (error) { /* noop */ }
    }
  }

  resumeMusic() {
    const name = this.pausedMusic;
    this.pausedMusic = null;
    if (!name || this.muted) return;
    const track = this.tracks[name];
    if (!track) return;
    this.applyMusicVolume();
    try {
      const p = track.play();
      if (p && p.catch) p.catch(() => {});
    } catch (error) { /* noop */ }
  }

  /* ---- pause-screen ducking (soft music instead of cut+restart) ---- */
  setDuck(level) {
    this.duckLevel = level;
    this.applyMusicVolume();
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
