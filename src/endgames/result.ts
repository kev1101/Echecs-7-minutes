/** Résultat d'un exercice de finale à partir de la position (règles pures, testées). */
import { Chess, type Move } from 'chess.js';
import type { Color } from '../chess/notation';
import type { EndGoal } from '../content/endgames';

export type EndState =
  | { done: false }
  | { done: true; ok: boolean; text: string };

export function endgameState(opts: {
  goal: EndGoal;
  user: Color;
  chess: Chess;
  last: Move | null;
  /** Coups joués par l'utilisateur. */
  n: number;
  limit: number;
  /** Verdict des tables après la promotion (null si inconnu). */
  verdictAfter?: 'win' | 'draw' | 'loss' | null;
}): EndState {
  const { goal, user, chess, last, n, limit, verdictAfter } = opts;
  const byUser = last ? last.color === user : false;
  const mate = chess.isCheckmate();
  const draw = chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial() || chess.isDrawByFiftyMoves();

  if (goal === 'mate') {
    if (mate && byUser) return { done: true, ok: true, text: `Mat en ${n} coups. Bravo !` };
    if (chess.isStalemate()) return { done: true, ok: false, text: 'Pat ! Laissez toujours une case de fuite au roi adverse.' };
    if (draw) return { done: true, ok: false, text: 'Partie nulle : il fallait aller plus vite vers le mat.' };
    if (last && !byUser && last.captured) return { done: true, ok: false, text: 'Vous avez perdu une pièce : le mat n’est plus possible.' };
  }
  if (goal === 'promote') {
    if (byUser && last?.promotion) {
      if (verdictAfter === 'draw' || verdictAfter === 'loss') {
        return { done: true, ok: false, text: 'Pion promu, mais l’adversaire peut forcer la nulle : il fallait mieux préparer la promotion.' };
      }
      return { done: true, ok: true, text: `Pion promu en ${n} coups : la finale est gagnée.` };
    }
    if (mate && byUser) return { done: true, ok: true, text: 'Mat ! Encore mieux que la promotion.' };
    if (last && !byUser && last.promotion) return { done: true, ok: false, text: 'L’adversaire a promu avant vous.' };
    if (draw) return { done: true, ok: false, text: chess.isStalemate() ? 'Pat : la partie est nulle.' : 'Le gain s’est envolé : la partie est nulle.' };
  }
  if (goal === 'draw') {
    if (mate) return { done: true, ok: false, text: 'Vous êtes mat.' };
    if (last && !byUser && last.promotion) return { done: true, ok: false, text: 'Le pion a été promu. Restez devant lui et prenez l’opposition.' };
    if (draw) return { done: true, ok: true, text: 'Nulle obtenue. Bien défendu !' };
    if (byUser && n >= limit) return { done: true, ok: true, text: `${limit} coups tenus sans promotion : la nulle est assurée.` };
  }
  if (byUser && n >= limit && goal !== 'draw') {
    return { done: true, ok: false, text: 'Limite de coups atteinte. Recommencez en suivant le conseil.' };
  }
  return { done: false };
}
