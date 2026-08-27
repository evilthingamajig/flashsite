(() => {
  const body = document.body;
  const navBars = [...document.querySelectorAll('.nav-bar')];
  const burgerButtons = [...document.querySelectorAll('.burger-menu')];
  const fullscreen = document.querySelector('.fullscreen-wrapper');
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let menuOpen = false;
  let menuAnimation = null;
  let previousScrollY = Math.max(0, window.scrollY);
  let scrollFrame = 0;

  function setDropdown(entry, open) {
    entry.root.classList.toggle('w--open', open);
    entry.toggle.classList.toggle('w--open', open);
    entry.list.classList.toggle('w--open', open);
    entry.toggle.setAttribute('aria-expanded', String(open));
  }

  const dropdowns = [...document.querySelectorAll('.navbar-menu-dropdown')]
    .map((root) => ({
      root,
      toggle: root.querySelector('.navbar-dropdown-toggle'),
      list: root.querySelector('.navbar-dropdown-list'),
    }))
    .filter((entry) => entry.toggle && entry.list);

  function closeDropdowns(except = null) {
    for (const entry of dropdowns) {
      if (entry !== except) setDropdown(entry, false);
    }
  }

  for (const entry of dropdowns) {
    entry.toggle.setAttribute('role', 'button');
    entry.toggle.setAttribute('tabindex', '0');
    entry.toggle.setAttribute('aria-haspopup', 'true');
    entry.toggle.setAttribute('aria-expanded', 'false');
    const toggle = () => {
      const open = entry.list.classList.contains('w--open');
      closeDropdowns(entry);
      setDropdown(entry, !open);
    };
    entry.toggle.addEventListener('click', toggle);
    entry.toggle.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      } else if (event.key === 'Escape') {
        setDropdown(entry, false);
        entry.toggle.focus({ preventScroll: true });
      }
    });
  }

  function finishMenuState(open) {
    if (!fullscreen) return;
    fullscreen.style.transform = open ? 'translateY(0)' : 'translateY(-100%)';
    fullscreen.style.display = open ? 'block' : 'none';
    fullscreen.style.pointerEvents = open ? 'auto' : 'none';
  }

  function setMenu(open) {
    if (!fullscreen || menuOpen === open) return;
    menuOpen = open;
    body.classList.toggle('burger-menu-open', open);
    body.style.overflow = open ? 'hidden' : '';
    for (const button of burgerButtons) {
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      const lines = button.querySelectorAll('.burger-line');
      lines[0]?.style.setProperty('transform', open ? 'translateY(6px) rotate(45deg)' : 'none');
      lines[1]?.style.setProperty('opacity', open ? '0' : '1');
      lines[2]?.style.setProperty('transform', open ? 'translateY(-6px) rotate(-45deg)' : 'none');
    }
    menuAnimation?.cancel();
    if (open) fullscreen.style.display = 'block';
    if (reducedMotion || !fullscreen.animate) {
      finishMenuState(open);
      return;
    }
    fullscreen.style.pointerEvents = open ? 'auto' : 'none';
    menuAnimation = fullscreen.animate(
      open
        ? [{ transform: 'translateY(-100%)' }, { transform: 'translateY(0)' }]
        : [{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }],
      { duration: open ? 220 : 160, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }
    );
    menuAnimation.finished.then(() => finishMenuState(open)).catch(() => {});
  }

  if (fullscreen) finishMenuState(false);
  for (const line of document.querySelectorAll('.burger-line')) {
    line.style.transition = 'transform 180ms ease, opacity 180ms ease';
  }
  for (const button of burgerButtons) {
    button.addEventListener('click', () => setMenu(!menuOpen));
    button.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setMenu(!menuOpen);
      }
    });
  }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.navbar-menu-dropdown')) closeDropdowns();
    if (menuOpen && event.target.closest('.fullscreen-wrapper a')) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeDropdowns();
    if (menuOpen) {
      setMenu(false);
      burgerButtons[0]?.focus({ preventScroll: true });
    }
  });

  function updateNav() {
    scrollFrame = 0;
    const y = Math.max(0, window.scrollY);
    const movingDown = y > previousScrollY && y > 80;
    for (const nav of navBars) {
      nav.classList.toggle('scrolled', y > 50);
      nav.style.transform = movingDown ? 'translateY(-100%)' : 'translateY(0)';
    }
    previousScrollY = y;
  }
  window.addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateNav);
  }, { passive: true });
  updateNav();

  for (const element of document.querySelectorAll('.year')) {
    element.textContent = String(new Date().getFullYear());
  }

  window.__ffHomeLite = {
    ready: true,
    dependencies: 'native',
    dropdowns: dropdowns.length,
  };
})();
