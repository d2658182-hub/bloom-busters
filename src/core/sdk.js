/* ============================================================
   SDK — defensive wrapper around the Playgama bridge.
   Every call is safe with OR without the bridge:
   - without bridge the game runs fully (no ads, localStorage);
   - with bridge: game_ready, loading progress, interstitial,
     rewarded (reward ONLY on state 'rewarded'), cloud storage,
     pause/audio subscriptions, gameplay lifecycle events.
   ============================================================ */

const SDK = (() => {
  const rawBridge = () => (typeof window !== 'undefined' && window.bridge) ? window.bridge : null;

  const isAvailable = () => {
    const b = rawBridge();
    if (!b) return false;
    try {
      return typeof b.isAvailable === 'function' ? !!b.isAvailable() : true;
    } catch (error) {
      return false;
    }
  };

  const safe = (fn) => {
    try { return fn(); } catch (error) { return undefined; }
  };

  return {
    isAvailable,

    /* ---- lifecycle ---- */
    gameReady() {
      if (!isAvailable()) return;
      safe(() => rawBridge().gameReady());
    },

    loadingProgress(p) {
      if (!isAvailable()) return;
      safe(() => rawBridge().loadingProgress(Math.max(0, Math.min(1, p))));
    },

    gameplayStart() { if (isAvailable()) safe(() => rawBridge().gameplay.start()); },
    gameplayPause() { if (isAvailable()) safe(() => rawBridge().gameplay.pause()); },
    gameplayResume() { if (isAvailable()) safe(() => rawBridge().gameplay.resume()); },
    gameplayStop() { if (isAvailable()) safe(() => rawBridge().gameplay.stop()); },
    gameplayFail() { if (isAvailable()) safe(() => rawBridge().gameplay.fail()); },

    /* ---- ads: interstitial ---- */
    async showInterstitial() {
      const b = rawBridge();
      if (!isAvailable() || !b.interstitial || typeof b.interstitial.show !== 'function') {
        return 'closed';
      }
      try {
        return await b.interstitial.show();
      } catch (error) {
        return 'closed';
      }
    },

    /* ---- ads: rewarded (reward ONLY on 'rewarded') ---- */
    async showRewarded() {
      const b = rawBridge();
      if (!isAvailable() || !b.rewarded || typeof b.rewarded.show !== 'function') {
        return 'failed';
      }
      try {
        return await b.rewarded.show();
      } catch (error) {
        return 'failed';
      }
    },

    /* ---- cloud storage (async) ---- */
    async storageGet(key) {
      const b = rawBridge();
      if (!isAvailable() || !b.storage || typeof b.storage.get !== 'function') return null;
      try {
        const value = await b.storage.get(key);
        return value == null ? null : String(value);
      } catch (error) {
        return null;
      }
    },

    async storageSet(key, value) {
      const b = rawBridge();
      if (!isAvailable() || !b.storage || typeof b.storage.set !== 'function') return;
      try {
        await b.storage.set(key, value);
      } catch (error) {
        /* noop — local fallback remains */
      }
    },

    /* ---- subscriptions (return unsubscribe fns) ---- */
    onPause(cb) {
      const b = rawBridge();
      if (isAvailable() && typeof b.onPause === 'function') return b.onPause(cb);
      return () => {};
    },

    onResume(cb) {
      const b = rawBridge();
      if (isAvailable() && typeof b.onResume === 'function') return b.onResume(cb);
      return () => {};
    },

    onAudio(cb) {
      const b = rawBridge();
      if (isAvailable() && typeof b.onAudio === 'function') return b.onAudio(cb);
      return () => {};
    },

    /* ---- audio state from the platform (null when absent) ---- */
    get isAudioEnabled() {
      const b = rawBridge();
      if (!isAvailable() || typeof b.isAudioEnabled !== 'boolean') return null;
      return b.isAudioEnabled;
    },

    get isPaused() {
      const b = rawBridge();
      if (!isAvailable() || typeof b.isPaused !== 'boolean') return null;
      return b.isPaused;
    },

    getLanguage() {
      const b = rawBridge();
      if (isAvailable() && typeof b.getLanguage === 'function') return safe(() => b.getLanguage());
      return null;
    },

    getPlatform() {
      const b = rawBridge();
      if (isAvailable() && typeof b.getPlatform === 'function') return safe(() => b.getPlatform());
      return null;
    }
  };
})();
