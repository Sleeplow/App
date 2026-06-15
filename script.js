function setLang(lang) {
  document.querySelectorAll('[lang-section]').forEach(el => {
    el.style.display = el.getAttribute('lang-section') === lang ? 'block' : 'none';
  });
  document.querySelectorAll('.lang-toggle button').forEach((btn, i) => {
    btn.classList.toggle('active', (i === 0 && lang === 'fr') || (i === 1 && lang === 'en'));
  });
  try { localStorage.setItem('budget-lang', lang); } catch (e) {}
}

// Make content sections collapsible: only the title shows until tapped.
function setupCollapsibleSections() {
  document.querySelectorAll('.section').forEach(section => {
    if (!section.querySelector('h2')) return;
    section.classList.add('collapsed');
    const title = section.querySelector('h2');
    title.setAttribute('role', 'button');
    title.setAttribute('tabindex', '0');
    const toggle = () => section.classList.toggle('collapsed');
    title.addEventListener('click', toggle);
    title.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
}

// Restore the visitor's previously chosen language on load.
document.addEventListener('DOMContentLoaded', () => {
  let lang = 'fr';
  try { lang = localStorage.getItem('budget-lang') || 'fr'; } catch (e) {}
  setLang(lang);
  setupCollapsibleSections();
});
