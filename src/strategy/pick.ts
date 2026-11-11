/** Choix de la prochaine question de stratégie (boîtes de Leitner). */
import type { StrategyRow } from '../db/db';

export const BOX_DAYS = [0, 1, 3, 7, 21];
const DAY = 864e5;

export function nextBox(prev: StrategyRow | undefined, ok: boolean): number {
  if (!ok) return 0;
  return Math.min(BOX_DAYS.length - 1, (prev?.box ?? 0) + 1);
}

export function dueAt(r: StrategyRow): number {
  return r.lastAt + BOX_DAYS[Math.min(r.box, BOX_DAYS.length - 1)] * DAY;
}

/**
 * Ordre : questions ratées dont la révision est due, puis questions jamais vues (en alternant les thèmes),
 * puis les autres questions dues, sinon la moins récemment vue.
 */
export function pickQuestion<T extends { id: string; theme: string }>(
  qs: T[], rows: Map<string, StrategyRow>, now: number, avoid?: string, rnd = Math.random
): T | null {
  const list = qs.filter((q) => q.id !== avoid || qs.length === 1);
  if (!list.length) return null;
  const wrongDue = list.filter((q) => {
    const r = rows.get(q.id);
    return r && !r.lastOk && dueAt(r) <= now;
  });
  if (wrongDue.length) return wrongDue[0];
  const unseen = list.filter((q) => !rows.has(q.id));
  if (unseen.length) {
    // Thème le moins pratiqué d'abord
    const count = new Map<string, number>();
    for (const q of qs) if (rows.has(q.id)) count.set(q.theme, (count.get(q.theme) ?? 0) + 1);
    unseen.sort((a, b) => (count.get(a.theme) ?? 0) - (count.get(b.theme) ?? 0));
    const best = unseen.filter((q) => (count.get(q.theme) ?? 0) === (count.get(unseen[0].theme) ?? 0));
    return best[Math.floor(rnd() * best.length)];
  }
  const due = list.filter((q) => dueAt(rows.get(q.id)!) <= now);
  if (due.length) return due[Math.floor(rnd() * due.length)];
  return [...list].sort((a, b) => rows.get(a.id)!.lastAt - rows.get(b.id)!.lastAt)[0];
}
