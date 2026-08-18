# Bloom Busters 🌸🐛

**Devine la magie du jardin** — jeu de puzzle de déduction pour
[Playgama](https://playgama.com).

---

## 🎮 Comment jouer

Chaque niveau cache une **logique secrète** de neutralisation.
Les pièces du **haut** neutralisent celles du **bas** — mais **quoi**
corrèle quoi change à chaque niveau.

> Le joueur **ne reçoit jamais la règle**. Il la découvre en testant :
> un drop correct → explosion ✅ ; un drop faux → un cœur perdu 💔.

### Le geste de base

```
  ┌──────────────────────────┐
  │  🌸 🌸 🌸 🌸   (objets)  │   ← tu choisis un objet ici
  │                          │
  │                          │
  │  🐛 🐛 🐛 🐛   (cibles)  │   ← tu le glisses vers une cible ici
  └──────────────────────────┘
```

**Glisse** un objet du haut vers une cible du bas.

- Si l'objet correspond à la logique secrète → **BOOM** 💥 la cible explose
- Sinon → **le cœur se brise** 💔 et l'objet revient en haut

### Les 8 logiques secrètes

Chaque niveau utilise **une seule** logique. Le joueur la devine en testant :

| Logique | Ce que le joueur voit | Exemple |
|---|---|---|
| 🎨 Par couleur | Gemmes de 8 couleurs | La gemme 🔵 va sur le cristal 🔵 |
| ⭐ Par symbole | Étoile, cœur, croix, flèche… | L'étoile ⭐ va sur l'étoile ⭐ |
| 🐞 Par créature | Éléphant, pingouin, singe… | Le singe 🐵 va sur le singe 🐵 |
| 🔢 Par nombre | Dominos de 0 à 5 points | Le domino ●● va sur le domino ●● |
| 🧵 Par motif | Rayures, pois, pain d'épice | Le motif ⭐ va sur le motif ⭐ |
| 🌱 Par élément | 6 fleurs (eau, lumière, feu…) | 💧 va sur 💧 |
| 🌗 Paires opposées | Jour/nuit, plus/moins… | ☀️ va sur 🌙 (les contraires s'attirent !) |
| 🔀 Par position | L'ordre des pièces | La 1ʳᵉ pièce va sur la 1ʳᵉ cible |

### Les cœurs — ton budget d'expériences

Tu commences chaque niveau avec **5 cœurs** ❤️❤️❤️❤️❤️.

- Chaque erreur coûte **1 cœur**
- À 0 cœur → **niveau perdu** (mais tu peux te relancer via une pub rewarded)
- **Zéro erreur** = 3 étoiles ⭐⭐⭐

### Les mondes

| Monde | Niveaux | Famille de pièces | Logique principale |
|---|---|---|---|
| 🌱 Sprout Meadow | 1–40 | Fleurs & nuisibles | Par élément |
| 🍎 Fruit Grove | 41–80 | 16 fruits | Par couleur + par type |
| 🐾 Creature Hollow | 81–120 | 10 animaux | Par créature + chrono |
| 💎 Crystal Falls | 121–160 | 32 gemmes + 22 symboles | Par couleur + par symbole |
| 🁢 Pattern Caverns | 161–200 | 27 dominos | Par nombre + par motif |
| 🌸 Eternal Bloom | 201–250 | Tout mélangé | Logique aléatoire + boss |

### Objectifs variés

- 🌸 **Jardinage libre** — détruis toutes les cibles
- 🎯 **Course au score** — atteins le score en X coups
- ⏱ **Course contre la montre** — détruis tout avant la fin du chrono
- 🎯 **Collecte ciblée** — neutralise X pièces d'un type précis
- 🌸 **Protège la fleur** — les cibles avancent vers ta fleur, arrête-les !
- 👑 **Boss** — un ennemi à plusieurs PV (tous les 10 niveaux)

---

## 🕹️ Contrôles

### 📱 Téléphone (tactile)

| Geste | Action |
|---|---|
| **Glisser** un objet du haut vers une cible du bas | Lâcher l'objet sur la cible |
| **Appuyer** sur ❓ | Ouvre l'aide « Comment jouer » |
| **Appuyer** sur ⏸ | Met en pause |

### 💻 Ordinateur (souris + clavier)

| Touche / Geste | Action |
|---|---|
| **Cliquer + glisser** un objet vers une cible | Lâcher l'objet sur la cible |
| **Échap** ou **P** | Met en pause |
| **Cliquer** sur ❓ | Ouvre l'aide |
| **Cliquer** sur ⏸ | Met en pause |

> 💡 Le jeu utilise les **Pointer Events** (pas les Touch Events), donc
> souris, trackpad et écran tactile fonctionnent tous de la même façon.

---

## 🎵 Musique & sons

**Oui, il y a de la musique de fond !**

| Écran | Musique | Style |
|---|---|---|
| 🏠 Menu | Boucle calme & relaxante | Ambient / lo-fi |
| 🎮 Gameplay | Boucle 8-bit battle | Chiptune entraînante |
| 🏆 Victoire | Jingle de victoire | Triomphante |
| 💀 Game Over | Sting dramatique | Court, percutant |

### Détails techniques

- **Format** : OGG Vorbis (meilleur compression, supporté partout)
- **Volume** : musique à 32%, effets sonores à 38% (confort oreilles)
- **Ducking en pause** : la musique baisse doucement quand tu pauses, ne coupe pas
- **Arrêt à la fermeture** : la musique s'arrête quand tu quittes l'onglet/navigateur
- **SFX** : click, drop, match, destroy, wrong, milestone, confirm — chaque action a son son

---

## 🛒 La boutique

Achète des améliorations avec les pièces gagnées aux niveaux :

| Objet | Prix | Effet |
|---|---|---|
| 🌸 Bloom Bonus | 150 | +25% de pièces par victoire |
| 🌺 Double Bloom | 600 | ×2 pièces par victoire |
| 🌈 Mega Seeds | 1000 | Les combos commencent à ×2 |
| ❤️ Extra Heart | 800 | +1 cœur par niveau |

---

## 🏗️ Tech

Vanilla JS, Canvas 2D, aucun framework. 100% des visuels et sons sont des
vrais fichiers téléchargés (CC0 / CC-BY) — voir [CREDITS.md](CREDITS.md).

### Lancer en local

```bash
python3 -m http.server 8123
# ouvrir http://localhost:8123
```

Spécifications : [SPEC.md](SPEC.md)

---

Made with the [hypercasual-game-template](https://github.com/kingdannydushime1/hypercasual-game-template)
and the **playgama-game-maker** skill.
