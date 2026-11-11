import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Board, type Arrow } from '../../board/Board';
import { fr, other, playUci, sideLower } from '../../chess/notation';
import { ENDGAMES, type Endgame } from '../../content/endgames';
import { analysisEngine } from '../../engine/stockfish';
import { probe, tbBestMove, verdictFor } from '../../endgames/tablebase';
import { endgameState, type EndState } from '../../endgames/result';
import { db, getKV, setKV } from '../../db/db';
import { useProfile } from '../../state/profile';
import { MoveList } from '../../ui/MoveList';

const GOALS = { mate: 'Matez', promote: 'Faites promouvoir le pion', draw: 'Tenez la nulle' };
const VERDICT = { win: 'gagnante', draw: 'nulle', loss: 'perdante' } as const;

export default function Endgames() {
  const { update } = useProfile();
  const [idx, setIdx] = useState<number | null>(null);
  const [sans, setSans] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<EndState>({ done: false });
  const [tbNote, setTbNote] = useState<{ tone: string; text: string } | null>(null);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);
  const [scores, setScores] = useState<Record<string, { attempts: number; successes: number }>>({});
  const gen = useRef(0);

  useEffect(() => {
    getKV<number>('endIdx', 0).then((i) => setIdx(i % ENDGAMES.length));
    db.endgames.toArray().then((rows) => setScores(Object.fromEntries(rows.map((r) => [r.id, r]))));
  }, []);

  const e: Endgame | null = idx === null ? null : ENDGAMES[idx];
  const chess = useMemo(() => {
    const c = new Chess(e?.fen);
    for (const s of sans) c.move(s);
    return c;
  }, [e, sans]);
  const n = useMemo(() => sans.filter((_, i) => i % 2 === 0).length, [sans]); // l'utilisateur joue toujours en premier
  const hist = chess.history({ verbose: true });
  const last = hist[hist.length - 1] ?? null;

  const start = (i: number) => {
    gen.current++;
    setIdx(i);
    void setKV('endIdx', i);
    setSans([]);
    setBusy(false);
    setState({ done: false });
    setTbNote(null);
    setArrows([]);
    // Vérifie la position de départ avec les tables (et teste la connexion)
    const eg = ENDGAMES[i];
    void probe(eg.fen).then((r) => setOnline(r !== null || null));
  };

  useEffect(() => {
    if (idx !== null) start(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx === null]);

  const record = async (ok: boolean) => {
    if (!e) return;
    const prev = scores[e.id] ?? { attempts: 0, successes: 0 };
    const row = { id: e.id, attempts: prev.attempts + 1, successes: prev.successes + (ok ? 1 : 0), lastAt: Date.now() };
    await db.endgames.put(row);
    setScores((s) => ({ ...s, [e.id]: row }));
    update((p) => ({ ...p, stats: { ...p.stats, endgames: p.stats.endgames + 1 } }));
  };

  const finishIf = async (c: Chess, nUser: number, g: number): Promise<boolean> => {
    if (!e) return false;
    const lm = c.history({ verbose: true }).at(-1) ?? null;
    let verdictAfter: 'win' | 'draw' | 'loss' | null = null;
    if (e.goal === 'promote' && lm?.promotion && lm.color === e.user) {
      const r = await probe(c.fen());
      if (g !== gen.current) return true;
      verdictAfter = r ? verdictFor(r.category, c.turn(), e.user) : null;
      if (!r) {
        // Hors ligne ou trop de pièces : Stockfish juge la position
        const a = await analysisEngine().analyse(c.fen(), { depth: 14, movetime: 800 });
        const cp = a.lines[0] ? (a.lines[0].mate !== undefined ? (a.lines[0].mate > 0 ? 9999 : -9999) : a.lines[0].cp ?? 0) : 0;
        const userCp = c.turn() === e.user ? cp : -cp;
        verdictAfter = userCp > 300 ? 'win' : userCp < -300 ? 'loss' : 'draw';
      }
    }
    const st = endgameState({ goal: e.goal, user: e.user, chess: c, last: lm, n: nUser, limit: e.limit, verdictAfter });
    if (st.done) {
      setState(st);
      void record(st.ok);
      return true;
    }
    return false;
  };

  const onMove = async (uci: string) => {
    if (!e || busy || state.done || chess.turn() !== e.user) return;
    const g = gen.current;
    const before = chess.fen();
    const c = new Chess(before);
    const m = playUci(c, uci);
    if (!m) return;
    const next = [...sans, m.san];
    setSans(next);
    setArrows([]);
    setBusy(true);
    const nUser = n + 1;

    // Vérification par les tables : le coup garde-t-il le résultat ?
    const [tbBefore, tbAfter] = await Promise.all([probe(before), probe(c.fen())]);
    if (g !== gen.current) return;
    if (tbBefore && tbAfter) {
      const vb = verdictFor(tbBefore.category, e.user, e.user);
      const va = verdictFor(tbAfter.category, other(e.user), e.user);
      if (vb && va && vb !== va) {
        const best = tbBefore.moves[0]?.san;
        setTbNote({ tone: 'bad', text: `Selon les tables Syzygy, ${fr(m.san)} rend la position ${VERDICT[va]} (elle était ${VERDICT[vb]}).${best ? ` Il fallait ${fr(best)}.` : ''}` });
      } else if (va) {
        const dtm = tbAfter.dtm !== null ? Math.abs(tbAfter.dtm) : null;
        setTbNote({ tone: 'good', text: `Syzygy : position toujours ${VERDICT[va]}${va === 'win' && dtm ? ` (mat en ${Math.ceil(dtm / 2)} au mieux)` : ''}.` });
      }
    } else setTbNote(null);

    if (await finishIf(c, nUser, g)) {
      setBusy(false);
      return;
    }
    // Réponse de la défense : meilleur coup des tables, sinon Stockfish à pleine force
    const t0 = Date.now();
    let reply = tbBestMove(tbAfter);
    if (!reply) reply = await analysisEngine().best(c.fen(), 700);
    await new Promise((r) => setTimeout(r, Math.max(0, 350 - (Date.now() - t0))));
    if (g !== gen.current || !reply) {
      setBusy(false);
      return;
    }
    const rm = playUci(c, reply)!;
    setSans([...next, rm.san]);
    await finishIf(c, nUser, g);
    setBusy(false);
  };

  const hint = async () => {
    if (!e || busy || state.done) return;
    setBusy(true);
    const r = await probe(chess.fen());
    const u = tbBestMove(r) ?? (await analysisEngine().best(chess.fen(), 900));
    setBusy(false);
    if (u) setArrows([{ from: u.slice(0, 2), to: u.slice(2, 4), brush: 'blue' }]);
  };

  if (!e || idx === null) return <div className="loading">Chargement…</div>;
  const sc = scores[e.id];

  return (
    <main className="layout">
      <div className="board-col">
        <Board fen={chess.fen()} orientation={e.user} movable={!busy && !state.done ? e.user : null} lastMove={last ? [last.from, last.to] : null}
          arrows={arrows} onMove={onMove} />
      </div>
      <section className="panel" aria-live="polite">
        <div className="ph">
          <h2>{e.name}</h2>
          <span className="tag">{GOALS[e.goal]} · {e.limit} coups max.</span>
        </div>
        <p className="sub">Vous jouez les {sideLower(e.user)} contre une défense parfaite (tables Syzygy, ou Stockfish hors ligne).</p>
        <p className="idea">{e.tip}</p>
        <div className={`msg ${state.done ? (state.ok ? 'good' : 'bad') : ''}`}>
          {state.done ? state.text : busy ? 'Réflexion…' : `Coups joués : ${n} / ${e.limit}`}
        </div>
        {tbNote && !state.done && <div className={`msg ${tbNote.tone}`}>{tbNote.text}</div>}
        <MoveList sans={sans} startFen={e.fen} />
        <div className="row">
          <button className="btn" onClick={hint} disabled={busy || state.done}>Indice</button>
          <button className="btn" onClick={() => start(idx)}>Recommencer</button>
          <button className="btn primary" onClick={() => start((idx + 1) % ENDGAMES.length)}>Finale suivante</button>
        </div>
        <div className="chips">
          {ENDGAMES.map((g, i) => (
            <button key={g.id} className={`chip ${i === idx ? 'on' : ''}`} onClick={() => start(i)}>
              {g.name}{scores[g.id]?.successes ? ' ✓' : ''}
            </button>
          ))}
        </div>
        <p className="fine">
          {online === null ? 'Hors ligne : la défense est assurée par Stockfish.' : 'Résultats vérifiés en direct par les tables de finales Syzygy (Lichess).'}
          {sc ? ` Réussi ${sc.successes} fois sur ${sc.attempts}.` : ''}
        </p>
      </section>
    </main>
  );
}
