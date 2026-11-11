import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { endgameState } from '../src/endgames/result';
import { pieceCount, tbBestMove, verdictFor } from '../src/endgames/tablebase';
import { ENDGAMES } from '../src/content/endgames';

const play = (fen: string, moves: string[]) => {
  const c = new Chess(fen);
  let last = null;
  for (const m of moves) last = c.move(m);
  return { c, last };
};

describe('résultat des finales', () => {
  it('mat réussi', () => {
    const { c, last } = play('7k/8/6K1/8/8/8/8/Q7 w - - 0 1', ['Qa8#']);
    expect(endgameState({ goal: 'mate', user: 'w', chess: c, last, n: 5, limit: 20 })).toMatchObject({ done: true, ok: true });
  });
  it('pat = échec de l’exercice', () => {
    const { c, last } = play('7k/8/6K1/8/8/8/8/1Q6 w - - 0 1', ['Qb6']);
    expect(c.isStalemate()).toBe(false);
    const { c: c2, last: l2 } = play('7k/8/5K2/8/8/8/8/6Q1 w - - 0 1', ['Qg6']);
    expect(c2.isStalemate()).toBe(true);
    expect(endgameState({ goal: 'mate', user: 'w', chess: c2, last: l2, n: 3, limit: 20 })).toMatchObject({ done: true, ok: false });
    expect(endgameState({ goal: 'mate', user: 'w', chess: c, last, n: 3, limit: 20 })).toEqual({ done: false });
  });
  it('limite de coups', () => {
    const { c, last } = play('8/8/8/4k3/8/8/8/3QK3 w - - 0 1', ['Qd2']);
    expect(endgameState({ goal: 'mate', user: 'w', chess: c, last, n: 20, limit: 20 })).toMatchObject({ done: true, ok: false });
  });
  it('promotion gagnante, ou promotion qui ne gagne plus selon les tables', () => {
    const { c, last } = play('8/4P3/8/8/8/k7/8/4K3 w - - 0 1', ['e8=Q']);
    expect(endgameState({ goal: 'promote', user: 'w', chess: c, last, n: 4, limit: 30, verdictAfter: 'win' })).toMatchObject({ ok: true });
    expect(endgameState({ goal: 'promote', user: 'w', chess: c, last, n: 4, limit: 30, verdictAfter: 'draw' })).toMatchObject({ ok: false });
  });
  it('défense : tenir le nombre de coups, ou perdre si le pion passe', () => {
    const { c, last } = play('4k3/8/4P3/4K3/8/8/8/8 b - - 0 1', ['Ke7']);
    expect(endgameState({ goal: 'draw', user: 'b', chess: c, last, n: 20, limit: 20 })).toMatchObject({ done: true, ok: true });
    const { c: c2, last: l2 } = play('8/4P3/8/8/8/8/k7/4K3 w - - 0 1', ['e8=Q']);
    expect(endgameState({ goal: 'draw', user: 'b', chess: c2, last: l2, n: 3, limit: 20 })).toMatchObject({ done: true, ok: false });
  });
  it('défense : capturer le dernier pion donne la nulle', () => {
    const { c, last } = play('8/8/8/8/8/8/k6p/7K w - - 0 1', ['Kxh2']);
    expect(c.isInsufficientMaterial()).toBe(true);
    expect(endgameState({ goal: 'draw', user: 'w', chess: c, last, n: 6, limit: 15 })).toMatchObject({ done: true, ok: true });
  });
});

describe('tables Syzygy', () => {
  it('traduit la catégorie pour l’utilisateur', () => {
    expect(verdictFor('win', 'w', 'w')).toBe('win');
    expect(verdictFor('win', 'b', 'w')).toBe('loss');
    expect(verdictFor('loss', 'b', 'w')).toBe('win');
    expect(verdictFor('cursed-win', 'w', 'w')).toBe('draw');
    expect(verdictFor('unknown', 'w', 'w')).toBeNull();
  });
  it('meilleur coup = premier de la liste', () => {
    expect(tbBestMove({ category: 'win', dtm: 3, dtz: 3, moves: [{ uci: 'e2e4', san: 'e4', category: 'loss', dtm: 2, dtz: 2 }] })).toBe('e2e4');
    expect(tbBestMove(null)).toBeNull();
  });
  it('compte les pièces', () => {
    expect(pieceCount('8/8/8/4k3/8/8/8/3QK3 w - - 0 1')).toBe(3);
  });
});

describe('positions de finales', () => {
  it('sont légales et uniques', () => {
    for (const e of ENDGAMES) {
      const c = new Chess(e.fen);
      expect(c.turn()).toBe(e.user);
      expect(c.isGameOver()).toBe(false);
    }
    expect(new Set(ENDGAMES.map((e) => e.id)).size).toBe(ENDGAMES.length);
  });
});
