/**
 * Explications en langage clair, générées par règles à partir des lignes de Stockfish.
 * Tout est calculé avec chess.js : rien n'est inventé.
 */
import { Chess, type Square, type Move } from 'chess.js';
import { fr, other, PIECE_NAME, PIECE_SHORT, playUci, VALUE, type Color } from '../chess/notation';
import { isMate } from './classify';
import { MATE_CP } from './stockfish';

/** Matériel des blancs moins celui des noirs (en pions). */
export function material(fen: string): number {
  const c = new Chess(fen);
  let s = 0;
  for (const row of c.board()) for (const p of row) if (p) s += (p.color === 'w' ? 1 : -1) * VALUE[p.type];
  return s;
}

export interface LineInfo {
  sans: string[];
  moves: Move[];
  /** Variation de matériel pour `color` à la fin de la ligne (en pions). */
  gain: number;
  mate: boolean;
  endFen: string;
  /** Pièces prises par `color` dans la ligne. */
  took: string[];
}

/**
 * Joue une ligne UCI et mesure le gain de matériel pour `color`.
 * La ligne est coupée au premier moment « calme » après `plies` demi-coups pour éviter de compter un échange en cours.
 */
export function lineInfo(fen: string, pv: string[], color: Color, plies = 4): LineInfo {
  const c = new Chess(fen);
  const start = material(fen);
  const moves: Move[] = [];
  for (const u of pv) {
    const m = playUci(c, u);
    if (!m) break;
    moves.push(m);
    // Au-delà de `plies`, on continue tant qu'il y a des prises (échanges en cours), jusqu'à 10 demi-coups
    if (moves.length >= plies && (!m.captured || moves.length >= 10)) break;
  }
  const sign = color === 'w' ? 1 : -1;
  return {
    sans: moves.map((m) => m.san),
    moves,
    gain: sign * (material(c.fen()) - start),
    mate: c.isCheckmate(),
    endFen: c.fen(),
    took: moves.filter((m) => m.color === color && m.captured).map((m) => m.captured as string)
  };
}

export function gainText(gain: number, took: string[] = []): string {
  const g = Math.round(gain);
  if (g >= 8) return 'gagne la dame';
  if (g >= 5) return 'gagne une tour';
  if (g === 2 && took.includes('r')) return 'gagne la qualité'; // tour contre pièce mineure
  if (g >= 3) return 'gagne une pièce';
  if (g === 2) return 'gagne deux pions';
  if (g === 1) return 'gagne un pion';
  return '';
}

/** Pièces de `color` attaquées et mal défendues (en prise) dans la position. */
export function hangingPieces(fen: string, color: Color): { square: Square; type: string }[] {
  const c = new Chess(fen);
  const out: { square: Square; type: string }[] = [];
  const opp = other(color);
  for (const row of c.board())
    for (const p of row) {
      if (!p || p.color !== color || p.type === 'k') continue;
      const attackers = c.attackers(p.square, opp);
      if (!attackers.length) continue;
      const defended = c.isAttacked(p.square, color);
      const cheapest = Math.min(...attackers.map((s) => VALUE[c.get(s)!.type] || 100));
      if (!defended || cheapest < VALUE[p.type]) out.push({ square: p.square, type: p.type });
    }
  return out;
}

function describeMove(m: Move): string {
  const bits: string[] = [];
  if (m.captured) bits.push(`prend ${PIECE_NAME[m.captured]}`);
  if (m.san.includes('#')) bits.push('mat');
  else if (m.san.includes('+')) bits.push('échec');
  if (m.promotion) bits.push('promotion');
  return bits.join(', ');
}

export interface Explanation {
  text: string;
  /** Meilleur coup en SAN anglaise (pour la flèche et l'API). */
  bestSan?: string;
  refutation?: string[];
}

/**
 * Explique un coup imprécis : ce que l'adversaire peut faire, et le meilleur coup.
 * fenBefore : position avant le coup ; bestPv : ligne du meilleur coup ; replyPv : meilleure réponse adverse après le coup joué.
 */
