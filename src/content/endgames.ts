import type { Color } from '../chess/notation';

export type EndGoal = 'mate' | 'promote' | 'draw';

export interface Endgame {
  id: string;
  name: string;
  fen: string;
  /** Camp de l'utilisateur. */
  user: Color;
  goal: EndGoal;
  /** Nombre maximal de coups de l'utilisateur. Pour « draw » : coups à tenir. */
  limit: number;
  tip: string;
  /** Résultat théorique attendu pour l'utilisateur (vérifié par Syzygy ou Stockfish dans tests/verify). */
  expected: 'win' | 'draw';
}

export const ENDGAMES: Endgame[] = [
  {
    id: 'kqk', name: 'Roi + Dame contre Roi', fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1', user: 'w', goal: 'mate', limit: 20, expected: 'win',
    tip: 'Réduisez la cage du roi avec la dame (à un saut de cavalier), puis amenez votre roi. Attention au pat !'
  },
  {
    id: 'krk', name: 'Roi + Tour contre Roi', fen: '8/8/8/3k4/8/8/8/R3K3 w - - 0 1', user: 'w', goal: 'mate', limit: 35, expected: 'win',
    tip: 'Coupez le roi avec la tour, rapprochez votre roi, et utilisez l’opposition pour repousser le roi adverse jusqu’au bord.'
  },
  {
    id: 'krrk', name: 'Mat de l’escalier (deux tours)', fen: '8/8/8/4k3/8/8/8/R3K2R w - - 0 1', user: 'w', goal: 'mate', limit: 12, expected: 'win',
    tip: 'Les tours avancent l’une après l’autre : une coupe une rangée, l’autre donne échec sur la suivante. Gardez-les loin du roi adverse.'
  },
  {
    id: 'kpk-win', name: 'Pion : le roi devant (opposition)', fen: '8/8/4k3/8/4K3/8/4P3/8 w - - 0 1', user: 'w', goal: 'promote', limit: 30, expected: 'win',
    tip: 'Votre roi devant le pion gagne s’il prend l’opposition. Ne poussez le pion qu’une fois la route ouverte : avancez d’abord le roi.'
  },
  {
    id: 'kpk-draw', name: 'Défendre la nulle (pion sur la 6e)', fen: '4k3/8/4P3/4K3/8/8/8/8 b - - 0 1', user: 'b', goal: 'draw', limit: 20, expected: 'draw',
    tip: 'Restez devant le pion. Quand le roi blanc arrive sur la 6e rangée, prenez l’opposition : le pat ou la répétition vous sauvent.'
  },
  {
    id: 'square', name: 'La règle du carré', fen: '8/8/8/p7/8/8/5K2/7k w - - 0 1', user: 'w', goal: 'draw', limit: 15, expected: 'draw',
    tip: 'Tracez le carré du pion (de a5 jusqu’à a1, puis e1 et e5). Si votre roi peut y entrer, il rattrape le pion. Entrez-y tout de suite !'
  },
  {
    id: 'rook-pawn', name: 'Pion de tour : rejoindre le coin', fen: '8/8/8/8/8/2k5/7P/6K1 b - - 0 1', user: 'b', goal: 'draw', limit: 20, expected: 'draw',
    tip: 'Contre un pion de tour, il suffit d’atteindre le coin de promotion (h1) ou de bloquer le roi blanc. Foncez vers l’aile roi.'
  },
  {
    id: 'lucena', name: 'Position de Lucena (faire le pont)', fen: '3K4/3P2k1/8/8/8/8/4r3/5R2 w - - 0 1', user: 'w', goal: 'promote', limit: 25, expected: 'win',
    tip: 'Le roi noir est coupé. Placez votre tour sur la 4e rangée (Tf4), sortez le roi, puis abritez-le des échecs derrière la tour : c’est « le pont ».'
  },
  {
    id: 'philidor', name: 'Position de Philidor (défendre)', fen: '4k3/R7/1r6/3KP3/8/8/8/8 b - - 0 1', user: 'b', goal: 'draw', limit: 25, expected: 'draw',
    tip: 'Gardez la tour sur la 6e rangée pour empêcher le roi blanc d’avancer. Quand le pion arrive en e6, passez derrière lui et donnez des échecs de loin.'
  },
  {
    id: 'breakthrough', name: 'La percée de pions', fen: '7k/ppp5/8/PPP5/8/8/8/7K w - - 0 1', user: 'w', goal: 'promote', limit: 12, expected: 'win',
    tip: 'Trois pions contre trois, rois loin : un sacrifice ouvre la route à un pion. Commencez par le pion du milieu (b6 !).'
  }
];
