import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { classify, moveAccuracy, winPct } from '../src/engine/classify';
import { explainMistake, hangingPieces, lineInfo, gainText } from '../src/engine/explain';
import { MATE_CP, parseInfo, scoreToCp } from '../src/engine/stockfish';
import { strengthFor } from '../src/engine/strength';

describe('classement des coups', () => {
  it('chances de gain', () => {
    expect(winPct(0)).toBeCloseTo(50, 5);
    expect(winPct(300)).toBeGreaterThan(70);
    expect(winPct(-MATE_CP)).toBeLessThan(1);
  });
  it('seuils', () => {
    expect(classify(30, 30, true).label).toBe('Excellent');
    expect(classify(30, 10, false).label).toBe('Bon coup');
    expect(classify(50, -40, false).label).toBe('Imprécision');
    expect(classify(30, -100, false).label).toBe('Erreur');
    expect(classify(100, -600, false).label).toBe('Gaffe');
  });
  it('mat manqué mais position toujours gagnante', () => {
    expect(classify(MATE_CP - 20, 900, false).label).toBe('Mat manqué');
  });
  it('précision', () => {
    expect(moveAccuracy(0)).toBeGreaterThan(99);
    expect(moveAccuracy(30)).toBeLessThan(30);
  });
});

describe('explications', () => {
  it('décrit la perte de la dame après Dxf7+ ?', () => {
    const c = new Chess();
    for (const s of ['e4', 'e5', 'Qh5', 'Nc6']) c.move(s);
    const fenBefore = c.fen();
    const played = new Chess(fenBefore).move('Qxf7+');
    const ex = explainMistake({
      fenBefore, played, bestPv: ['f1c4', 'g7g6'], bestCp: 20, replyPv: ['e8f7', 'g1f3'], playedCp: -800, severe: true
    });
    expect(ex.text).toContain('Rxf7');
    expect(ex.text).toContain('gagne la dame');
    expect(ex.text).toContain('Meilleur : Fc4');
  });
  it('pièces en prise', () => {
    // Cavalier blanc en e5 attaqué par le pion d6, non défendu
    const h = hangingPieces('4k3/8/3p4/4N3/8/8/8/4K3 w - - 0 1', 'w');
    expect(h.map((x) => x.square)).toEqual(['e5']);
  });
  it('gain de matériel le long d’une ligne', () => {
    const li = lineInfo('4k3/8/3p4/4N3/8/8/8/4K3 b - - 0 1', ['d6e5'], 'b');
    expect(li.gain).toBe(3);
    expect(gainText(li.gain, li.took)).toBe('gagne une pièce');
    expect(gainText(2, ['r'])).toBe('gagne la qualité');
  });
});

describe('protocole UCI', () => {
  it('lit une ligne info', () => {
    const l = parseInfo('info depth 14 seldepth 20 multipv 2 score cp -35 nodes 1000 nps 1 pv e7e5 g1f3 b8c6');
    expect(l).toMatchObject({ depth: 14, multipv: 2, cp: -35, pv: ['e7e5', 'g1f3', 'b8c6'] });
    expect(parseInfo('info depth 3 score cp 20 lowerbound nodes 4 pv e2e4')).toBeNull();
  });
  it('convertit les mats', () => {
    expect(scoreToCp({ mate: 2 })).toBeGreaterThan(scoreToCp({ mate: 5 }));
    expect(scoreToCp({ mate: -1 })).toBeLessThan(-90000);
  });
  it('règle la force', () => {
    expect(strengthFor(1500).options).toMatchObject({ UCI_LimitStrength: true, UCI_Elo: 1500 });
    const weak = strengthFor(800);
    expect(weak.options.UCI_LimitStrength).toBe(false);
    expect(weak.go).toMatch(/depth [12]/);
    expect(strengthFor(5000).options.UCI_Elo).toBe(3190);
  });
});
