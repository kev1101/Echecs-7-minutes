import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { STRATEGY } from '../../src/content/strategy';
import { replay, uciOf } from '../../src/chess/notation';
import { winPct } from '../../src/engine/classify';
import { startEngine, type NodeEngine } from './engine';

let sf: NodeEngine;
beforeAll(async () => {
  sf = await startEngine();
});
afterAll(() => sf?.quit());

describe('stratégie vérifiée par Stockfish', () => {
  it('positions équilibrées et coups thématiques sains', async () => {
    const problems: string[] = [];
    for (const q of STRATEGY) {
      const c = replay(q.moves);
      const fen = c.fen();
      const best = await sf.eval(fen, { depth: 16 });
      // La position ne doit pas être déjà perdue pour un camp (sinon la question serait trompeuse)
      if (Math.abs(best.cp) > 250) problems.push(`${q.id} : position déséquilibrée (${best.cp} pour le camp au trait)`);
      if (q.move) {
        const m = new Chess(fen).move(q.move);
        const mine = await sf.eval(fen, { depth: 16, searchmoves: [uciOf(m)] });
        const loss = winPct(best.cp) - winPct(mine.cp);
        if (loss > 8) problems.push(`${q.id} : ${q.move} perd ${loss.toFixed(1)} % (meilleur ${best.pv[0]})`);
      }
    }
    if (problems.length) console.log(problems.join('\n'));
    expect(problems).toEqual([]);
  }, 900_000);
});
