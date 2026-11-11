import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { REPERTOIRE } from '../../src/content/repertoire';
import { parsePgn } from '../../src/chess/pgn';
import { buildTree, userMoves } from '../../src/chess/tree';
import { winPct } from '../../src/engine/classify';
import { startEngine, type NodeEngine } from './engine';

let sf: NodeEngine;
beforeAll(async () => {
  sf = await startEngine();
});
afterAll(() => sf?.quit());

describe('répertoire vérifié par Stockfish', () => {
  for (const side of ['w', 'b'] as const) {
    it(`aucun coup des ${side === 'w' ? 'blancs' : 'noirs'} ne perd plus de 8 % de chances de gain`, async () => {
      const t = buildTree(side, REPERTOIRE.filter((l) => l.side === side).map((l) => ({ id: l.id, lines: parsePgn(l.pgn).lines })));
      const bad: string[] = [];
      for (const um of userMoves(t)) {
        const fen = t.nodes.get(um.epd)!.fen;
        const best = await sf.eval(fen, { depth: 15 });
        const mine = await sf.eval(fen, { depth: 15, searchmoves: [um.uci] });
        const loss = winPct(best.cp) - winPct(mine.cp);
        if (loss > 8) {
          const c = new Chess(fen);
          const bestSan = c.move({ from: best.pv[0].slice(0, 2), to: best.pv[0].slice(2, 4), promotion: best.pv[0][4] }).san;
          bad.push(`${[...um.lineIds].join(',')} : ${um.san} (${mine.cp}) au lieu de ${bestSan} (${best.cp}) — perte ${loss.toFixed(1)} % — ${fen}`);
        }
      }
      if (bad.length) console.log(bad.join('\n'));
      expect(bad).toEqual([]);
    }, 900_000);
  }
});
