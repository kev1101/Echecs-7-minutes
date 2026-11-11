import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { parsePgn } from '../chess/pgn';
import { buildTree, type RepLine, type RepTree } from '../chess/tree';
import { REPERTOIRE } from '../content/repertoire';
import type { Color } from '../chess/notation';

export interface Repertoire {
  lines: RepLine[];
  /** Lignes déjà découpées (racine → feuille). */
  parsed: Map<string, string[][]>;
  trees: Record<Color, RepTree>;
  byId: Map<string, RepLine>;
}

let cache: Promise<Repertoire> | null = null;
const listeners = new Set<() => void>();

async function load(): Promise<Repertoire> {
  const custom = await db.repLines.toArray();
  const lines: RepLine[] = [
    ...REPERTOIRE,
    ...custom.map((c) => ({ id: c.id, side: c.side, group: c.group, name: c.name, pgn: c.pgn, idea: c.idea, custom: true }))
  ];
  const parsed = new Map<string, string[][]>();
  for (const l of lines) {
    try {
      parsed.set(l.id, parsePgn(l.pgn).lines);
    } catch {
      parsed.set(l.id, []);
    }
  }
  const tree = (side: Color) =>
    buildTree(side, lines.filter((l) => l.side === side).map((l) => ({ id: l.id, lines: parsed.get(l.id) ?? [] })));
  return { lines, parsed, trees: { w: tree('w'), b: tree('b') }, byId: new Map(lines.map((l) => [l.id, l])) };
}

export function getRepertoire(): Promise<Repertoire> {
  return (cache ??= load());
}

/** À appeler après l'ajout ou la suppression d'une ligne. */
export function invalidateRepertoire() {
  cache = null;
  for (const fn of listeners) fn();
}

export function useRepertoire(): Repertoire | null {
  const [rep, setRep] = useState<Repertoire | null>(null);
  useEffect(() => {
    let live = true;
    const reload = () => getRepertoire().then((r) => live && setRep(r));
    reload();
    listeners.add(reload);
    return () => {
      live = false;
      listeners.delete(reload);
    };
  }, []);
  return rep;
}
