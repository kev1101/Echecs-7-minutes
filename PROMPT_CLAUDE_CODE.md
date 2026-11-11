# Application de révision des échecs : « Échecs en 7 minutes »

Tu travailles dans le dossier `~/Desktop/Echecs`. Il contient déjà un prototype fonctionnel dans `prototype/` :
- `prototype/index.html` : l'application complète en une page (moteur maison, interface, contenu). Ouvre-la dans un navigateur pour voir le comportement attendu.
- `prototype/content.js` : le contenu déjà vérifié (répertoire d'ouvertures, problèmes, finales, questions de stratégie).

Lis ces deux fichiers avant de commencer. Le but est de transformer ce prototype en une vraie application, installable sur mon téléphone et mon ordinateur, que j'utilise 5 à 10 minutes par jour.

## Qui je suis

- Joueur d'environ 1200 Elo, qui veut remonter. Le niveau doit s'adapter automatiquement et rester réglable à la main.
- Répertoire : 1.e4 avec les blancs ; Caro-Kann contre 1.e4 et Slave contre 1.d4 avec les noirs.
- Interface entièrement en français, notation française (R, D, T, F, C).

## Ce que l'application doit faire

Une séance quotidienne de 7 minutes environ (chronomètre, objectif du jour, série de jours consécutifs), avec un thème qui tourne chaque jour et la possibilité d'en choisir un autre :

1. **Ouvertures** : je rejoue mes lignes de répertoire coup par coup, l'adversaire joue automatiquement. Révision par répétition espacée (algorithme FSRS ou SM-2) : une ligne ratée revient vite, une ligne sue s'espace. Je dois pouvoir ajouter mes propres lignes en collant un PGN, et voir le nom de l'ouverture (base ECO). Une ligne est un arbre, pas une seule suite : gérer les variantes adverses.
2. **Problèmes** : puzzles tirés de la base Lichess, choisis selon mon niveau et par thème (fourchette, clouage, mat en 2…). Classement de type Glicko pour moi et pour chaque puzzle. Indice, solution, et revoir plus tard les puzzles ratés.
3. **Stratégie** : positions tirées de mes ouvertures avec une question de plan (QCM) et une explication. Reprendre les 8 questions du prototype et en ajouter au moins 30, centrées sur les structures de mon répertoire (Caro-Kann, Slave, Italienne, Sicilienne, Française avance, pion isolé, attaque de minorité, bon et mauvais fou).
4. **Finales** : positions types à jouer contre Stockfish (R+D contre R, R+T contre R, opposition, règle du carré, Lucena, Philidor, finales de tours courantes). Vérifier le résultat avec les tables de finales Syzygy (API Lichess) quand le réseau est disponible.
5. **Partie commentée** : partie contre Stockfish réglé sur mon niveau, couleurs alternées. L'ordinateur suit mon répertoire tant que c'est possible. Chaque coup que je joue est évalué (théorie, bon coup, imprécision, erreur, gaffe), avec le meilleur coup, la menace adverse et une explication en langage clair. Barre d'évaluation, reprise de coup, bilan en fin de partie et relecture de la partie.

## Choix techniques

- Vite + React + TypeScript, en PWA installable et utilisable hors ligne (vite-plugin-pwa).
- Règles et notation : chess.js. Échiquier : chessground (celui de Lichess) ou react-chessboard, avec glisser-déposer et clic, choix de la pièce de promotion, et flèches pour les indices.
- Moteur : Stockfish compilé en WebAssembly, version « lite » mono-thread lancée dans un Web Worker (pour éviter d'avoir besoin des en-têtes COOP/COEP). Force réglée avec `UCI_LimitStrength` + `UCI_Elo` quand c'est possible, et `Skill Level` en dessous du minimum de `UCI_Elo`.
- Données stockées localement dans IndexedDB (Dexie), avec export et import en JSON pour passer d'un appareil à l'autre.
- Données libres de droits à préparer par un script dans `scripts/` (ne pas tout charger dans l'appli) :
  - puzzles Lichess (database.lichess.org, licence CC0) : filtrer entre 600 et 2000 de classement, garder environ 20 000 puzzles répartis par thème, les découper en fichiers JSON par tranche de classement ;
  - noms d'ouvertures : dépôt `lichess-org/chess-openings` (CC0).
- **Commentaires rédigés par Claude** (optionnel, activable dans les réglages) : après l'analyse Stockfish, envoyer la position, le coup joué, le meilleur coup et l'écart d'évaluation à l'API Anthropic pour obtenir une explication de 2 ou 3 phrases adaptée à un joueur de 1200. Utiliser un modèle léger et peu coûteux (Haiku). La clé API est saisie par moi dans les réglages et stockée seulement sur l'appareil. Sans clé, garder les commentaires générés par règles du prototype. Prévoir un plafond de dépense (nombre d'appels par partie).

## Méthode de travail

1. Commence par me proposer un plan court (architecture, structure des dossiers, étapes) et attends mon accord.
2. Avance par étapes, chacune utilisable, dans cet ordre : échiquier + Stockfish → partie commentée → ouvertures avec répétition espacée → puzzles Lichess → finales → stratégie → commentaires par Claude → PWA et déploiement.
3. Initialise un dépôt git et fais un commit à chaque étape terminée.
4. Écris des tests (Vitest) pour la logique : répétition espacée, classement, sélection des puzzles, vérification des lignes d'ouverture, résultat des finales.
5. Vérifie toi-même que chaque position et chaque solution que tu ajoutes est légale et correcte, avec chess.js et Stockfish. Ne laisse aucun contenu d'échecs non vérifié.
6. Garde le design du prototype (échiquier vert et ivoire, panneau à droite, mode sombre) et assure-toi qu'il marche bien sur téléphone.
7. À la fin, déploie sur GitHub Pages ou Vercel (gratuit) et explique-moi comment l'installer sur mon iPhone et mon Mac.

Pose-moi tes questions si un choix important n'est pas clair, sinon prends une décision raisonnable et signale-la.
