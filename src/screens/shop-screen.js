/* Shop — every item is ILLUSTRATED (real icon + name + desc + price +
   BUY + WATCH AD on >=50% of items). Coins + owned state, en-US. */

class ShopScreen extends BaseScreen {
  constructor(game) {
    super(game, 'shop');
  }

  build() {
    const items = this.game.config.shop.items;

    this.el = document.createElement('div');
    this.el.className = 'screen shop-screen';
    this.el.style.backgroundImage = `url("${this.game.config.backgrounds.menu}")`;

    const panel = new Panel({ image: 'assets/ui/f.png' });
    panel.add(
      this.titleEl('SHOP'),
      this.coinsEl(),
      this.itemsEl(items),
      this.backButton()
    );
    this.el.appendChild(panel.el);

    this.onKeyDown((event) => {
      if (event.code === 'Escape') this.game.show('menu');
    });
  }

  titleEl(text) {
    const h = document.createElement('h2');
    h.className = 'modal-title';
    h.textContent = text;
    return h;
  }

  coinsEl() {
    const row = document.createElement('div');
    row.className = 'shop-coins';
    row.innerHTML = `<img src="assets/ui/c.png" alt="" draggable="false"><span>${this.getCoins()}</span>`;
    return row;
  }

  itemsEl(items) {
    const list = document.createElement('div');
    list.className = 'shop-list';
    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'shop-item';
      row.innerHTML = `
        <img class="shop-item-icon" src="${item.icon}" alt="" draggable="false">
        <div class="shop-item-info">
          <div class="shop-item-name">${item.name}</div>
          <div class="shop-item-desc">${item.desc}</div>
          <div class="shop-item-price"><img src="assets/ui/c.png" alt="" draggable="false">${item.price.toLocaleString('en-US')}</div>
        </div>
      `;
      const actions = document.createElement('div');
      actions.className = 'shop-item-actions';
      const buyButton = new Button({
        label: 'BUY',
        variant: 'secondary',
        onClick: () => this.buy(item, buyButton)
      });
      actions.appendChild(buyButton.el);
      if (item.watchAd) {
        const adButton = new Button({
          label: 'WATCH AD',
          variant: 'back',
          onClick: () => this.watchAd(item, adButton)
        });
        actions.appendChild(adButton.el);
      }
      row.appendChild(actions);
      list.appendChild(row);
    });
    return list;
  }

  backButton() {
    return new Button({
      label: 'BACK',
      variant: 'back',
      onClick: () => this.game.show('menu')
    });
  }

  enter() {
    this.game.audio.playMusic('menu');
    this.refreshAll();
  }

  getCoins() {
    return this.game.getCoins().toLocaleString('en-US');
  }

  refreshCoins() {
    const value = this.el.querySelector('.shop-coins span');
    if (value) value.textContent = this.getCoins();
  }

  refreshAll() {
    this.refreshCoins();
    const owned = this.game.getItems();
    this.el.querySelectorAll('.shop-item').forEach((row, i) => {
      const item = this.game.config.shop.items[i];
      if (!item) return;
      if (owned.includes(item.id)) {
        row.classList.add('owned');
        const buttons = row.querySelectorAll('.btn');
        buttons.forEach((b) => { b.style.display = 'none'; });
        const label = document.createElement('span');
        label.className = 'shop-owned-label';
        label.textContent = 'OWNED ✔';
        row.appendChild(label);
      }
    });
  }

  buy(item, button) {
    if (this.game.hasItem(item.id)) return;
    if (this.game.spendCoins(item.price)) {
      this.game.addItem(item.id);
      this.game.audio.confirm();
      button.el.querySelector('.btn-label').textContent = '✔';
      this.refreshAll();
    } else {
      this.game.audio.wrong();
      const price = button.el.closest('.shop-item').querySelector('.shop-item-price');
      if (price) {
        price.classList.remove('price-shake');
        void price.offsetWidth;
        price.classList.add('price-shake');
      }
    }
  }

  async watchAd(item, button) {
    if (this.game.hasItem(item.id)) return;
    if (typeof SDK === 'undefined') return;
    this.game.audio.click();
    const state = await SDK.showRewarded();
    if (state === 'rewarded') {
      this.game.addItem(item.id);
      this.game.audio.confirm();
      button.el.querySelector('.btn-label').textContent = '✔';
      this.refreshAll();
    }
    /* on 'closed'/'failed': no item, coins untouched */
  }
}
