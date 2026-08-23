(() => {
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      menu.classList.toggle('open');
    });
    menu.querySelectorAll('a, button').forEach((item) => {
      item.addEventListener('click', () => menu.classList.remove('open'));
    });
  }

  document.querySelectorAll('form').forEach((form) => {
    form.addEventListener('submit', () => {
      const button = form.querySelector('button[type="submit"]');
      if (button && !button.dataset.keepLabel) {
        button.dataset.originalText = button.textContent;
        button.textContent = 'Working…';
        button.disabled = true;
      }
    });
  });
})();
