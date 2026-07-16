# CLAUDE.md — Site Sleeplow (hub multi-applications)

Site statique (HTML/CSS/JS, sans build) déployé sur GitHub Pages via `CNAME`.
La page d'accueil est un **carousel** qui présente plusieurs applications ; chaque
app a son propre dossier, son icône, sa couleur de thème et ses pages.

## Structure

```
index.html            Accueil = carousel (en-tête + cartes rendus par script.js)
styles.css            Styles partagés + thèmes par app ([data-app]) + carousel
script.js             Registre APPS + logique carousel + langue + sections repliables
CNAME                 Domaine custom GitHub Pages (app.sleeplow.ca)
budget/  storage/     1 dossier par app (ajouter le sien à côté)
  ├── help.html       Aide & fonctionnalités
  ├── privacy.html    Politique de confidentialité
  ├── contact.html    Contact & support
  └── logo.svg        Icône de l'app (glyphe utilisé comme masque CSS)
.github/workflows/
  ├── security-lint.yml   CI sécurité (cf. § Sécurité)
  └── deploy-pages.yml    CI/CD dev → QA → prod (cf. § Déploiement)
```

## Ajouter une nouvelle application

Tout est piloté par les données — **3 étapes** :

1. **Créer le dossier** `monapp/` avec `help.html`, `privacy.html`, `contact.html`
   et `logo.svg`. Le plus simple : copier ceux de `budget/` puis adapter le contenu.
   Dans chaque page HTML, mettre `<html lang="fr" data-app="monapp">`. Les chemins
   relatifs sont déjà en `../styles.css`, `../script.js`. **Adapter** le back-link
   vers `../index.html?app=monapp` (paramètre `app` = l'`id` de l'app, cf. `APPS`
   dans `script.js`) pour que le carousel se rouvre sur la bonne slide — même
   convention pour toutes les apps, y compris la première.
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
  `setLang()` affiche/masque les éléments `[lang-section]` selon la langue.
- **Titre affiché des sous-pages** : le gros titre de l'en-tête suit la langue —
  deux `<h1 lang-section="fr">`/`<h1 lang-section="en">` (pas de bloc bilingue qui
  afficherait les deux en même temps).
- **Titre de l'onglet** (`<title>`) : traduit via les attributs
  `data-title-fr`/`data-title-en` sur la balise `<title>`, que `setLang()` recopie
  dans `document.title`.

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

## Déploiement (dev → QA → prod)

Le site est publié par le workflow `.github/workflows/deploy-pages.yml`, qui copie
le contenu (site statique, sans build) vers la branche **`gh-pages`** — la source
servie par GitHub Pages (Settings → Pages → *Deploy from a branch* → `gh-pages`).
Trois environnements coexistent sur le même domaine :

| Env  | Déclencheur                | Emplacement `gh-pages` | URL                              |
|------|----------------------------|------------------------|----------------------------------|
| DEV  | ouverture / màj d'une PR   | `pr-preview/pr-<n>/`   | `…/pr-preview/pr-<n>/` (éphémère)|
| QA   | push sur `qa`              | `qa/`                  | `app.sleeplow.ca/qa/`            |
| PROD | push sur `main`            | racine                 | `app.sleeplow.ca/`               |

L'aperçu DEV est créé/supprimé automatiquement à chaque PR
(`rossjrw/pr-preview-action`). Le `CNAME` n'est régénéré que par le déploiement
PROD (option `cname` de l'action), jamais dupliqué dans `qa/` ou `pr-preview/`.
Docs et CI (`CLAUDE.md`, `SECURITY-AUDIT.md`, `.github/`, `.gitignore`, `CNAME`)
sont exclus du contenu publié (`rsync --exclude`).

### Flux de travail

1. Brancher depuis `qa` + ouvrir une PR → tester sur l'aperçu **DEV** de la PR.
2. Merger la PR dans **`qa`** → tester sur `app.sleeplow.ca/qa/` (SIT / UAT).
3. Bug ? corriger via une nouvelle PR vers `qa`, `/qa/` se met à jour, retester.
4. Validé ? ouvrir une PR **`qa` → `main`** → PROD se déploie automatiquement.

### Garde-fous

- **`main` est protégé** (ruleset GitHub, Settings → Rules) : aucun push direct,
  toute modif passe par une PR, `security-lint` doit être vert, force-push bloqué.
  → on ne modifie donc jamais la PROD sans passer par le flux ci-dessus.
- **`main` ≠ QA en direct** : GitHub ne peut pas forcer qu'une PR vers `main`
  vienne de `qa` ; c'est une discipline (ne créer de PR vers `main` que depuis `qa`).
- Les déploiements `main` / `qa` partagent un même groupe de concurrence
  (`gh-pages-deploy`) pour ne pas se livrer une course sur `gh-pages` ; les aperçus
  de PR ont leur propre groupe par PR.

## Développement / vérification

```bash
python3 -m http.server 8000   # puis ouvrir http://localhost:8000/
```

À vérifier après une modif du carousel : changement d'app (flèches/points/clavier/
swipe) met bien à jour icône + nom + couleur du thème ; mode sombre ; bascule FR/EN
re-traduit les cartes ; sous-pages (`budget/help.html`…) ont le switch dans l'en-tête,
le **titre d'en-tête et le titre d'onglet changent de langue**, et le retour
`‹ Accueil` fonctionne ; aucune erreur console.

À vérifier côté **sécurité** (cf. § Sécurité) : **aucune violation CSP** dans la
console ; toute nouvelle page possède le bloc `<meta>` CSP + referrer ; aucun
`innerHTML` ni `onclick` inline introduit ; le logo (chargé en `mask` CSS) et les
liens des cartes s'affichent (signe que la CSP ne bloque rien).
