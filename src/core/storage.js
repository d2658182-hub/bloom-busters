/* Progress persistence.
   Bridge Storage is authoritative on Playgama. localStorage is only an
   offline fallback when the Bridge CDN is unavailable. */

class Storage {
  constructor(gameId) {
    this.prefix = `gt_${gameId}_`;
    this.cache = Object.create(null);
    this.bridgeActive = false;
    this.readyPromise = null;
  }

  key(name) { return this.prefix + name; }

  parse(raw, fallback = null) {
    if (raw === null || raw === undefined || raw === '') return fallback;
    try { return JSON.parse(raw); } catch (error) { return raw; }
  }

  readOffline(key, fallback) {
    try {
      const raw = localStorage.getItem(this.key(key));
      return raw === null ? fallback : this.parse(raw, fallback);
    } catch (error) {
      return fallback;
    }
  }

  writeOffline(key, value) {
    try { localStorage.setItem(this.key(key), JSON.stringify(value)); } catch (error) { /* unavailable */ }
  }

  get(key, fallback = null) {
    return Object.prototype.hasOwnProperty.call(this.cache, key) ? this.cache[key] : fallback;
  }

  set(key, value) {
    this.cache[key] = value;
    if (this.bridgeActive && typeof SDK !== 'undefined') {
      SDK.storageSet(this.key(key), JSON.stringify(value));
    } else if (!this.readyPromise) {
      this.writeOffline(key, value);
    }
  }

  init() {
    if (this.readyPromise) return this.readyPromise;
    const keys = ['coins', 'level', 'items', 'settings', 'streak', 'runStats',
      'hintsUsed', 'reviveUsed', 'bestCombo', 'stars'];
    this.readyPromise = (typeof SDK !== 'undefined' && SDK.available
      ? SDK.available()
      : Promise.resolve(false))
      .then((available) => {
        this.bridgeActive = !!available;
        if (this.bridgeActive) {
          return Promise.all(keys.map((key) =>
            SDK.storageGet(this.key(key)).then((raw) => ({ key, raw }))
          )).then((values) => {
            values.forEach(({ key, raw }) => {
              const value = this.parse(raw, null);
              if (value !== null && value !== undefined) this.cache[key] = value;
            });
            return true;
          });
        }
        keys.forEach((key) => {
          const value = this.readOffline(key, null);
          if (value !== null && value !== undefined) this.cache[key] = value;
        });
        return false;
      })
      .catch(() => {
        this.bridgeActive = false;
        keys.forEach((key) => {
          const value = this.readOffline(key, null);
          if (value !== null && value !== undefined) this.cache[key] = value;
        });
        return false;
      });
    return this.readyPromise;
  }

  pullFromCloud() { return this.init(); }
}
