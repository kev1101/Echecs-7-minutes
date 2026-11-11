/** Classement d'un coup à partir de l'écart de « chances de gain » (méthode de Lichess). */
import { MATE_CP } from './stockfish';

export type Tone = 'good' | 'warn' | 'bad' | 'info';
export type Label = 'Théorie' | 'Excellent' | 'Bon coup' | 'Imprécision' | 'Erreur' | 'Gaffe' | 'Mat manqué';

/** Chances de gain en % (0–100) pour une évaluation en centipions du point de vue du joueur. */
export function winPct(cp: number): number {
  const c = Math.max(-MATE_CP, Math.min(MATE_CP, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
}

/** Précision d'un coup (formule de Lichess) à partir de la perte en chances de gain. */
export function moveAccuracy(lossPct: number): number {
  const a = 103.1668 * Math.exp(-0.04354 * Math.max(0, lossPct)) - 3.1669;
  return Math.max(0, Math.min(100, a));
}

export const isMate = (cp: number) => Math.abs(cp) >= MATE_CP - 1000;

export interface Classification {
  label: Label;
  tone: Tone;
  lossPct: number;
}

/**
 * bestCp : évaluation après le meilleur coup ; playedCp : après le coup joué.
 * Les deux du point de vue du joueur qui vient de jouer.
 */
export function classify(bestCp: number, playedCp: number, isBest: boolean): Classification {
  const lossPct = Math.max(0, winPct(bestCp) - winPct(playedCp));
  if (isMate(bestCp) && bestCp > 0 && !(isMate(playedCp) && playedCp > 0) && lossPct < 10) {
    return { label: 'Mat manqué', tone: 'warn', lossPct };
  }
  if (isBest || lossPct < 2) return { label: isBest ? 'Excellent' : 'Bon coup', tone: 'good', lossPct };
  if (lossPct < 5) return { label: 'Bon coup', tone: 'good', lossPct };
  if (lossPct < 10) return { label: 'Imprécision', tone: 'warn', lossPct };
  if (lossPct < 15) return { label: 'Erreur', tone: 'bad', lossPct };
  return { label: 'Gaffe', tone: 'bad', lossPct };
}
