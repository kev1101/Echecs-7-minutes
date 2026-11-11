/** Tables de finales Syzygy (API publique de Lichess) : 7 pièces au plus. */
import type { Color } from '../chess/notation';

export type TbCategory = 'win' | 'loss' | 'draw' | 'cursed-win' | 'blessed-loss' | 'maybe-win' | 'maybe-loss' | 'unknown';

export interface TbMove {
  uci: string;
  san: string;
  category: TbCategory; // du point de vue de l'adversaire après le coup
  dtm: number | null;
  dtz: number | null;
}

export interface TbResult {
  category: TbCategory; // du point de vue du camp au trait
  dtm: number | null;
  dtz: number | null;
  moves: TbMove[];
}

export function pieceCount(fen: string): number {
  return fen.split(' ')[0].replace(/[^a-zA-Z]/g, '').length;
}

const cache = new Map<string, Promise<TbResult | null>>();

export function probe(fen: string, timeoutMs = 4000): Promise<TbResult | null> {
  if (pieceCount(fen) > 7) return Promise.resolve(null);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve(null);
  const key = fen.split(' ').slice(0, 4).join(' ');
  let p = cache.get(key);
  if (!p) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    p = fetch(`https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d ? ({ category: d.category, dtm: d.dtm, dtz: d.dtz, moves: d.moves ?? [] } as TbResult) : null))
      .catch(() => null)
      .finally(() => clearTimeout(t));
    p.then((r) => {
      if (!r) cache.delete(key);
    });
    cache.set(key, p);
  }
  return p;
}

/** Résultat théorique pour `user` à partir de la catégorie (point de vue du camp au trait). */
export function verdictFor(category: TbCategory, turn: Color, user: Color): 'win' | 'draw' | 'loss' | null {
  const flip = turn !== user;
  switch (category) {
    case 'win':
      return flip ? 'loss' : 'win';
    case 'loss':
      return flip ? 'win' : 'loss';
    case 'draw':
    case 'cursed-win':
    case 'blessed-loss':
      return 'draw';
    default:
      return null;
  }
}

/** Meilleur coup selon les tables (le premier de la liste de Lichess). */
export function tbBestMove(r: TbResult | null): string | null {
  return r?.moves[0]?.uci ?? null;
}
