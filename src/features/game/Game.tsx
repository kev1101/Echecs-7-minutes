import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Move } from 'chess.js';
import { Board, type Arrow } from '../../board/Board';
import { analysisEngine, playerEngine, scoreToCp, type Analysis as EngineAnalysis } from '../../engine/stockfish';
import { classify, moveAccuracy, type Label, type Tone } from '../../engine/classify';
import { describeThreat, explainMistake, generalTips } from '../../engine/explain';
import { fr, nullMoveFen, other, PIECE_NAME, playUci, sideLower, uciOf, type Color } from '../../chess/notation';
import { bookMoves } from '../../chess/tree';
import { useRepertoire } from '../../state/repertoire';
import { level, useProfile } from '../../state/profile';
import { db, getKV, setKV, type GameRow } from '../../db/db';
import { update as glickoUpdate } from '../../rating/glicko2';
import { EvalBar } from '../../ui/EvalBar';
import { Analysis } from '../analysis/Analysis';
import { enhanceWithClaude } from '../../llm/claude';

export interface Note {
  ply: number; // index du demi-coup (0 = premier coup de la partie)
  san: string;
  by: 'user' | 'engine';
  label?: Label | 'Coup repris';
  tone: Tone;
  text: string;
  pending?: boolean;
  best?: string; // SAN anglaise du meilleur coup
  bestUci?: string;
  evalWhite?: number;
  lossPct?: number;
  ai?: boolean;
}

type Result = 'win' | 'loss' | 'draw' | 'stop';

interface Saved {
  color: Color;
  engineElo: number;
  sans: string[];
  notes: Note[];
  inBook: boolean;
  undos: number;
}

