/* UI kit — reusable components built with the pack images
   (assets/ui/). Do NOT modify: identical for all games. */

const UI = {
  BUTTONS: {
    primary: 'assets/ui/b_4.png',
    secondary: 'assets/ui/b_5.png',
    back: 'assets/ui/b_2.png',
    square: 'assets/ui/b_8.png'
  },

  setupLoaded(root) {
    const targets = (root || document).querySelectorAll('.btn, .panel');
    targets.forEach(revealWhenReady);
  }
};

function revealWhenReady(el) {
  if (el.classList.contains('ui-ready')) return;
  const finish = () => el.classList.add('ui-ready');
  const img = el.querySelector('img');
  if (img) {
    if (img.complete && img.naturalWidth > 0) return finish();
    img.addEventListener('load', finish, { once: true });
    img.addEventListener('error', finish, { once: true });
    return;
  }
  const background = getComputedStyle(el).backgroundImage;
  const match = background && background.match(/url\("?(.+?)"?\)/);
  if (match) {
    const probe = new Image();
    probe.addEventListener('load', finish);
    probe.addEventListener('error', finish);
    probe.src = match[1];
    return;
  }
  finish();
}

class Button {
  constructor({ label = '', variant = 'primary', onClick = null, icon = null, ariaLabel = null }) {
    this.el = document.createElement('button');
    this.el.type = 'button';
    this.el.className = `btn btn-${variant}`;
    if (ariaLabel) this.el.setAttribute('aria-label', ariaLabel);
    const image = UI.BUTTONS[variant] || UI.BUTTONS.primary;
    this.el.innerHTML = `<img src="${image}" alt="" draggable="false">${icon ? `<span class="btn-icon" aria-hidden="true">${icon}</span>` : ''}<span class="btn-label">${label}</span>`;
    if (onClick) this.el.addEventListener('click', (event) => onClick(event, this));
  }
}

class Panel {
  constructor({ image = 'assets/ui/f.png', className = '' }) {
    this.el = document.createElement('div');
    this.el.className = `panel ${className}`;
    this.el.style.backgroundImage = `url("${image}")`;
    this.content = document.createElement('div');
    this.content.className = 'panel-content';
    this.el.appendChild(this.content);
  }

  add(...children) {
    children.forEach((child) => this.content.appendChild(child.el || child));
  }
}
