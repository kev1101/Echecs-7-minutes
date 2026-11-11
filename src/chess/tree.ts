import { Chess } from 'chess.js';
import { epd, START_FEN, uciOf, type Color } from './notation';

export interface RepLine {
  id: string;
  side: Color;
  group: string;
  name: string;
  /** PGN (variantes possibles) ou suite de coups. */
  pgn: string;
  idea?: string;
  custom?: boolean;
}

export interface Edge {
  uci: string;
  san: string;
  to: string; // epd du nœud suivant
  lineIds: Set<string>;
}

export interface TreeNode {
  epd: string;
  fen: string;
  turn: Color;
  children: Map<string, Edge>; // uci → arête
  depth: number;
}

/** Arbre de répertoire d'un camp ; les transpositions partagent le même nœud. */
export interface RepTree {
  side: Color;
  root: string;
  nodes: Map<string, TreeNode>;
  /** Chemins complets (racine → feuille) avec leur ligne d'origine. */
  paths: { lineId: string; sans: string[] }[];
}

export function buildTree(side: Color, entries: { id: string; lines: string[][] }[]): RepTree {
  const nodes = new Map<string, TreeNode>();
  const rootChess = new Chess(START_FEN);
  const root = epd(rootChess.fen());
  nodes.set(root, { epd: root, fen: rootChess.fen(), turn: 'w', children: new Map(), depth: 0 });
  const paths: RepTree['paths'] = [];
  for (const e of entries) {
    for (const sans of e.lines) {
      const c = new Chess(START_FEN);
      let cur = nodes.get(root)!;
      for (const s of sans) {
        const m = c.move(s);
        const key = epd(c.fen());
        let next = nodes.get(key);
        if (!next) {
          next = { epd: key, fen: c.fen(), turn: c.turn() as Color, children: new Map(), depth: cur.depth + 1 };
          nodes.set(key, next);
        }
        const u = uciOf(m);
        let edge = cur.children.get(u);
        if (!edge) {
          edge = { uci: u, san: m.san, to: key, lineIds: new Set() };
          cur.children.set(u, edge);
        }
        edge.lineIds.add(e.id);
        cur = next;
      }
      paths.push({ lineId: e.id, sans });
    }
  }
  return { side, root, nodes, paths };
}

/** Coups du répertoire dans une position (null si hors répertoire). */
export function bookMoves(tree: RepTree, fen: string): Edge[] | null {
  const n = tree.nodes.get(epd(fen));
  if (!n || n.children.size === 0) return null;
  return [...n.children.values()];
}

/** Identifiant de carte : un coup de l'utilisateur dans une position. */
export const cardId = (side: Color, positionEpd: string, uci: string) => `${side}|${positionEpd}|${uci}`;

/** Toutes les cartes (coups de l'utilisateur) de l'arbre. */
export function userMoves(tree: RepTree): { id: string; epd: string; uci: string; san: string; lineIds: Set<string> }[] {
  const out: ReturnType<typeof userMoves> = [];
  for (const n of tree.nodes.values()) {
    if (n.turn !== tree.side) continue;
    for (const e of n.children.values()) out.push({ id: cardId(tree.side, n.epd, e.uci), epd: n.epd, uci: e.uci, san: e.san, lineIds: e.lineIds });
  }
  return out;
}

/**
 * Conflits : deux coups différents pour l'utilisateur dans la même position.
 * Un répertoire doit donner une seule réponse par position.
 */
export function conflicts(tree: RepTree): { epd: string; sans: string[] }[] {
  const out: { epd: string; sans: string[] }[] = [];
  for (const n of tree.nodes.values()) {
    if (n.turn === tree.side && n.children.size > 1) out.push({ epd: n.epd, sans: [...n.children.values()].map((e) => e.san) });
  }
  return out;
}
