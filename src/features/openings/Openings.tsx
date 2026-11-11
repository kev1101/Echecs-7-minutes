import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Board, type Arrow } from '../../board/Board';
import { fr, playUci, sideLower, type Color } from '../../chess/notation';
import { loadEco, openingName, type OpeningName } from '../../chess/eco';
import { db, getKV, setKV } from '../../db/db';
import { useRepertoire, type Repertoire } from '../../state/repertoire';
import { useProfile } from '../../state/profile';
import {
  cardsOnPath, dueSummary, gradesForRun, isDue, masteryLevel, planNext, reviveCard, type Card, type TrainingPath
} from '../../srs/srs';
import { MoveList } from '../../ui/MoveList';
import { today } from '../../util/dates';
import { AddLine } from './AddLine';

type Filter = 'all' | Color;

function whenText(due: Date | null): string {
  if (!due) return '';
  const ms = due.getTime() - Date.now();
  if (ms < 60 * 60 * 1000) return 'dans quelques minutes';
  if (ms < 20 * 60 * 60 * 1000) return 'plus tard aujourd’hui';
  const days = Math.round(ms / 864e5);
  return days <= 1 ? 'demain' : `dans ${days} jours`;
}

export default function Openings() {
  const rep = useRepertoire();
  const [cards, setCards] = useState<Map<string, Card> | null>(null);
  const [eco, setEco] = useState<Record<string, [string, string]>>({});

  const reloadCards = useCallback(async () => {
    const rows = await db.cards.toArray();
    setCards(new Map(rows.map((r) => [r.id, reviveCard(r.card)])));
  }, []);

  useEffect(() => {
    void reloadCards();
    void loadEco().then(setEco);
  }, [reloadCards]);

  if (!rep || !cards) return <div className="loading">Chargement…</div>;
  return <Trainer rep={rep} cards={cards} eco={eco} onGraded={reloadCards} />;
}

