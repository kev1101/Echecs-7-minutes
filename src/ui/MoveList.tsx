import { fr, START_FEN } from '../chess/notation';

/** Liste de coups cliquable ; cursor = nombre de demi-coups affichés sur l'échiquier. */
export function MoveList({ sans, cursor, startFen = START_FEN, onSelect, pending }: {
  sans: string[];
  cursor?: number;
  startFen?: string;
  onSelect?: (ply: number) => void;
  /** Affiche un « ? » pour le coup attendu. */
  pending?: boolean;
}) {
  const parts = startFen.split(' ');
  const startPly = (Number(parts[5] ?? 1) - 1) * 2 + (parts[1] === 'b' ? 1 : 0);
  const items: React.ReactNode[] = [];
  sans.forEach((s, i) => {
    const ply = startPly + i;
    if (ply % 2 === 0) items.push(<span key={`n${i}`} className="num">{ply / 2 + 1}.</span>);
    else if (i === 0) items.push(<span key={`n${i}`} className="num">{Math.floor(ply / 2) + 1}…</span>);
    items.push(
      <button key={i} className={`mv ${cursor === i + 1 ? 'cur' : ''}`} onClick={() => onSelect?.(i + 1)} disabled={!onSelect}>
        {fr(s)}
      </button>
    );
  });
  if (pending) items.push(<span key="p" className="mv next">?</span>);
  return <div className="moves">{items}</div>;
}
