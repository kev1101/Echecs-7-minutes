import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Board, type Arrow } from '../../board/Board';
import { fr, playUci, sideLower, type Color } from '../../chess/notation';
import { db, type PuzzleRow } from '../../db/db';
import { level, useProfile } from '../../state/profile';
import { update as glicko } from '../../rating/glicko2';
import { acceptMove, bucketsFor, dueReviews, fromTuple, pickPuzzle, scheduleReview, type Bucket, type Puzzle, type PuzzleTuple } from '../../puzzles/select';
import { PUZZLE_THEMES, themeLabel } from '../../content/puzzleThemes';
import { MoveList } from '../../ui/MoveList';

interface Index {
  buckets: Bucket[];
  themes: Record<string, number>;
}

const base = import.meta.env.BASE_URL;
const fileCache = new Map<string, Promise<Puzzle[]>>();
function loadBucket(file: string): Promise<Puzzle[]> {
  let p = fileCache.get(file);
  if (!p) {
    p = fetch(`${base}data/puzzles/${file}`).then((r) => {
      if (!r.ok) throw new Error('hors ligne');
      return r.json() as Promise<PuzzleTuple[]>;
    }).then((l) => l.map(fromTuple));
    p.catch(() => fileCache.delete(file));
    fileCache.set(file, p);
  }
  return p;
}

const THEME_KEY = 'echecs7:puzzleTheme';
type Phase = 'intro' | 'play' | 'won' | 'lost' | 'solution';