const ANALYSE = { depth: 14, movetime: 1500, multipv: 2 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fenAt(sans: string[]): Chess {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c;
}

function endReason(c: Chess): { result: 'mate' | 'draw'; why: string } | null {
  if (c.isCheckmate()) return { result: 'mate', why: 'mat' };
  if (c.isStalemate()) return { result: 'draw', why: 'pat' };
  if (c.isThreefoldRepetition()) return { result: 'draw', why: 'répétition' };
  if (c.isInsufficientMaterial()) return { result: 'draw', why: 'matériel insuffisant' };
  if (c.isDrawByFiftyMoves()) return { result: 'draw', why: 'règle des 50 coups' };
  return null;
}

const moveNum = (ply: number) => `${Math.floor(ply / 2) + 1}${ply % 2 === 0 ? '.' : '...'}`;

export default function Game() {
  const { profile, update, rate } = useProfile();
  const rep = useRepertoire();
  const [saved, setSaved] = useState<Saved | null | undefined>(undefined);

  useEffect(() => {
    getKV<Saved | null>('currentGame', null).then(setSaved);
  }, []);

  if (saved === undefined || !rep) return <div className="loading">Chargement…</div>;
  return <GameInner key={saved ? 'resume' : 'new'} saved={saved} profileLevel={level(profile)} offset={profile.settings.engineOffset} rep={rep}
    nextColor={profile.gameColor} toggleColor={() => update((p) => ({ ...p, gameColor: other(p.gameColor), stats: { ...p.stats } }))}
    onFinish={(score, engineElo) => {
      update((p) => ({ ...p, stats: { ...p.stats, games: p.stats.games + 1 } }));
      if (score !== null) rate(glickoUpdate(profile.rating, { r: engineElo, rd: 120, vol: 0.06 }, score));
    }} />;
}

function GameInner({ saved, profileLevel, offset, rep, nextColor, toggleColor, onFinish }: {
  saved: Saved | null;
  profileLevel: number;
  offset: number;
  rep: NonNullable<ReturnType<typeof useRepertoire>>;
  nextColor: Color;
  toggleColor: () => void;
  onFinish: (score: number | null, engineElo: number) => void;
}) {
  const { profile } = useProfile();
  const [color] = useState<Color>(saved?.color ?? nextColor);
  const [engineElo, setEngineElo] = useState(saved?.engineElo ?? Math.max(600, profileLevel + offset));
  const [sans, setSans] = useState<string[]>(saved?.sans ?? []);
  const [notes, setNotes] = useState<Note[]>(saved?.notes ?? []);
  const [inBook, setInBook] = useState(saved?.inBook ?? true);
  const [undos, setUndos] = useState(saved?.undos ?? 0);
  const [thinking, setThinking] = useState(false);
  const [over, setOver] = useState<{ result: Result; why: string } | null>(null);
  const [review, setReview] = useState<number | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [threat, setThreat] = useState<Arrow | null>(null);

  const gen = useRef(0);
  const cache = useRef(new Map<string, Promise<EngineAnalysis>>());
  const tips = useRef(new Set<string>());
  const claudeCalls = useRef(0);
  const sansRef = useRef(sans);
  sansRef.current = sans;
  const startedRef = useRef(false);
  const overRef = useRef(false);

  const chess = useMemo(() => fenAt(sans), [sans]);
  const fen = chess.fen();
  const turn = chess.turn() as Color;
  const history = chess.history({ verbose: true });
  const lastMv = history[history.length - 1];
  const tree = rep.trees[color];

  // Sauvegarde de la partie en cours (reprise après fermeture de l'appli)
  useEffect(() => {
    if (over) void setKV('currentGame', null);
    else void setKV('currentGame', { color, engineElo, sans, notes: notes.filter((n) => !n.pending), inBook, undos } satisfies Saved);
  }, [color, engineElo, sans, notes, inBook, undos, over]);

  const analyse = useCallback((f: string) => {
    let p = cache.current.get(f);
    if (!p) {
      p = analysisEngine().analyse(f, ANALYSE);
      cache.current.set(f, p);
    }
    return p;
  }, []);

  const patchNote = (ply: number, by: Note['by'], patch: Partial<Note>) =>
    setNotes((ns) => ns.map((n) => (n.ply === ply && n.by === by ? { ...n, ...patch } : n)));

  const evalWhite = useMemo(() => {
    for (let i = notes.length - 1; i >= 0; i--) if (notes[i].evalWhite !== undefined) return notes[i].evalWhite!;
    return null;
  }, [notes]);

  // ---------- Fin de partie ----------
  const finish = useCallback(
    (result: Result, why: string, finalSans: string[]) => {
      setOver((o) => o ?? { result, why });
      if (overRef.current) return;
      overRef.current = true;
      const score = result === 'win' ? 1 : result === 'loss' ? 0 : result === 'draw' ? 0.5 : null;
      // Une partie arrêtée avant le 10e demi-coup ne compte pas
      onFinish(finalSans.length >= 10 || result !== 'stop' ? score : null, engineElo);
    },
    [engineElo, onFinish]
  );

  // Enregistre la partie terminée une fois toutes les analyses arrivées
  const savedRow = useRef(false);
  useEffect(() => {
    if (!over || savedRow.current || notes.some((n) => n.pending)) return;
    savedRow.current = true;
    const row: GameRow = {
      date: Date.now(), color, level: profileLevel, engineElo, result: over.result, reason: over.why, sans,
      notes: notes.map((n) => ({ ply: n.ply, san: n.san, by: n.by, label: n.label, tone: n.tone, text: n.text, best: n.best, evalCp: n.evalWhite }))
    };
    void db.games.add(row);
  }, [over, notes, sans, color, engineElo, profileLevel]);

  const checkEnd = useCallback(
    (c: Chess, s: string[]) => {
      const e = endReason(c);
      if (!e) return false;
      if (e.result === 'mate') finish(c.turn() === color ? 'loss' : 'win', 'mat', s);
      else finish('draw', e.why, s);
      return true;
    },
    [color, finish]
  );

  // ---------- Menace de l'adversaire (sur le coup qu'il vient de jouer) ----------
  const computeThreat = useCallback(
    async (f: string, ply: number, g: number) => {
      const base = await analyse(f);
      if (g !== gen.current) return;
      const nf = nullMoveFen(f);
      if (!nf) return;
      const t = await analysisEngine().analyse(nf, { depth: 10, movetime: 700 });
      if (g !== gen.current || !t.lines[0]) return;
      // Scores du point de vue de l'adversaire
      const baseOpp = -scoreToCp(base.lines[0] ?? { cp: 0 });
      const threatOpp = scoreToCp(t.lines[0]);
      const d = describeThreat(nf, t.lines[0].pv, threatOpp, baseOpp);
      if (!d) return;
      setNotes((ns) => ns.map((n) => (n.ply === ply && n.by === 'engine' ? { ...n, text: `${n.text} Menace : ${d}.`.trim() } : n)));
      const u = t.lines[0].pv[0];
      setThreat({ from: u.slice(0, 2), to: u.slice(2, 4), brush: 'red' });
    },
    [analyse]
  );

  // ---------- Coup de l'ordinateur ----------
  const engineMove = useCallback(
    async (curSans: string[], book: boolean, g: number) => {
      setThinking(true);
      const c = fenAt(curSans);
      const f = c.fen();
      let uci: string | null = null;
      let bookName = '';
      let stillBook = book;
      if (book) {
        const edges = bookMoves(tree, f);
        if (edges?.length) {
          const e = edges[Math.floor(Math.random() * edges.length)];
          uci = e.uci;
          bookName = rep.byId.get([...e.lineIds][0])?.name ?? '';
        } else stillBook = false;
      }
      const t0 = Date.now();
      if (!uci) uci = await playerEngine().play(f, engineElo);
      await sleep(Math.max(0, 450 - (Date.now() - t0)));
      if (g !== gen.current) return;
      setThinking(false);
      if (!uci) return;
      const m = playUci(c, uci)!;
      const next = [...curSans, m.san];
      const ply = curSans.length;
      let text = '';
      if (m.captured) text += `Prend ${PIECE_NAME[m.captured]}.`;
      if (c.inCheck()) text += ' Échec !';
      if (bookName) text = `Suit votre répertoire : ${bookName}. ${text}`;
      const note: Note = { ply, san: m.san, by: 'engine', tone: 'info', text: text.trim() };
      setInBook(stillBook);
      setSans(next);
      setNotes((ns) => [...ns, note]);
      checkEnd(c, next);
      setThreat(null);
      if (!endReason(c)) {
        // Pré-analyse de la position (sert à juger le prochain coup) puis menace
        if (!stillBook) void computeThreat(c.fen(), ply, g);
        else void analyse(c.fen());
      }
    },
    [analyse, checkEnd, computeThreat, engineElo, rep.byId, tree]
  );

  // Premier coup si l'ordinateur a les blancs (ou reprise d'une partie où c'est à lui)
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (!saved) toggleColor();
    const c = fenAt(sans);
    if (!endReason(c) && c.turn() !== color) void engineMove(sans, inBook, gen.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Coup de l'utilisateur ----------
  const userMove = async (uci: string) => {
    if (thinking || over || turn !== color) return;
    const g = gen.current;
    const before = new Chess(fen);
    const fenBefore = before.fen();
    const c = new Chess(fen);
    const m = playUci(c, uci);
    if (!m) {
      setFlash(uci.slice(2, 4));
      return;
    }
    const ply = sans.length;
    const next = [...sans, m.san];
    setThreat(null);

    // Théorie : coup de votre répertoire
    const edge = inBook ? bookMoves(tree, fenBefore)?.find((e) => e.uci === uciOf(m)) : undefined;
    if (edge) {
      const name = rep.byId.get([...edge.lineIds][0])?.name ?? 'votre répertoire';
      const note: Note = { ply, san: m.san, by: 'user', label: 'Théorie', tone: 'good', text: `Coup de votre répertoire : ${name}.` };
      setSans(next);
      setNotes((ns) => [...ns, note]);
      if (!checkEnd(c, next)) void engineMove(next, true, g);
      return;
    }

    const wasBookPosition = inBook && !!bookMoves(tree, fenBefore);
    setInBook(false);
    const pending: Note = { ply, san: m.san, by: 'user', tone: 'info', text: 'Analyse…', pending: true };
    setSans(next);
    setNotes((ns) => [...ns, pending]);
    const ended = checkEnd(c, next);
    if (!ended) void engineMove(next, false, g);

    // Analyse du coup (en parallèle de la réflexion de l'ordinateur)
    const a = await analyse(fenBefore);
    if (g !== gen.current) return;
    const best = a.lines[0];
    if (!best) {
      patchNote(ply, 'user', { pending: false, text: '' });
      return;
    }
    const bestCp = scoreToCp(best);
    const isBest = best.pv[0] === uciOf(m);
    let playedCp: number;
    let replyPv: string[];
    const second = a.lines.find((l) => l.pv[0] === uciOf(m));
    if (isBest) {
      playedCp = bestCp;
      replyPv = best.pv.slice(1);
    } else if (second && second.depth >= best.depth - 1) {
      playedCp = scoreToCp(second);
      replyPv = second.pv.slice(1);
    } else {
      const after = await analyse(c.fen());
      if (g !== gen.current) return;
      const l = after.lines[0];
      playedCp = l ? -scoreToCp(l) : c.isCheckmate() ? 100000 : 0;
      replyPv = l?.pv ?? [];
    }
    const cl = classify(bestCp, playedCp, isBest);
    const parts: string[] = [];
    let label: Note['label'] = cl.label;
    if (wasBookPosition) {
      const expected = bookMoves(tree, fenBefore)!.map((e) => fr(e.san)).join(' ou ');
      parts.push(`Vous sortez de votre répertoire, qui prévoyait ${expected}.`);
    }
    if (cl.tone !== 'good') {
      const ex = explainMistake({ fenBefore, played: m, bestPv: best.pv, bestCp, replyPv, playedCp, severe: cl.label !== 'Imprécision' });
      parts.push(ex.text);
    } else if (isBest && a.lines[1] && classify(bestCp, scoreToCp(a.lines[1]), false).lossPct >= 15) {
      parts.push('Le seul bon coup, bien trouvé !');
    }
    if (c.isCheckmate()) {
      label = 'Excellent';
      parts.push('Échec et mat !');
    }
    parts.push(...generalTips({ fenAfter: c.fen(), played: m, ply, good: cl.tone === 'good', seen: tips.current }));
    const sign = color === 'w' ? 1 : -1;
    const bestSan = new Chess(fenBefore).move({ from: best.pv[0].slice(0, 2), to: best.pv[0].slice(2, 4), promotion: best.pv[0][4] })?.san;
    const patch: Partial<Note> = {
      pending: false, label, tone: c.isCheckmate() ? 'good' : cl.tone, text: parts.join(' '),
      best: bestSan, bestUci: best.pv[0], evalWhite: sign * playedCp, lossPct: cl.lossPct
    };
    patchNote(ply, 'user', patch);

    // Commentaire rédigé par Claude (optionnel, plafonné)
    if (cl.tone !== 'good' && profile.settings.claude && claudeCalls.current < profile.settings.claudeCap) {
      claudeCalls.current++;
      const text = await enhanceWithClaude({
        fen: fenBefore, played: m.san, best: bestSan ?? '', bestCp, playedCp, label: cl.label, color,
        refutation: replyPv, ruleText: patch.text ?? '', history: sans
      });
      if (text && g === gen.current) patchNote(ply, 'user', { text, ai: true });
    }
  };

  // ---------- Reprendre ----------
  const undo = () => {
    if (thinking || over || sans.length === 0) return;
    // Revient avant votre dernier coup
    let keep = sans.length;
    keep -= turn === color ? 2 : 1;
    if (keep < 0) return;
    gen.current++;
    const next = sans.slice(0, keep);
    setSans(next);
    setNotes((ns) => ns.filter((n) => n.ply < keep));
    setUndos((u) => u + 1);
    setThreat(null);
    setThinking(false);
    // Le livre reste valable si la position est encore dans l'arbre
    setInBook(!!bookMoves(tree, fenAt(next).fen()) || next.length === 0);
    if (fenAt(next).turn() !== color) void engineMove(next, true, gen.current);
  };

  const newGame = async () => {
    gen.current++;
    await setKV('currentGame', null);
    location.reload();
  };

  // ---------- Bilan ----------
  const userNotes = notes.filter((n) => n.by === 'user' && !n.pending);
  const count = (l: string) => userNotes.filter((n) => n.label === l).length;
  const judged = userNotes.filter((n) => n.lossPct !== undefined);
  const accuracy = judged.length ? Math.round(judged.reduce((s, n) => s + moveAccuracy(n.lossPct!), 0) / judged.length) : null;

  if (review !== null) {
    const ann: Record<number, { title: string; text: string; tone: string }> = {};
    for (const n of notes) ann[n.ply + 1] = { title: `${moveNum(n.ply)} ${fr(n.san)}${n.label ? ` · ${n.label}` : n.by === 'engine' ? ' · Ordinateur' : ''}`, text: n.text, tone: n.tone };
    return (
      <Analysis initialSans={sans} startCursor={review} orientation={color} title="Relecture de la partie" annotations={ann}
        onBack={() => setReview(null)} />
    );
  }

  const arrows: Arrow[] = [];
  if (threat && !over) arrows.push(threat);

  const resultTitle = over
    ? over.result === 'win' ? 'Victoire !' : over.result === 'loss' ? 'Défaite' : over.result === 'draw' ? `Nulle (${over.why})` : 'Partie arrêtée'
    : '';

  return (
    <main className="layout">
      <div className="board-col">
        <Board fen={fen} orientation={color} movable={over || thinking ? null : color} lastMove={lastMv ? [lastMv.from, lastMv.to] : null}
          arrows={arrows} flash={flash} onMove={userMove} />
        <EvalBar cp={evalWhite} />
      </div>
      <section className="panel" aria-live="polite">
        <div className="ph">
          <h2>Partie commentée</h2>
          <span className="tag">Ordinateur ≈ {engineElo}</span>
        </div>
        <p className="sub">
          Vous avez les {sideLower(color)}.{' '}
          {over ? '' : thinking ? 'L’ordinateur réfléchit…' : turn === color ? 'À vous de jouer.' : ''}
          {inBook && !over ? ' L’ordinateur suit votre répertoire.' : ''}
        </p>
        {over && (
          <div className={`msg ${over.result === 'win' ? 'good' : over.result === 'loss' ? 'bad' : ''}`}>
            <b>{resultTitle}</b>
            <span className="idea">
              Bilan : {count('Gaffe')} gaffe{count('Gaffe') > 1 ? 's' : ''}, {count('Erreur')} erreur{count('Erreur') > 1 ? 's' : ''},{' '}
              {count('Imprécision')} imprécision{count('Imprécision') > 1 ? 's' : ''}
              {accuracy !== null ? ` · précision ${accuracy} %` : ''}
              {undos ? ` · ${undos} coup${undos > 1 ? 's' : ''} repris` : ''}.
            </span>
            <WorstMoves notes={userNotes} onPick={(p) => setReview(p + 1)} />
          </div>
        )}
        <ol className="feed">
          {[...notes].reverse().map((n) => (
            <li key={`${n.by}${n.ply}`} className={`${n.tone} clickable`} onClick={() => over && setReview(n.ply + 1)}>
              <b>
                {moveNum(n.ply)} {fr(n.san)}
                {n.label ? ` · ${n.label}` : n.by === 'engine' ? ' · Ordinateur' : ''}
              </b>
              {n.text && <span>{n.text}</span>}
              {n.ai && <span className="ai">Commentaire rédigé par Claude</span>}
            </li>
          ))}
          <li className="info">
            <b>Début de partie</b>
            <span>
              {color === 'w'
                ? 'Jouez 1.e4 : l’ordinateur suit les lignes de votre répertoire tant que c’est possible.'
                : 'L’ordinateur commence. Contre 1.e4, votre Caro-Kann ; contre 1.d4, la Slave.'}
            </span>
          </li>
        </ol>
        <div className="row">
          {!over && <button className="btn" onClick={undo} disabled={thinking || sans.length === 0}>Reprendre le coup</button>}
          {!over && <button className="btn" onClick={() => finish('loss', 'abandon', sans)} disabled={sans.length < 2}>Abandonner</button>}
          {!over && <button className="btn" onClick={() => finish('stop', 'arrêt', sans)}>Arrêter</button>}
          {over && <button className="btn" onClick={() => setReview(sans.length)}>Relire la partie</button>}
          <button className="btn primary" onClick={newGame}>Nouvelle partie</button>
        </div>
        {!over && (
          <p className="fine">
            « Arrêter » ne change pas votre niveau. Une victoire ou une défaite l’ajuste. Prochaine partie avec les {sideLower(other(color))}.
          </p>
        )}
        {engineElo !== Math.max(600, profileLevel + offset) && !over && (
          <button className="btn small" onClick={() => setEngineElo(Math.max(600, profileLevel + offset))}>Régler l’ordinateur sur mon niveau actuel</button>
        )}
      </section>
    </main>
  );
}

function WorstMoves({ notes, onPick }: { notes: Note[]; onPick: (ply: number) => void }) {
  const worst = notes.filter((n) => n.tone === 'bad' || n.tone === 'warn').sort((a, b) => (b.lossPct ?? 0) - (a.lossPct ?? 0)).slice(0, 3);
  if (!worst.length) return <span className="idea">Aucune erreur notable : très belle partie.</span>;
  return (
    <span className="idea">
      À revoir :{' '}
      {worst.map((n, i) => (
        <span key={n.ply}>
          {i > 0 && ', '}
          <button className="linkish" onClick={() => onPick(n.ply)}>
            <b>{moveNum(n.ply)} {fr(n.san)}</b>
          </button>
          {n.best ? ` (mieux : ${fr(n.best)})` : ''}
        </span>
      ))}
    </span>
  );
}

export type { Move };
