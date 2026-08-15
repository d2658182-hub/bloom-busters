# SPEC — Bloom Busters (Magic Garden Drop & Match)

> **Concept sacré (verbatim) :** Jeu en 2D. En haut se trouvent les objets à faire
> s'écraser sur des cibles placées en bas. Le joueur doit trouver quel objet peut
> neutraliser/briser la cible : chaque objet ne peut neutraliser qu'une seule cible.
> Pour réussir un niveau, **on ne doit pas se tromper**.
>
> **Gameplay choisi :** A — Drop & Match (largage direct objet → cible).
> **Thème choisi :** 5 — Jardin magique (fleurs/outils enchantés ↔ insectes nuisibles).

---

## 1. Gameplay

- **Hook (< 3 s) :** tu fais tomber une fleur magique sur un insecte. S'il s'agit du
  bon élément, il explose. Sinon… c'est raté. Une seule erreur par niveau.
- **Boucle :** voir les cibles → choisir le bon objet → larguer → destruction + combo
  → niveau suivant.
- **Actions :** toucher/glisser un objet du haut → le larguer sur une cible en bas.
  (pointer-touch + souris). Support clavier minimal non requis.
- **Objectif :** neutraliser TOUTES les cibles du niveau en trouvant le bon match,
  sans aucune erreur. 1 erreur = échec du niveau.
- **Victoire :** toutes les cibles détruites → écran VICTORY (étoiles, pièces, confettis).
- **Défaite :** un mauvais match → GAME OVER (avec option REVIVE rewarded, 1×/run).
- **Déduction (le cœur) :** chaque objet porte un badge d'élément ; chaque cible
  montre l'élément auquel elle est faible. Le joueur associe les badges.
  - Monde 1 : badges gros et colorés (tuto implicite).
  - Monde 3+ : couleurs **trompeuses** sur certaines cibles (la couleur ment, le badge dit la vérité).
  - Monde 5+ : badges petits et monochromes (lecture fine).
  - Une aide : **HINT** (item shop) qui surligne la bonne paire, max 3/niveau.

## 2. Éléments & entités

- **6 éléments** débloqués par monde : WATER 💧, LIGHT ✨, FIRE 🔥, WIND 🌬, EARTH 🪨, FROST ❄️
  (badges = vraies icônes PNG téléchargées).
