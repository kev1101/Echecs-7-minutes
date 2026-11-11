import type { RepLine } from '../chess/tree';

/**
 * Répertoire intégré. side = camp de l'utilisateur.
 * Chaque entrée peut contenir des variantes adverses entre parenthèses (PGN).
 * Vérifié par tests/content.test.ts (légalité, pas de conflit dans les coups de l'utilisateur).
 */
export const REPERTOIRE: RepLine[] = [
  // ---------- Blancs : 1.e4 ----------
  {
    id: 'w-ita', side: 'w', group: 'Blancs · 1.e4', name: 'Italienne (Giuoco Pianissimo)',
    pgn: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d3 d6 (5...a6 6.O-O d6 7.a4) (5...O-O 6.O-O d6 7.Re1) 6.O-O O-O 7.Re1 a6 8.a4',
    idea: 'c3 et d3 : centre solide, puis Cbd2-f1-g3 et la poussée d4 au bon moment. a4 empêche ...b5 qui chasserait le fou.'
  },
  {
    id: 'w-2c', side: 'w', group: 'Blancs · 1.e4', name: 'Deux cavaliers (4.d3)',
    pgn: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.d3 Be7 (4...Bc5 5.c3 d6 6.O-O O-O 7.Re1) (4...h6 5.O-O d6 6.c3) 5.O-O O-O 6.Re1 d6 7.c3',
    idea: '4.d3 évite les complications de 4.Cg5 et garde une structure de type Italienne.'
  },
  {
    id: 'w-sic', side: 'w', group: 'Blancs · 1.e4', name: 'Sicilienne ouverte (2...d6)',
    pgn: '1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 (5...Nc6 6.Be2 e5 7.Nb3) (5...g6 6.Be2 Bg7 7.O-O O-O 8.Be3) 6.Be2 e5 7.Nb3 Be7 8.O-O',
    idea: '6.Fe2 est le système le plus calme : développement, roque, puis f4 ou Fe3. Contre le Dragon, même plan.'
  },
  {
    id: 'w-sv', side: 'w', group: 'Blancs · 1.e4', name: 'Sicilienne 2...Cc6',
    pgn: '1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 (4...g6 5.Nc3 Bg7 6.Be3 Nf6 7.Be2) (4...e6 5.Nc3 Qc7 6.Be2) 5.Nc3 e5 (5...d6 6.Be2 e5 7.Nb3) 6.Ndb5 d6 7.Bg5 a6 8.Na3',
    idea: 'Contre la Sveshnikov, la case d5 est affaiblie par ...e5 : les blancs veulent la contrôler (Fxf6, Cd5).'
  },
  {
    id: 'w-sic-e6', side: 'w', group: 'Blancs · 1.e4', name: 'Sicilienne 2...e6',
    pgn: '1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 (4...Nc6 5.Nc3 Qc7 6.Be2 a6 7.O-O) (4...Nf6 5.Nc3 d6 6.Be2) 5.Bd3 Nf6 6.O-O Qc7 7.Qe2',
    idea: 'Contre la Kan, Fd3 et c4 ou Cc3 : un centre solide sans complications théoriques.'
  },
  {
    id: 'w-fr', side: 'w', group: 'Blancs · 1.e4', name: 'Française avance',
    pgn: '1.e4 e6 2.d4 d5 3.e5 c5 (3...Nc6 4.Nf3 Nge7 5.c3) 4.c3 Nc6 (4...Qb6 5.Nf3 Bd7 6.a3) 5.Nf3 Qb6 (5...Bd7 6.Be2 Nge7 7.O-O) 6.a3',
    idea: 'La chaîne d4-e5 gagne de l’espace ; 6.a3 prépare b4 et protège contre ...Fb4.'
  },
  {
    id: 'w-ck', side: 'w', group: 'Blancs · 1.e4', name: 'Caro-Kann avance (Short)',
    pgn: '1.e4 c6 2.d4 d5 3.e5 Bf5 (3...c5 4.dxc5 e6 5.Nf3 Bxc5 6.Bd3) 4.Nf3 e6 5.Be2 c5 (5...Nd7 6.O-O Ne7 7.Nbd2) 6.Be3',
    idea: 'Développement simple, roque rapide ; Fe3 soutient d4 contre ...c5.'
  },
  {
    id: 'w-sc', side: 'w', group: 'Blancs · 1.e4', name: 'Scandinave',
    pgn: '1.e4 d5 2.exd5 Qxd5 (2...Nf6 3.d4 Nxd5 4.Nf3 g6 5.Be2) 3.Nc3 Qa5 (3...Qd6 4.d4 Nf6 5.Nf3 a6 6.g3) (3...Qd8 4.d4 Nf6 5.Nf3 c6 6.Bc4) 4.d4 Nf6 5.Nf3 c6 6.Bc4 Bf5 7.Bd2 e6',
    idea: 'Gain de temps sur la dame, Fc4 et Fd2 : les blancs ont une avance de développement.'
  },
  {
    id: 'w-pirc', side: 'w', group: 'Blancs · 1.e4', name: 'Pirc / Moderne (attaque 150)',
    pgn: '1.e4 d6 (1...g6 2.d4 Bg7 3.Nc3 d6 4.Be3 Nf6 5.Qd2) 2.d4 Nf6 3.Nc3 g6 (3...e5 4.Nf3 Nbd7 5.Bc4 Be7 6.O-O) 4.Be3 Bg7 5.Qd2',
    idea: 'Fe3 + Dd2 visent Fh6 pour échanger le fou g7, puis grand roque et attaque à l’aile roi.'
  },
  {
    id: 'w-alek', side: 'w', group: 'Blancs · 1.e4', name: 'Alekhine',
    pgn: '1.e4 Nf6 2.e5 Nd5 3.d4 d6 4.Nf3 Bg4 (4...g6 5.Bc4 Nb6 6.Bb3 Bg7 7.Qe2) 5.Be2 e6 6.O-O Be7 7.c4 Nb6 8.h3',
    idea: 'Les blancs gardent un centre fort sans le surétendre : développement classique et c4.'
  },
  {
    id: 'w-petrov', side: 'w', group: 'Blancs · 1.e4', name: 'Petrov',
    pgn: '1.e4 e5 2.Nf3 Nf6 3.Nxe5 d6 4.Nf3 Nxe4 5.d4 d5 6.Bd3 Nc6 7.O-O Be7 8.c4',
    idea: 'Ne pas jouer 4.Cxf7 ? ! Après 4.Cf3, c4 attaque le centre noir.'
  },
  {
    id: 'w-phil', side: 'w', group: 'Blancs · 1.e4', name: 'Philidor et contre-gambits',
    pgn: '1.e4 e5 2.Nf3 d6 (2...f5 3.Nxe5 Qf6 4.d4 d6 5.Nc4 fxe4 6.Nc3) 3.d4 exd4 (3...Nf6 4.Nc3 Nbd7 5.Bc4 Be7 6.O-O) 4.Nxd4 Nf6 5.Nc3 Be7 6.Bf4 O-O 7.Qd2',
    idea: 'Contre la Philidor, centre et développement rapide ; les blancs ont plus d’espace.'
  },

  // ---------- Noirs : Caro-Kann ----------
  {
    id: 'b-ck-av', side: 'b', group: 'Noirs · Caro-Kann', name: 'Caro-Kann avance',
    pgn: '1.e4 c6 2.d4 d5 3.e5 Bf5 4.Nf3 (4.Nc3 e6 5.g4 Bg6 6.Nge2 c5) (4.Bd3 Bxd3 5.Qxd3 e6 6.Nf3 Qb6) e6 5.Be2 Nd7 6.O-O Ne7 7.Nbd2 h6',
    idea: 'Le fou f5 sort avant ...e6. ...h6 offre une retraite au fou (h7) contre Ch4. Contre 4.Fd3, échangez et ...Db6.'
  },
  {
    id: 'b-ck-cl', side: 'b', group: 'Noirs · Caro-Kann', name: 'Caro-Kann classique',
    pgn: '1.e4 c6 2.d4 d5 3.Nc3 (3.Nd2 dxe4 4.Nxe4 Bf5 5.Ng3 Bg6) dxe4 4.Nxe4 Bf5 5.Ng3 Bg6 6.h4 h6 7.Nf3 Nd7 8.h5 Bh7 9.Bd3 Bxd3 10.Qxd3 e6',
    idea: 'Échange du bon fou blanc ; structure solide, ...Cgf6, ...Fe7/Fd6 et ...c5 plus tard.'
  },
  {
    id: 'b-ck-ex', side: 'b', group: 'Noirs · Caro-Kann', name: 'Caro-Kann échange',
    pgn: '1.e4 c6 2.d4 d5 3.exd5 cxd5 4.Bd3 (4.Nf3 Nc6 5.Bb5 Bg4) Nc6 5.c3 Nf6 6.Bf4 Bg4 7.Qb3 Qd7',
    idea: '...Fg4 sort le fou avant ...e6 ; 7...Dd7 défend b7 sans difficulté.'
  },
  {
    id: 'b-ck-pa', side: 'b', group: 'Noirs · Caro-Kann', name: 'Caro-Kann Panov',
    pgn: '1.e4 c6 2.d4 d5 3.exd5 cxd5 4.c4 Nf6 5.Nc3 e6 6.Nf3 Be7 7.cxd5 (7.Bd3 dxc4 8.Bxc4 O-O 9.O-O Nc6) Nxd5 8.Bd3 Nc6 9.O-O O-O',
    idea: 'Les blancs ont un pion isolé en d4 : bloquez-le (case d5) et échangez des pièces.'
  },
  {
    id: 'b-ck-2c', side: 'b', group: 'Noirs · Caro-Kann', name: 'Caro-Kann deux cavaliers',
    pgn: '1.e4 c6 2.Nc3 d5 3.Nf3 Bg4 4.h3 Bxf3 5.Qxf3 e6 6.d3 (6.d4 dxe4 7.Nxe4 Qxd4 8.Bd3 Nd7) (6.Be2 Nf6 7.O-O Nbd7) Nf6 7.Be2 Nbd7 8.O-O Bc5',
    idea: 'Le fou g4 s’échange contre le cavalier ; ...e6 et ...Cf6 donnent une position solide.'
  },
  {
    id: 'b-ck-fant', side: 'b', group: 'Noirs · Caro-Kann', name: 'Caro-Kann fantaisie (3.f3)',
    pgn: '1.e4 c6 2.d4 d5 3.f3 e6 4.Nc3 Bb4 5.Bd2 Ne7 6.a3 Bxc3 7.Bxc3 dxe4 8.fxe4 Nd7',
    idea: 'Contre f3, ...e6 et ...Fb4 visent les cases noires affaiblies.'
  },
  {
    id: 'b-ck-misc', side: 'b', group: 'Noirs · Caro-Kann', name: 'Contre 2.d3 et 2.c4',
    pgn: '1.e4 c6 2.d3 (2.c4 d5 3.exd5 cxd5 4.cxd5 Nf6 5.Nc3 Nxd5) d5 3.Nd2 e5 4.Ngf3 Bd6 5.g3 Nf6 6.Bg2 O-O 7.O-O',
    idea: 'Contre le système fermé, prenez le centre avec ...d5 et ...e5.'
  },

  // ---------- Noirs : Slave et 1.d4 ----------
  {
    id: 'b-sl-main', side: 'b', group: 'Noirs · Slave', name: 'Slave principale (5.a4)',
    pgn: '1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 dxc4 5.a4 (5.e4 b5 6.e5 Nd5 7.a4 e6) Bf5 6.e3 (6.Ne5 e6 7.f3 c5 8.e4 cxd4) e6 7.Bxc4 Bb4 8.O-O O-O 9.Qe2 Nbd7',
    idea: 'Le fou c8 sort en f5 avant ...e6 : c’est tout l’intérêt de la Slave.'
  },
  {
    id: 'b-sl-ex', side: 'b', group: 'Noirs · Slave', name: 'Slave échange',
    pgn: '1.d4 d5 2.c4 c6 3.cxd5 cxd5 4.Nc3 Nf6 5.Bf4 (5.Nf3 Nc6 6.Bf4 Bf5 7.e3 e6) Nc6 6.e3 Bf5 7.Nf3 e6 8.Qb3 Bb4 9.Bb5 O-O',
    idea: 'Structure symétrique : la colonne c ouverte et l’activité des pièces décident.'
  },
  {
    id: 'b-sl-e3', side: 'b', group: 'Noirs · Slave', name: 'Slave 4.e3',
    pgn: '1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.e3 Bf5 5.Nc3 e6 6.Nh4 (6.Bd3 Bxd3 7.Qxd3 Nbd7 8.O-O Bd6) Bg6 7.Nxg6 hxg6 8.Bd3 Nbd7',
    idea: 'Après Cxg6 hxg6, la colonne h semi-ouverte compense la paire de fous.'
  },
  {
    id: 'b-sl-nc3', side: 'b', group: 'Noirs · Slave', name: 'Slave 3.Nc3 / 3.e3',
    pgn: '1.d4 d5 2.c4 c6 3.Nc3 (3.e3 Nf6 4.Nc3 a6) Nf6 4.e3 (4.Bg5 dxc4 5.e3 b5) a6 5.Nf3 b5 6.b3 Bg4',
    idea: 'Contre 3.Cc3 et e3, ...a6 et ...b5 gagnent de l’espace à l’aile dame.'
  },
  {
    id: 'b-sl-cat', side: 'b', group: 'Noirs · Slave', name: 'Slave contre g3',
    pgn: '1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.g3 dxc4 5.Bg2 b5 6.Ne5 Nd5 7.O-O Bb7',
    idea: 'Contre le fianchetto, ...dxc4 et ...b5 gardent le pion ; le fou va en b7.'
  },
  {
    id: 'b-lon', side: 'b', group: 'Noirs · 1.d4', name: 'Contre le Londres',
    pgn: '1.d4 d5 2.Bf4 (2.Nf3 Nf6 3.Bf4 c5 4.e3 Nc6 5.c3 Qb6) c5 3.e3 Nc6 4.Nf3 (4.c3 Qb6 5.Qb3 c4 6.Qc2 Bf5) Nf6 5.c3 Qb6 6.Qb3 c4 7.Qc2 Bf5',
    idea: '...Db6 vise b2 ; si Db3, ...c4 gagne de l’espace et chasse la dame.'
  },
  {
    id: 'b-col', side: 'b', group: 'Noirs · 1.d4', name: 'Contre Colle et systèmes',
    pgn: '1.d4 d5 2.Nf3 Nf6 3.e3 (3.Bg5 Ne4 4.Bf4 c5 5.e3 Nc6) Bf5 4.Bd3 e6 5.Bxf5 exf5 6.Qd3 Qc8',
    idea: 'Contre e3 et Fd3, ...Ff5 échange le fou actif des blancs.'
  },
  {
    id: 'b-c4', side: 'b', group: 'Noirs · Autres', name: 'Contre 1.c4 et 1.Nf3',
    pgn: '1.c4 (1.Nf3 d5 2.g3 Nf6 3.Bg2 c6 4.O-O Bg4) c6 2.Nf3 (2.e4 d5 3.exd5 cxd5 4.d4 Nf6) d5 3.e3 Nf6 4.Nc3 e6 5.d4 Nbd7',
    idea: 'Visez une structure Slave avec ...c6 et ...d5 : vous restez en terrain connu.'
  }
];
