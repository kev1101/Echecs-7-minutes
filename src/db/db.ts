import Dexie, { type Table } from 'dexie';
import type { Card } from 'ts-fsrs';
import type { Color } from '../chess/notation';
import type { Glicko } from '../rating/glicko2';

/** Ligne de répertoire ajoutée par l'utilisateur (les lignes intégrées viennent de src/content). */
export interface RepLineRow {
  id: string;
  side: Color;
  group: string;
  name: string;
  pgn: string;
  idea?: string;
  created: number;
}

/** Une carte de répétition espacée = un coup de l'utilisateur dans une position donnée. */
export interface CardRow {
  id: string; // `${side}|${epd}|${uci}`
  side: Color;
  epd: string;
  uci: string;
  card: Card;
}

export interface PuzzleRow {
  id: string;
  rating: Glicko; // classement local du puzzle
  attempts: number;
  solved: number;
  lastAt: number;
  lastOk: boolean;
  /** Date (ms) à partir de laquelle un puzzle raté revient. */
  reviewAt: number | null;
  reviewStep: number;
}

export interface GameRow {
  id?: number;
  date: number;
  color: Color;
  level: number;
  engineElo: number;
  result: 'win' | 'loss' | 'draw' | 'stop';
  reason?: string;
  sans: string[];
  notes: MoveNoteRow[];
}

export interface MoveNoteRow {
  ply: number;
  san: string;
  by: 'user' | 'engine';
  label?: string;
  tone: 'good' | 'warn' | 'bad' | 'info';
  text: string;
  best?: string;
  evalCp?: number; // point de vue des blancs, après le coup
}

export interface StrategyRow {
  id: string;
  seen: number;
  right: number;
  lastAt: number;
  lastOk: boolean;
}

export interface EndgameRow {
  id: string;
  attempts: number;
  successes: number;
  lastAt: number;
}

export interface KV {
  key: string;
  value: unknown;
}

export class EchecsDB extends Dexie {
  kv!: Table<KV, string>;
  repLines!: Table<RepLineRow, string>;
  cards!: Table<CardRow, string>;
  puzzles!: Table<PuzzleRow, string>;
  games!: Table<GameRow, number>;
  strategy!: Table<StrategyRow, string>;
  endgames!: Table<EndgameRow, string>;

  constructor(name = 'echecs7') {
    super(name);
    this.version(1).stores({
      kv: 'key',
      repLines: 'id, side',
      cards: 'id, side, epd',
      puzzles: 'id, reviewAt',
      games: '++id, date',
      strategy: 'id',
      endgames: 'id'
    });
  }
}

export const db = new EchecsDB();

export async function getKV<T>(key: string, fallback: T): Promise<T> {
  const row = await db.kv.get(key);
  return row ? (row.value as T) : fallback;
}
export async function setKV<T>(key: string, value: T): Promise<void> {
  await db.kv.put({ key, value });
}

const TABLES = ['kv', 'repLines', 'cards', 'puzzles', 'games', 'strategy', 'endgames'] as const;

/** Export complet en JSON (pour passer d'un appareil à l'autre). La clé API n'est jamais exportée. */
export async function exportAll(): Promise<string> {
  const out: Record<string, unknown> = { app: 'echecs7', version: 1, exported: new Date().toISOString() };
  for (const t of TABLES) {
    let rows = await db.table(t).toArray();
    if (t === 'kv') rows = rows.filter((r: KV) => r.key !== 'apiKey');
    out[t] = rows;
  }
  return JSON.stringify(out);
}

export async function importAll(json: string): Promise<void> {
  const data = JSON.parse(json);
  if (data?.app !== 'echecs7') throw new Error('Ce fichier ne vient pas de l’application.');
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      const rows = data[t];
      if (!Array.isArray(rows)) continue;
      const table = db.table(t);
      if (t === 'kv') {
        const key = await db.kv.get('apiKey');
        await table.clear();
        if (key) await db.kv.put(key);
      } else await table.clear();
      await table.bulkPut(rows);
    }
  });
}