- **Objets (haut)** : fleurs/plantes magiques — une par élément, sprite distinct
  (ex. lotus d'eau, fleur de feu, pissenlit de vent…). Chaque objet ne peut
  neutraliser qu'UNE cible (celle de son élément).
- **Cibles (bas)** : insectes nuisibles — un par élément (limace bleue faiblesse WATER,
  luciole faiblesse LIGHT, scarabée faiblesse FIRE…).
- **Niveau :** N cibles + N objets correspondants (N de 2 à 8). Jamais d'objet inutile.

## 3. Dopamine & juice (chiffres précis)

- **Cadence de récompense :** un retour (particules + son + popup +X) à CHAQUE match,
  toutes les 2-4 s.
- **Combo :** enchaîner les bons matchs monte un multiplicateur ×1..×5 (pitch SFX qui
  monte, particules plus grosses). Ruptures rares : layout pensé pour enchaîner vite.
- **Near-miss :** glisser un objet près d'une mauvaise cible → la cible tremble (tension).
- **Jalons :** bannière animée « LEVEL X » avec sous-titre (GOAL / NEW ELEMENT /
  SPECIAL / MILESTONE) à chaque niveau et tous les 10 niveaux.
- **« Encore une partie » :** GAME OVER animé + confettis de consolation + RETRY visible.
- **Économie :** pièces gagnées même en perdant (10 pièces de consolation) ; victoire =
  25 + n/5 pièces (≈22-30 au début). 1er item shop ≈ 150 pièces (~7 victoires).
- **Juice :** particules réelles (PNG) à chaque destruction, confettis à la victoire,
  screen-shake, popups animés, fond en couches + parallaxe (ciel + nuages + collines +
  décor : 5+ éléments ambiants, 1 élément animé), entrées animées. 60 fps mobile faible
  (particules bornées à 160).

## 4. Niveaux : courbe paramétrique (250 niveaux, 6 mondes)

- **pestCount(n) = min(8, 2 + floor((n-1)/12))** → 2 cibles (L1) → 8 cibles (L73+).
- **Mondes** (thème + palette qui change par tranche) :
  - W1 « Sprout Meadow » L1-40 : WATER + LIGHT (2-5 cibles)
  - W2 « Ember Grove » L41-80 : +FIRE (5-6 cibles)
  - W3 « Gale Falls » L81-120 : +WIND, couleurs trompeuses (6)
  - W4 « Stone Hollow » L121-160 : +EARTH (6-7)
  - W5 « Frost Caverns » L161-200 : +FROST, badges monochromes (7)
  - W6 « Eternal Bloom » L201-250 : tout, badges petits (7-8)
- **Progression visible :** bannières LEVEL X + sous-titre contextuel ; nouveaux
  éléments = bannière « NEW ELEMENT » + tooltip ; MILESTONE tous les 10 niveaux (+bonus
  pièces) ; fonds de monde différents ; nouveaux sprites de cibles débloqués.
- **Courbe douce linéaire :** aucun timer punitif ; la difficulté vient du nombre de
  cibles et de la lisibilité des badges. Dernier niveau faisable (casual).

## 5. Écrans

1. **LOADING** — barre réelle (assets préchargés), titre animé, `SDK.loadingProgress`.
2. **MENU** — PLAY (continue au niveau courant), SHOP, son 🔊/🔇, affiche monde/niveau.
3. **GAMEPLAY** — canvas 2D portrait : objets en haut, cibles en bas, HUD
   (score + niveau + pause + son, sans chevauchement), bannière de niveau animée.
4. **PAUSE** — gel instantané (rAF annulé + timers gelés), RESUME / RESTART / QUIT.
5. **GAME OVER** — animé, score/pièces réels passés (jamais 0), RETRY / REVIVE / MENU.
6. **VICTORY** — animé + confettis, score/pièces/étoiles réels, NEXT / DOUBLE COINS.
7. **SHOP** — items illustrés : IMAGE + nom + prix + BUY + WATCH AD (≥ 50 %).

## 6. Économie & shop

| Item | Effet | Prix | WATCH AD |
|---|---|---|---|
| Bloom Bonus | +25 % pièces par victoire (passif) | 150 | ✔ |
| Hint Sprite | 3 hints/niveau (surligne la bonne paire) | 300 | — |
| Double Bloom | pièces ×2 par victoire (passif) | 600 | ✔ |
| Mega Seeds | combo de départ +1 | 1000 | — |

- Pièces aussi gagnées en perdant (10) ; double impossible deux fois sur la même
  victoire (DOUBLE COINS rewarded une fois par victoire, jamais retiré).

## 7. Audio (100 % fichiers réels téléchargés)

- **2 musiques en boucle** : MENU (calme magique) + GAMEPLAY (rythmée), vraies boucles
  ≥ 8 s, changement selon l'écran, bouton mute fonctionnel (mémorisé).
- **SFX** : match (pop), combo (pitch montant), destruction (impact), erreur (buzz),
  victoire (fanfare), game over (down), clic, drop, milestone (ding). Réels, pas de tons.

## 8. SDK Playgama (exact)

- `<script src="https://bridge.playgama.com/v2/stable/playgama-bridge.js"></script>`
  AVANT les scripts du jeu ; wrapper défensif `SDK` (marche avec ET sans bridge,
  `initialize()` attrape les rejets).
- `game_ready` à la 1re frame jouable ; `loadingProgress(p)` piloté par le loading.
- Abonnement UNE fois à pause + audio ; `isAudioEnabled` appliqué au démarrage.
- **Interstitielle** : après 2 runs consécutifs de même issue (2 victoires OU 2 défaites)
  → à la transition naturelle (victoire/game over), reset après. Jamais en gameplay,
  jamais juste après une rewarded. Max ~1/2 runs.
- **Rewarded** (récompense UNIQUEMENT sur état `rewarded`) :
  1. GAME OVER → REVIVE (reprend EXACTEMENT où on était, 1×/run).
  2. VICTORY → DOUBLE COINS (sinon garder la base, jamais la retirer).
  3. SHOP → WATCH AD sur ≥ 50 % des items.
- **Stockage :** `bridge.storage` (cloud) tiré au boot puis re-mirroré à chaque écriture,
  repli `localStorage`.
- **Modération :** ZIP index.html racine ≤ 300 MB, titre anglais, pubs uniquement via le
  bridge (zéro tierce, zéro lien sortant, zéro appel réseau externe), rewarded opt-in
  clair avec récompense annoncée, son + gameplay en pause pendant une pub plein écran,
  REPLAY toujours visible, progression conservée après pub, événements
  `level_started/paused/resumed/completed/failed` aux bons moments.

## 9. Responsive (zéro bande noire)

- **Mobile portrait :** plein écran. **Desktop/paysage :** cadre portrait 9:16 centré,
  côtés remplis par le fond du jeu **flouté + assombri** (CSS, même image).
- Canvas logique fixe 720×1280 (9:16) mis à l'échelle dans le cadre ; HUD en DOM par-dessus.

## 10. Règles d'or techniques

- Vanilla JS uniquement, zéro erreur console, zéro `console.log`/TODO/code mort.
- 100 % assets téléchargés (aucun visuel/son généré par code) ; licences CC0 (idéal)
  / CC-BY (attribution notée dans CREDITS).
- Texte en anglais, nombres `toLocaleString('en-US')`.
- Pause = gel instantané + reprise sans fuite, testée après chaque changement.
- Vérifié en EXÉCUTANT : headless (zéro erreur), pixels du canvas comptés (sprites
  dessinés), screenshot de chaque écran REGARDÉ, matrice responsive, stress
  (gagner/perdre/revive/doubler/redimensionner/pause×10), AVEC et SANS SDK.

## 11. Livraison

Repo + GitHub Pages (HTTP 200 + assets 200) + ZIP Playgama (index.html racine, ≤ 300 MB,
sans fichiers de dev). 3 liens : repo, Pages, ZIP.

## 12. Checklist finale

- [ ] Le jeu JOUE le concept verbatim (objets en haut → cibles en bas, 1 objet = 1 cible, 0 erreur)
- [ ] 250 niveaux, progression réelle ET visible (bannières, éléments, mondes, sprites)
- [ ] Hook < 3 s ; dopamine (cadence, combo, near-miss, one-more-round)
- [ ] Juice : musiques + SFX partout, particules, confettis, écrans animés, env dense
- [ ] Économie équilibrée, shop illustré sans overlap
- [ ] Pub interstitielle (2 runs) + rewarded (revive/double/≥50 % shop), récompense sur `rewarded` seulement
- [ ] Responsive sans bandes noires ; desktop = cadre portrait + fond flouté
- [ ] Zéro erreur console (avec ET sans SDK), zéro MISSING, zéro code mort, pause OK
- [ ] Rendu PIXEL vérifié + screenshot de chaque écran regardé
- [ ] Texte anglais, formats `en-US`
- [ ] 100 % assets téléchargés (attributions dans CREDITS)
- [ ] Publié : repo + GitHub Pages (HTTP 200) + ZIP (index.html racine)
