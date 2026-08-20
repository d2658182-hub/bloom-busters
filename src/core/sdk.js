/* Playgama Bridge v2 adapter.
   The game remains playable without the CDN, while supported hosts use the
   documented platform, advertisement, and storage modules. */

const SDK = (() => {
  const bridgePromise = (typeof window !== 'undefined' && window.bridge
    && typeof window.bridge.initialize === 'function')
    ? Promise.resolve().then(() => window.bridge.initialize())
      .then(() => window.bridge)
      .catch(() => null)
    : Promise.resolve(null);

  const call = (fn, fallback = null) => (...args) => bridgePromise
    .then((bridge) => {
      try { return fn(bridge, ...args); } catch (error) { return fallback; }
    })
    .catch(() => fallback);

  const eventName = (bridge, name) => bridge && bridge.EVENT_NAME
    ? bridge.EVENT_NAME[name]
    : null;

  const subscribe = (bridge, name, callback) => {
    if (!bridge || !bridge.platform || typeof bridge.platform.on !== 'function') return () => {};
    const event = eventName(bridge, name);
    if (!event || typeof callback !== 'function') return () => {};
    try {
      const unsubscribe = bridge.platform.on(event, callback);
      if (typeof unsubscribe === 'function') return unsubscribe;
      if (typeof bridge.platform.off === 'function') return () => bridge.platform.off(event, callback);
    } catch (error) { /* unsupported host */ }
    return () => {};
  };

  const showAd = (kind, placement) => call((bridge) => {
    const advertisement = bridge && bridge.advertisement;
    const supported = advertisement && advertisement[`is${kind}Supported`];
    if (!supported) return Promise.resolve('failed');
    const event = eventName(bridge, `${kind.toUpperCase()}_STATE_CHANGED`);
    if (!event || !bridge.platform || typeof bridge.platform.on !== 'function') {
      return Promise.resolve('failed');
    }
    return new Promise((resolve) => {
      let settled = false;
      let unsubscribe = () => {};
      const finish = (state) => {
        if (settled) return;
        settled = true;
        try { unsubscribe(); } catch (error) { /* noop */ }
        resolve(state);
      };
      const onState = (state) => {
        if (kind === 'Rewarded') {
          if (state === 'rewarded') finish('rewarded');
          else if (state === 'closed' || state === 'failed') finish('failed');
        } else if (state === 'closed' || state === 'failed') {
          finish(state);
        }
      };
      try {
        const registered = bridge.platform.on(event, onState);
        if (typeof registered === 'function') unsubscribe = registered;
        else if (typeof bridge.platform.off === 'function') unsubscribe = () => bridge.platform.off(event, onState);
        const method = kind === 'Rewarded' ? 'showRewarded' : 'showInterstitial';
        const result = placement == null
          ? bridge.advertisement[method]()
          : bridge.advertisement[method](placement);
        if (result && typeof result.catch === 'function') result.catch(() => finish('failed'));
      } catch (error) {
        finish('failed');
      }
    });
  }, 'failed')(placement);

  const storageGet = call((bridge, key) => {
    if (!bridge || !bridge.storage || typeof bridge.storage.get !== 'function') return null;
    return Promise.resolve(bridge.storage.get([key]))
      .then((data) => data && data.length ? data[0] : null)
      .catch(() => null);
  }, null);

  const storageSet = call((bridge, key, value) => {
    if (!bridge || !bridge.storage || typeof bridge.storage.set !== 'function') return Promise.resolve();
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    return Promise.resolve(bridge.storage.set([key], [serialized])).catch(() => {});
  }, undefined);

  return {
    available: () => bridgePromise.then((bridge) => !!bridge),
    isAvailable: () => bridgePromise.then((bridge) => !!bridge),
    gameReady: call((bridge) => {
      if (bridge && bridge.platform && typeof bridge.platform.sendMessage === 'function') {
        bridge.platform.sendMessage('game_ready');
      }
    }, undefined),
    loadingProgress: call((bridge, progress) => {
      if (bridge && typeof bridge.setGameLoadingProgress === 'function') {
        bridge.setGameLoadingProgress(Math.max(0, Math.min(1, Number(progress) || 0)));
      }
    }, undefined),
    levelMessage: call((bridge, name, data) => {
      if (bridge && bridge.platform && typeof bridge.platform.sendMessage === 'function') {
        bridge.platform.sendMessage(name, data);
      }
    }, undefined),
    interstitialSupported: call((bridge) => !!(bridge && bridge.advertisement
      && bridge.advertisement.isInterstitialSupported), false),
    rewardedSupported: call((bridge) => !!(bridge && bridge.advertisement
      && bridge.advertisement.isRewardedSupported), false),
    showInterstitial: (placement) => showAd('Interstitial', placement),
    showRewarded: (placement) => showAd('Rewarded', placement),
    onPause: call((bridge, callback) => subscribe(bridge, 'PAUSE_STATE_CHANGED', callback), () => {}),
    onResume: call((bridge, callback) => subscribe(bridge, 'RESUME_STATE_CHANGED', callback), () => {}),
    onAudio: call((bridge, callback) => subscribe(bridge, 'AUDIO_STATE_CHANGED', callback), () => {}),
    isAudioEnabled: call((bridge) => bridge && bridge.platform
      && typeof bridge.platform.isAudioEnabled !== 'undefined'
      ? bridge.platform.isAudioEnabled : null, null),
    audioEnabled: call((bridge) => bridge && bridge.platform
      && typeof bridge.platform.isAudioEnabled !== 'undefined'
      ? bridge.platform.isAudioEnabled : null, null),
    isPaused: call((bridge) => bridge && bridge.platform
      && typeof bridge.platform.isPaused !== 'undefined'
      ? bridge.platform.isPaused : null, null),
    language: call((bridge) => bridge && bridge.platform && bridge.platform.language
      ? bridge.platform.language : 'en', 'en'),
    storageGet,
    storageSet,
    showRewardedAd: (placement) => showAd('Rewarded', placement)
  };
})();
