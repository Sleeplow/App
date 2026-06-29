# CLAUDE.md — Site Sleeplow (hub multi-applications)

Site statique (HTML/CSS/JS, sans build) déployé sur GitHub Pages via `CNAME`.
La page d'accueil est un **carousel** qui présente plusieurs applications ; chaque
app a son propre dossier, son icône, sa couleur de thème et ses pages.

## Structure

```
index.html            Accueil = carousel (en-tête + cartes rendus par script.js)
styles.css            Styles partagés + thèmes par app ([data-app]) + carousel
script.js             Registre APPS + logique carousel + langue + sections repliables
placeholder-logo.svg  Icône de l'app placeholder « Bientôt »
budget/               1 dossier par app
  ├── help.html       Aide & fonctionnalités
  ├── privacy.html    Politique de confidentialité
  ├── contact.html    Contact & support
  └── logo.svg        Icône de l'app (glyphe utilisé comme masque CSS)
```

## Ajouter une nouvelle application

Tout est piloté par les données — **3 étapes** :

1. **Créer le dossier** `monapp/` avec `help.html`, `privacy.html`, `contact.html`
   et `logo.svg`. Le plus simple : copier ceux de `budget/` puis adapter le contenu.
   Dans chaque page HTML, mettre `<html lang="fr" data-app="monapp">`. Les chemins
   relatifs sont déjà en `../styles.css`, `../script.js`, back-link `../index.html`.
   **Conserver** le bloc `<meta http-equiv="Content-Security-Policy">` + le
   `<meta name="referrer">` du `<head>` (cf. § Sécurité — toute page doit l'avoir).
   **Adapter** aussi `<meta name="description">` et les balises Open Graph
   (`og:title`, `og:description`, `og:url`) au contenu de la page.

2. **Ajouter le thème** dans `styles.css` : dupliquer un bloc `[data-app="..."]`
   (variante claire + variante sombre dans la `@media (prefers-color-scheme: dark)`)
   avec la couleur d'accent de l'app et `--app-logo: url(monapp/logo.svg);`.

3. **Enregistrer l'app** dans le tableau `APPS` de `script.js` : `id` = nom du
   dossier/`data-app`, plus `name`, `tagline`, `footer` et les `cards` (FR/EN).

Le carousel (en-tête, couleur, cartes, flèches, points) se met à jour tout seul.

### Slide placeholder « Bientôt »
La dernière entrée `id: 'next'` de `APPS` est une démo. Quand une vraie app la
remplace, **supprimer** cette entrée dans `script.js`, le bloc `[data-app="next"]`
dans `styles.css`, et `placeholder-logo.svg` si inutilisé.

## Conventions

- **Thème par app** : déclaratif en CSS via l'attribut `data-app` sur `<html>`
  (statique sur les sous-pages, changé dynamiquement par le carousel sur l'accueil).
  Le logo est une variable CSS (`--app-logo`) résolue par rapport à `styles.css`
  (racine), donc le même chemin fonctionne depuis n'importe quelle page.
- **Langue** : switch FR/EN global dans le bandeau d'en-tête (`.lang-switch`),
  identique sur toutes les pages. `setLang()` mémorise le choix (`localStorage`
  clé `sleeplow-lang`, ancienne clé `budget-lang` lue en repli) + paramètre d'URL
  `?lang=fr|en`, met à jour `<html lang>`, et re-rend le carousel.
- **Texte bilingue** : sur les sous-pages via `[lang-section="fr|en"]` ; dans le
  registre `APPS` via des valeurs `{ fr, en }` (ou une simple chaîne si identique).

## Sécurité (règles à respecter)

Le site n'a ni backend ni collecte de données, mais ces règles évitent de
réintroduire des failles. **À appliquer dès qu'on touche au HTML ou au JS.**
Détail et justifications dans `SECURITY-AUDIT.md`. Un workflow CI
`security-lint` (`.github/workflows/`) vérifie automatiquement ces règles à
chaque push/PR (il échoue si `innerHTML`/handler inline/`<script>` inline
réapparaît, ou si une page n'a pas de CSP stricte).

### Toujours

- **Jamais d'injection HTML.** Pas de `innerHTML` / `outerHTML` /
  `insertAdjacentHTML` avec des données : construire le DOM via le helper
  `el(tag, class, text)` de `script.js` (`createElement` + `textContent`, qui
  n'interprète jamais le HTML). Bannir aussi `eval`, `new Function`,
  `document.write`.
- **CSP sur chaque page HTML.** Tout `<head>` doit contenir le bloc
  `<meta http-equiv="Content-Security-Policy">` + `<meta name="referrer">`
  (copier ceux d'une page existante). Ne pas affaiblir la CSP : `script-src`
  reste `'self'` — **jamais** `'unsafe-inline'` pour les scripts.
- **Pas de handler d'événement en ligne** (`onclick=`, `onload=`…) ni de
  `<script>` inline. Câbler les événements via `addEventListener` dans
  `script.js` (c'est ce qui permet la CSP `script-src 'self'` stricte).
- **Valider les `href` issus de données** : n'autoriser que `./` (relatif),
  `https:` et `mailto:` via `safeHref()` de `script.js`. Jamais de `javascript:`.
- **Aucune ressource tierce** (CDN, script/police/CSS externe, iframe) : tout
  reste same-origin. La CSP est en `default-src 'none'` → tout est refusé par
  défaut.
- **Valider toute entrée externe** (paramètre d'URL, `localStorage`) contre une
  liste blanche avant usage (ex. la langue : `'fr'`/`'en'` uniquement).
- **Aucun secret** dans le dépôt (clé d'API, token, identifiant).

### Selon la situation

- **Nouveau type de ressource** (image, police, appel réseau…) : `default-src`
  étant à `'none'`, il faut **ajouter explicitement** la directive correspondante
  (`img-src`, `font-src`, `connect-src`…) sur **toutes** les pages, sinon la
  ressource est bloquée. Rester aussi restrictif que possible (`'self'`).
- **Style en ligne** (`style="…"`) : toléré (`style-src 'unsafe-inline'`), mais
  préférer une classe dans `styles.css`.
- **Lien externe avec `target="_blank"`** : ajouter `rel="noopener noreferrer"`.
- **En-têtes HTTP** (`X-Frame-Options`, `Permissions-Policy`, HSTS) : non
  réglables sur GitHub Pages — ne pas compter dessus. Garder **« Enforce HTTPS »**
  activé côté GitHub Pages ; l'anti-clickjacking repose sur la garde JS en tête de
  `script.js`.

## Développement / vérification

```bash
python3 -m http.server 8000   # puis ouvrir http://localhost:8000/
```

À vérifier après une modif du carousel : changement d'app (flèches/points/clavier/
swipe) met bien à jour icône + nom + couleur du thème ; mode sombre ; bascule FR/EN
re-traduit les cartes ; sous-pages (`budget/help.html`…) ont le switch dans l'en-tête
et le retour `‹ Accueil` fonctionne ; aucune erreur console.

À vérifier côté **sécurité** (cf. § Sécurité) : **aucune violation CSP** dans la
console ; toute nouvelle page possède le bloc `<meta>` CSP + referrer ; aucun
`innerHTML` ni `onclick` inline introduit ; le logo (chargé en `mask` CSS) et les
liens des cartes s'affichent (signe que la CSP ne bloque rien).
