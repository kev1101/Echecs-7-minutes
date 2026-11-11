import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
import { useInstall } from './ui/install';
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

const Settings = lazy(() => import('./features/settings/Settings'));
const Game = lazy(() => import('./features/game/Game'));
const Openings = lazy(() => import('./features/openings/Openings'));
const Puzzles = lazy(() => import('./features/puzzles/Puzzles'));
const Endgames = lazy(() => import('./features/endgames/Endgames'));
const Strategy = lazy(() => import('./features/strategy/Strategy'));

export const THEMES: Theme[] = [
  { id: 'ouvertures', label: 'Ouvertures', daily: true, Comp: () => <Openings /> },
  { id: 'problemes', label: 'Problèmes', daily: true, Comp: () => <Puzzles /> },
  { id: 'strategie', label: 'Stratégie', daily: true, Comp: () => <Strategy /> },
  { id: 'finales', label: 'Finales', daily: true, Comp: () => <Endgames /> },
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

  const { canInstall, install } = useInstall();
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
        {canInstall && (
          <button className="install" onClick={() => void install()} title="Ajouter l’application à l’écran d’accueil">
            ⤓ Installer
          </button>
        )}
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
