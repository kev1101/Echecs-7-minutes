import type { Color } from '../chess/notation';

/** Fait vérifiable par chess.js dans la position finale (tests/content.test.ts). */
export type Fact =
  | { attacks: { from: string; to: string } }
  | { piece: { square: string; type: string; color: Color } }
  | { noPawnControl: { square: string; by: Color } }
  | { pawnsOnLight: { color: Color; squares: string[] } };

export interface StrategyQ {
  id: string;
  theme: StrategyTheme;
  /** Coups depuis la position initiale (notation anglaise). */
  moves: string;
  /** Camp de l'utilisateur (orientation de l'échiquier). */
  side: Color;
  q: string;
  /** La première option est la bonne (l'ordre est mélangé à l'affichage). */
  options: [string, string, string, string];
  expl: string;
  /** Coup thématique (SAN) pour le camp au trait : vérifié par Stockfish (npm run verify). */
  move?: string;
  facts?: Fact[];
}

export type StrategyTheme =
  | 'Caro-Kann'
  | 'Slave'
  | 'Italienne'
  | 'Sicilienne'
  | 'Française avance'
  | 'Pion isolé'
  | 'Attaque de minorité'
  | 'Bon et mauvais fou';

export const STRATEGY_THEMES: StrategyTheme[] = [
  'Caro-Kann', 'Slave', 'Italienne', 'Sicilienne', 'Française avance', 'Pion isolé', 'Attaque de minorité', 'Bon et mauvais fou'
];

const CK_EX = '1.e4 c6 2.d4 d5 3.exd5 cxd5 4.Bd3 Nc6 5.c3 Nf6 6.Bf4 Bg4 7.Qb3 Qd7 8.Nd2 e6 9.Ngf3 Bd6';
const PANOV = '1.e4 c6 2.d4 d5 3.exd5 cxd5 4.c4 Nf6 5.Nc3 e6 6.Nf3 Be7 7.cxd5 Nxd5';
const ITA = '1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d3 d6 6.O-O O-O 7.Re1 a6 8.a4';

