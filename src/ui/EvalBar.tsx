import { MATE_CP } from '../engine/stockfish';

/** Évaluation affichée du point de vue des blancs (centipions). */
export function formatEval(cpWhite: number | null): string {
  if (cpWhite === null) return '…';
  if (Math.abs(cpWhite) >= MATE_CP - 1000) {
    const n = Math.round((MATE_CP - Math.abs(cpWhite)) / 10);
    return (cpWhite > 0 ? '+M' : '−M') + n;
  }
  const v = (cpWhite / 100).toFixed(1).replace('.', ',');
  return cpWhite > 0 ? '+' + v : cpWhite < 0 ? v.replace('-', '−') : '0,0';
}

export function EvalBar({ cp, label = 'Évaluation' }: { cp: number | null; label?: string }) {
  const pct = cp === null ? 50 : 50 + 50 * Math.tanh(cp / 600);
  return (
    <div className="evalrow" aria-label={`${label} : ${formatEval(cp)}`}>
      <span>{label}</span>
      <div className="evalbar">
        <div className="fill" style={{ width: `${pct}%` }} />
      </div>
      <b>{formatEval(cp)}</b>
    </div>
  );
}
