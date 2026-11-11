import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
import { Header } from './ui/Header';
import { useProfile } from './state/profile';
import { daysBetween, today } from './util/dates';
import { Analysis } from './features/analysis/Analysis';

interface Theme {
  id: string;
  label: string;
  daily: boolean;
  Comp: ComponentType;
}

const Soon = ({ what }: { what: string }) => (
  <main className="single">
    <section className="panel">
      <h2>{what}</h2>
      <p className="sub">Ce module arrive dans une prochaine étape.</p>
    </section>
  </main>
);

const Settings = lazy(() => import('./features/settings/Settings'));
const Game = lazy(() => import('./features/game/Game'));
const Openings = lazy(() => import('./features/openings/Openings'));

export const THEMES: Theme[] = [
  { id: 'ouvertures', label: 'Ouvertures', daily: true, Comp: () => <Openings /> },
  { id: 'problemes', label: 'Problèmes', daily: true, Comp: () => <Soon what="Problèmes" /> },
  { id: 'strategie', label: 'Stratégie', daily: true, Comp: () => <Soon what="Stratégie" /> },
  { id: 'finales', label: 'Finales', daily: true, Comp: () => <Soon what="Finales" /> },
  { id: 'partie', label: 'Partie commentée', daily: true, Comp: () => <Game /> },
  { id: 'analyse', label: 'Analyse', daily: false, Comp: () => <Analysis /> },
  { id: 'reglages', label: '⚙︎ Réglages', daily: false, Comp: () => <Settings /> }
];

const DAILY = THEMES.filter((t) => t.daily);
export function themeOfDay(d = today()) {
  const i = ((daysBetween('2026-01-05', d) % DAILY.length) + DAILY.length) % DAILY.length;
  return DAILY[i];
}

export default function App() {
  const { profile } = useProfile();
  const daily = themeOfDay();
  const [id, setId] = useState(() => location.hash.slice(1) || daily.id);

  useEffect(() => {
    const on = () => setId(location.hash.slice(1) || daily.id);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, [daily.id]);

  useEffect(() => {
    const t = profile.settings.theme;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }, [profile.settings.theme]);

  const theme = THEMES.find((t) => t.id === id) ?? daily;
  const go = (tid: string) => {
    history.replaceState(null, '', '#' + tid);
    setId(tid);
  };

  return (
    <div className="wrap">
      <Header themeLabel={daily.label} />
      <nav className="tabs" aria-label="Thèmes">
        {THEMES.map((t) => (
          <button key={t.id} className={`${t.id === theme.id ? 'on' : ''} ${t.id === 'reglages' ? 'gear' : ''}`} onClick={() => go(t.id)}>
            {t.label}
            {t.id === daily.id && <em>du jour</em>}
          </button>
        ))}
      </nav>
      <Suspense fallback={<div className="loading">Chargement…</div>}>
        <theme.Comp key={theme.id} />
      </Suspense>
      <footer>
        Vos progrès sont gardés sur cet appareil (exportables dans les réglages). Moteur :{' '}
        <a href="https://stockfishchess.org" target="_blank" rel="noreferrer">Stockfish</a> (GPL v3). Problèmes et noms
        d’ouvertures : <a href="https://database.lichess.org" target="_blank" rel="noreferrer">Lichess</a> (CC0).
      </footer>
    </div>
  );
}
