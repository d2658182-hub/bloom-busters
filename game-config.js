/* ============================================================
   BLOOM BUSTERS — GAME CONFIGURATION
   Deduction garden: pieces at the top neutralize pieces at the
   bottom — but every level hides its OWN matching logic.
   All visuals/audio are REAL downloaded CC0 files (see CREDITS.md).
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
      /* element badges (plant family) */
      'assets/game/badge-water.png', 'assets/game/badge-light.png',
      'assets/game/badge-fire.png',  'assets/game/badge-wind.png',
      'assets/game/badge-earth.png', 'assets/game/badge-frost.png',
      /* tutorial hand */
      'assets/ui/tutorial-hand.png',
      /* shop icons */
      'assets/game/shop-bloom-bonus.png',
      'assets/game/shop-double.png',
      'assets/game/shop-mega-seeds.png',
      'assets/game/shop-extra-heart.png',
      /* particles */
      'assets/particles/star_01.png', 'assets/particles/star_03.png',
      'assets/particles/star_05.png', 'assets/particles/star_07.png',
      'assets/particles/star_09.png',
      'assets/particles/spark_01.png', 'assets/particles/spark_03.png',
      'assets/particles/spark_05.png',
      'assets/particles/circle_01.png', 'assets/particles/circle_03.png',
      'assets/particles/magic_01.png', 'assets/particles/magic_02.png',
      'assets/particles/magic_05.png',
      /* plant family (objects + pests) */
      'assets/game/plant-water-1.png', 'assets/game/plant-water-2.png',
      'assets/game/plant-light-1.png', 'assets/game/plant-light-2.png',
      'assets/game/plant-fire-1.png',  'assets/game/plant-fire-2.png',
      'assets/game/plant-wind-1.png',  'assets/game/plant-wind-2.png',
      'assets/game/plant-earth-1.png', 'assets/game/plant-earth-2.png',
      'assets/game/plant-frost-1.png', 'assets/game/plant-frost-2.png',
      'assets/game/pest-bee-1.png', 'assets/game/pest-bee-2.png',
      'assets/game/pest-bee-3.png', 'assets/game/pest-bee-4.png',
      'assets/game/pest-bee-5.png', 'assets/game/pest-bee-6.png',
      'assets/game/pest-fly-1.png',  'assets/game/pest-fly-2.png',
      'assets/game/pest-spider.png',
      'assets/game/pest-orange-spider.png',
      'assets/game/pest-slug.png',
      'assets/game/pest-snail.png',
      /* piece families (generated) */
      'assets/game/pieces/animal/animal_elephant.png',
      'assets/game/pieces/animal/animal_giraffe.png',
      'assets/game/pieces/animal/animal_hippo.png',
      'assets/game/pieces/animal/animal_monkey.png',
      'assets/game/pieces/animal/animal_panda.png',
      'assets/game/pieces/animal/animal_parrot.png',
      'assets/game/pieces/animal/animal_penguin.png',
      'assets/game/pieces/animal/animal_pig.png',
      'assets/game/pieces/animal/animal_rabbit.png',
      'assets/game/pieces/animal/animal_snake.png',
      'assets/game/pieces/domino/domino_gingerbread_0_0.png',
      'assets/game/pieces/domino/domino_gingerbread_0_1.png',
      'assets/game/pieces/domino/domino_gingerbread_0_2.png',
      'assets/game/pieces/domino/domino_gingerbread_0_3.png',
      'assets/game/pieces/domino/domino_gingerbread_1_3.png',
      'assets/game/pieces/domino/domino_gingerbread_1_4.png',
      'assets/game/pieces/domino/domino_gingerbread_2_4.png',
      'assets/game/pieces/domino/domino_gingerbread_2_5.png',
      'assets/game/pieces/domino/domino_gingerbread_3_5.png',
      'assets/game/pieces/domino/domino_hearts_0_0.png',
      'assets/game/pieces/domino/domino_hearts_0_1.png',
      'assets/game/pieces/domino/domino_hearts_0_2.png',
      'assets/game/pieces/domino/domino_hearts_0_3.png',
      'assets/game/pieces/domino/domino_hearts_1_3.png',
      'assets/game/pieces/domino/domino_hearts_1_4.png',
      'assets/game/pieces/domino/domino_hearts_2_4.png',
      'assets/game/pieces/domino/domino_hearts_2_5.png',
      'assets/game/pieces/domino/domino_hearts_3_5.png',
      'assets/game/pieces/domino/domino_stars_0_0.png',
      'assets/game/pieces/domino/domino_stars_0_1.png',
      'assets/game/pieces/domino/domino_stars_0_2.png',
      'assets/game/pieces/domino/domino_stars_0_3.png',
      'assets/game/pieces/domino/domino_stars_1_3.png',
      'assets/game/pieces/domino/domino_stars_1_4.png',
      'assets/game/pieces/domino/domino_stars_2_4.png',
      'assets/game/pieces/domino/domino_stars_2_5.png',
      'assets/game/pieces/domino/domino_stars_3_5.png',
      'assets/game/pieces/fruit/fruit_apple.png',
      'assets/game/pieces/fruit/fruit_banana.png',
      'assets/game/pieces/fruit/fruit_blackberries.png',
      'assets/game/pieces/fruit/fruit_blueberries.png',
      'assets/game/pieces/fruit/fruit_cherries.png',
      'assets/game/pieces/fruit/fruit_coconut_01.png',
      'assets/game/pieces/fruit/fruit_grapes.png',
      'assets/game/pieces/fruit/fruit_kiwi.png',
      'assets/game/pieces/fruit/fruit_lemon.png',
      'assets/game/pieces/fruit/fruit_olive.png',
      'assets/game/pieces/fruit/fruit_orange.png',
      'assets/game/pieces/fruit/fruit_pear.png',
      'assets/game/pieces/fruit/fruit_pineapple_01.png',
      'assets/game/pieces/fruit/fruit_plum.png',
      'assets/game/pieces/fruit/fruit_raspberries.png',
      'assets/game/pieces/fruit/fruit_strawberry.png',
      'assets/game/pieces/gem/gem_black_04.png',
      'assets/game/pieces/gem/gem_black_05.png',
      'assets/game/pieces/gem/gem_black_06.png',
      'assets/game/pieces/gem/gem_black_07.png',
      'assets/game/pieces/gem/gem_blue_04.png',
      'assets/game/pieces/gem/gem_blue_05.png',
      'assets/game/pieces/gem/gem_blue_06.png',
      'assets/game/pieces/gem/gem_blue_07.png',
      'assets/game/pieces/gem/gem_green_04.png',
      'assets/game/pieces/gem/gem_green_05.png',
      'assets/game/pieces/gem/gem_green_06.png',
      'assets/game/pieces/gem/gem_green_07.png',
      'assets/game/pieces/gem/gem_grey_04.png',
      'assets/game/pieces/gem/gem_grey_05.png',
      'assets/game/pieces/gem/gem_grey_06.png',
      'assets/game/pieces/gem/gem_grey_07.png',
      'assets/game/pieces/gem/gem_orange_04.png',
      'assets/game/pieces/gem/gem_orange_05.png',
      'assets/game/pieces/gem/gem_orange_06.png',
      'assets/game/pieces/gem/gem_orange_07.png',
      'assets/game/pieces/gem/gem_pink_04.png',
      'assets/game/pieces/gem/gem_pink_05.png',
      'assets/game/pieces/gem/gem_pink_06.png',
      'assets/game/pieces/gem/gem_pink_07.png',
      'assets/game/pieces/gem/gem_red_04.png',
      'assets/game/pieces/gem/gem_red_05.png',
      'assets/game/pieces/gem/gem_red_06.png',
      'assets/game/pieces/gem/gem_red_07.png',
      'assets/game/pieces/gem/gem_yellow_04.png',
      'assets/game/pieces/gem/gem_yellow_05.png',
      'assets/game/pieces/gem/gem_yellow_06.png',
      'assets/game/pieces/gem/gem_yellow_07.png',
      'assets/game/pieces/symbol/symbol_arrowDown.png',
      'assets/game/pieces/symbol/symbol_arrowLeft.png',
      'assets/game/pieces/symbol/symbol_arrowRight.png',
      'assets/game/pieces/symbol/symbol_arrowUp.png',
      'assets/game/pieces/symbol/symbol_checkmark.png',
      'assets/game/pieces/symbol/symbol_cross.png',
      'assets/game/pieces/symbol/symbol_exclamation.png',
      'assets/game/pieces/symbol/symbol_gear.png',
      'assets/game/pieces/symbol/symbol_locked.png',
      'assets/game/pieces/symbol/symbol_medal1.png',
      'assets/game/pieces/symbol/symbol_medal2.png',
      'assets/game/pieces/symbol/symbol_minus.png',
      'assets/game/pieces/symbol/symbol_musicOff.png',
      'assets/game/pieces/symbol/symbol_musicOn.png',
      'assets/game/pieces/symbol/symbol_plus.png',
      'assets/game/pieces/symbol/symbol_power.png',
      'assets/game/pieces/symbol/symbol_question.png',
      'assets/game/pieces/symbol/symbol_star.png',
      'assets/game/pieces/symbol/symbol_target.png',
      'assets/game/pieces/symbol/symbol_trophy.png',
      'assets/game/pieces/symbol/symbol_unlocked.png',
      'assets/game/pieces/symbol/symbol_warning.png',
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

  /* ----- shop items (no direct hints: deduction is the game) ----- */
  shop: {
    items: [
      { id: 'bloom-bonus', name: 'Bloom Bonus',  price: 150, icon: 'assets/game/shop-bloom-bonus.png', watchAd: true,
        desc: '+25% coins per win' },
      { id: 'double',      name: 'Double Bloom', price: 600, icon: 'assets/game/shop-double.png',      watchAd: true,
        desc: 'Double coins per win' },
      { id: 'mega-seeds',  name: 'Mega Seeds',   price: 1000, icon: 'assets/game/shop-mega-seeds.png', watchAd: false,
        desc: 'Start combos at x2' },
      { id: 'extra-heart', name: 'Extra Heart',  price: 800, icon: 'assets/game/shop-extra-heart.png', watchAd: true,
        desc: '+1 heart every level' }
    ]
  },

  /* ----- gameplay HUD ----- */
  hud: {
    showScore: true,
    showHearts: true,
    hearts: 5
  },

  /* ----- deduction rules (see src/pieces-data.js for rule metadata) ----- */
  /* every level hides ONE rule; the player deduces it by testing drops */

  /* piece count curve */
  totalLevels: 250,
  worlds: [
    { name: 'Sprout Meadow',   levels: 40, families: ['plant'],  objectives: ['clear'],                    bossEvery: 10 },
    { name: 'Fruit Grove',     levels: 40, families: ['fruit'],  objectives: ['clear', 'score', 'time'],    bossEvery: 10 },
    { name: 'Creature Hollow', levels: 40, families: ['animal'], objectives: ['clear', 'score', 'time'],    bossEvery: 10 },
    { name: 'Crystal Falls',   levels: 40, families: ['gem', 'symbol'], objectives: ['clear', 'score', 'time', 'collect'], bossEvery: 10 },
    { name: 'Pattern Caverns', levels: 40, families: ['domino'], objectives: ['clear', 'score', 'time', 'collect', 'protect'], bossEvery: 10 },
    { name: 'Eternal Bloom',   levels: 50, families: ['plant', 'fruit', 'animal', 'gem', 'symbol', 'domino'], objectives: ['clear', 'score', 'time', 'collect', 'protect'], bossEvery: 10 }
  ],
  maxPests: 8,
  pestStep: 12,

  /* hearts: the deduction budget. A wrong drop costs one heart. */
  hearts: {
    max: 5,
    extraHeartBonus: 1
  },

  /* combo tools: every 3 consecutive correct matches grants one */
  tools: {
    comboEvery: 3,
    bombTargets: 2
  },

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
    milestoneBonus: 10,
    starBonus: 5
  }
};
