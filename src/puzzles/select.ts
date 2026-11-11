/** Sélection des puzzles selon le niveau, le thème et les puzzles ratés à revoir. */
import type { PuzzleRow } from '../db/db';

export interface Puzzle {
  id: string;
  fen: string;
  /** Coups UCI : le premier est joué par l'adversaire, puis l'utilisateur. */
  moves: string[];
  rating: number;
  rd: number;
  themes: string[];
}

export type PuzzleTuple = [string, string, string, number, number, string];

export function fromTuple(t: PuzzleTuple): Puzzle {
  return { id: t[0], fen: t[1], moves: t[2].split(' '), rating: t[3], rd: t[4], themes: t[5].split(' ') };
}

export interface Bucket {
  file: string;
  min: number;
  max: number;
  count: number;
}

/** Tranches à charger pour viser `target` ± `spread`. */
export function bucketsFor(target: number, buckets: Bucket[], spread = 150): Bucket[] {
  const lo = target - spread;
  const hi = target + spread;
  const hit = buckets.filter((b) => b.max > lo && b.min < hi);
  if (hit.length) return hit;
  // Hors de la plage disponible : la tranche la plus proche
  const sorted = [...buckets].sort((a, b) => Math.abs((a.min + a.max) / 2 - target) - Math.abs((b.min + b.max) / 2 - target));
  return sorted.slice(0, 1);
}

/** Intervalles de révision d'un puzzle raté (jours). */
export const REVIEW_STEPS = [1, 3, 7, 21];
const DAY = 864e5;

/**
 * Programme la prochaine révision d'un puzzle.
 * Raté → revient demain (étape 0). Réussi lors d'une révision → étape suivante, puis sort de la file.
 */
export function scheduleReview(prev: PuzzleRow | undefined, ok: boolean, now: number): { reviewAt: number | null; reviewStep: number } {
  if (!ok) return { reviewAt: now + REVIEW_STEPS[0] * DAY, reviewStep: 0 };
  if (!prev || prev.reviewAt === null) return { reviewAt: null, reviewStep: 0 };
  const step = prev.reviewStep + 1;
  if (step >= REVIEW_STEPS.length) return { reviewAt: null, reviewStep: step };
  return { reviewAt: now + REVIEW_STEPS[step] * DAY, reviewStep: step };
}

export interface PickInput {
  pool: Puzzle[];
  states: Map<string, PuzzleRow>;
  userRating: number;
  theme: string | null;
  now: number;
  /** Probabilité de proposer un puzzle raté à revoir s'il y en a. */
  reviewChance?: number;
  /** Puzzles à revoir (déjà chargés). */
  reviewPool?: Puzzle[];
  exclude?: Set<string>;
  rnd?: () => number;
}

export interface Pick {
  puzzle: Puzzle;
  review: boolean;
}

/** Puzzles ratés dont la révision est due. */
export function dueReviews(states: Map<string, PuzzleRow>, now: number): string[] {
  return [...states.values()].filter((s) => s.reviewAt !== null && s.reviewAt <= now).sort((a, b) => a.reviewAt! - b.reviewAt!).map((s) => s.id);
}

export function pickPuzzle(inp: PickInput): Pick | null {
  const rnd = inp.rnd ?? Math.random;
  const ex = inp.exclude ?? new Set<string>();
  const matchTheme = (p: Puzzle) => !inp.theme || p.themes.includes(inp.theme);

  // 1. Révision d'un puzzle raté
  const due = new Set(dueReviews(inp.states, inp.now));
  const reviews = (inp.reviewPool ?? []).filter((p) => due.has(p.id) && !ex.has(p.id) && matchTheme(p));
  if (reviews.length && rnd() < (inp.reviewChance ?? 0.35)) return { puzzle: reviews[0], review: true };

  // 2. Nouveau puzzle près du niveau : cible légèrement au-dessus pour progresser
  const target = inp.userRating + Math.round((rnd() - 0.35) * 200);
  const fresh = inp.pool.filter((p) => !inp.states.has(p.id) && !ex.has(p.id) && matchTheme(p));
  const list = fresh.length ? fresh : inp.pool.filter((p) => !ex.has(p.id) && matchTheme(p));
  if (!list.length) return reviews.length ? { puzzle: reviews[0], review: true } : null;
  const close = [...list].sort((a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target)).slice(0, 12);
  return { puzzle: close[Math.floor(rnd() * close.length)], review: false };
}

/** Le coup joué est-il accepté ? Le coup attendu, ou n'importe quel mat au dernier coup (comme sur Lichess). */
export function acceptMove(played: string, expected: string, isMate: boolean, isLastMove: boolean): boolean {
  if (played === expected) return true;
  // Promotion : e7e8 sans pièce = dame par défaut
  if (expected.length === 5 && played.length === 4 && played === expected.slice(0, 4) && expected[4] === 'q') return true;
  return isLastMove && isMate;
}
