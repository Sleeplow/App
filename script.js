/* ───────────────────── Clickjacking guard (F6) ───────────────────────
   GitHub Pages can't send X-Frame-Options or CSP frame-ancestors, so this is
   a best-effort defense: if the page is loaded inside a cross-origin frame,
   break out of it. Harmless when the page is not framed. */
(function () {
  try {
    if (window.top && window.self !== window.top) {
      window.top.location = window.self.location.href;
    }
  } catch (e) {
    // Cross-origin parent blocked the navigation → hide content as a fallback.
    document.documentElement.style.visibility = 'hidden';
  }
})();

/* ───────────────────────── App registry ─────────────────────────
   One entry per app. To add an app:
     1. create its folder (e.g. budget/) with help/privacy/contact pages,
     2. add a [data-app="id"] theme block (light + dark) in styles.css,
     3. add an entry below.
   The home-page carousel renders itself from this list automatically.
   `name`/`tagline`/`footer`/card text may be a string or a {fr, en} object. */

const APPS = [
  {
    id: 'budget',
    name: 'Budget',
    tagline: { fr: 'par Sleeplow', en: 'by Sleeplow' },
    footer: {
      fr: 'Budget — application iOS de gestion budgétaire personnelle',
      en: 'Budget — personal finance iOS application'
    },
    cards: {
      fr: [
        { icon: '📖', title: 'Aide & fonctionnalités', desc: "Apprenez à utiliser toutes les fonctions de l'application", href: './budget/help.html' },
        { icon: '🔒', title: 'Politique de confidentialité', desc: 'Comment vos données sont traitées et protégées', href: './budget/privacy.html' },
        { icon: '✉️', title: 'Contact & signaler un bug', desc: 'Une question, une suggestion ou un problème ?', href: './budget/contact.html' }
      ],
      en: [
        { icon: '📖', title: 'Help & Features', desc: "Learn how to use all of the app's features", href: './budget/help.html' },
        { icon: '🔒', title: 'Privacy Policy', desc: 'How your data is handled and protected', href: './budget/privacy.html' },
        { icon: '✉️', title: 'Contact & Report a Bug', desc: 'A question, a suggestion or a problem?', href: './budget/contact.html' }
      ]
    }
  },

  {
    id: 'storage',
    name: 'Storage',
    tagline: { fr: 'par Sleeplow · Français & English', en: 'by Sleeplow · Français & English' },
    footer: {
      fr: 'Storage — application iOS de gestion d\'inventaire · Disponible en français et en anglais',
      en: 'Storage — iOS inventory management application · Available in French and English'
    },
    cards: {
      fr: [
        { icon: '📖', title: 'Aide & fonctionnalités', desc: "Apprenez à utiliser toutes les fonctions de l'application", href: './storage/help.html' },
        { icon: '🔒', title: 'Politique de confidentialité', desc: 'Comment vos données sont traitées et protégées', href: './storage/privacy.html' },
        { icon: '✉️', title: 'Contact & signaler un bug', desc: 'Une question, une suggestion ou un problème ?', href: './storage/contact.html' }
      ],
      en: [
        { icon: '📖', title: 'Help & Features', desc: "Learn how to use all of the app's features", href: './storage/help.html' },
        { icon: '🔒', title: 'Privacy Policy', desc: 'How your data is handled and protected', href: './storage/privacy.html' },
        { icon: '✉️', title: 'Contact & Report a Bug', desc: 'A question, a suggestion or a problem?', href: './storage/contact.html' }
      ]
    }
  }
];

/* ─────────────────────── Carousel state ─────────────────────── */

let current = 0;
let currentLang = 'fr';

// Resolve a string-or-{fr,en} value for the active language. Falls back to the
// French value (then empty) if the requested language is missing, so a typo in
// the APPS registry can never blank out or crash the page.
function t(value, lang) {
  if (value && typeof value === 'object') return value[lang] ?? value.fr ?? '';
  return value ?? '';
}

// Safe element builder. textContent never interprets HTML, so app/card data
// cannot inject markup or scripts — this is the core of the F1 fix.
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// Only allow safe href schemes (relative paths, https, mailto). Anything else
// (e.g. a "javascript:" URI) is rejected so card data can never become a link
// that executes code.
function safeHref(href) {
  return typeof href === 'string' && /^(?:\.?\/|https:\/\/|mailto:)/i.test(href)
    ? href : null;
}

function buildCard(card) {
  const href = safeHref(card.href);
  const root = el(href ? 'a' : 'div', href ? 'menu-card' : 'menu-card soon');
  if (href) root.setAttribute('href', href);

  root.appendChild(el('span', 'menu-icon', card.icon));

  const text = el('span', 'menu-text');
  text.appendChild(el('h2', null, card.title));
  text.appendChild(el('p', null, card.desc));
  root.appendChild(text);

  root.appendChild(card.soon
    ? el('span', 'soon-badge', card.soon)
    : el('span', 'menu-arrow', '›'));
  return root;
}

