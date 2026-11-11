import { useEffect, useRef, useState } from 'react';
import { level, useProfile } from '../state/profile';
import { daysBetween, today } from '../util/dates';

export const GOAL_SEC = 7 * 60;
const STREAK_SEC = 5 * 60;

export function Header({ themeLabel }: { themeLabel: string }) {
  const { profile, update, setLevel } = useProfile();
  const [sec, setSec] = useState(profile.session.date === today() ? profile.session.sec : 0);
  const [active, setActive] = useState(false);
  const secRef = useRef(sec);

  useEffect(() => {
    const on = () => setActive(true);
    document.addEventListener('pointerdown', on, { once: true });
    return () => document.removeEventListener('pointerdown', on);
  }, []);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      const d = today();
      secRef.current += 1;
      const s = secRef.current;
      setSec(s);
      if (s % 5 === 0 || s === STREAK_SEC) {
        update((p) => {
          let next = { ...p, session: { date: d, sec: p.session.date === d ? Math.max(p.session.sec, s) : s } };
          if (s >= STREAK_SEC && p.streak.last !== d) {
            const cont = p.streak.last && daysBetween(p.streak.last, d) === 1;
            next = { ...next, streak: { count: cont ? p.streak.count + 1 : 1, last: d } };
          }
          return next;
        });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [active, update]);

  const m = Math.floor(sec / 60);
  const r = sec % 60;
  const done = sec >= GOAL_SEC;
  const st = profile.streak;
  const streak = st.last && daysBetween(st.last, today()) <= 1 ? st.count : 0;
  const lv = level(profile);

  return (
    <header>
      <h1>
        Échecs en 7 minutes<small>Thème du jour : <b>{themeLabel}</b></small>
      </h1>
      <div className="stats">
        <div className={`stat timer ${done ? 'done' : ''}`}>
          <span>Séance</span>
          <b>
            {m}:{String(r).padStart(2, '0')}
          </b>
          <div className="bar">
            <div className="fill" style={{ width: `${Math.min(100, (sec / GOAL_SEC) * 100)}%` }} />
          </div>
          <span className="note">{done ? 'Objectif atteint, bravo !' : active ? 'sur 7:00' : 'démarre au premier coup'}</span>
        </div>
        <div className="stat">
          <span>Série</span>
          <b>{streak} {streak > 1 ? 'jours' : 'jour'}</b>
          {st.last !== today() && <span className="note">5 min pour la valider</span>}
        </div>
        <div className="stat">
          <span>Niveau</span>
          <div className="level">
            <button onClick={() => setLevel(-50)} aria-label="Baisser le niveau de 50">−</button>
            <b title={`Incertitude ±${Math.round(profile.rating.rd)}`}>{lv}</b>
            <button onClick={() => setLevel(50)} aria-label="Monter le niveau de 50">+</button>
          </div>
        </div>
      </div>
    </header>
  );
}
