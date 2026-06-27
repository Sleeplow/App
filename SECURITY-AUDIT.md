# Rapport d'audit de sécurité — Site Sleeplow (app.sleeplow.ca)

- **Périmètre audité** : site statique HTML/CSS/JS hébergé sur GitHub Pages
  (`index.html`, `script.js`, `styles.css`, `budget/*.html`, `*.svg`, `CNAME`,
  `.gitignore`).
- **Type d'application** : site vitrine / pages de support (aide, confidentialité,
  contact) pour l'app iOS « Budget ». **Pas de backend, pas de base de données,
  pas de formulaire, pas d'authentification, aucune collecte de données côté web.**
- **Date** : 2026-06-27
- **Méthode** : revue manuelle du code source, recherche des points d'injection
  (sinks DOM), analyse des dépendances externes, des en-têtes de sécurité
  possibles, de la configuration d'hébergement et de l'historique git.

---

## 1. Résumé exécutif (TL;DR)

**Niveau de risque global : FAIBLE.** Le site est purement statique, ne contient
**aucun secret**, ne charge **aucun script tiers** et n'a **aucun backend** : la
surface d'attaque est très réduite. **Aucune faille critique exploitable en
l'état** n'a été trouvée.

Cela dit, plusieurs **durcissements importants** sont recommandés. Le point le
plus structurant est la **manière dont le HTML est généré en JavaScript
(`innerHTML`)** : ce n'est pas exploitable aujourd'hui (les données sont
statiques), mais c'est précisément le **canal par lequel du code malicieux
pourrait être introduit** si un jour ces données proviennent d'une source
externe (fichier JSON, paramètre d'URL, copier-coller de contenu, CMS…).
Coupler cela à une **Content-Security-Policy (CSP)** apporterait une seconde
ligne de défense efficace et peu coûteuse.

### Tableau de synthèse (classé par priorité)

| # | Constat | Sévérité | Urgence | Effort |
|---|---------|----------|---------|--------|
| **F1** | Génération de HTML via `innerHTML` sans échappement (sink DOM-XSS **latent**) | Moyen *(latent — Critique si données externes)* | Élevée | Moyen |
| **F2** | Absence de Content-Security-Policy et d'en-têtes de sécurité | Moyen | Élevée | Faible |
| **F3** | Gestionnaires d'événements en ligne (`onclick=…`) empêchant une CSP stricte | Faible-Moyen | Court terme | Faible |
| **F4** | Valeur `lang` lue depuis `localStorage` sans validation → plantage du rendu | Faible | Court terme | Faible |
| **F5** | Vérifier « Enforce HTTPS » / HSTS sur GitHub Pages | Moyen *(si désactivé)* | Élevée | Faible |
| **F6** | Clickjacking : pas de protection `frame-ancestors` / `X-Frame-Options` | Faible | Moyen terme | Moyen |
| **F7** | En-têtes `Referrer-Policy` / `Permissions-Policy` non définis | Informatif | Moyen terme | Faible |
| **F8** | Liens externes sans `rel="noopener noreferrer"` (préventif) | Informatif | Moyen terme | Faible |

> **Sévérité** = impact potentiel · **Urgence** = à quelle vitesse traiter ·
> **Effort** = coût de correction.

### Statut de remédiation (mise à jour 2026-06-27)

Les correctifs suivants ont été appliqués dans la même branche que ce rapport et
**vérifiés dans un navigateur headless** (aucune violation CSP, carousel + switch
FR/EN fonctionnels, sonde d'injection rendue inerte) :

| # | Statut | Détail |
|---|--------|--------|
| **F1** | ✅ Corrigé | Rendu reconstruit avec l'API DOM (`createElement`/`textContent`) ; `innerHTML` supprimé ; schéma de `href` validé (rejet de `javascript:`). |
| **F2** | ✅ Corrigé | Balise `<meta>` CSP ajoutée aux 4 pages (`default-src 'none'`, `script-src 'self'`, …). |
| **F3** | ✅ Corrigé | `onclick` inline remplacés par `addEventListener` + `data-lang` → `script-src 'self'` strict possible. |
| **F4** | ✅ Corrigé | Valeur `lang` de `localStorage` validée par liste blanche. |
| **F5** | ⏳ Manuel | **Action requise hors code** : activer « Enforce HTTPS » dans GitHub Pages. |
| **F6** | ⚠️ Atténué | Garde anti-clickjacking JS (best-effort) ajoutée ; `frame-ancestors`/`X-Frame-Options` restent impossibles sur GitHub Pages. |
| **F7** | ✅ Partiel | `Referrer-Policy` posé via `<meta>` ; `Permissions-Policy` nécessite des en-têtes (hors GitHub Pages). |
| **F8** | ➖ Sans objet | Aucun lien `target="_blank"` aujourd'hui — rien à corriger (préventif documenté). |

---

## 2. Constats détaillés

### F1 — Génération de HTML via `innerHTML` sans échappement *(le point le plus important)*

**Sévérité : Moyen (latent) — deviendrait Critique en cas de données externes**
**· Urgence : Élevée · Effort : Moyen**

**Emplacement :** `script.js`
- `buildCard()` — lignes ~59-70
- `renderTrack()` — lignes ~72-79 (`track.innerHTML = …`)
- `renderDots()` — lignes ~81-90 (`dots.innerHTML = …`)

**Description.** Les cartes du carousel sont construites par concaténation de
chaînes puis injectées via `innerHTML` :

```js
const inner =
  `<span class="menu-icon">${card.icon}</span>` +
  `<span class="menu-text"><h2>${card.title}</h2><p>${card.desc}</p></span>` +
  tail;
return card.href
  ? `<a class="menu-card" href="${card.href}">${inner}</a>`   // ← href non filtré
  : `<div class="menu-card soon">${inner}</div>`;
...
track.innerHTML = APPS.map(app => { ... }).join('');           // ← sink
```

**Pourquoi c'est le canal d'introduction de code malicieux.**
- `innerHTML` **interprète et exécute** le HTML injecté (balises, attributs
  d'événements, etc.). Toute donnée placée dans `card.icon`, `card.title`,
  `card.desc`, `card.soon`, `app.name`, `app.footer`… est rendue **sans aucun
  échappement**.
- L'attribut `href="${card.href}"` est inséré tel quel : une valeur du type
  `javascript:...` deviendrait un vecteur d'exécution au clic.

**Risque réel aujourd'hui : aucun.** Les valeurs proviennent exclusivement du
tableau **`APPS` codé en dur** dans `script.js` (contenu de confiance, écrit par
le développeur). La seule donnée « externe » est la langue (`lang`), validée pour
le paramètre d'URL et utilisée uniquement comme **clé** d'objet — elle ne peut pas
être injectée dans le HTML.

**Quand cela devient une faille XSS (stockée/réfléchie) :** dès que **l'un de ces
champs provient d'une source non maîtrisée**, par exemple si à l'avenir :
- le registre `APPS` est chargé depuis un fichier `apps.json` / une API / un CMS ;
- un champ est alimenté par un paramètre d'URL, `localStorage`, ou un contenu
  copié-collé depuis une source tierce ;
- une nouvelle app est ajoutée avec un titre/description repris d'un texte externe.

Le `CLAUDE.md` documente d'ailleurs explicitement l'ajout d'apps via le tableau
`APPS` : il est donc probable que ce code évolue. **Mieux vaut corriger le motif
maintenant**, tant que c'est trivial.

**Recommandation.** Ne pas injecter de données via concaténation + `innerHTML`.
Deux options :

1. **Construire le DOM par API** (`createElement` + `textContent`), ce qui rend
   l'injection impossible par construction :

   ```js
   function buildCard(card) {
     const root = document.createElement(card.href ? 'a' : 'div');
     root.className = card.href ? 'menu-card' : 'menu-card soon';
     if (card.href && /^(\.?\/|https?:|mailto:)/i.test(card.href)) {
       root.href = card.href;            // n'autorise que des schémas sûrs
     }
     const icon = document.createElement('span');
     icon.className = 'menu-icon';
     icon.textContent = card.icon;       // textContent = pas d'interprétation HTML
     const text = document.createElement('span');
     text.className = 'menu-text';
     const h2 = document.createElement('h2'); h2.textContent = card.title;
     const p  = document.createElement('p');  p.textContent  = card.desc;
     text.append(h2, p);
     // … badge/flèche de fin …
     root.append(icon, text /*, tail */);
     return root;
   }
   ```

2. **À défaut, échapper** systématiquement chaque valeur avant interpolation
   (fonction `escapeHTML()` sur `&`, `<`, `>`, `"`, `'`) **et** valider le schéma
   de `href` (rejeter tout ce qui n'est pas `./`, `https:` ou `mailto:`).

> Note : ce sont les seuls sinks d'injection du projet. Aucun `eval`,
> `document.write`, `insertAdjacentHTML` ni `new Function` n'a été trouvé.

---

### F2 — Absence de Content-Security-Policy (et d'en-têtes de sécurité)

**Sévérité : Moyen · Urgence : Élevée · Effort : Faible**

**Emplacement :** `index.html`, `budget/help.html`, `budget/privacy.html`,
`budget/contact.html` (section `<head>`).

**Description.** Aucune page ne définit de **Content-Security-Policy**. En cas
d'XSS (cf. F1, ou une future régression), rien ne limite l'exécution de scripts,
le chargement de ressources externes ou l'exfiltration de données. Une CSP est la
**défense en profondeur** la plus rentable pour ce site.

**Contrainte d'hébergement importante.** GitHub Pages **ne permet pas de définir
des en-têtes HTTP personnalisés**. La CSP doit donc être posée via une balise
`<meta http-equiv>` dans chaque page. Limites à connaître : dans une balise
`<meta>`, les directives `frame-ancestors`, `report-uri` et `sandbox` sont
**ignorées** (cf. F6) — seules les autres directives s'appliquent.

**Recommandation.** Ajouter dans le `<head>` de **chaque** page HTML (idéalement
après avoir traité F3, sinon il faut tolérer `'unsafe-inline'` pour les scripts) :

```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none';
           script-src 'self';
           style-src 'self' 'unsafe-inline';
           img-src 'self';
           base-uri 'none';
           form-action 'none';
           object-src 'none'">
```

Notes :
- `script-src 'self'` suffit car le seul script est `script.js` (aucun `<script>`
  inline). **Mais** les `onclick=` inline (F3) exigeraient sinon `'unsafe-inline'`,
  qui annulerait l'essentiel du bénéfice → traiter F3 d'abord.
- `style-src 'unsafe-inline'` est nécessaire pour les rares attributs
  `style="…"` (ex. `contact.html`) et reste **peu risqué** pour du style. Pour
  passer à `style-src 'self'`, déplacer ces styles inline dans `styles.css`.
- `img-src 'self'` couvre les logos SVG chargés en `mask`/`url()` (même origine).

---

### F3 — Gestionnaires d'événements en ligne (`onclick`) empêchant une CSP stricte

**Sévérité : Faible-Moyen · Urgence : Court terme · Effort : Faible**

**Emplacement :** boutons FR/EN de l'en-tête sur toutes les pages, ex.
`index.html` lignes 13-14 :

```html
<button class="active" onclick="setLang('fr')">FR</button>
<button onclick="setLang('en')">EN</button>
```

**Description.** Les attributs d'événements en ligne (`onclick`) sont du code
exécuté par le navigateur. Une CSP **ne peut pas** les autoriser via *hash* ou
*nonce* : il faudrait `script-src 'unsafe-inline'`, ce qui ré-ouvre la porte au
XSS et vide la CSP de l'essentiel de sa valeur (lien direct avec F2).

**Recommandation.** Supprimer les `onclick` et câbler les boutons en JS, comme le
reste du carousel le fait déjà (`addEventListener`). Par exemple, donner un
attribut `data-lang` aux boutons et, dans `script.js` :

```js
document.querySelectorAll('.lang-switch button').forEach(btn =>
  btn.addEventListener('click', () => setLang(btn.dataset.lang)));
```

Cela permet ensuite une CSP `script-src 'self'` réellement stricte.

---

### F4 — Valeur `lang` de `localStorage` non validée → plantage du rendu

**Sévérité : Faible · Urgence : Court terme · Effort : Faible**

**Emplacement :** `script.js` ligne ~200 (lecture) et ~72-78 (`renderTrack`).

**Description.** Le paramètre d'URL `?lang=` est correctement validé
(`urlLang === 'fr' || urlLang === 'en'`), **mais pas** la valeur lue depuis
`localStorage` :

```js
try { lang = localStorage.getItem('budget-lang') || 'fr'; } catch (e) {}
```

Si `budget-lang` contient autre chose que `fr`/`en` (valeur corrompue, ou écrite
par un autre script de la même origine), `renderTrack()` fait
`app.cards[lang].map(...)` sur `undefined` → **exception → le carousel ne s'affiche
plus** (déni de service local de la page d'accueil). Ce n'est pas une injection
(la valeur n'est utilisée que comme clé), mais c'est un défaut de robustesse.

**Recommandation.** Valider la valeur dans une liste blanche, comme pour l'URL :

```js
const stored = localStorage.getItem('budget-lang');
lang = (stored === 'fr' || stored === 'en') ? stored : 'fr';
```

---

### F5 — Vérifier « Enforce HTTPS » / HSTS sur GitHub Pages

**Sévérité : Moyen (si désactivé) · Urgence : Élevée (simple vérification) · Effort : Faible**

**Description.** Le domaine personnalisé `app.sleeplow.ca` (cf. `CNAME`) doit
**forcer le HTTPS**. Si l'option n'est pas active, le site reste accessible en
HTTP clair, exposant les visiteurs à une interception/altération (MITM) — y
compris l'injection de contenu dans une page pourtant « statique ».

**Cela ne se vérifie pas dans le code** ; à contrôler côté GitHub :
**Settings → Pages → « Enforce HTTPS »** doit être **coché**. Quand c'est activé,
GitHub Pages sert aussi l'en-tête HSTS et `X-Content-Type-Options: nosniff`.

**Recommandation.** Confirmer que « Enforce HTTPS » est activé. Vérifier aussi que
l'enregistrement DNS de `app.sleeplow.ca` pointe bien vers GitHub Pages et que le
certificat est émis.

---

### F6 — Clickjacking : pas de `frame-ancestors` / `X-Frame-Options`

**Sévérité : Faible · Urgence : Moyen terme · Effort : Moyen**

**Description.** Rien n'empêche d'intégrer le site dans une `<iframe>` tierce
(clickjacking). L'impact est **faible** ici : les pages sont **informationnelles**,
sans formulaire, sans bouton sensible ni action à état. Le risque est donc surtout
théorique (usurpation visuelle de la marque).

**Contrainte.** `frame-ancestors` est **ignoré** dans une balise `<meta>` (il faut
un en-tête HTTP) et GitHub Pages ne permet pas `X-Frame-Options`. Sur GitHub Pages,
la protection anti-iframe n'est donc **pas réalisable proprement**.

**Recommandation (selon le besoin) :**
- Acceptable de ne rien faire vu le faible enjeu ; **ou**
- petit script « frame-busting » (`if (self !== top) top.location = self.location`)
  — solution imparfaite ; **ou**
- pour un contrôle complet par en-têtes (X-Frame-Options, HSTS, Permissions-Policy…),
  héberger derrière un service supportant les en-têtes personnalisés / fichier
  `_headers` (Cloudflare Pages, Netlify…).

---

### F7 — `Referrer-Policy` / `Permissions-Policy` non définis

**Sévérité : Informatif · Urgence : Moyen terme · Effort : Faible**

**Description.** Durcissements mineurs. `Referrer-Policy` peut être posé via
`<meta>` ; `Permissions-Policy` nécessite un en-tête HTTP (non disponible sur
GitHub Pages).

**Recommandation.** Ajouter dans le `<head>` :

```html
<meta name="referrer" content="strict-origin-when-cross-origin">
```

(`Permissions-Policy` : reporté à un éventuel changement d'hébergement, cf. F6.)

---

### F8 — Liens externes sans `rel="noopener noreferrer"` (préventif)

**Sévérité : Informatif · Urgence : Moyen terme · Effort : Faible**

**Emplacement :** liens vers `apple.com` dans `budget/privacy.html` (l.81, l.203).

**Description.** Ces liens **n'utilisent pas** `target="_blank"` : il n'y a donc
**pas** de risque de *reverse tabnabbing* aujourd'hui (et les navigateurs récents
appliquent `noopener` par défaut sur `target="_blank"`). Recommandation purement
préventive.

**Recommandation.** Si un jour un lien externe utilise `target="_blank"`, lui
ajouter `rel="noopener noreferrer"`.

---

## 3. Points positifs (bonnes pratiques constatées)

Ces éléments réduisent significativement le risque et méritent d'être maintenus :

- ✅ **Aucun script/feuille de style tiers ni CDN externe** → pas de risque de
  chaîne d'approvisionnement (supply chain) côté front ; SRI non nécessaire.
- ✅ **Aucun secret, clé d'API ou jeton** dans le code, ni détecté dans
  l'historique git.
- ✅ **Aucun backend, aucun formulaire, aucune collecte de données** côté web →
  surface d'attaque minimale.
- ✅ **Aucun motif dangereux** : pas d'`eval`, `document.write`, `new Function`,
  `insertAdjacentHTML`.
- ✅ **Aucun workflow GitHub Actions** (`.github/` absent) → pas de risque
  d'injection de pipeline (`pull_request_target`, etc.).
- ✅ **SVG sûrs** : pixel-art statique, sans `<script>` ni `<foreignObject>`,
  servis depuis la même origine.
- ✅ `localStorage` n'est utilisé que pour la préférence de langue — **aucune
  donnée sensible** stockée côté navigateur.
- ✅ Bonne posture de confidentialité **documentée** (traitement on-device,
  pas de télémétrie) dans les pages.

---

## 4. Plan d'action recommandé (par ordre)

1. **F5** — Vérifier « Enforce HTTPS » sur GitHub Pages *(2 min, vérification)*.
2. **F3** — Remplacer les `onclick` inline par `addEventListener` *(prérequis d'une CSP stricte)*.
3. **F2** — Ajouter la balise `<meta>` CSP (+ `referrer`) sur les 4 pages.
4. **F1** — Refactorer `buildCard`/`renderTrack`/`renderDots` (DOM API ou
   échappement + validation du schéma `href`).
5. **F4** — Valider la valeur `lang` issue de `localStorage`.
6. **F6/F7/F8** — Durcissements optionnels ; envisager un hébergement gérant les
   en-têtes si un contrôle complet est souhaité.

---

## 5. Annexe — Ce qui a été vérifié

- Revue ligne à ligne de `script.js`, `index.html`, `styles.css` et des 3
  sous-pages `budget/*.html`.
- Recherche des sinks d'injection : `innerHTML`, `outerHTML`,
  `insertAdjacentHTML`, `document.write`, `eval`, `new Function` → seuls deux
  `innerHTML` trouvés (F1).
- Recherche de ressources non-HTTPS / externes → seuls des `xmlns` SVG (espaces
  de noms, pas de requête réseau) et une note localhost dans `CLAUDE.md`.
- Recherche de secrets/identifiants dans le code et survol de l'historique git
  (`git log`) → rien de sensible.
- Présence de workflows CI (`.github/`) → aucun.
- Analyse des dépendances tierces → aucune.

> **Limites de l'audit :** la configuration runtime de GitHub Pages (option
> « Enforce HTTPS », en-têtes HTTP réellement servis) et un scan de secrets
> exhaustif sur tout l'historique git **ne peuvent pas être validés depuis le seul
> code source** et doivent être contrôlés côté plateforme (cf. F5).