function renderTrack(lang) {
  const track = document.getElementById('carousel-track');
  track.replaceChildren(...APPS.map(app => {
    const slide = el('div', 'slide');
    const menu = el('nav', 'menu');
    // Fall back to the French cards if a language key is missing on an app.
    const cards = (app.cards && (app.cards[lang] || app.cards.fr)) || [];
    cards.forEach(card => menu.appendChild(buildCard(card)));
    slide.appendChild(menu);
    slide.appendChild(el('p', 'updated', t(app.footer, lang)));
    return slide;
  }));
}

function renderDots(lang) {
  const dots = document.getElementById('carousel-dots');
  if (APPS.length < 2) { dots.hidden = true; return; }
  dots.hidden = false;
  dots.replaceChildren(...APPS.map((app, i) => {
    const dot = el('button', 'dot' + (i === current ? ' active' : ''));
    dot.type = 'button';
    dot.setAttribute('aria-label', t(app.name, lang));
    dot.addEventListener('click', () => goTo(i));
    return dot;
  }));
}

// Update the header (icon/name/tagline) and theme to the current app.
function updateHeader(lang) {
  const app = APPS[current];
  document.documentElement.setAttribute('data-app', app.id);
  const name = document.getElementById('app-name');
  const tagline = document.getElementById('app-tagline');
  const logo = document.getElementById('app-logo');
  if (name) name.textContent = t(app.name, lang);
  if (tagline) tagline.textContent = t(app.tagline, lang);
  if (logo) logo.setAttribute('aria-label', t(app.name, lang));
  updateAppMenuActiveState();
}

// Slide the track and refresh dots/arrow states for the current index.
function updatePosition() {
  const track = document.getElementById('carousel-track');
  if (track) {
    track.style.transform = `translateX(-${current * 100}%)`;
    // Keep off-screen slides out of the tab order and the accessibility tree:
    // their links must not be focusable while hidden.
    track.querySelectorAll('.slide').forEach((slide, i) => {
      const active = i === current;
      slide.inert = !active;
      slide.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
  }
  document.querySelectorAll('.carousel-dots .dot').forEach((dot, i) =>
    dot.classList.toggle('active', i === current));
  const prev = document.querySelector('.carousel-arrow.prev');
  const next = document.querySelector('.carousel-arrow.next');
  if (prev) prev.disabled = current === 0;
  if (next) next.disabled = current === APPS.length - 1;
}

function goTo(index) {
  current = Math.max(0, Math.min(APPS.length - 1, index));
  updateHeader(currentLang);
  updatePosition();
}

// Full (re)render — called on first load and whenever the language changes.
function renderCarousel(lang) {
  currentLang = lang;
  renderTrack(lang);
  renderDots(lang);
  updateHeader(lang);
  updatePosition();
}

// Wire the static controls (arrows, keyboard, swipe) once.
function setupCarousel() {
  const carousel = document.querySelector('.carousel');
  if (!carousel) return;

  const prev = carousel.querySelector('.carousel-arrow.prev');
  const next = carousel.querySelector('.carousel-arrow.next');
  if (prev) prev.addEventListener('click', () => goTo(current - 1));
  if (next) next.addEventListener('click', () => goTo(current + 1));

  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') goTo(current - 1);
    else if (e.key === 'ArrowRight') goTo(current + 1);
  });

  let startX = null;
  const viewport = carousel.querySelector('.carousel-viewport');
  viewport.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  viewport.addEventListener('touchend', e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
    startX = null;
  });

  // A single app has nothing to navigate.
  if (APPS.length < 2) carousel.querySelectorAll('.carousel-arrow').forEach(a => { a.hidden = true; });
}

/* ─────────────────── App menu (hamburger, every page) ───────────────────
   Lets any page jump straight to another app instead of stepping through
   the carousel one slide at a time. On the home page it just moves the
   carousel in place; on a sub-page it links to that app's home slide. */

// data-app on the item scopes the app's own [data-app="id"] theme block
// (--accent, --app-logo…) to it, so each entry renders in its app's colors.
function buildAppMenuItem(app, lang, onHome) {
  const item = el('a', 'app-menu-item');
  const back = document.querySelector('.back-link');
  const base = onHome ? '' : (back ? back.getAttribute('href').split('?')[0] : '../index.html');
  item.setAttribute('href', `${base}?app=${encodeURIComponent(app.id)}`);
  item.setAttribute('data-app', app.id);
  item.dataset.appId = app.id;
  item.appendChild(el('span', 'app-menu-icon'));
  item.appendChild(el('span', 'app-menu-label', t(app.name, lang)));
  item.addEventListener('click', e => {
    if (onHome) {
      e.preventDefault();
      const idx = APPS.findIndex(a => a.id === app.id);
      if (idx !== -1) goTo(idx);
    }
    closeAppMenu();
  });
  return item;
}

