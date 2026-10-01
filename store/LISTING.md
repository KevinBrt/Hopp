# Fiche Chrome Web Store — Hopp

Tout ce qu'il faut coller dans la [console développeur](https://chrome.google.com/webstore/devconsole), onglet par onglet. Les visuels sont dans `store/fr/` et `store/en/` (régénérables avec `npm run build && npm run store:assets`).

Paquet à téléverser : `npm run zip` → `.output/hop-<version>-chrome.zip`.

---

## 1. Onglet « Fiche du Chrome Web Store »

Le **nom** (Hopp) et le **résumé** viennent du manifest, traduits automatiquement selon la langue du visiteur :

- en : *A fast, smart command palette to jump between tabs, history, bookmarks and commands.*
- fr : *Une command palette rapide et intelligente pour passer d'un onglet, de l'historique, des favoris ou d'une commande à l'autre.*

**Catégorie** : Productivité → Outils
**Langue principale** : Français (ajoutez l'anglais dans « Ajouter une langue » pour la description et les visuels anglais)

### Description — Français

```
Hopp est une command palette pour votre navigateur, inspirée d'Arc. Une touche, et une barre de recherche s'ouvre au milieu de la page : tapez quelques lettres, Entrée, vous y êtes.

RETROUVEZ TOUT, TOUT DE SUITE
• Vos onglets ouverts : Hopp bascule dessus au lieu d'ouvrir un doublon.
• Votre historique complet et vos favoris.
• Les sites que vous consultez le plus, en tête des suggestions.
• Les commandes du navigateur : épingler, couper le son, dupliquer, rouvrir un onglet fermé, copier l'URL, libérer la mémoire…
• Une adresse tapée (exemple.fr) s'ouvre directement ; sinon, la recherche web est à une touche.

INTELLIGENTE
• Tolère les fautes de frappe et les accents, et les mots dans le désordre.
• Apprend ce que vous choisissez : tapez « gi » une fois que vous avez choisi GitHub pour « git », et GitHub arrive en premier.
• Tient compte de vos habitudes selon l'heure : votre tableau de bord du matin, votre musique du soir.

RECHERCHE PAR SITE ET CALCULS
• « ytb lofi » + Entrée cherche directement sur YouTube. Wikipédia, GitHub, Google Maps, Traduction… et vos propres sites, à ajouter dans les paramètres.
• « 15% de 340 », « 12*1,2 » : le résultat s'affiche, Entrée le copie.

AU CLAVIER
• Alt+K pour ouvrir (modifiable).
• Filtres : > commandes, @ onglets, * favoris, # historique.
• Ctrl/⌘+Entrée ouvre dans l'onglet actuel, Maj+Entrée dans une nouvelle fenêtre, Maj+Suppr ferme l'onglet ou retire la page de l'historique.
• En option : la palette s'ouvre dans chaque nouvel onglet.

RAPIDE ET DISCRÈTE
• S'affiche en quelques dizaines de millisecondes, sans ralentir les pages où vous ne l'utilisez pas.
• Thème clair et sombre, en français et en anglais.

VOS DONNÉES RESTENT CHEZ VOUS
Hopp n'a aucun serveur : tout est traité sur votre appareil, rien n'est envoyé nulle part. Pas de publicité, pas de pistage. Politique de confidentialité : https://github.com/KevinBrt/Hopp/blob/main/PRIVACY.md
```

### Description — English

```
Hopp is an Arc-style command palette for your browser. Press a key and a search bar opens in the middle of the page: type a few letters, hit Enter, you're there.

FIND ANYTHING, RIGHT AWAY
• Your open tabs: Hopp switches to them instead of opening duplicates.
• Your whole history and your bookmarks.
• The sites you visit most, at the top of the suggestions.
• Browser commands: pin, mute, duplicate, reopen a closed tab, copy the URL, free memory…
• Type an address (example.com) to go there; otherwise web search is one key away.

SMART
• Tolerates typos, accents and words in any order.
• Learns what you pick: type "gi" after choosing GitHub for "git", and GitHub comes first.
• Knows your habits by time of day: your morning dashboard, your evening music.

SITE SEARCH AND CALCULATIONS
• "ytb lofi" + Enter searches YouTube directly. Wikipedia, GitHub, Google Maps, Translate… and your own sites, added in the settings.
• "15% of 340", "12*1.2": the result shows up, Enter copies it.

KEYBOARD FIRST
• Alt+K to open (customizable).
• Filters: > commands, @ tabs, * bookmarks, # history.
• Ctrl/⌘+Enter opens in the current tab, Shift+Enter in a new window, Shift+Delete closes the tab or removes the page from history.
• Optional: open the palette in every new tab.

FAST AND LIGHT
• Shows up in a few tens of milliseconds, without slowing down the pages where you don't use it.
• Light and dark themes, in English and French.

YOUR DATA STAYS WITH YOU
Hopp has no server: everything is processed on your device and nothing is sent anywhere. No ads, no tracking. Privacy policy: https://github.com/KevinBrt/Hopp/blob/main/PRIVACY.md
```

### Visuels

| Champ | Fichier (fr) | Fichier (en) |
|---|---|---|
| Captures d'écran (dans cet ordre) | `store/fr/screenshot-1.png` … `screenshot-5.png` | `store/en/screenshot-1.png` … `screenshot-5.png` |
| Petite vignette promotionnelle (440×280) | `store/fr/promo-small.png` | `store/en/promo-small.png` |
| Bandeau promotionnel (1400×560, facultatif) | `store/fr/promo-marquee.png` | `store/en/promo-marquee.png` |

Ordre des captures : 1. suggestions (sombre) · 2. recherche floue (clair) · 3. recherche par site · 4. calcul · 5. paramètres.

**Site web** (facultatif) : https://github.com/KevinBrt/Hopp
**URL d'assistance** (facultatif) : https://github.com/KevinBrt/Hopp/issues

---

## 2. Onglet « Pratiques de confidentialité »

### Objectif unique

```
Hopp is a keyboard command palette that lets users quickly find and switch to their open tabs, history, bookmarks and browser commands, and search the web or specific sites, from a search bar opened on top of the current page.
```

### Justification des autorisations

Une case par autorisation dans la console. Tout est en anglais, la langue de l'équipe d'examen.

**tabs**
```
Lists the user's open tabs (title, URL) in the palette so they can search them and switch to one, and runs the tab commands the user picks (close, pin, mute, duplicate, reload, move to a new window).
```

**history**
```
Searches the user's browsing history and suggests frequently/recently visited pages in the palette. Also lets the user remove a page from their history with Shift+Delete. History is read locally when the palette opens and is never transmitted.
```

**bookmarks**
```
Searches the user's bookmarks from the palette and marks bookmarked pages in the results. Read locally, never transmitted.
```

**topSites**
```
Uses the browser's most visited sites to rank the suggestions shown when the palette opens with an empty query.
```

**scripting**
```
Injects the palette's user interface into the current page when the user presses the keyboard shortcut or clicks the toolbar icon, so it appears centered over the page. The injected script is bundled with the extension; no remote code.
```

**activeTab**
```
Grants temporary access to the current tab when the user invokes the extension (shortcut or toolbar icon), so the palette can be shown on that page without requesting access to all websites.
```

**search**
```
Runs a web search with the user's default search engine when they pick "Search the web" in the palette.
```

**sessions**
```
Powers the "Reopen closed tab" command, which restores the most recently closed tab.
```

**storage**
```
Saves the user's settings (theme, shortcut behavior, search engine, site search keywords) and, locally only, the results they picked so the palette can rank them first next time. The user can erase this data from the settings.
```

**favicon**
```
Displays each site's icon next to the results, from the browser's local favicon cache (no network request).
```

**tabGroups**
```
Shows the name of the tab group a tab belongs to in the results, so users can tell similar tabs apart.
```

**Autorisations d'hôte** : aucune (rien à justifier).

**Remplacement de la page Nouvel onglet** (si la console le demande) :
```
Optional feature, off by default: when the user enables it in the settings, new tabs open the command palette. When disabled, the page immediately hands over to the browser's own new tab page.
```

### Code distant

> **Non, je n'utilise pas de code distant.** Tout le code est inclus dans le paquet.

### Utilisation des données

Hopp traite l'historique et les onglets **uniquement sur l'appareil** ; rien n'est transmis. Google considère en général que des données qui ne quittent pas l'appareil ne sont pas « collectées ». Pour rester transparent face à l'équipe d'examen, je recommande quand même de cocher :

- ☑ **Historique Web**
- ☑ **Activité de l'utilisateur** (Hopp retient localement les résultats choisis et le début de ce qui a été tapé)

Puis cocher les trois certifications :

- ☑ Je ne vends ni ne transfère les données des utilisateurs à des tiers, en dehors des cas d'utilisation approuvés
- ☑ Je n'utilise pas ni ne transfère les données des utilisateurs à des fins sans rapport avec la fonctionnalité unique de mon article
- ☑ Je n'utilise pas ni ne transfère les données des utilisateurs pour déterminer leur solvabilité ou pour accorder des prêts

**Règles de confidentialité (URL)** : `https://github.com/KevinBrt/Hopp/blob/main/PRIVACY.md`
Le dépôt GitHub doit être **public** pour que cette URL soit accessible par l'équipe d'examen et les utilisateurs.

---

## 3. Distribution

- **Visibilité** : « Non répertoriée » pour un premier test par lien, puis « Publique ».
- **Régions** : toutes.
- Envoyer pour examen : compter quelques jours à 2-3 semaines pour une première publication (historique + remplacement du Nouvel onglet = examen plus poussé).

## Mises à jour

1. Augmenter `version` dans `package.json`.
2. `npm run build && npm run zip`.
3. Console → Paquet → Importer un nouveau paquet → Envoyer pour examen.
