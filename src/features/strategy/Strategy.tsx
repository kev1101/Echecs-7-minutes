import { useCallback, useEffect, useMemo, useState } from 'react';
import { Board } from '../../board/Board';
import { formatLine, replay, tokens } from '../../chess/notation';
import { STRATEGY, STRATEGY_THEMES, type StrategyQ, type StrategyTheme } from '../../content/strategy';
import { db, type StrategyRow } from '../../db/db';
import { useProfile } from '../../state/profile';
import { nextBox, pickQuestion } from '../../strategy/pick';
import { shuffle } from '../../util/dates';
import { loadEco, openingName } from '../../chess/eco';

export default function Strategy() {
  const { update } = useProfile();
  const [rows, setRows] = useState<Map<string, StrategyRow> | null>(null);
  const [theme, setTheme] = useState<StrategyTheme | null>(null);
  const [q, setQ] = useState<StrategyQ | null>(null);
  const [opts, setOpts] = useState<{ o: string; ok: boolean }[]>([]);
  const [answer, setAnswer] = useState<number | null>(null);
  const [eco, setEco] = useState<Record<string, [string, string]>>({});

  useEffect(() => {
    db.strategy.toArray().then((r) => setRows(new Map(r.map((x) => [x.id, x]))));
    void loadEco().then(setEco);
  }, []);

  const next = useCallback(
    (rs: Map<string, StrategyRow>, th: StrategyTheme | null, avoid?: string) => {
      const pool = STRATEGY.filter((x) => !th || x.theme === th);
      const n = pickQuestion(pool, rs, Date.now(), avoid);
      setQ(n);
      setOpts(n ? shuffle(n.options.map((o, i) => ({ o, ok: i === 0 }))) : []);
      setAnswer(null);
    },
    []
  );

  useEffect(() => {
    if (rows && !q) next(rows, theme);
  }, [rows, q, theme, next]);

  const position = useMemo(() => {
    if (!q) return null;
    const c = replay(q.moves);
    const h = c.history({ verbose: true });
    const last = h[h.length - 1];
    return { fen: c.fen(), last: last ? ([last.from, last.to] as [string, string]) : null, sans: c.history() };
  }, [q]);

  const choose = async (i: number) => {
    if (!q || answer !== null || !rows) return;
    setAnswer(i);
    const ok = opts[i].ok;
    const prev = rows.get(q.id);
    const row: StrategyRow = {
      id: q.id, seen: (prev?.seen ?? 0) + 1, right: (prev?.right ?? 0) + (ok ? 1 : 0), lastAt: Date.now(), lastOk: ok, box: nextBox(prev, ok)
    };
    await db.strategy.put(row);
    setRows((m) => new Map(m).set(q.id, row));
    update((p) => ({ ...p, stats: { ...p.stats, strategy: p.stats.strategy + 1 } }));
  };

  if (!rows || !q || !position) return <div className="loading">Chargement…</div>;
  const ok = answer !== null && opts[answer].ok;
  const name = openingName(eco, position.sans);
  const seen = STRATEGY.filter((x) => rows.has(x.id)).length;
  const right = STRATEGY.filter((x) => rows.get(x.id)?.lastOk).length;

  return (
    <main className="layout">
      <div className="board-col">
        <Board fen={position.fen} orientation={q.side} movable={null} lastMove={position.last} />
      </div>
      <section className="panel" aria-live="polite">
        <div className="ph">
          <h2>Question de plan</h2>
          <span className="tag">{q.theme} · vu des {q.side === 'w' ? 'blancs' : 'noirs'}</span>
        </div>
        {name && <p className="sub">{name.eco} · {name.name}</p>}
        <p className="sub mono">{formatLine(tokens(q.moves))}</p>
        <p className="q">{q.q}</p>
        <div className="opts">
          {opts.map((x, i) => (
            <button key={i} className={`opt ${answer !== null && x.ok ? 'right' : ''} ${answer === i && !x.ok ? 'wrong' : ''}`} disabled={answer !== null} onClick={() => choose(i)}>
              {x.o}
            </button>
          ))}
        </div>
        {answer !== null && (
          <div className={`msg ${ok ? 'good' : 'warn'}`}>
            <b>{ok ? 'Exact.' : 'Pas tout à fait.'}</b> {q.expl}
            {!ok && <span className="idea">Cette question reviendra demain.</span>}
          </div>
        )}
        <div className="row">
          <button className="btn primary" onClick={() => next(rows, theme, q.id)}>{answer === null ? 'Passer' : 'Question suivante'}</button>
        </div>
        <details className="rep">
          <summary>Thème : {theme ?? 'tous'} · {right} / {STRATEGY.length} questions sues ({seen} vues)</summary>
          <div className="chips">
            <button className={`chip ${!theme ? 'on' : ''}`} onClick={() => { setTheme(null); next(rows, null); }}>Tous</button>
            {STRATEGY_THEMES.map((t) => (
              <button key={t} className={`chip ${theme === t ? 'on' : ''}`} onClick={() => { setTheme(t); next(rows, t); }}>{t}</button>
            ))}
          </div>
          <p className="fine">Positions tirées de votre répertoire. Une question ratée revient le lendemain ; une question sue s’espace (1, 3, 7 puis 21 jours).</p>
        </details>
      </section>
    </main>
  );
}