function renderAppMenu(lang) {
  const menu = document.getElementById('app-menu');
  if (!menu) return;
  const onHome = !!document.querySelector('.carousel');
  menu.replaceChildren(...APPS.map(app => buildAppMenuItem(app, lang, onHome)));
  updateAppMenuActiveState();
}

// Highlight whichever app the page (or carousel slide) is currently showing.
function updateAppMenuActiveState() {
  const menu = document.getElementById('app-menu');
  if (!menu) return;
  const activeId = document.documentElement.getAttribute('data-app');
  menu.querySelectorAll('.app-menu-item').forEach(item => {
    const active = item.dataset.appId === activeId;
    item.classList.toggle('active', active);
    item.setAttribute('aria-current', active ? 'page' : 'false');
  });
}

function closeAppMenu() {
  const menu = document.getElementById('app-menu');
  const toggle = document.querySelector('.menu-toggle');
  if (menu) menu.hidden = true;
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

function setupAppMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('app-menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', e => {
    e.stopPropagation();
    const willOpen = menu.hidden;
    menu.hidden = !willOpen;
    toggle.setAttribute('aria-expanded', String(willOpen));
  });
  document.addEventListener('click', e => {
    if (!menu.hidden && !menu.contains(e.target) && e.target !== toggle) closeAppMenu();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) {
      closeAppMenu();
      toggle.focus();
    }
  });
}

/* ─────────────────────── Language + content ─────────────────────── */

function setLang(lang) {
  // Keep <html lang> in sync so screen readers use the right pronunciation.
  document.documentElement.lang = lang;
  document.querySelectorAll('[lang-section]').forEach(sec => {
    sec.style.display = sec.getAttribute('lang-section') === lang ? 'block' : 'none';
  });
  // The <title> (browser tab / window title) isn't a [lang-section], so it
  // needs its own translation via data-title-fr/data-title-en attributes.
  const titleEl = document.querySelector('title');
  if (titleEl && titleEl.dataset.titleFr && titleEl.dataset.titleEn) {
    document.title = lang === 'en' ? titleEl.dataset.titleEn : titleEl.dataset.titleFr;
  }
  document.querySelectorAll('.lang-switch button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  try { localStorage.setItem('sleeplow-lang', lang); } catch (e) {}
  // App menu labels are language-specific on every page.
  renderAppMenu(lang);
  // Carousel cards are language-specific, so re-render them in place.
  if (document.querySelector('.carousel')) renderCarousel(lang);
}

// Wire the FR/EN buttons (present on every page) via addEventListener instead
// of inline onclick attributes, so a strict `script-src 'self'` CSP works (F3).
function setupLangSwitch() {
  document.querySelectorAll('.lang-switch button[data-lang]').forEach(btn =>
    btn.addEventListener('click', () => setLang(btn.dataset.lang)));
}

// Make content sections collapsible: only the title shows until tapped.
function setupCollapsibleSections() {
  document.querySelectorAll('.section').forEach(section => {
    if (!section.querySelector('h2')) return;
    section.classList.add('collapsed');
    const title = section.querySelector('h2');
    title.setAttribute('role', 'button');
    title.setAttribute('tabindex', '0');
    title.setAttribute('aria-expanded', 'false');
    const toggle = () => {
      const collapsed = section.classList.toggle('collapsed');
      title.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    };
    title.addEventListener('click', toggle);
    title.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
}

// Restore language: URL param (?lang=fr/en) takes priority, then localStorage, then default fr.
document.addEventListener('DOMContentLoaded', () => {
  let lang = 'fr';
  const urlLang = new URLSearchParams(window.location.search).get('lang');
  if (urlLang === 'fr' || urlLang === 'en') {
    lang = urlLang;
  } else {
    // F4: validate the stored value against a whitelist before using it as a
    // language key — a corrupted value would otherwise break the render.
    // Read the current key, falling back to the legacy 'budget-lang' key.
    try {
      const stored = localStorage.getItem('sleeplow-lang') ||
                     localStorage.getItem('budget-lang');
      if (stored === 'fr' || stored === 'en') lang = stored;
    } catch (e) {}
  }
  // Set initial carousel position from ?app= URL param (e.g. ?app=storage)
  const urlApp = new URLSearchParams(window.location.search).get('app');
  if (urlApp) {
    const idx = APPS.findIndex(a => a.id === urlApp);
    if (idx !== -1) current = idx;
  }
  setupCarousel();
  setupLangSwitch();
  setupAppMenu();
  setLang(lang);
  setupCollapsibleSections();
});