function Trainer({ rep, cards, eco, onGraded }: {
  rep: Repertoire;
  cards: Map<string, Card>;
  eco: Record<string, [string, string]>;
  onGraded: () => Promise<void>;
}) {
  const { profile, update } = useProfile();
  const [filter, setFilter] = useState<Filter>('all');
  const [path, setPath] = useState<TrainingPath | null>(null);
  const [i, setI] = useState(0);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [miss, setMiss] = useState(0);
  const [msg, setMsg] = useState<{ tone: string; html: React.ReactNode }>({ tone: '', html: '' });
  const [hint, setHint] = useState<Arrow | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [done, setDone] = useState<{ errors: number; next: Date | null } | null>(null);
  const [adding, setAdding] = useState(false);
  const lastLine = useRef<string | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trees = useMemo(() => (filter === 'all' ? [rep.trees.w, rep.trees.b] : [rep.trees[filter]]), [rep, filter]);
  const summary = useMemo(() => dueSummary(trees, cards), [trees, cards]);

  const start = useCallback(
    async (forced?: TrainingPath) => {
      if (timer.current) clearTimeout(timer.current);
      const nt = await getKV<{ date: string; n: number }>('newToday', { date: today(), n: 0 });
      const used = nt.date === today() ? nt.n : 0;
      const p = forced ?? planNext({ trees, cards, now: new Date(), newLeft: profile.settings.newCardsPerDay - used, avoid: lastLine.current });
      lastLine.current = p?.lineId;
      setPath(p);
      setI(0);
      setErrors(new Set());
      setMiss(0);
      setHint(null);
      setDone(null);
      setMsg({ tone: '', html: '' });
    },
    [trees, cards, profile.settings.newCardsPerDay]
  );

  // Démarre (ou redémarre quand le filtre change)
  useEffect(() => {
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const line = path ? rep.byId.get(path.lineId) : undefined;
  const side: Color = line?.side ?? 'w';
  const chess = useMemo(() => {
    const c = new Chess();
    if (path) for (const s of path.sans.slice(0, i)) c.move(s);
    return c;
  }, [path, i]);
  const fen = chess.fen();
  const hist = chess.history({ verbose: true });
  const last = hist[hist.length - 1];
  const name: OpeningName | null = path ? openingName(eco, path.sans.slice(0, Math.max(i, 1))) : null;
  const pathCards = path ? path.cards : [];
  const cardAt = (ply: number) => pathCards.find((c) => c.ply === ply);

  // Coup de l'adversaire automatique, et annonce du coup à jouer
  useEffect(() => {
    if (!path || done) return;
    if (i >= path.sans.length) {
      void finish();
      return;
    }
    if (chess.turn() !== side) {
      timer.current = setTimeout(() => setI((x) => x + 1), 450);
      return () => {
        if (timer.current) clearTimeout(timer.current);
      };
    }
    const pc = cardAt(i);
    const card = pc ? cards.get(pc.id) : undefined;
    if (pc && !card) {
      // Nouveau coup : on le montre d'abord
      const m = new Chess(fen).move(path.sans[i]);
      setHint({ from: m.from, to: m.to, brush: 'green' });
      setMsg({ tone: 'info', html: <>Nouveau coup à apprendre : <b>{fr(path.sans[i])}</b>. Jouez-le.</> });
    } else if (miss === 0) {
      setHint(null);
      setMsg({ tone: '', html: <>À vous : coup {Math.floor(i / 2) + 1} des {sideLower(side)}{card && isDue(card) ? ' (à revoir)' : ''}.</> });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, i, done]);

  const finish = async () => {
    if (!path || done) return;
    const now = new Date();
    const grades = gradesForRun(path, errors, cards, now);
    const fresh = grades.filter((g) => !cards.has(g.id)).length;
    await db.cards.bulkPut(
      grades.map((g) => {
        const pc = path.cards.find((c) => c.id === g.id)!;
        const [s, ep, uci] = g.id.split('|');
        return { id: g.id, side: s as Color, epd: ep, uci: uci ?? pc.san, card: g.card };
      })
    );
    if (fresh) {
      const nt = await getKV<{ date: string; n: number }>('newToday', { date: today(), n: 0 });
      await setKV('newToday', { date: today(), n: (nt.date === today() ? nt.n : 0) + fresh });
    }
    update((p) => ({ ...p, stats: { ...p.stats, lines: p.stats.lines + 1 } }));
    // Prochaine révision de la ligne : la plus proche de ses cartes
    const merged = new Map(cards);
    for (const g of grades) merged.set(g.id, g.card);
    let next: Date | null = null;
    for (const pc of path.cards) {
      const c = merged.get(pc.id);
      if (c && (!next || new Date(c.due) < next)) next = new Date(c.due);
    }
    setDone({ errors: errors.size, next });
    setHint(null);
    await onGraded();
  };

  const onMove = (uci: string) => {
    if (!path || done || chess.turn() !== side) return;
    const expected = path.sans[i];
    const c = new Chess(fen);
    const m = playUci(c, uci);
    if (!m) return;
    if (m.san === expected) {
      if (miss === 0 && !hint) setMsg({ tone: 'good', html: <>{fr(m.san)} : correct.</> });
      else setMsg({ tone: '', html: '' });
      setMiss(0);
      setHint(null);
      setI(i + 1);
      return;
    }
    const pc = cardAt(i);
    setFlash(`${m.to}#${i}-${miss}-${Date.now()}`);
    if (pc && !hint) setErrors((e) => new Set(e).add(pc.id));
    const n = miss + 1;
    setMiss(n);
    if (n === 1 && !hint) {
      setMsg({ tone: 'warn', html: <>{fr(m.san)} n’est pas le coup de votre répertoire. Essayez encore.</> });
    } else {
      const em = new Chess(fen).move(expected);
      setHint({ from: em.from, to: em.to, brush: 'blue' });
      setMsg({ tone: 'bad', html: <>Le coup du répertoire est <b>{fr(expected)}</b>. Jouez-le pour continuer.</> });
    }
  };

  // Liste du répertoire
  const lines = rep.lines.filter((l) => filter === 'all' || l.side === filter);
  const groups = new Map<string, typeof lines>();
  for (const l of lines) groups.set(l.group, [...(groups.get(l.group) ?? []), l]);
  const lineStatus = (id: string) => {
    const l = rep.byId.get(id)!;
    const t = rep.trees[l.side];
    const all = (rep.parsed.get(id) ?? []).flatMap((s) => cardsOnPath(t, s));
    const uniq = [...new Map(all.map((c) => [c.id, c])).values()];
    if (!uniq.length) return { mastery: 0, due: false };
    const lv = uniq.reduce((s, c) => s + masteryLevel(cards.get(c.id)), 0) / uniq.length;
    return { mastery: Math.round(lv), due: uniq.some((c) => isDue(cards.get(c.id))) };
  };
  const trainLine = (id: string) => {
    const l = rep.byId.get(id)!;
    const t = rep.trees[l.side];
    const paths = t.paths.filter((p) => p.lineId === id);
    if (!paths.length) return;
    // La variante qui a le plus de cartes à revoir (ou de nouvelles), sinon au hasard
    const scored = paths.map((p) => {
      const cs = cardsOnPath(t, p.sans);
      return { p, s: cs.filter((c) => !cards.has(c.id) || isDue(cards.get(c.id))).length + Math.random() };
    });
    scored.sort((a, b) => b.s - a.s);
    void start({ lineId: id, sans: scored[0].p.sans, cards: cardsOnPath(t, scored[0].p.sans), reason: 'practice' });
  };
  const removeLine = async (id: string) => {
    if (!confirm('Supprimer cette ligne de votre répertoire ?')) return;
    await db.repLines.delete(id);
    const { invalidateRepertoire } = await import('../../state/repertoire');
    invalidateRepertoire();
  };

  if (adding) return <AddLine rep={rep} onClose={() => setAdding(false)} />;

  return (
    <main className="layout">
      <div className="board-col">
        <Board fen={fen} orientation={side} movable={path && !done && chess.turn() === side ? side : null}
          lastMove={last ? [last.from, last.to] : null} arrows={hint ? [hint] : []} flash={flash} onMove={onMove} />
      </div>
      <section className="panel" aria-live="polite">
        {path && line ? (
          <>
            <div className="ph">
              <h2>{line.name}</h2>
              <span className="tag">{line.group}</span>
            </div>
            {name && <p className="sub">{name.eco} · {name.name}</p>}
            <p className="sub">
              Vous jouez les {sideLower(side)}.{' '}
              {path.reason === 'due' ? 'Révision des coups à revoir.' : path.reason === 'new' ? 'Apprentissage de nouveaux coups.' : 'Entraînement libre : rien à revoir pour l’instant.'}
            </p>
            {!done && <div className={`msg ${msg.tone}`}>{msg.html}</div>}
            {done && (
              <div className={`msg ${done.errors ? 'warn' : 'good'}`}>
                {done.errors ? `Ligne terminée avec ${done.errors} erreur${done.errors > 1 ? 's' : ''}.` : 'Ligne parfaite !'}
                {done.next && <> Prochaine révision {whenText(done.next)}.</>}
                {line.idea && <span className="idea">{line.idea}</span>}
              </div>
            )}
            <MoveList sans={path.sans.slice(0, i)} pending={!done && i < path.sans.length && chess.turn() === side} />
            <div className="row">
              {done && <button className="btn primary" onClick={() => start()}>Ligne suivante</button>}
              {done && <button className="btn" onClick={() => start(path)}>Recommencer</button>}
              {!done && <button className="btn" onClick={() => start()}>Passer</button>}
            </div>
          </>
        ) : (
          <>
            <h2>Ouvertures</h2>
            <p className="sub">Aucune ligne dans ce filtre.</p>
          </>
        )}
        <p className="fine">
          {summary.dueCards ? `${summary.dueCards} coup${summary.dueCards > 1 ? 's' : ''} à revoir (${summary.dueLines} ligne${summary.dueLines > 1 ? 's' : ''})` : 'Rien à revoir pour l’instant'}
          {' · '}{summary.fresh} coup{summary.fresh > 1 ? 's' : ''} encore jamais vu{summary.fresh > 1 ? 's' : ''}. Répétition espacée FSRS : un coup raté revient vite, un coup su s’espace.
        </p>
        <details className="rep">
          <summary>Votre répertoire ({rep.lines.length} lignes)</summary>
          <div className="chips">
            {(
              [
                ['all', 'Tout'],
                ['w', 'Blancs'],
                ['b', 'Noirs']
              ] as const
            ).map(([k, v]) => (
              <button key={k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{v}</button>
            ))}
            <button className="chip" onClick={() => setAdding(true)}>+ Ajouter une ligne (PGN)</button>
          </div>
          {[...groups.entries()].map(([g, ls]) => (
            <div key={g}>
              <h3 className="sub" style={{ fontSize: '.85rem', margin: '6px 0 2px' }}>{g}</h3>
              <ul className="list">
                {ls.map((l) => {
                  const st = lineStatus(l.id);
                  return (
                    <li key={l.id} className={path?.lineId === l.id ? 'cur' : ''}>
                      <button className="linkish" onClick={() => trainLine(l.id)}>
                        {l.name}{st.due ? ' •' : ''}
                      </button>
                      <span className="row" style={{ gap: 6 }}>
                        {l.custom && <button className="btn small" onClick={() => removeLine(l.id)} aria-label={`Supprimer ${l.name}`}>✕</button>}
                        <span className="boxes" title={`Mémorisation ${st.mastery}/5`}>
                          {[0, 1, 2, 3, 4].map((k) => <i key={k} className={k < st.mastery ? 'on' : ''} />)}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <p className="fine">• = des coups de cette ligne sont à revoir. Cliquez sur une ligne pour la travailler.</p>
        </details>
      </section>
    </main>
  );
}
