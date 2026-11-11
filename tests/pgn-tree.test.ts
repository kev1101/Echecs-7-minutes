import { describe, expect, it } from 'vitest';
import { parsePgn } from '../src/chess/pgn';
import { bookMoves, buildTree, conflicts, userMoves } from '../src/chess/tree';
import { fr, formatLine, START_FEN } from '../src/chess/notation';
import { REPERTOIRE } from '../src/content/repertoire';

describe('lecture PGN', () => {
  it('lit les variantes', () => {
    const p = parsePgn('1.e4 e5 (1...c5 2.Nf3 d6) 2.Nf3 Nc6 (2...d6 3.d4) 3.Bb5 *');
    expect(p.lines).toEqual([
      ['e4', 'c5', 'Nf3', 'd6'],
      ['e4', 'e5', 'Nf3', 'd6', 'd4'],
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']
    ]);
  });

  it('accepte la notation française et les en-têtes', () => {
    const p = parsePgn('[Event "Test"]\n[White "Moi"]\n\n1. e4 e5 2. Cf3 Cc6 3. Fc4 Cf6 4. O-O Fc5 5. Te1 1-0');
    expect(p.headers.White).toBe('Moi');
    expect(p.lines[0]).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'O-O', 'Bc5', 'Re1']);
  });

  it('ignore commentaires et NAG', () => {
    const p = parsePgn('1.e4 {le meilleur} c6!? $1 2.d4 d5');
    expect(p.lines[0]).toEqual(['e4', 'c6', 'd4', 'd5']);
  });

  it('signale un coup illégal', () => {
    expect(() => parsePgn('1.e4 e5 2.Ke2 Nc6 3.Qh7')).toThrow(/Qh7/);
  });
});

describe('arbre de répertoire', () => {
  it('fusionne les transpositions', () => {
    const t = buildTree('w', [
      { id: 'a', lines: [['e4', 'g6', 'd4', 'd6']] },
      { id: 'b', lines: [['e4', 'd6', 'd4', 'g6']] }
    ]);
    const after = [...t.nodes.values()].filter((n) => n.depth === 4);
    expect(after.length).toBe(1);
  });

  it('donne les coups du livre', () => {
    const t = buildTree('b', [{ id: 'x', lines: parsePgn('1.e4 c6 2.d4 d5 (2...e6)').lines }]);
    expect(bookMoves(t, START_FEN)?.map((e) => e.san)).toEqual(['e4']);
  });

  it('détecte deux réponses différentes dans la même position', () => {
    const t = buildTree('b', [{ id: 'x', lines: [['e4', 'c6'], ['e4', 'e5']] }]);
    expect(conflicts(t).length).toBe(1);
  });
});

describe('répertoire intégré', () => {
  for (const side of ['w', 'b'] as const) {
    it(`toutes les lignes ${side} sont légales et sans conflit`, () => {
      const entries = REPERTOIRE.filter((l) => l.side === side).map((l) => ({ id: l.id, lines: parsePgn(l.pgn).lines }));
      const t = buildTree(side, entries);
      expect(conflicts(t)).toEqual([]);
      expect(userMoves(t).length).toBeGreaterThan(30);
    });
  }
  it('les identifiants sont uniques', () => {
    expect(new Set(REPERTOIRE.map((l) => l.id)).size).toBe(REPERTOIRE.length);
  });
});

describe('notation française', () => {
  it('traduit les pièces', () => {
    expect(fr('Nf3')).toBe('Cf3');
    expect(fr('Qxd8+')).toBe('Dxd8+');
    expect(fr('e8=Q#')).toBe('e8=D#');
    expect(fr('Kxe2')).toBe('Rxe2');
    expect(fr('Rxa8')).toBe('Txa8');
  });
  it('numérote une ligne', () => {
    expect(formatLine(['e4', 'e5', 'Nf3'])).toBe('1.e4 e5 2.Cf3');
    expect(formatLine(['e5', 'Nf3'], 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')).toBe('1...e5 2.Cf3');
  });
});
