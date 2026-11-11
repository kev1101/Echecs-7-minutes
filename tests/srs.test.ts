import { describe, expect, it } from 'vitest';
import { buildTree } from '../src/chess/tree';
import { parsePgn } from '../src/chess/pgn';
import { cardsOnPath, dueSummary, grade, gradesForRun, isDue, masteryLevel, planNext, reviveCard, State, type Card } from '../src/srs/srs';

const tree = buildTree('b', [
  { id: 'ck', lines: parsePgn('1.e4 c6 2.d4 d5 3.e5 (3.Nc3 dxe4 4.Nxe4 Bf5) Bf5').lines },
  { id: 'sl', lines: parsePgn('1.d4 d5 2.c4 c6 3.Nf3 Nf6').lines }
]);
const day = 864e5;

describe('répétition espacée (FSRS)', () => {
  it('une carte réussie s’espace, une carte ratée revient vite', () => {
    const t0 = new Date('2026-03-01T10:00:00Z');
    let c = grade(undefined, true, t0);
    c = grade(c, true, new Date(c.due));
    c = grade(c, true, new Date(c.due));
    const okInterval = new Date(c.due).getTime() - (c.last_review as Date).getTime();
    expect(okInterval).toBeGreaterThan(3 * day);
    const failed = grade(c, false, new Date(c.due));
    const failInterval = new Date(failed.due).getTime() - (failed.last_review as Date).getTime();
    expect(failInterval).toBeLessThan(day);
    expect(failed.lapses).toBe(1);
  });

  it('les intervalles grandissent avec les réussites', () => {
    let c: Card | undefined;
    let now = new Date('2026-03-01T10:00:00Z');
    const intervals: number[] = [];
    for (let i = 0; i < 6; i++) {
      c = grade(c, true, now);
      intervals.push(new Date(c.due).getTime() - now.getTime());
      now = new Date(c.due);
    }
    for (let i = 2; i < intervals.length; i++) expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]);
    expect(masteryLevel(c)).toBeGreaterThanOrEqual(3);
  });

  it('reconstruit les dates après un export JSON', () => {
    const c = grade(undefined, true, new Date('2026-03-01T10:00:00Z'));
    const back = reviveCard(JSON.parse(JSON.stringify(c)));
    expect(back.due).toBeInstanceOf(Date);
    expect(grade(back, true, new Date('2026-03-05T10:00:00Z')).reps).toBe(2);
  });

  it('les cartes sont les coups de l’utilisateur seulement', () => {
    const cards = cardsOnPath(tree, ['e4', 'c6', 'd4', 'd5']);
    expect(cards.map((c) => c.san)).toEqual(['c6', 'd5']);
    expect(cards.map((c) => c.ply)).toEqual([1, 3]);
  });
});

describe('choix de la ligne à travailler', () => {
  const now = new Date('2026-03-10T10:00:00Z');

  it('propose d’abord la ligne la plus en retard', () => {
    const cards = new Map<string, Card>();
    for (const p of tree.paths) for (const pc of cardsOnPath(tree, p.sans)) {
      cards.set(pc.id, { ...grade(undefined, true, new Date('2026-03-01T10:00:00Z')), due: new Date('2026-04-01T00:00:00Z') });
    }
    // La carte 3...dxe4 est en retard de 5 jours
    const target = cardsOnPath(tree, tree.paths.find((p) => p.sans.includes('Nc3'))!.sans).find((c) => c.san === 'dxe4')!;
    cards.set(target.id, { ...cards.get(target.id)!, due: new Date('2026-03-05T10:00:00Z') });
    const plan = planNext({ trees: [tree], cards, now, newLeft: 10 });
    expect(plan?.reason).toBe('due');
    expect(plan?.sans).toContain('dxe4');
  });

  it('introduit de nouveaux coups dans la limite du jour', () => {
    const plan = planNext({ trees: [tree], cards: new Map(), now, newLeft: 5 });
    expect(plan?.reason).toBe('new');
    const none = planNext({ trees: [tree], cards: new Map(), now, newLeft: 0, rnd: () => 0 });
    expect(none?.reason).toBe('practice');
  });

  it('compte les révisions dues', () => {
    const cards = new Map<string, Card>();
    const pcs = cardsOnPath(tree, tree.paths[0].sans);
    cards.set(pcs[0].id, { ...grade(undefined, true, now), due: new Date('2026-03-01T00:00:00Z') });
    const s = dueSummary([tree], cards, now);
    expect(s.dueCards).toBe(1);
    expect(s.dueLines).toBeGreaterThanOrEqual(1);
    expect(s.fresh).toBeGreaterThan(0);
  });

  it('note les nouvelles cartes et les erreurs, pas les cartes non dues réussies', () => {
    const path = planNext({ trees: [tree], cards: new Map(), now, newLeft: 5 })!;
    const cards = new Map<string, Card>();
    const first = path.cards[0];
    cards.set(first.id, { ...grade(undefined, true, now), due: new Date('2026-05-01T00:00:00Z'), state: State.Review });
    const g1 = gradesForRun(path, new Set(), cards, now);
    expect(g1.find((g) => g.id === first.id)).toBeUndefined();
    expect(g1.length).toBe(path.cards.length - 1);
    const g2 = gradesForRun(path, new Set([first.id]), cards, now);
    const lapse = g2.find((g) => g.id === first.id)!;
    expect(lapse.ok).toBe(false);
    expect(isDue(lapse.card, new Date(now.getTime() + day))).toBe(true);
  });
});
