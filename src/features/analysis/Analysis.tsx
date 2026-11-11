import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Board, type Arrow } from '../../board/Board';
import { analysisEngine, scoreToCp, type EngineLine } from '../../engine/stockfish';
import { formatLine, fr, playUci, START_FEN, type Color } from '../../chess/notation';
import { EvalBar } from '../../ui/EvalBar';
import { MoveList } from '../../ui/MoveList';

/** Échiquier libre avec analyse Stockfish : sert aussi à relire une partie. */
export function Analysis({ initialSans, initialFen = START_FEN, title = 'Analyse libre', orientation: o0 = 'w' }: {
  initialSans?: string[];
  initialFen?: string;
  title?: string;
  orientation?: Color;
}) {
  const [sans, setSans] = useState<string[]>(initialSans ?? []);
  const [cursor, setCursor] = useState(initialSans?.length ?? 0);
  const [orientation, setOrientation] = useState<Color>(o0);
  const [lines, setLines] = useState<EngineLine[]>([]);
  const [depth, setDepth] = useState(0);

  const { fen, last } = useMemo(() => {
    const c = new Chess(initialFen);
    let lm: [string, string] | null = null;
    for (const s of sans.slice(0, cursor)) {
      const m = c.move(s);
      lm = [m.from, m.to];
    }
    return { fen: c.fen(), last: lm };
  }, [sans, cursor, initialFen]);

  useEffect(() => {
    let live = true;
    setLines([]);
    setDepth(0);
    const c = new Chess(fen);
    if (c.isGameOver()) return;
    const eng = analysisEngine();
    eng
      .analyse(fen, { depth: 16, multipv: 3 }, (l) => {
        if (!live) return;
        setDepth(l.depth);
        setLines((prev) => {
          const next = prev.filter((x) => x.multipv !== l.multipv).concat(l);
          return next.sort((a, b) => a.multipv - b.multipv);
        });
      })
      .catch(() => {});
    return () => {
      live = false;
      eng.stop();
    };
  }, [fen]);

  const turn = fen.split(' ')[1] as Color;
  const sign = turn === 'w' ? 1 : -1;
  const best = lines[0];
  const evalWhite = best ? sign * scoreToCp(best) : null;
  const arrows: Arrow[] = lines.slice(0, 3).map((l, i) => ({
    from: l.pv[0].slice(0, 2),
    to: l.pv[0].slice(2, 4),
    brush: i === 0 ? 'blue' : 'paleBlue'
  }));

  const onMove = (uci: string) => {
    const c = new Chess(fen);
    const m = playUci(c, uci);
    if (!m) return;
    const next = sans.slice(0, cursor).concat(m.san);
    setSans(next);
    setCursor(next.length);
  };

  return (
    <main className="layout">
      <div className="board-col">
        <Board fen={fen} orientation={orientation} movable={turn} lastMove={last} arrows={arrows} onMove={onMove} />
      </div>
      <section className="panel" aria-live="polite">
        <div className="ph">
          <h2>{title}</h2>
          <span className="tag">Stockfish 19 · profondeur {depth || '…'}</span>
        </div>
        <EvalBar cp={evalWhite} />
        <ol className="feed">
          {lines.map((l) => {
            const san = pvToSan(fen, l.pv).slice(0, 8);
            return (
              <li key={l.multipv}>
                <b>{formatEvalSide(scoreToCp(l) * sign)}</b>
                <span>{formatLine(san, fen)}</span>
              </li>
            );
          })}
        </ol>
        <MoveList sans={sans} cursor={cursor} startFen={initialFen} onSelect={setCursor} />
        <div className="row">
          <button className="btn" onClick={() => setCursor(0)} aria-label="Début">⏮</button>
          <button className="btn" onClick={() => setCursor((c) => Math.max(0, c - 1))} aria-label="Coup précédent">◀</button>
          <button className="btn" onClick={() => setCursor((c) => Math.min(sans.length, c + 1))} aria-label="Coup suivant">▶</button>
          <button className="btn" onClick={() => setCursor(sans.length)} aria-label="Fin">⏭</button>
          <button className="btn" onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}>Retourner</button>
          <button className="btn" onClick={() => { setSans([]); setCursor(0); }}>Effacer</button>
        </div>
        {best && <p className="fine">Meilleur coup : <b>{fr(pvToSan(fen, best.pv)[0] ?? '')}</b></p>}
      </section>
    </main>
  );
}

function formatEvalSide(cp: number) {
  if (Math.abs(cp) > 90000) return cp > 0 ? 'Mat' : '−Mat';
  const v = (cp / 100).toFixed(1).replace('.', ',');
  return cp > 0 ? '+' + v : v.replace('-', '−');
}

export function pvToSan(fen: string, pv: string[]): string[] {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const u of pv) {
    const m = playUci(c, u);
    if (!m) break;
    out.push(m.san);
  }
  return out;
}