export const STRATEGY: StrategyQ[] = [
  // ---------- Les 8 questions du prototype ----------
  {
    id: 'p1', theme: 'Caro-Kann', moves: '1.e4 c6 2.d4 d5 3.e5 Bf5 4.Nf3 e6 5.Be2', side: 'b',
    q: 'Caro-Kann avance : quel est le plan typique des noirs ?',
    options: ['Attaquer la chaîne à sa base par ...c5', 'Jouer ...f6 tout de suite contre e5', 'Échanger ...Fxb1 pour gagner du temps', 'Préparer le grand roque par ...Dc7 puis ...O-O-O'],
    expl: 'La chaîne blanche d4-e5 s’attaque à sa base : d4. ...c5 (souvent après ...Cd7 et ...Ce7) est le levier principal. Votre fou f5 est déjà sorti de la chaîne : c’est l’avantage de la Caro-Kann sur la Française.',
    move: 'c5'
  },
  {
    id: 'p2', theme: 'Bon et mauvais fou', moves: '1.e4 e6 2.d4 d5 3.e5', side: 'w',
    q: 'Française avance : quel fou noir est le « mauvais fou » ?',
    options: ['Le fou c8', 'Le fou f8', 'Les deux', 'Aucun'],
    expl: 'Les pions noirs e6 et d5 sont sur cases blanches : le fou c8, qui circule sur ces cases, est enfermé. Côté blanc, gardez cette pression et évitez de libérer ce fou.',
    facts: [{ pawnsOnLight: { color: 'b', squares: ['d5', 'e6'] } }]
  },
  {
    id: 'p3', theme: 'Slave', moves: '1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 dxc4 5.a4', side: 'b',
    q: 'Slave : pourquoi les blancs jouent-ils 5.a4 ?',
    options: ['Pour empêcher ...b5, qui garderait le pion c4', 'Pour sortir la tour a1 par a3 vers l’aile roi', 'Pour préparer a5-a6 contre le pion b7', 'Pour faire de la place au fou f1 en a2'],
    expl: 'Sans a4, les noirs soutiendraient c4 avec ...b5. Le prix : la case b4 est affaiblie, d’où ...Fb4 dans la ligne principale. Les noirs profitent du temps pour jouer ...Ff5.',
    move: 'Bf5'
  },
  {
    id: 'p4', theme: 'Slave', moves: '1.d4 d5 2.c4 c6 3.cxd5 cxd5 4.Nc3 Nf6 5.Bf4 Nc6 6.e3 Bf5 7.Nf3 e6', side: 'b',
    q: 'Slave échange : quel est l’enjeu principal de cette structure symétrique ?',
    options: ['La colonne c ouverte', 'La poussée ...e5 immédiate', 'L’attaque sur le roi', 'Le pion faible en d5'],
    expl: 'Avec des pions symétriques, celui qui contrôle la colonne c (tours en c1/c8, cavalier en b5/b4) prend souvent l’initiative. Le premier à y installer ses tours a l’avantage.'
  },
  {
    id: 'p5', theme: 'Caro-Kann', moves: '1.e4 c6 2.d4 d5 3.exd5 cxd5 4.Bd3 Nc6 5.c3 Nf6 6.Bf4 Bg4 7.Qb3', side: 'b',
    q: 'Caro-Kann échange : que vise 7.Db3 ?',
    options: ['Le pion b7, tout en pressant d5', 'Le pion f7 et le roi noir en e8', 'Le fou g4, laissé sans défense', 'La case h7, avec Fxh7 à suivre'],
    expl: 'La dame b3 attaque b7, désormais non protégé par le fou parti en g4. 7...Dd7 défend tout simplement b7, et les noirs continuent avec ...e6.',
    move: 'Qd7',
    facts: [{ attacks: { from: 'b3', to: 'b7' } }]
  },
  {
    id: 'p6', theme: 'Caro-Kann', moves: '1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Bf5 5.Ng3 Bg6 6.h4 h6 7.Nf3 Nd7 8.h5', side: 'b',
    q: 'Caro-Kann classique : quel est le but de h4-h5 ?',
    options: ['Chasser le fou g6 et prendre de l’espace', 'Ouvrir la colonne h pour la tour immédiatement', 'Préparer g4-g5 contre le cavalier f6', 'Bloquer définitivement le pion h6'],
    expl: 'h4-h5 chasse le fou en h7 et fixe un pion en h5 qui gêne un futur petit roque noir. C’est pourquoi les blancs font souvent le grand roque dans cette ligne.',
    move: 'Bh7',
    facts: [{ attacks: { from: 'h5', to: 'g6' } }]
  },
  {
    id: 'p7', theme: 'Italienne', moves: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d3 d6 6.O-O O-O 7.Re1', side: 'w',
    q: 'Italienne lente : quel est le plan typique des blancs ?',
    options: ['Cbd2-f1-g3, puis d4 au bon moment', 'Attaquer tout de suite avec g4', 'Sacrifier Fxf7+ pour attirer le roi', 'Jouer b4-b5 sans préparation'],
    expl: 'Le cavalier b1 passe par d2 et f1 pour aller en g3, d’où il vise f5 et h5. Fb3 met le fou à l’abri de ...Ca5 ; d3-d4 vient quand le centre est prêt.'
  },
  {
    id: 'p8', theme: 'Pion isolé', moves: '1.e4 c6 2.d4 d5 3.exd5 cxd5 4.c4 Nf6 5.Nc3 e6 6.Nf3 Be7 7.cxd5 Nxd5 8.Bd3 Nc6 9.O-O O-O', side: 'b',
    q: 'Panov : comment jouer contre le pion isolé d4 ?',
    options: ['Le bloquer sur d5 et échanger des pièces', 'Ouvrir le jeu avec ...e5', 'Attaquer l’aile roi blanche', 'Garder toutes les pièces sur l’échiquier'],
    expl: 'Le pion isolé donne de l’activité en milieu de partie mais devient faible en finale. Gardez un cavalier en d5, échangez les pièces actives et visez le pion d4.',
    facts: [{ piece: { square: 'd5', type: 'n', color: 'b' } }]
  },

  // ---------- Caro-Kann ----------
  {
    id: 'ck1', theme: 'Caro-Kann', moves: '1.e4 c6 2.d4 d5 3.e5 Bf5 4.Nf3 e6 5.Be2 Nd7 6.O-O Ne7', side: 'b',
    q: 'Caro-Kann avance : pourquoi le cavalier va-t-il en e7 plutôt qu’en f6 ?',
    options: ['Le pion e5 chasserait un cavalier posté en f6', 'Pour préparer la poussée ...f6 immédiatement', 'Pour protéger le pion d5 une troisième fois', 'Pour libérer la case f8 au roi noir'],
    expl: 'Le pion e5 contrôle f6. Depuis e7, le cavalier peut aller en g6 (il défend alors le fou) ou en c6 pour soutenir ...c5, sans gêner le fou f5.',
    facts: [{ attacks: { from: 'e5', to: 'f6' } }]
  },
  {
    id: 'ck2', theme: 'Caro-Kann', moves: '1.e4 c6 2.d4 d5 3.e5 Bf5 4.Nf3 e6 5.Be2 Nd7 6.O-O', side: 'b',
    q: 'Les blancs menacent souvent Ch4 pour échanger le fou f5. Quelle précaution prendre ?',
    options: ['...h6, pour que le fou puisse reculer en h7', '...g5, pour interdire h4 au cavalier', '...Fg4, pour clouer le cavalier f3', '...Db6, pour attaquer b2 et d4'],
    expl: 'Après ...h6, si Ch4 alors ...Fh7 : le fou reste sur la diagonale b1-h7 sans pouvoir être échangé. Votre ligne joue ...Ce7 puis ...h6.',
    move: 'h6'
  },
  {
    id: 'ck3', theme: 'Caro-Kann', moves: '1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Bf5 5.Ng3 Bg6 6.h4 h6 7.Nf3 Nd7 8.h5 Bh7 9.Bd3 Bxd3 10.Qxd3 e6 11.Bd2 Ngf6 12.O-O-O', side: 'b',
    q: 'Caro-Kann classique : les blancs ont fait le grand roque. Quel placement est le plus courant pour le roi noir ?',
    options: ['Le grand roque, après ...Dc7', 'Le petit roque tout de suite', 'Rester au centre jusqu’à la finale', 'Roquer seulement après ...g5'],
    expl: 'Avec un pion blanc en h5, le petit roque offrirait une cible (g4-g5 ouvre des lignes). Les noirs jouent souvent ...Dc7 et ...O-O-O : la structure c6-e6 protège bien le roi.',
    move: 'Qc7'
  },
  {
    id: 'ck4', theme: 'Caro-Kann', moves: CK_EX, side: 'b',
    q: 'Caro-Kann échange : quel plan d’aile dame s’offre aux noirs dans cette structure ?',
    options: ['L’attaque de minorité avec ...b5-b4', 'Pousser ...e5 pour libérer le jeu', 'Attaquer à l’aile roi avec ...h5-h4', 'Échanger toutes les tours sur la colonne e'],
    expl: 'C’est une structure « Carlsbad » inversée : les noirs ont deux pions (a7, b7) contre trois (a2, b2, c3). En avançant ...b5-b4, ils créent une faiblesse en c3 ou en d4.'
  },
  {
    id: 'ck5', theme: 'Caro-Kann', moves: '1.e4 c6 2.Nc3 d5 3.Nf3 Bg4 4.h3 Bxf3 5.Qxf3 e6', side: 'b',
    q: 'Deux cavaliers : pourquoi les noirs donnent-ils la paire de fous avec ...Fxf3 ?',
    options: ['Le fou s’échange avant ...e6 et la structure reste solide', 'Pour attirer la dame blanche en f3 et l’attaquer', 'Parce que le fou ne pouvait plus reculer', 'Pour ouvrir la colonne g au profit de la tour'],
    expl: 'Les blancs ont la paire de fous, mais les noirs n’ont plus de « mauvais fou » et se développent sans problème : ...Cf6, ...Cbd7, ...Fe7 ou ...Fc5.'
  },
  {
    id: 'ck6', theme: 'Caro-Kann', moves: '1.e4 c6 2.d4 d5 3.e5 Bf5 4.Nf3 e6 5.Be2 c5 6.Be3', side: 'b',
    q: 'Après ...c5 et Fe3, quelle est l’idée des noirs ?',
    options: ['Presser d4 avec ...Cc6, ...Db6 et ...cxd4', 'Jouer ...f6 pour ouvrir la colonne f', 'Échanger les dames pour simplifier', 'Pousser ...c4 pour fermer l’aile dame'],
    expl: 'Le pion d4 est la base de la chaîne. Les noirs l’attaquent avec ...c5, ...Cc6 et ...Db6 (qui vise aussi b2). ...c4 relâcherait cette pression.',
    move: 'cxd4'
  },

  // ---------- Slave ----------
  {
    id: 'sl1', theme: 'Slave', moves: '1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 dxc4 5.a4 Bf5 6.e3 e6 7.Bxc4 Bb4', side: 'b',
    q: 'Slave principale : pourquoi ...Fb4 ?',
    options: ['Pour clouer le cavalier c3 et freiner e4', 'Pour gagner le pion a4 par ...Da5', 'Pour doubler les pions blancs à tout prix', 'Pour préparer une attaque sur le roi blanc'],
    expl: 'La poussée e4 libérerait le jeu blanc. ...Fb4 cloue le cavalier qui soutient e4, en profitant de la case b4 affaiblie par a4.',
    facts: [{ attacks: { from: 'b4', to: 'c3' } }]
  },
  {
    id: 'sl2', theme: 'Slave', moves: '1.d4 d5 2.c4 c6 3.cxd5 cxd5 4.Nc3 Nf6 5.Bf4 Nc6 6.e3 Bf5 7.Nf3 e6 8.Qb3', side: 'b',
    q: 'Slave échange : 8.Db3 attaque b7. Que jouent les noirs ?',
    options: ['...Fb4, qui cloue le cavalier c3', '...Tb8, pour défendre le pion b7', '...Dc8, pour garder le pion b7', '...b6, pour fermer la colonne b'],
    expl: '...Fb4 développe avec gain de temps : le cavalier c3 est cloué, et les noirs roquent ensuite. C’est la ligne de votre répertoire (9.Fb5 O-O).',
    move: 'Bb4',
    facts: [{ attacks: { from: 'b3', to: 'b7' } }]
  },
  {
    id: 'sl3', theme: 'Slave', moves: '1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.e3 Bf5 5.Nc3 e6 6.Nh4 Bg6 7.Nxg6 hxg6', side: 'b',
    q: 'Après Cxg6 hxg6, quelle compensation pour la paire de fous ?',
    options: ['La colonne h semi-ouverte et un centre solide', 'Un pion de plus et la meilleure structure', 'Le roi blanc coincé au centre pour longtemps', 'Aucune : c’est une erreur des noirs'],
    expl: 'La reprise vers le centre donne une colonne h semi-ouverte pour la tour h8 et une structure très solide. Les noirs se développent avec ...Cbd7, ...Fd6 ou ...Fb4.',
    facts: [{ attacks: { from: 'g6', to: 'f5' } }]
  },
  {
    id: 'sl4', theme: 'Slave', moves: '1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 dxc4 5.e4 b5 6.e5 Nd5', side: 'b',
    q: 'Contre 5.e4, pourquoi les noirs peuvent-ils garder le pion avec ...b5 ?',
    options: ['La chaîne b5-c4 tient, faute de a2-a4 préalable', 'Parce que le pion c4 est protégé par la dame', 'Parce que le pion e4 tombe juste après ...b5', 'Ils ne le peuvent pas : le pion sera repris'],
    expl: 'C’est pour cela que 5.a4 est la ligne principale. Après 5.e4 b5, les noirs ont un pion de plus mais doivent jouer précisément (...Cd5, ...e6) face au centre blanc.'
  },
  {
    id: 'sl5', theme: 'Bon et mauvais fou', moves: '1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 dxc4 5.a4 Bf5', side: 'b',
    q: 'Quel est l’avantage de la Slave par rapport au Gambit dame refusé avec ...e6 ?',
    options: ['Le fou c8 sort avant ...e6 et reste actif', 'La dame noire se développe plus vite', 'Le roi noir peut roquer plus vite', 'Le pion c4 est gagné pour toujours'],
    expl: 'Dans le Gambit dame refusé, ...e6 enferme le fou c8 : c’est le « problème du fou de la dame ». La Slave le résout en sortant le fou en f5 (ou g4) avant de jouer ...e6.'
  },
  {
    id: 'sl6', theme: 'Bon et mauvais fou', moves: '1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.e3', side: 'b',
    q: 'Contre 4.e3, pourquoi sortir le fou en f5 tout de suite ?',
    options: ['Pour le sortir avant ...e6, qui l’enfermerait', 'Pour attaquer c2 et gagner un pion', 'Pour préparer ...Fe4 puis ...Fxf3 au plus vite', 'Pour empêcher le petit roque blanc'],
    expl: 'Les blancs ont enfermé leur propre fou c1 avec e3 ; les noirs, eux, gardent un fou actif. Attention ensuite à cxd5 suivi de Db3, qui vise b7.',
    move: 'Bf5'
  },

  // ---------- Italienne ----------
  {
    id: 'it1', theme: 'Italienne', moves: ITA, side: 'w',
    q: 'Italienne : pourquoi 8.a4 ?',
    options: ['Pour empêcher ...b5, qui chasserait le fou c4', 'Pour préparer Ta3 et une attaque à l’aile roi', 'Pour attaquer le fou c5 avec b4 au coup suivant', 'Pour protéger le pion b2 de la dame noire'],
    expl: 'Après ...a6, les noirs menacent ...b5 puis ...Ca5 contre le fou. a4 garde le fou sur sa belle diagonale et gagne de l’espace à l’aile dame.'
  },
  {
    id: 'it2', theme: 'Italienne', moves: `${ITA} Ba7 9.h3`, side: 'w',
    q: 'Pourquoi les blancs jouent-ils souvent h3 dans l’Italienne lente ?',
    options: ['Pour empêcher le clouage ...Fg4', 'Pour préparer g4-g5 tout de suite', 'Pour libérer la case h2 à la tour', 'Pour attaquer le cavalier f6'],
    expl: 'Le cavalier f3 défend e5 et d4 ; cloué par ...Fg4, il serait gênant. h3 donne aussi une case de fuite au roi, utile quand le centre s’ouvrira.',
    facts: [{ attacks: { from: 'h3', to: 'g4' } }]
  },
  {
    id: 'it3', theme: 'Italienne', moves: `${ITA} Ba7 9.h3 h6 10.Nbd2 Re8 11.Nf1`, side: 'w',
    q: 'Pourquoi le cavalier passe-t-il par d2 et f1 ?',
    options: ['Pour aller en g3 sans gêner le fou c1', 'Pour défendre le pion e4 une fois de plus', 'Pour préparer la poussée c3-c4', 'Pour préparer l’échange du fou a7'],
    expl: 'En c3, le cavalier gênerait le pion c3. Par d2 et f1, il rejoint g3 (vers f5 et h5) ou e3 (vers d5 et f5). Ensuite vient la poussée d3-d4.'
  },
  {
    id: 'it4', theme: 'Italienne', moves: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.d3', side: 'w',
    q: 'Deux cavaliers : pourquoi 4.d3 plutôt que 4.Cg5 ?',
    options: ['4.d3 évite la théorie de 4.Cg5 et reste solide', '4.Cg5 est une erreur qui perd une pièce', '4.d3 prépare le grand roque blanc', '4.d3 prépare une attaque rapide sur f7'],
    expl: 'Après 4.Cg5 d5, les variantes sont tranchantes et demandent beaucoup de théorie. 4.d3 protège e4 et transpose vers des structures d’Italienne lente que vous connaissez.'
  },

  // ---------- Sicilienne ----------
  {
    id: 'sc1', theme: 'Sicilienne', moves: '1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be2 e5 7.Nb3', side: 'w',
    q: 'Najdorf avec ...e5 : quelle case est devenue faible chez les noirs ?',
    options: ['La case d5', 'La case f5', 'La case b5', 'La case h5'],
    expl: '...e5 chasse le cavalier mais laisse un trou en d5 et un pion d6 arriéré. Plan blanc : Fe3 ou Fg5, Cd5, et a4 pour empêcher ...b5.',
    facts: [{ noPawnControl: { square: 'd5', by: 'b' } }]
  },
  {
    id: 'sc2', theme: 'Sicilienne', moves: '1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be2 Bg7 7.O-O O-O 8.Be3 Nc6', side: 'w',
    q: 'Dragon, système avec Fe2 : quel plan simple pour les blancs ?',
    options: ['Cb3, puis f4 et Dd2, sans échanger en d4', 'Pousser h4-h5 malgré le petit roque', 'Cxc6, puis e5 sans préparation', 'Jouer g4-g5 contre le cavalier f6'],
    expl: 'Le cavalier d4 est exposé (...Cxd4, ...Cg4 contre Fe3). Cb3 l’en retire ; ensuite f4 et Dd2 donnent un jeu actif sans risque pour votre roi.',
    move: 'Nb3'
  },
  {
    id: 'sc3', theme: 'Sicilienne', moves: '1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e5 6.Ndb5 d6 7.Bg5 a6 8.Na3 b5 9.Bxf6 gxf6 10.Nd5', side: 'w',
    q: 'Sveshnikov : pourquoi les blancs ont-ils joué Fxf6 ?',
    options: ['Pour éliminer un défenseur de la case d5', 'Pour gagner un pion tout de suite', 'Pour doubler les pions et gagner la finale', 'Pour ouvrir la colonne g contre le roi noir'],
    expl: 'Le cavalier f6 contrôlait d5. Après Fxf6, le cavalier blanc s’installe en d5, une case que les pions noirs ne peuvent plus attaquer.',
    facts: [{ piece: { square: 'd5', type: 'n', color: 'w' } }, { noPawnControl: { square: 'd5', by: 'b' } }]
  },
  {
    id: 'sc4', theme: 'Sicilienne', moves: '1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Bd3 Nf6 6.O-O Qc7 7.Qe2 d6 8.c4', side: 'w',
    q: 'Kan : quelle structure les blancs installent-ils avec c4 ?',
    options: ['L’étau de Maroczy : c4 et e4 tiennent d5', 'Une chaîne de pions qui pointe vers e5', 'Un pion isolé en d4 soutenu par les pièces', 'Un gambit pour ouvrir la colonne c'],
    expl: 'Avec c4 et e4, les blancs empêchent ...d5 et ...b5, les leviers libérateurs des noirs. Les noirs manquent d’espace et doivent jouer avec patience.',
    facts: [{ attacks: { from: 'c4', to: 'd5' } }, { attacks: { from: 'e4', to: 'd5' } }]
  },

  // ---------- Française avance ----------
  {
    id: 'fr1', theme: 'Française avance', moves: '1.e4 e6 2.d4 d5 3.e5 c5 4.c3 Nc6 5.Nf3 Qb6', side: 'w',
    q: 'Française avance : que vise ...Db6 ?',
    options: ['Le pion d4, puis le pion b2', 'Le pion f2 et le roi blanc', 'Le pion e5, pour le gagner', 'Le cavalier b1, pour le clouer'],
    expl: 'Les noirs attaquent la base de la chaîne : d4, défendu par c3 et le cavalier f3. 6.a3 prépare b4 pour gagner de l’espace ; Fd3 ou Fe2 complète le développement.',
    move: 'a3',
    facts: [{ attacks: { from: 'b6', to: 'b2' } }]
  },
  {
    id: 'fr2', theme: 'Française avance', moves: '1.e4 e6 2.d4 d5 3.e5 c5 4.c3', side: 'w',
    q: 'Pourquoi 4.c3 ?',
    options: ['Pour soutenir d4 par un pion contre ...c5', 'Pour préparer Db3 tout de suite', 'Pour ouvrir la diagonale du fou f1', 'Pour préparer la poussée c3-c4 ensuite'],
    expl: 'Si d4 tombe, la pointe e5 n’est plus soutenue. c3 reprend en d4 avec un pion : la chaîne c3-d4-e5 reste intacte.',
    facts: [{ attacks: { from: 'c3', to: 'd4' } }]
  },
  {
    id: 'fr3', theme: 'Française avance', moves: '1.e4 e6 2.d4 d5 3.e5 c5 4.c3 Nc6 5.Nf3 Qb6 6.a3 c4', side: 'w',
    q: 'Après ...c4, la pression sur d4 disparaît. Quel levier reste aux noirs ?',
    options: ['...f6, contre la pointe e5', '...c3, contre la base b2', '...e5, pour ouvrir le centre', 'Aucun : la position est bloquée'],
    expl: 'Avec ...c4, les noirs gagnent de l’espace mais lâchent d4. Il leur reste ...f6 contre e5. Les blancs répondent par Cbd2, g3 et Fh3, et peuvent attaquer c4 avec b3.',
    move: 'Nbd2'
  },
  {
    id: 'fr4', theme: 'Française avance', moves: '1.e4 e6 2.d4 d5 3.e5', side: 'w',
    q: 'Quel avantage durable les blancs obtiennent-ils avec e5 ?',
    options: ['De l’espace : le cavalier noir perd f6', 'Un pion de plus au centre', 'La colonne e ouverte pour la tour', 'Une majorité de pions à l’aile dame'],
    expl: 'Le pion e5 prive les noirs de f6, leur meilleure case pour le cavalier, et gêne la défense du roi noir. En échange, les noirs attaquent la chaîne avec ...c5 et ...f6.',
    facts: [{ attacks: { from: 'e5', to: 'f6' } }]
  },

  // ---------- Pion isolé ----------
  {
    id: 'iq1', theme: 'Pion isolé', moves: `${PANOV} 8.Bd3 Nc6 9.O-O O-O 10.Re1 Bf6`, side: 'b',
    q: 'Pourquoi les blancs cherchent-ils souvent la poussée d4-d5 ?',
    options: ['Pour ouvrir le jeu et liquider le pion faible', 'Pour gagner une pièce par une fourchette', 'Pour promouvoir le pion d en finale', 'Pour enfermer durablement le fou c8'],
    expl: 'Le pion isolé est un atout dynamique (cases e5 et c5, lignes ouvertes) mais une faiblesse statique. Les blancs veulent l’échanger par d4-d5 au bon moment ; les noirs gardent un contrôle ferme de d5.'
  },
  {
    id: 'iq2', theme: 'Pion isolé', moves: PANOV, side: 'b',
    q: 'Quelle pièce bloque le mieux un pion isolé ?',
    options: ['Le cavalier', 'La dame', 'La tour', 'Le fou'],
    expl: 'Les blancs n’ont plus de pions c ou e pour attaquer d5 : un cavalier y est inamovible. De là, il contrôle aussi b4, c3, e3 et f4.',
    facts: [{ piece: { square: 'd5', type: 'n', color: 'b' } }, { noPawnControl: { square: 'd5', by: 'w' } }]
  },
  {
    id: 'iq3', theme: 'Pion isolé', moves: `${PANOV} 8.Bd3 Nc6 9.O-O O-O 10.Re1 Bf6 11.Be4 Nce7`, side: 'b',
    q: 'Si beaucoup de pièces s’échangent, qui profite de la structure ?',
    options: ['Les noirs : le pion d4 devient une cible', 'Les blancs : le pion isolé gagne en force', 'Personne : la structure est symétrique', 'Celui qui a le trait à ce moment'],
    expl: 'Sans pièces pour l’animer, le pion isolé ne peut être défendu que par des pièces. Les noirs échangent les pièces actives des blancs et attaquent d4 avec tours et cavaliers.'
  },

  // ---------- Attaque de minorité ----------
  {
    id: 'mi1', theme: 'Attaque de minorité', moves: `${CK_EX} 10.Bxd6 Qxd6 11.O-O O-O 12.Rae1 Rab8`, side: 'b',
    q: 'Pourquoi ...Tab8 ?',
    options: [
      'Pour préparer ...b5-b4 : l’attaque de minorité',
      'Pour mettre la tour à l’abri d’une attaque du fou d3',
      'Pour préparer le grand roque',
      'Pour doubler les tours sur la colonne b après ...b6'
    ],
    expl: 'La tour soutient l’avance ...b5-b4. Elle défend aussi b7 contre la dame b3. Les pions a7 et b7 vont attaquer la chaîne a2-b2-c3, plus nombreuse.'
  },
  {
    id: 'mi2', theme: 'Attaque de minorité', moves: `${CK_EX} 10.Bxd6 Qxd6 11.O-O O-O 12.Rae1 Rab8 13.Ne5 b5`, side: 'b',
    q: 'Les noirs poussent ...b5 puis ...b4. Quel est le but final ?',
    options: ['Créer un pion faible (c3 ou d4) à attaquer', 'Promouvoir le pion b en finale', 'Ouvrir la colonne h contre le roi blanc', 'Forcer l’échange des dames au plus vite'],
    expl: 'Après ...b4 et un échange en c3, les blancs gardent soit un pion c3 arriéré sur colonne ouverte, soit un pion d4 isolé. Les tours noires sur les colonnes b et c l’attaquent.'
  },
  {
    id: 'mi3', theme: 'Attaque de minorité', moves: `${CK_EX} 10.Bxd6 Qxd6 11.O-O O-O`, side: 'b',
    q: 'Pendant l’attaque de minorité noire, où les blancs cherchent-ils leur jeu ?',
    options: ['À l’aile roi, où ils ont plus de pièces', 'À l’aile dame, en poussant b4-b5', 'En échangeant toutes les pièces de l’aile roi', 'En amenant leur roi à l’aile dame'],
    expl: 'Dans cette structure, chaque camp joue de son côté. Les noirs doivent rester attentifs à leur roi : ...Ce4 et ...f6 servent souvent de défense contre Ce5.'
  },

  // ---------- Bon et mauvais fou ----------
  {
    id: 'bf1', theme: 'Bon et mauvais fou', moves: '1.e4 c6 2.d4 d5 3.e5 Bf5', side: 'b',
    q: 'Caro-Kann avance : pourquoi le fou c8 sort-il avant ...e6 ?',
    options: ['Pour ne pas être enfermé derrière les pions', 'Pour attaquer le pion e5 avec le fou', 'Pour préparer ...Fxb1 au coup suivant', 'Pour protéger le roi après le petit roque'],
    expl: 'Les pions noirs c6 et d5 sont sur cases blanches, et ...e6 suivra. Un fou de cases blanches enfermé derrière eux serait « mauvais » ; dehors, il est actif.',
    facts: [{ pawnsOnLight: { color: 'b', squares: ['c6', 'd5'] } }]
  },
  {
    id: 'bf2', theme: 'Bon et mauvais fou', moves: '1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Bf5 5.Ng3 Bg6 6.h4 h6 7.Nf3 Nd7 8.h5 Bh7 9.Bd3 Bxd3 10.Qxd3', side: 'b',
    q: 'Après l’échange des fous en d3, qu’ont gagné les noirs ?',
    options: ['Leur mauvais fou contre le bon fou blanc', 'Ils ont gagné un pion au passage', 'Le contrôle de la colonne h ouverte', 'Rien : ils ont juste perdu un temps précieux'],
    expl: 'Avec des pions en c6 et e6, le fou de cases blanches noir aurait peu d’avenir. L’échanger contre le fou d3, qui visait le roi, simplifie la défense.',
    move: 'e6'
  },
  {
    id: 'bf3', theme: 'Bon et mauvais fou', moves: '1.e4 e6 2.d4 d5 3.e5 c5 4.c3 Nc6 5.Nf3 Bd7', side: 'w',
    q: 'Pourquoi les noirs jouent-ils souvent ...Fd7 puis ...Fb5 ou ...Fa4 ?',
    options: ['Pour activer ou échanger leur mauvais fou', 'Pour protéger le pion d5 une fois de plus', 'Pour préparer le petit roque noir', 'Pour attaquer le pion e5 plus tard'],
    expl: 'Le fou c8 est bloqué par e6 et d5. Par d7 il peut sortir vers b5 (échange contre le fou f1) ou a4. Côté blanc, évitez les échanges qui soulagent ce fou.',
    facts: [{ pawnsOnLight: { color: 'b', squares: ['d5', 'e6'] } }]
  }
];