export function explainMistake(opts: {
  fenBefore: string;
  played: Move;
  bestPv: string[];
  bestCp: number;
  replyPv: string[];
  playedCp: number;
  severe: boolean;
}): Explanation {
  const { fenBefore, played, bestPv, replyPv, bestCp, playedCp, severe } = opts;
  const me = played.color as Color;
  const parts: string[] = [];
  const after = new Chess(fenBefore);
  after.move(played.san);
  const fenAfter = after.fen();

  // 1. La réfutation
  if (replyPv.length) {
    const r = lineInfo(fenAfter, replyPv, other(me), 4);
    const first = r.moves[0];
    if (isMate(playedCp) && playedCp < 0) {
      const n = Math.round((MATE_CP - Math.abs(playedCp)) / 10);
      parts.push(`Votre coup permet un mat${n > 1 ? ` en ${n}` : ''} : ${fr(r.sans.slice(0, 3).join(' '))}.`);
    } else if (first && r.gain >= 1) {
      const what = gainText(r.gain, r.took);
      parts.push(`L’adversaire répond ${fr(first.san)}${what ? ` et ${what}` : ''}${r.sans.length > 1 ? ` (${fr(r.sans.slice(0, 4).join(' '))})` : ''}.`);
    } else if (first && severe) {
      parts.push(`L’adversaire répond ${fr(first.san)}${describeMove(first) ? ` (${describeMove(first)})` : ''} et prend l’avantage.`);
    }
  }
  // 2. Pièce laissée en prise
  const hang = hangingPieces(fenAfter, me).filter((h) => h.square === played.to || severe);
  if (hang.length && !parts.some((p) => p.includes('gagne'))) {
    const h = hang[0];
    parts.push(`Attention : votre ${PIECE_SHORT[h.type]} en ${h.square} est en prise.`);
  }
  // 3. Le meilleur coup
  let bestSan: string | undefined;
  if (bestPv.length) {
    const b = lineInfo(fenBefore, bestPv, me, 4);
    const m = b.moves[0];
    if (m) {
      bestSan = m.san;
      const desc = describeMove(m);
      let idea = '';
      if (isMate(bestCp) && bestCp > 0) idea = 'qui mène au mat';
      else if (b.gain >= 1) idea = `qui ${gainText(b.gain, b.took)}`;
      parts.push(`Meilleur : ${fr(m.san)}${desc ? ` (${desc})` : ''}${idea ? `, ${idea}` : ''}.`);
    }
  }
  return { text: parts.join(' '), bestSan, refutation: replyPv };
}

/** Menace : ce que l'adversaire jouerait s'il rejouait tout de suite (analyse « coup nul »). */
export function describeThreat(fenNull: string, pv: string[], threatCp: number, baseCp: number): string | null {
  if (!pv.length) return null;
  const c = new Chess(fenNull);
  const them = c.turn() as Color;
  const r = lineInfo(fenNull, pv, them, 3);
  const first = r.moves[0];
  if (!first) return null;
  if (isMate(threatCp) && threatCp > 0) return `mat avec ${fr(r.sans.slice(0, 3).join(' '))}`;
  if (threatCp - baseCp < 150) return null;
  if (r.gain >= 1) return `${fr(first.san)}, qui ${gainText(r.gain, r.took)}`;
  if (first.captured) return `${fr(first.san)}, qui prend ${PIECE_NAME[first.captured]}`;
  return null;
}

/** Remarques générales (roque, dame sortie trop tôt, roi au centre). */
export function generalTips(opts: { fenAfter: string; played: Move; ply: number; good: boolean; seen: Set<string> }): string[] {
  const { fenAfter, played, ply, good, seen } = opts;
  const tips: string[] = [];
  if ((played.san.startsWith('O-O')) && good) tips.push('Le roque met le roi à l’abri et relie les tours.');
  if (played.piece === 'q' && ply <= 12 && !seen.has('q')) {
    seen.add('q');
    tips.push('Sortir la dame tôt l’expose aux attaques des pièces adverses : développez d’abord cavaliers et fous.');
  }
  const c = new Chess(fenAfter);
  const me = played.color;
  const king = me === 'w' ? 'e1' : 'e8';
  const rights = c.getCastlingRights(me);
  if (ply >= 20 && !seen.has('k') && c.get(king as Square)?.type === 'k' && (rights.k || rights.q)) {
    seen.add('k');
    tips.push('Pensez à roquer : votre roi est encore au centre.');
  }
  return tips;
}
