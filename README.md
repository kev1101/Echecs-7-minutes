# Échecs en 7 minutes

**Application en ligne : https://kev1101.github.io/Echecs-7-minutes/**

Une séance d’échecs quotidienne de 7 minutes, en français, qui fonctionne hors ligne et s’installe comme une application (PWA) sur le téléphone et sur l’ordinateur.

- **Ouvertures** : votre répertoire (1.e4 ; Caro-Kann et Slave avec les noirs) révisé par répétition espacée (FSRS), import PGN, noms ECO.
- **Problèmes** : 20 006 puzzles Lichess (600 à 2000), classement Glicko pour vous et pour chaque puzzle, indice, solution, révision des échecs.
- **Stratégie** : 41 questions de plan vérifiées par chess.js et Stockfish.
- **Finales** : 10 finales essentielles contre une défense parfaite (tables Syzygy en ligne, Stockfish hors ligne).
- **Partie commentée** : contre Stockfish à votre niveau, chaque coup classé et expliqué ; commentaires de Claude en option.

## Installer l’application

L’application est un site web installable. Une fois ouverte une première fois, elle fonctionne sans connexion (seules les tables de finales et les commentaires de Claude demandent Internet).

### Sur Android (Chrome)

1. Ouvrez l’adresse du site dans **Chrome**.
2. Touchez le bouton **⤓ Installer** dans la barre des thèmes, ou le menu **⋮** puis **Installer l’application** (ou **Ajouter à l’écran d’accueil**).
3. L’icône du cavalier apparaît sur l’écran d’accueil ; l’application s’ouvre en plein écran.

### Sur Mac

- **Chrome** : bouton **⤓ Installer**, ou l’icône d’installation à droite de la barre d’adresse. L’application apparaît dans le Launchpad et le Dock.
- **Safari** (macOS 14 ou plus récent) : menu **Fichier → Ajouter au Dock**.

### Passer d’un appareil à l’autre

Les progrès restent sur chaque appareil. Dans **⚙︎ Réglages**, **Exporter (JSON)** crée une sauvegarde ; **Importer…** la charge sur l’autre appareil. La clé API Claude n’est jamais exportée.

## Commentaires par Claude (facultatif)

Dans **⚙︎ Réglages**, collez une clé API Anthropic (créée sur console.anthropic.com), puis **Tester et enregistrer**. La clé reste sur l’appareil et l’appel part directement du navigateur vers l’API. Le modèle Claude Haiku coûte environ 0,02 centime par commentaire ; le nombre d’appels par partie est plafonné (10 par défaut). Les coups cités par Claude sont vérifiés par chess.js : en cas de doute, le commentaire de l’application est conservé.

## Développement

```bash
npm install          # copie aussi Stockfish dans public/engine
npm run dev          # serveur local sur http://localhost:5173
npm test             # tests unitaires (Vitest)
npm run verify       # vérification du contenu par Stockfish et Syzygy (lent, en ligne)
npm run build        # version de production dans dist/
```

Données :

- `npm run data:eco` régénère `public/data/eco.json` (noms d’ouvertures traduits).
- `npm run data:puzzles` télécharge la base Lichess (≈ 280 Mo) et régénère `public/data/puzzles/`.
- `python3 scripts/make-icons.py` régénère les icônes.

## Publication sur GitHub Pages

Le workflow `.github/workflows/deploy.yml` teste, construit et publie l’application à chaque push sur `main`. Une fois le dépôt créé sur GitHub : **Settings → Pages → Source : GitHub Actions**. Le site est alors disponible à `https://<utilisateur>.github.io/<dépôt>/`.

## Crédits et licences

- Moteur : [Stockfish](https://stockfishchess.org) (GPL v3, licence dans `public/engine/COPYING-stockfish.txt` ; sources sur github.com/official-stockfish/Stockfish).
- Problèmes et noms d’ouvertures : [Lichess](https://database.lichess.org) (CC0).
- Tables de finales : API Syzygy de Lichess.
- Échiquier : chessground (GPL v3), règles : chess.js (BSD).