export default function Puzzles() {
  const { profile, update, rate } = useProfile();
  const [index, setIndex] = useState<Index | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [states, setStates] = useState<Map<string, PuzzleRow>>(new Map());
  const [theme, setTheme] = useState<string | null>(() => {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch {
      return null;
    }
  });
  const [puz, setPuz] = useState<{ p: Puzzle; review: boolean } | null>(null);
  const [step, setStep] = useState(0); // nombre de coups de la solution déjà joués
  const [moves, setMoves] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>('intro');
  const [failed, setFailed] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [msg, setMsg] = useState<{ tone: string; text: React.ReactNode }>({ tone: '', text: '' });
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [delta, setDelta] = useState<number | null>(null);
  const graded = useRef(false);
  const recent = useRef<Set<string>>(new Set());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    fetch(`${base}data/puzzles/index.json`)
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => setError('Impossible de charger les problèmes. Connectez-vous une première fois à Internet : ils seront ensuite gardés hors ligne.'));
    db.puzzles.toArray().then((rows) => setStates(new Map(rows.map((r) => [r.id, r]))));
    return clearTimers;
  }, []);

  const next = useCallback(async () => {
    if (!index) return;
    clearTimers();
    const r = level(profile);
    let pool: Puzzle[] = [];
    try {
      const lists = await Promise.all(bucketsFor(r, index.buckets).map((b) => loadBucket(b.file)));
      pool = lists.flat();
    } catch {
      setError('Ces problèmes ne sont pas encore disponibles hors ligne. Reconnectez-vous pour les télécharger.');
      return;
    }
    // Puzzles ratés à revoir : on charge leurs tranches (déjà en cache en général)
    const now = Date.now();
    const dueIds = new Set(dueReviews(states, now));
    let reviewPool: Puzzle[] = [];
    if (dueIds.size) {
      const files = new Set<string>();
      for (const id of dueIds) {
        const st = states.get(id);
        const b = index.buckets.find((x) => st && st.rating.r >= x.min - 400 && st.rating.r < x.max + 400);
        if (b) files.add(b.file);
      }
      const all = (await Promise.all([...files].map((f) => loadBucket(f).catch(() => [])))).flat();
      reviewPool = all.filter((p) => dueIds.has(p.id));
    }
    const pick = pickPuzzle({ pool, states, userRating: r, theme, now, reviewPool, exclude: recent.current });
    if (!pick) {
      setMsg({ tone: 'warn', text: 'Plus de problèmes disponibles pour ce thème à votre niveau. Choisissez un autre thème.' });
      return;
    }
    recent.current.add(pick.puzzle.id);
    setPuz({ p: pick.puzzle, review: pick.review });
    setMoves(pick.puzzle.moves);
    setStep(0);
    setPhase('intro');
    setFailed(false);
    setHintLevel(0);
    setArrows([]);
    setDelta(null);
    graded.current = false;
    setMsg({ tone: '', text: 'L’adversaire joue…' });
    // Le premier coup de la ligne est celui de l'adversaire
    later(() => {
      setStep(1);
      setPhase('play');
      setMsg({ tone: '', text: 'À vous : trouvez le meilleur coup.' });
    }, 700);
  }, [index, profile, states, theme]);

  useEffect(() => {
    if (index && !puz) void next();
  }, [index, puz, next]);

  const p = puz?.p;
  const chess = new Chess(p?.fen ?? undefined);
  if (p) for (const u of moves.slice(0, step)) playUci(chess, u);
  const fen = chess.fen();
  const userColor: Color = p ? (new Chess(p.fen).turn() === 'w' ? 'b' : 'w') : 'w';
  const hist = chess.history({ verbose: true });
  const lastMove = hist.length ? hist[hist.length - 1] : null;
  const sans = (() => {
    if (!p) return [];
    const c = new Chess(p.fen);
    return moves.slice(0, step).map((u) => playUci(c, u)!.san);
  })();

  const grade = async (ok: boolean, score: number) => {
    if (!p || graded.current) return;
    graded.current = true;
    const prev = states.get(p.id);
    const userR = profile.rating;
    const puzzleR = prev?.rating ?? { r: p.rating, rd: p.rd, vol: 0.06 };
    const newUser = glicko(userR, puzzleR, score);
    const newPuzzle = glicko(puzzleR, userR, 1 - score);
    rate(newUser);
    setDelta(profile.settings.autoLevel ? Math.round(newUser.r - userR.r) : null);
    const now = Date.now();
    const rv = scheduleReview(prev, ok, now);
    const row: PuzzleRow = {
      id: p.id, rating: newPuzzle, attempts: (prev?.attempts ?? 0) + 1, solved: (prev?.solved ?? 0) + (ok ? 1 : 0),
      lastAt: now, lastOk: ok, ...rv
    };
    await db.puzzles.put(row);
    setStates((m) => new Map(m).set(p.id, row));
    update((pr) => ({ ...pr, stats: { ...pr.stats, puzzles: pr.stats.puzzles + 1, solved: pr.stats.solved + (ok ? 1 : 0) } }));
  };

  const onMove = (uci: string) => {
    if (!p || phase !== 'play' || chess.turn() !== userColor) return;
    const expected = moves[step];
    const c = new Chess(fen);
    const m = playUci(c, uci);
    if (!m) return;
    const isLast = step === moves.length - 1;
    if (!acceptMove(uci, expected, c.isCheckmate(), isLast)) {
      setFlash(`${m.to}#${Date.now()}`);
      if (!failed) {
        setFailed(true);
        void grade(false, 0);
      }
      setMsg({ tone: 'bad', text: <>{fr(m.san)} ne marche pas. Réessayez, ou demandez la solution.</> });
      return;
    }
    setArrows([]);
    // Coup accepté (éventuellement un autre mat que celui de la base)
    if (uci !== expected && uci !== expected.slice(0, 4)) {
      // Mat alternatif : on remplace le dernier coup pour l'affichage
      setMoves([...moves.slice(0, step), uci]);
    }
    const ns = step + 1;
    setStep(ns);
    if (ns >= moves.length) {
      setPhase(failed ? 'lost' : 'won');
      const score = failed ? 0 : hintLevel >= 2 ? 0.5 : 1;
      if (!failed) void grade(true, score);
      setMsg({ tone: failed ? 'warn' : 'good', text: failed ? 'Résolu après une erreur.' : 'Résolu !' });
      return;
    }
    setMsg({ tone: 'good', text: <>{fr(m.san)} : bien vu. Continuez !</> });
    later(() => setStep(ns + 1), 500);
  };

  const hint = () => {
    if (!p || phase !== 'play') return;
    const h = hintLevel + 1;
    setHintLevel(h);
    if (h === 1) {
      const t = p.themes.map(themeLabel).filter(Boolean).filter((x) => !['Avantage', 'Gain décisif', 'Milieu de partie', 'Ouverture'].includes(x!));
      setMsg({ tone: '', text: <>Indice : <b>{t.slice(0, 3).join(', ') || 'cherchez les échecs et les prises'}</b>.</> });
    } else {
      const u = moves[step];
      setArrows([{ from: u.slice(0, 2), brush: 'blue' }]);
      setMsg({ tone: '', text: 'La pièce à jouer est entourée.' });
    }
  };

  const solution = () => {
    if (!p || phase === 'won' || phase === 'solution') return;
    if (!failed) {
      setFailed(true);
      void grade(false, 0);
    }
    setPhase('solution');
    let s = step;
    const play = () => {
      if (s >= moves.length) {
        setMsg({ tone: 'warn', text: 'Voici la solution. Ce problème reviendra demain pour vérifier que vous l’avez retenu.' });
        return;
      }
      const u = moves[s];
      setArrows([{ from: u.slice(0, 2), to: u.slice(2, 4), brush: 'blue' }]);
      later(() => {
        s += 1;
        setStep(s);
        setArrows([]);
        later(play, 500);
      }, 700);
    };
    play();
  };

  if (error) return <main className="single"><section className="panel"><h2>Problèmes</h2><div className="msg warn">{error}</div></section></main>;
  if (!index || !p) return <div className="loading">Chargement des problèmes…</div>;

  const due = dueReviews(states, Date.now()).length;
  const labels = p.themes.map(themeLabel).filter(Boolean) as string[];
  const done = phase === 'won' || phase === 'lost' || (phase === 'solution' && step >= moves.length);
  const mateTheme = p.themes.find((t) => /^mateIn\d$/.test(t));
  const goal = mateTheme ? `Mat en ${mateTheme.slice(-1)}` : 'Trouvez le meilleur coup';

  return (
    <main className="layout">
      <div className="board-col">
        <Board fen={fen} orientation={userColor} movable={phase === 'play' ? userColor : null} lastMove={lastMove ? [lastMove.from, lastMove.to] : null}
          arrows={arrows} flash={flash} onMove={onMove} />
      </div>
      <section className="panel" aria-live="polite">
        <div className="ph">
          <h2>{goal}</h2>
          <span className="tag">Difficulté {Math.round(states.get(p.id)?.rating.r ?? p.rating)}{puz?.review ? ' · à revoir' : ''}</span>
        </div>
        <p className="sub">Les {sideLower(userColor)} jouent. Votre niveau : {level(profile)}.</p>
        <div className={`msg ${msg.tone}`}>
          {msg.text}
          {done && delta !== null && <> Niveau {delta >= 0 ? `+${delta}` : delta}.</>}
          {done && <span className="idea">Thèmes : {labels.join(', ') || '—'}.</span>}
        </div>
        <MoveList sans={sans} startFen={p.fen} />
        <div className="row">
          {!done && <button className="btn" onClick={hint} disabled={phase !== 'play' || hintLevel >= 2}>Indice</button>}
          {!done && <button className="btn" onClick={solution} disabled={phase === 'intro' || phase === 'solution'}>Voir la solution</button>}
          <button className="btn primary" onClick={() => void next()}>{done ? 'Problème suivant' : 'Passer'}</button>
          {done && (
            <a className="btn" href={`https://lichess.org/training/${p.id}`} target="_blank" rel="noreferrer">Voir sur Lichess</a>
          )}
        </div>
        <details className="rep">
          <summary>Thème : {theme ? themeLabel(theme) : 'tous'}{due ? ` · ${due} problème${due > 1 ? 's' : ''} raté${due > 1 ? 's' : ''} à revoir` : ''}</summary>
          <div className="chips">
            <button className={`chip ${!theme ? 'on' : ''}`} onClick={() => choose(null)}>Tous</button>
            {PUZZLE_THEMES.filter(([k]) => (index.themes[k] ?? 0) > 0).map(([k, l]) => (
              <button key={k} className={`chip ${theme === k ? 'on' : ''}`} onClick={() => choose(k)}>{l}</button>
            ))}
          </div>
          <p className="fine">Les problèmes ratés reviennent le lendemain, puis après 3, 7 et 21 jours. Source : base de puzzles Lichess (CC0).</p>
        </details>
      </section>
    </main>
  );

  function choose(k: string | null) {
    setTheme(k);
    try {
      if (k) localStorage.setItem(THEME_KEY, k);
      else localStorage.removeItem(THEME_KEY);
    } catch {
      /* stockage indisponible */
    }
    setPuz(null);
  }
}
