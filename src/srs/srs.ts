/**
 * Répétition espacée (FSRS) appliquée au répertoire.
 * Une carte = un coup de l'utilisateur dans une position. Une révision = une ligne complète de l'arbre
 * qui passe par les cartes à revoir.
 */
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card } from 'ts-fsrs';
import type { RepTree } from '../chess/tree';
import { cardId } from '../chess/tree';
import { Chess } from 'chess.js';
import { epd, START_FEN, uciOf } from '../chess/notation';

const scheduler = fsrs(generatorParameters({ enable_fuzz: true, request_retention: 0.9, maximum_interval: 365 }));

export { Rating, State };
export type { Card };

export function newCard(now = new Date()): Card {
  return createEmptyCard(now);
}

/** Note une carte : juste du premier coup → Good ; avec erreur → Again. */
export function grade(card: Card | undefined, ok: boolean, now = new Date()): Card {
  const c = card ? reviveCard(card) : newCard(now);
  return scheduler.next(c, now, ok ? Rating.Good : Rating.Again).card;
}

/** Les dates sont des chaînes après un export JSON : on les reconstruit. */
export function reviveCard(c: Card): Card {
  return {
    ...c,
    due: new Date(c.due),
    last_review: c.last_review ? new Date(c.last_review) : undefined
  };
}

export function isDue(c: Card | undefined, now = new Date()): boolean {
  return !!c && new Date(c.due).getTime() <= now.getTime();
}

/** Niveau de mémorisation de 0 à 5 (pour l'affichage), d'après la stabilité en jours. */
export function masteryLevel(c: Card | undefined): number {
  if (!c || c.state === State.New) return 0;
  const s = c.stability;
  if (c.state === State.Learning || c.state === State.Relearning) return 1;
  if (s < 3) return 1;
  if (s < 7) return 2;
  if (s < 21) return 3;
  if (s < 60) return 4;
  return 5;
}

export interface PathCard {
  id: string;
  ply: number;
  san: string;
}

export interface TrainingPath {
  lineId: string;
  sans: string[];
  /** Cartes (coups de l'utilisateur) le long de la ligne. */
  cards: PathCard[];
  reason: 'due' | 'new' | 'practice';
}

/** Cartes d'une ligne pour le camp de l'arbre. */
export function cardsOnPath(tree: RepTree, sans: string[]): PathCard[] {
  const c = new Chess(START_FEN);
  const out: PathCard[] = [];
  sans.forEach((s, ply) => {
    const before = epd(c.fen());
    const turn = c.turn();
    const m = c.move(s);
    if (turn === tree.side) out.push({ id: cardId(tree.side, before, uciOf(m)), ply, san: m.san });
  });
  return out;
}

export interface PlanInput {
  trees: RepTree[];
  cards: Map<string, Card>;
  now: Date;
  /** Nouvelles cartes encore autorisées aujourd'hui. */
  newLeft: number;
  /** Lignes à éviter (dernière jouée). */
  avoid?: string;
  filter?: (lineId: string) => boolean;
  rnd?: () => number;
}

/**
 * Choisit la prochaine ligne à travailler :
 * 1. la ligne qui contient la carte la plus en retard ;
 * 2. sinon une ligne qui apporte de nouveaux coups (dans la limite du jour), en commençant par les plus courtes ;
 * 3. sinon une ligne au hasard (entraînement libre).
 */
export function planNext(inp: PlanInput): TrainingPath | null {
  const { cards, now } = inp;
  const rnd = inp.rnd ?? Math.random;
  const candidates: TrainingPath[] = [];
  for (const t of inp.trees) {
    for (const p of t.paths) {
      if (inp.filter && !inp.filter(p.lineId)) continue;
      candidates.push({ lineId: p.lineId, sans: p.sans, cards: cardsOnPath(t, p.sans), reason: 'practice' });
    }
  }
  if (!candidates.length) return null;

  const score = (p: TrainingPath) => {
    let overdue = -Infinity;
    let due = 0;
    let fresh = 0;
    for (const pc of p.cards) {
      const c = cards.get(pc.id);
      if (!c) fresh++;
      else if (isDue(c, now)) {
        due++;
        overdue = Math.max(overdue, now.getTime() - new Date(c.due).getTime());
      }
    }
    return { overdue, due, fresh };
  };

  const scored = candidates.map((p, idx) => ({ p, idx, ...score(p) }));
  const notAvoid = (x: { p: TrainingPath }) => x.p.lineId !== inp.avoid || scored.length === 1;

  const dueList = scored.filter((x) => x.due > 0 && notAvoid(x));
  if (dueList.length) {
    dueList.sort((a, b) => b.overdue - a.overdue || b.due - a.due);
    return { ...dueList[0].p, reason: 'due' };
  }
  if (inp.newLeft > 0) {
    const fresh = scored.filter((x) => x.fresh > 0 && notAvoid(x));
    if (fresh.length) {
      // Les lignes déjà commencées d'abord, puis dans l'ordre du répertoire (lignes principales en tête)
      const started = (x: (typeof scored)[number]) => (x.fresh < x.p.cards.length ? 1 : 0);
      fresh.sort((a, b) => started(b) - started(a) || a.idx - b.idx);
      return { ...fresh[0].p, reason: 'new' };
    }
  }
  const pool = scored.filter(notAvoid);
  const pick = pool[Math.floor(rnd() * pool.length)] ?? scored[0];
  return { ...pick.p, reason: 'practice' };
}

/** Nombre de cartes à revoir maintenant et de lignes concernées. */
export function dueSummary(trees: RepTree[], cards: Map<string, Card>, now = new Date()) {
  let dueCards = 0;
  const dueLines = new Set<string>();
  let fresh = 0;
  const seen = new Set<string>();
  for (const t of trees)
    for (const p of t.paths) {
      for (const pc of cardsOnPath(t, p.sans)) {
        const c = cards.get(pc.id);
        if (!c) {
          if (!seen.has(pc.id)) fresh++;
        } else if (isDue(c, now)) {
          dueLines.add(p.lineId);
          if (!seen.has(pc.id)) dueCards++;
        }
        seen.add(pc.id);
      }
    }
  return { dueCards, dueLines: dueLines.size, fresh };
}

/**
 * Décide quelles cartes noter à la fin d'une ligne.
 * - nouvelle carte ou carte à revoir : notée (Good si juste du premier coup, Again sinon) ;
 * - carte pas encore due : notée seulement en cas d'erreur (oubli = Again).
 */
export function gradesForRun(path: TrainingPath, errors: Set<string>, cards: Map<string, Card>, now = new Date()) {
  const out: { id: string; card: Card; ok: boolean }[] = [];
  const done = new Set<string>();
  for (const pc of path.cards) {
    if (done.has(pc.id)) continue;
    done.add(pc.id);
    const existing = cards.get(pc.id);
    const ok = !errors.has(pc.id);
    if (!existing || isDue(existing, now) || !ok) out.push({ id: pc.id, card: grade(existing, ok, now), ok });
  }
  return out;
}
