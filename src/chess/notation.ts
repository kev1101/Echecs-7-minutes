import { Chess, type Move, type Square } from 'chess.js';

export type Color = 'w' | 'b';
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const FR: Record<string, string> = { K: 'R', Q: 'D', R: 'T', B: 'F', N: 'C' };

/** Notation anglaise (chess.js) vers notation française : Nf3 → Cf3, e8=Q → e8=D. */
export function fr(san: string): string {
  return san.replace(/[KQRBN]/g, (c) => FR[c]);
}

/** SAN française vers SAN anglaise (Cf3 → Nf3, Re2 → Ke2). À n'utiliser qu'en second essai. */
const EN: Record<string, string> = { R: 'K', D: 'Q', T: 'R', F: 'B', C: 'N' };
export function frToSan(tok: string): string {
  return tok.replace(/[RDTFC]/g, (c) => EN[c]);
}

/** Joue un jeton SAN en acceptant la notation anglaise ou française. */
export function playSanAny(chess: Chess, tok: string): Move | null {
  const clean = tok.replace(/[!?]+$/, '').replace(/^0-0-0/, 'O-O-O').replace(/^0-0/, 'O-O');
  return playSan(chess, clean) ?? playSan(chess, frToSan(clean));
}

export const sideName = (c: Color) => (c === 'w' ? 'Blancs' : 'Noirs');
export const sideLower = (c: Color) => (c === 'w' ? 'blancs' : 'noirs');
export const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

export const PIECE_NAME: Record<string, string> = {
  p: 'un pion', n: 'un cavalier', b: 'un fou', r: 'une tour', q: 'la dame', k: 'le roi'
};
export const PIECE_SHORT: Record<string, string> = {
  p: 'pion', n: 'cavalier', b: 'fou', r: 'tour', q: 'dame', k: 'roi'
};
export const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Clé de position sans compteurs (pour les transpositions). */
export function epd(fen: string): string {
  const [board, turn, castle, ep] = fen.split(' ');
  return `${board} ${turn} ${castle} ${ep}`;
}

/** Cases de destination légales, au format attendu par chessground. */
export function dests(chess: Chess): Map<Square, Square[]> {
  const map = new Map<Square, Square[]>();
  for (const m of chess.moves({ verbose: true })) {
    const list = map.get(m.from) ?? [];
    list.push(m.to);
    map.set(m.from, list);
  }
  return map;
}

export function uciOf(m: Pick<Move, 'from' | 'to' | 'promotion'>): string {
  return m.from + m.to + (m.promotion ?? '');
}

/** Joue un coup UCI (e2e4, e7e8q) ; renvoie le coup ou null s'il est illégal. */
export function playUci(chess: Chess, uci: string): Move | null {
  try {
    return chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  } catch {
    return null;
  }
}

export function playSan(chess: Chess, san: string): Move | null {
  try {
    return chess.move(san);
  } catch {
    return null;
  }
}

/** Convertit une suite UCI en SAN depuis une position. */
export function uciLineToSan(fen: string, ucis: string[]): string[] {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const u of ucis) {
    const m = playUci(c, u);
    if (!m) break;
    out.push(m.san);
  }
  return out;
}

/** « 1.e4 e5 2.Cf3 » à partir d'une liste de SAN et du numéro/trait de départ. */
export function formatLine(sans: string[], startFen = START_FEN, french = true): string {
  const parts = startFen.split(' ');
  let ply = (Number(parts[5] ?? 1) - 1) * 2 + (parts[1] === 'b' ? 1 : 0);
  const out: string[] = [];
  sans.forEach((s, i) => {
    const num = Math.floor(ply / 2) + 1;
    if (ply % 2 === 0) out.push(`${num}.`);
    else if (i === 0) out.push(`${num}...`);
    out.push(french ? fr(s) : s);
    ply++;
  });
  return out.join(' ').replace(/(\d+\.) /g, '$1');
}

/** Découpe « 1.e4 e5 2.Nf3 » en jetons SAN. */
export function tokens(moves: string): string[] {
  return moves
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\d+\.(\.\.)?/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Rejoue une suite de SAN ; lève une erreur si un coup est illégal. */
export function replay(moves: string | string[], fen = START_FEN): Chess {
  const c = new Chess(fen);
  for (const t of Array.isArray(moves) ? moves : tokens(moves)) {
    if (!playSan(c, t)) throw new Error(`Coup illégal : ${t} (après ${c.history().join(' ')})`);
  }
  return c;
}

/** Position avec le trait inversé (pour chercher la « menace »). Null si impossible (échec). */
export function nullMoveFen(fen: string): string | null {
  const p = fen.split(' ');
  p[1] = p[1] === 'w' ? 'b' : 'w';
  p[3] = '-';
  const f = p.join(' ');
  try {
    const c = new Chess(f);
    // Si le camp qui ne joue pas est en échec, la position est illégale
    const t = new Chess(fen);
    if (t.inCheck()) return null;
    return c.fen();
  } catch {
    return null;
  }
}
