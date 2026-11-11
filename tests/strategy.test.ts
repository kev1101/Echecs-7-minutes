import { describe, expect, it } from 'vitest';
import { Chess, type Square } from 'chess.js';
import { STRATEGY, STRATEGY_THEMES, type Fact } from '../src/content/strategy';
import { replay } from '../src/chess/notation';

const isLight = (sq: string) => (sq.charCodeAt(0) - 96 + Number(sq[1])) % 2 === 1;

function checkFact(c: Chess, f: Fact): string | null {
  if ('attacks' in f) {
    const { from, to } = f.attacks;
    const p = c.get(from as Square);
    if (!p) return `pas de pièce en ${from}`;
    return c.attackers(to as Square, p.color).includes(from as Square) ? null : `${from} n’attaque pas ${to}`;
  }
  if ('piece' in f) {
    const p = c.get(f.piece.square as Square);
    return p && p.type === f.piece.type && p.color === f.piece.color ? null : `pièce attendue en ${f.piece.square}`;
  }
  if ('noPawnControl' in f) {
    const { square, by } = f.noPawnControl;
    // Un pion de `by` pourrait-il un jour attaquer la case ? (pion sur une colonne voisine, derrière la case)
    const file = square.charCodeAt(0);
    const rank = Number(square[1]);
    for (const row of c.board())
      for (const p of row) {
        if (!p || p.type !== 'p' || p.color !== by) continue;
        const df = Math.abs(p.square.charCodeAt(0) - file);
        const r = Number(p.square[1]);
        const behind = by === 'b' ? r > rank : r < rank;
        if (df === 1 && behind) return `le pion ${p.square} peut encore contrôler ${square}`;
      }
    return null;
  }
  if ('pawnsOnLight' in f) {
    for (const sq of f.pawnsOnLight.squares) {
      const p = c.get(sq as Square);
      if (!p || p.type !== 'p' || p.color !== f.pawnsOnLight.color) return `pas de pion en ${sq}`;
      if (!isLight(sq)) return `${sq} n’est pas une case blanche`;
    }
    return null;
  }
  return 'fait inconnu';
}

describe('questions de stratégie', () => {
  it('au moins 38 questions (8 du prototype + 30 nouvelles)', () => {
    expect(STRATEGY.length).toBeGreaterThanOrEqual(38);
    expect(new Set(STRATEGY.map((q) => q.id)).size).toBe(STRATEGY.length);
  });
  it('chaque thème a au moins 3 questions', () => {
    for (const t of STRATEGY_THEMES) expect(STRATEGY.filter((q) => q.theme === t).length).toBeGreaterThanOrEqual(3);
  });
  for (const q of STRATEGY) {
    it(`${q.id} : ligne légale, options distinctes, faits exacts`, () => {
      const c = replay(q.moves);
      expect(new Set(q.options).size).toBe(4);
      if (q.move) expect(() => new Chess(c.fen()).move(q.move!)).not.toThrow();
      for (const f of q.facts ?? []) expect(checkFact(c, f)).toBeNull();
    });
  }
});

describe('vérificateur de faits', () => {
  it('détecte un fait faux', () => {
    const c = replay('1.e4 e5');
    expect(checkFact(c, { attacks: { from: 'e4', to: 'e5' } })).not.toBeNull();
    expect(checkFact(c, { noPawnControl: { square: 'd5', by: 'w' } })).not.toBeNull();
    expect(isLight('d5')).toBe(true);
    expect(isLight('a1')).toBe(false);
  });
});

import { pickQuestion, nextBox, dueAt } from '../src/strategy/pick';
import type { StrategyRow } from '../src/db/db';

describe('choix des questions', () => {
  const qs = [
    { id: 'a', theme: 'X' },
    { id: 'b', theme: 'X' },
    { id: 'c', theme: 'Y' }
  ];
  const row = (id: string, o: Partial<StrategyRow>): StrategyRow => ({ id, seen: 1, right: 1, lastAt: 0, lastOk: true, box: 1, ...o });
  const DAY = 864e5;

  it('une question ratée revient dès qu’elle est due', () => {
    const rows = new Map([['b', row('b', { lastOk: false, box: 0 })]]);
    expect(pickQuestion(qs, rows, DAY)?.id).toBe('b');
  });
  it('puis les questions jamais vues, du thème le moins pratiqué', () => {
    const rows = new Map([['a', row('a', { lastAt: 0, box: 2 })]]);
    expect(pickQuestion(qs, rows, DAY)?.id).toBe('c');
  });
  it('les boîtes montent avec les réussites et retombent à 0 sur une erreur', () => {
    expect(nextBox(undefined, true)).toBe(1);
    expect(nextBox(row('a', { box: 4 }), true)).toBe(4);
    expect(nextBox(row('a', { box: 3 }), false)).toBe(0);
    expect(dueAt(row('a', { lastAt: 0, box: 3 }))).toBe(7 * DAY);
  });
});
