const game = new Game(GAME_CONFIG);
game
  .register(new LoadingScreen(game))
  .register(new MenuScreen(game))
  .register(new GameplayScreen(game))
  .register(new PauseScreen(game))
  .register(new GameOverScreen(game))
  .register(new VictoryScreen(game));
if (GAME_CONFIG.features.shop) {
  game.register(new ShopScreen(game));
}
game.start();
