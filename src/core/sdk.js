/* ============================================================
   SDK — defensive wrapper around the Playgama Bridge v2.
   Every call is safe with OR without the bridge:
   - without bridge the game runs fully (no ads, localStorage);
   - with bridge: game_ready, loading progress, interstitial,
     rewarded (reward ONLY on state 'rewarded'), cloud storage,
     pause/audio subscriptions, lifecycle messages.
   ============================================================ */

const SDK = (() => {
  /* v2: bridge.initialize() must be called first */
  const bridgePromise = (window.bridge && typeof window.bridge.initialize === 'function')
    ? window.bridge.initialize().then(function () { return window.bridge; }).catch(function () { return null; })
    : Promise.resolve(null);

  const call = function (fn) {
    return function () {
      var args = arguments;
      return bridgePromise.then(function (b) { return fn.apply(null, [b].concat(Array.prototype.slice.call(args))); });
    };
  };

  return {
    isAvailable: function () {
      return bridgePromise.then(function (b) { return !!b; });
    },

    /* ---- lifecycle (v2: platform.sendMessage) ---- */
    gameReady: call(function (b) {
      if (b) { try { b.platform.sendMessage('game_ready'); } catch (e) {} }
    }),

    loadingProgress: call(function (b, p) {
      var value = Math.max(0, Math.min(1, p));
      if (b && typeof b.setGameLoadingProgress === 'function') {
        try { b.setGameLoadingProgress(value); } catch (e) {}
      }
    }),

    levelMessage: call(function (b, name) {
      if (b) { try { b.platform.sendMessage(name); } catch (e) {} }
    }),

    /* ---- ads: interstitial (v2) ---- */
    showInterstitial: call(function (b) {
      if (!b || !b.advertisement || !b.advertisement.isInterstitialSupported) return Promise.resolve('closed');
      return new Promise(function (resolve) {
        var settled = false;
        var done = function (state) { if (!settled) { settled = true; resolve(state); } };
        var onState = function (state) {
          if (state === 'closed') done('closed');
          else if (state === 'failed') done('failed');
        };
        b.platform.on(b.EVENT_NAME.INTERSTITIAL_STATE_CHANGED, onState);
        try { b.advertisement.showInterstitial(); } catch (e) { done('failed'); }
      });
    }),

    /* ---- ads: rewarded (reward ONLY on 'rewarded') ---- */
    showRewarded: call(function (b) {
      if (!b || !b.advertisement || !b.advertisement.isRewardedSupported) return Promise.resolve('failed');
      return new Promise(function (resolve) {
        var settled = false;
        var done = function (ok) { if (!settled) { settled = true; resolve(ok); } };
        var onState = function (state) {
          if (state === 'rewarded') done('rewarded');
          else if (state === 'closed' || state === 'failed') done('failed');
        };
        /* v2: subscribe on platform event bus */
        b.platform.on(b.EVENT_NAME.REWARDED_STATE_CHANGED, onState);
        try { b.advertisement.showRewarded(); } catch (e) { done('failed'); }
      });
    }),

    /* ---- cloud storage (v2: array API) ---- */
    storageGet: call(function (b, key) {
      if (!b || !b.storage || typeof b.storage.get !== 'function') return Promise.resolve(null);
      return b.storage.get([key]).then(function (data) {
        return (data && data.length > 0 && data[0] != null) ? String(data[0]) : null;
      }).catch(function () { return null; });
    }),

    storageSet: call(function (b, key, value) {
      if (!b || !b.storage || typeof b.storage.set !== 'function') return Promise.resolve();
      return b.storage.set([key], [value]).catch(function () { /* noop */ });
    }),

    /* ---- subscriptions (v2: platform.on) ---- */
    onPause: call(function (b, cb) {
      if (b) { try { b.platform.on(b.EVENT_NAME.PAUSE_STATE_CHANGED, cb); } catch (e) {} }
      return function () {};
    }),

    onResume: call(function (b, cb) {
      if (b) { try { b.platform.on(b.EVENT_NAME.RESUME_STATE_CHANGED, cb); } catch (e) {} }
      return function () {};
    }),

    onAudio: call(function (b, cb) {
      if (b) { try { b.platform.on(b.EVENT_NAME.AUDIO_STATE_CHANGED, cb); } catch (e) {} }
      return function () {};
    }),

    /* ---- audio state from the platform (null when absent) ---- */
    isAudioEnabled: call(function (b) {
      if (!b || !b.platform || typeof b.platform.isAudioEnabled === 'undefined') return null;
      return b.platform.isAudioEnabled;
    }),

    isPaused: call(function (b) {
      if (!b || !b.platform || typeof b.platform.isPaused === 'undefined') return null;
      return b.platform.isPaused;
    }),

    getLanguage: call(function (b) {
      if (b && b.platform && typeof b.platform.language !== 'undefined') return b.platform.language;
      return null;
    }),

    getPlatform: call(function (b) {
      if (b && b.platform && typeof b.platform.id !== 'undefined') return b.platform.id;
      return null;
    })
  };
})();
