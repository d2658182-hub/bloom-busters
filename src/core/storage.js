class Storage {
  constructor(gameId) {
    this.prefix = `gt_${gameId}_`;
    this.cloudLoaded = false;
  }

  key(name) {
    return this.prefix + name;
  }

  /* local (fast, source of truth) */
  getLocal(key, fallback = null) {
    try {
      const value = localStorage.getItem(this.key(key));
      return value === null ? fallback : JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  setLocal(key, value) {
    try {
      localStorage.setItem(this.key(key), JSON.stringify(value));
    } catch (error) {
      /* storage unavailable */
    }
  }

  /* public API — local first, then mirror to cloud (bridge.storage) */
  get(key, fallback = null) {
    return this.getLocal(key, fallback);
  }

  set(key, value) {
    this.setLocal(key, value);
    this.mirrorToCloud(key);
  }

  /* ---- cloud mirroring (defensive: never throws, async best-effort) ---- */
  mirrorToCloud(key) {
    if (typeof SDK === 'undefined') return;
    const value = this.getLocal(key, null);
    SDK.storageSet(this.key(key), value === null ? '' : JSON.stringify(value)).catch(() => {});
  }

  /* Pull cloud values at boot and merge into local.
     Called once; never blocks the game. */
  pullFromCloud() {
    if (this.cloudLoaded || typeof SDK === 'undefined' || !SDK.isAvailable()) return;
    this.cloudLoaded = true;
    const keys = ['coins', 'level', 'items', 'settings', 'streak', 'runStats', 'hintsUsed', 'reviveUsed', 'bestCombo'];
    keys.forEach((key) => {
      SDK.storageGet(this.key(key)).then((raw) => {
        if (raw == null || raw === '') return;
        try {
          const parsed = JSON.parse(raw);
          // only adopt if the local value is missing (fresh device)
          if (this.getLocal(key, null) === null) this.setLocal(key, parsed);
        } catch (error) {
          /* ignore malformed cloud value */
        }
      }).catch(() => {});
    });
  }
}
