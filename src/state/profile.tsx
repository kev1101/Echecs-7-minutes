import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { getKV, setKV } from '../db/db';
import { clampRating, decay, newRating, type Glicko } from '../rating/glicko2';
import type { Color } from '../chess/notation';
import { daysBetween, today } from '../util/dates';

export interface Settings {
  theme: 'auto' | 'light' | 'dark';
  /** Commentaires rédigés par Claude. */
  claude: boolean;
  /** Plafond d'appels à l'API par partie. */
  claudeCap: number;
  /** Nouvelles cartes d'ouverture par jour. */
  newCardsPerDay: number;
  /** Écart entre le niveau de l'ordinateur et le vôtre (Elo). */
  engineOffset: number;
  /** Ajustement automatique du niveau. */
  autoLevel: boolean;
}

export interface Stats {
  puzzles: number;
  solved: number;
  lines: number;
  games: number;
  strategy: number;
  endgames: number;
}

export interface Profile {
  rating: Glicko;
  ratingDay: string;
  streak: { count: number; last: string | null };
  session: { date: string; sec: number };
  gameColor: Color;
  stats: Stats;
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  claude: false,
  claudeCap: 10,
  newCardsPerDay: 8,
  engineOffset: 0,
  autoLevel: true
};

export function defaultProfile(): Profile {
  return {
    rating: newRating(1200, 200),
    ratingDay: today(),
    streak: { count: 0, last: null },
    session: { date: today(), sec: 0 },
    gameColor: 'w',
    stats: { puzzles: 0, solved: 0, lines: 0, games: 0, strategy: 0, endgames: 0 },
    settings: { ...DEFAULT_SETTINGS }
  };
}

interface Ctx {
  profile: Profile;
  update: (fn: (p: Profile) => Profile) => void;
  /** Résultat contre un adversaire (puzzle, ordinateur) : met à jour le niveau si l'ajustement auto est actif. */
  rate: (newRating: Glicko) => void;
  setLevel: (delta: number) => void;
}

const ProfileCtx = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const ref = useRef<Profile | null>(null);

  useEffect(() => {
    getKV<Profile | null>('profile', null).then((p) => {
      const base = defaultProfile();
      let merged: Profile = p ? { ...base, ...p, settings: { ...base.settings, ...p.settings }, stats: { ...base.stats, ...p.stats } } : base;
      // L'incertitude du classement remonte avec l'inactivité
      const gap = daysBetween(merged.ratingDay, today());
      if (gap > 0) merged = { ...merged, rating: decay(merged.rating, gap), ratingDay: today() };
      if (merged.session.date !== today()) merged = { ...merged, session: { date: today(), sec: 0 } };
      ref.current = merged;
      setProfile(merged);
    });
  }, []);

  const update = useCallback((fn: (p: Profile) => Profile) => {
    if (!ref.current) return;
    const next = fn(ref.current);
    ref.current = next;
    setProfile(next);
    void setKV('profile', next);
  }, []);

  const rate = useCallback(
    (r: Glicko) => update((p) => (p.settings.autoLevel ? { ...p, rating: clampRating(r), ratingDay: today() } : p)),
    [update]
  );

  const setLevel = useCallback(
    (delta: number) => update((p) => ({ ...p, rating: clampRating({ ...p.rating, r: Math.round(p.rating.r + delta) }) })),
    [update]
  );

  if (!profile) return <div className="loading">Chargement…</div>;
  return <ProfileCtx.Provider value={{ profile, update, rate, setLevel }}>{children}</ProfileCtx.Provider>;
}

export function useProfile(): Ctx {
  const c = useContext(ProfileCtx);
  if (!c) throw new Error('ProfileProvider manquant');
  return c;
}

export const level = (p: Profile) => Math.round(p.rating.r);
