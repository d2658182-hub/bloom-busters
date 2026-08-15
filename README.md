# Bloom Busters 🌸🐛

**Drop & Match in a Magic Garden** — a 2D puzzle game built with vanilla JS for
[Playgama](https://playgama.com).

Magic plants float at the top of the garden, pests nibble the flowers at the bottom.
Each plant neutralizes **exactly one** kind of pest — match the element badges and
drop the right plant onto the right bug. **One wrong drop and the level is lost.**

- 🎯 250 levels across 6 worlds (Sprout Meadow → Eternal Bloom)
- 🌊 6 elements (Water, Light, Fire, Wind, Earth, Frost), unlocked progressively
- 💥 Combos, particles, confetti, parallax garden, real music & SFX
- 🛒 Illustrated shop with coins, upgrades and rewarded ads
- 📱 Responsive 9:16 — full screen on phones, centered frame on desktop (no black bars)
- 🎮 Playgama SDK: interstitial (2 runs), rewarded (REVIVE / DOUBLE COINS / WATCH AD),
  cloud save with localStorage fallback

## Play

- **Play** — continue from your current level
- Drag a **plant** (top) onto the **pest** (bottom) whose badge matches
- Match all pests to win — **one mistake = game over** (REVIVE via rewarded ad)

## Tech

Vanilla JS, Canvas 2D, no frameworks. 100% of the visuals & sounds are real
downloaded files (CC0 / CC-BY) — see [CREDITS.md](CREDITS.md).

## Build & run

```bash
python3 -m http.server 8123
# open http://localhost:8123
```

Spec: [SPEC.md](SPEC.md)

---

Made with the [hypercasual-game-template](https://github.com/kingdannydushime1/hypercasual-game-template)
and the **playgama-game-maker** skill.
