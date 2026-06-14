function setLang(lang) {
  document.querySelectorAll('[lang-section]').forEach(el => {
    el.style.display = el.getAttribute('lang-section') === lang ? 'block' : 'none';
  });
  document.querySelectorAll('.lang-toggle button').forEach((btn, i) => {
    btn.classList.toggle('active', (i === 0 && lang === 'fr') || (i === 1 && lang === 'en'));
  });
  try { localStorage.setItem('budget-lang', lang); } catch (e) {}
}

// Restore the visitor's previously chosen language on load.
document.addEventListener('DOMContentLoaded', () => {
  let lang = 'fr';
  try { lang = localStorage.getItem('budget-lang') || 'fr'; } catch (e) {}
  setLang(lang);
});
