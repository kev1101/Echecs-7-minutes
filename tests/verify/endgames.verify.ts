import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENDGAMES } from '../../src/content/endgames';
import { pieceCount, verdictFor, type TbCategory } from '../../src/endgames/tablebase';
import { startEngine, type NodeEngine } from './engine';

// Stockfish (emscripten) peut masquer fetch dans Node : on garde la version d'origine
const httpFetch = globalThis.fetch.bind(globalThis);
let sf: NodeEngine;
beforeAll(async () => {
  sf = await startEngine();
});
afterAll(() => sf?.quit());

describe('finales vérifiées (Syzygy si ≤ 7 pièces, sinon Stockfish)', () => {
  for (const e of ENDGAMES) {
    it(`${e.name} : ${e.expected === 'win' ? 'gain' : 'nulle'}`, async () => {
      if (pieceCount(e.fen) <= 7) {
        const r = await httpFetch(`https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(e.fen)}`);
        const d = (await r.json()) as { category: TbCategory };
        expect(verdictFor(d.category, e.fen.split(' ')[1] as 'w' | 'b', e.user)).toBe(e.expected);
      } else {
        const r = await sf.eval(e.fen, { depth: 26 });
        if (e.expected === 'win') expect(r.cp).toBeGreaterThan(400);
        else expect(Math.abs(r.cp)).toBeLessThan(80);
      }
    }, 120_000);
  }
});
