import { Chess } from 'chess.js';
import { epd, START_FEN } from './notation';

type EcoMap = Record<string, [string, string]>;
let data: Promise<EcoMap> | null = null;

export function loadEco(): Promise<EcoMap> {
  return (data ??= fetch(`${import.meta.env.BASE_URL}data/eco.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({})));
}

export interface OpeningName {
  eco: string;
  name: string;
  /** Nombre de demi-coups de la position nommée. */
  ply: number;
}

/** Nom de l'ouverture : la position nommée la plus avancée le long de la partie. */
export function openingName(eco: EcoMap, sans: string[], startFen = START_FEN): OpeningName | null {
  const c = new Chess(startFen);
  let best: OpeningName | null = null;
  sans.forEach((s, i) => {
    try {
      c.move(s);
    } catch {
      return;
    }
    const hit = eco[epd(c.fen())];
    if (hit) best = { eco: hit[0], name: hit[1], ply: i + 1 };
  });
  return best;
}

/** La position est-elle une position de théorie connue (base ECO) ? */
export function isKnownPosition(eco: EcoMap, fen: string): boolean {
  return !!eco[epd(fen)];
}
