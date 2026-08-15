/* ============================================================
   BLOOM BUSTERS — GAME CONFIGURATION
   Drop & Match in a Magic Garden.
   All visuals/audio are REAL downloaded files (see CREDITS.md).
   ============================================================ */

const GAME_CONFIG = {
  id: 'bloom-busters',
  firstScreen: 'loading',
  playTarget: 'gameplay',

  /* ----- game identity ----- */
  title: 'BLOOM BUSTERS',

  /* ----- loading screen: every image + audio the game uses ----- */
  loading: {
    loadTarget: 'menu',
    assets: [
      /* backgrounds */
      'assets/screens/menu-bg.png',
      'assets/screens/gameplay-bg.png',
      /* parallax layers */
      'assets/game/clouds-top.png',
      'assets/game/clouds-mid.png',
      'assets/game/ground-tile.png',
      /* objects (plants, 2 frames each) */
      'assets/game/plant-water-1.png', 'assets/game/plant-water-2.png',
      'assets/game/plant-light-1.png', 'assets/game/plant-light-2.png',
      'assets/game/plant-fire-1.png',  'assets/game/plant-fire-2.png',
      'assets/game/plant-wind-1.png',  'assets/game/plant-wind-2.png',
      'assets/game/plant-earth-1.png', 'assets/game/plant-earth-2.png',
      'assets/game/plant-frost-1.png', 'assets/game/plant-frost-2.png',
      /* pests */
      'assets/game/pest-bee-1.png', 'assets/game/pest-bee-2.png',
      'assets/game/pest-bee-3.png', 'assets/game/pest-bee-4.png',
      'assets/game/pest-bee-5.png', 'assets/game/pest-bee-6.png',
      'assets/game/pest-fly-1.png',  'assets/game/pest-fly-2.png',
      'assets/game/pest-spider.png',
      'assets/game/pest-orange-spider.png',
      'assets/game/pest-slug.png',
      'assets/game/pest-snail.png',
      /* element badges */
      'assets/game/badge-water.png', 'assets/game/badge-light.png',
      'assets/game/badge-fire.png',  'assets/game/badge-wind.png',
      'assets/game/badge-earth.png', 'assets/game/badge-frost.png',
      /* shop icons */
      'assets/game/shop-bloom-bonus.png',
      'assets/game/shop-hint.png',
      'assets/game/shop-double.png',
      'assets/game/shop-mega-seeds.png',
      /* particles */
      'assets/particles/star_01.png', 'assets/particles/star_03.png',
      'assets/particles/star_05.png', 'assets/particles/star_07.png',
      'assets/particles/star_09.png',
      'assets/particles/spark_01.png', 'assets/particles/spark_03.png',
      'assets/particles/spark_05.png',
      'assets/particles/circle_01.png', 'assets/particles/circle_03.png',
      'assets/particles/magic_01.png', 'assets/particles/magic_02.png',
      'assets/particles/magic_05.png',
      /* audio */
      'assets/audio/menu.ogg',
      'assets/audio/gameplay.ogg',
      'assets/audio/victory.ogg',
      'assets/audio/gameover.ogg',
      'assets/audio/sfx-click.ogg',
      'assets/audio/sfx-drop.ogg',
      'assets/audio/sfx-match.ogg',
      'assets/audio/sfx-destroy.ogg',
      'assets/audio/sfx-wrong.ogg',
      'assets/audio/sfx-milestone.ogg',
      'assets/audio/sfx-confirm.ogg'
    ]
  },

  /* ----- backgrounds ----- */
  backgrounds: {
    menu: 'assets/screens/menu-bg.png',
    gameplay: 'assets/screens/gameplay-bg.png'
  },

  /* ----- features ----- */
  features: {
    shop: true
  },

  /* ----- shop items (illustrated: image + name + price + BUY + WATCH AD) ----- */
  shop: {
    items: [
      { id: 'bloom-bonus', name: 'Bloom Bonus',  price: 150, icon: 'assets/game/shop-bloom-bonus.png', watchAd: true,
        desc: '+25% coins per win' },
      { id: 'hint',        name: 'Hint Sprite',  price: 300, icon: 'assets/game/shop-hint.png',        watchAd: false,
        desc: '3 hints per level' },
      { id: 'double',      name: 'Double Bloom', price: 600, icon: 'assets/game/shop-double.png',      watchAd: true,
        desc: 'Double coins per win' },
      { id: 'mega-seeds',  name: 'Mega Seeds',   price: 1000, icon: 'assets/game/shop-mega-seeds.png', watchAd: false,
        desc: 'Start combos at x2' }
    ]
  },

  /* ----- gameplay HUD ----- */
  hud: {
    showScore: true,
    showHearts: false,
    hearts: 3
  },

  /* ----- elements (order of unlock) ----- */
  elements: ['water', 'light', 'fire', 'wind', 'earth', 'frost'],

  /* fixed pest sprite per element */
  pestSprites: {
    water: ['pest-bee-1.png', 'pest-bee-2.png', 'pest-bee-3.png', 'pest-bee-4.png', 'pest-bee-5.png', 'pest-bee-6.png'],
    light: ['pest-snail.png'],
    fire:  ['pest-fly-1.png', 'pest-fly-2.png'],
    wind:  ['pest-spider.png'],
    earth: ['pest-orange-spider.png'],
    frost: ['pest-slug.png']
  },

  /* level curve */
  totalLevels: 250,
  worlds: [
    { name: 'Sprout Meadow',  levels: 40, unlock: 2 },
    { name: 'Ember Grove',    levels: 40, unlock: 3 },
    { name: 'Gale Falls',     levels: 40, unlock: 4 },
    { name: 'Stone Hollow',   levels: 40, unlock: 5 },
    { name: 'Frost Caverns',  levels: 40, unlock: 6 },
    { name: 'Eternal Bloom',  levels: 50, unlock: 6 }
  ],
  maxPests: 8,
  pestStep: 12,

  /* audio files */
  audio: {
    music: {
      menu: 'assets/audio/menu.ogg',
      gameplay: 'assets/audio/gameplay.ogg',
      victory: 'assets/audio/victory.ogg',
      gameover: 'assets/audio/gameover.ogg'
    },
    sfx: {
      click: 'assets/audio/sfx-click.ogg',
      drop: 'assets/audio/sfx-drop.ogg',
      match: 'assets/audio/sfx-match.ogg',
      destroy: 'assets/audio/sfx-destroy.ogg',
      wrong: 'assets/audio/sfx-wrong.ogg',
      milestone: 'assets/audio/sfx-milestone.ogg',
      confirm: 'assets/audio/sfx-confirm.ogg'
    }
  },

  /* economy */
  economy: {
    winBase: 20,
    winPerLevel: 0.2,
    lossConsolation: 10,
    milestoneBonus: 10
  }
};
