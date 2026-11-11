import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { Chess } from 'chess.js';
import { acceptMove, bucketsFor, dueReviews, fromTuple, pickPuzzle, scheduleReview, type Puzzle, type PuzzleTuple } from '../src/puzzles/select';
import type { PuzzleRow } from '../src/db/db';
import { newRating, update } from '../src/rating/glicko2';
import { PUZZLE_THEMES } from '../src/content/puzzleThemes';

const B = Array.from({ length: 14 }, (_, i) => ({ file: `r${600 + i * 100}.json`, min: 600 + i * 100, max: 700 + i * 100, count: 1 }));
const mk = (id: string, rating: number, themes = ['fork']): Puzzle => ({ id, fen: '', moves: [], rating, rd: 80, themes });
const row = (id: string, extra: Partial<PuzzleRow> = {}): PuzzleRow => ({
  id, rating: newRating(1200, 80), attempts: 1, solved: 0, lastAt: 0, lastOk: false, reviewAt: null, reviewStep: 0, ...extra
});
const DAY = 864e5;

describe('tranches de classement', () => {
  it('charge les tranches autour du niveau', () => {
    expect(bucketsFor(1200, B).map((b) => b.min)).toEqual([1000, 1100, 1200, 1300]);
  });
  it('reste dans la plage disponible', () => {
    expect(bucketsFor(300, B).map((b) => b.min)).toEqual([600]);
    expect(bucketsFor(2600, B).map((b) => b.min)).toEqual([1900]);
  });
});

describe('sélection des puzzles', () => {
  const pool = [mk('a', 800), mk('b', 1150), mk('c', 1220, ['pin']), mk('d', 1300), mk('e', 1900)];

  it('choisit près du niveau', () => {
    const picks = new Set<string>();
    let s = 1;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 50; i++) picks.add(pickPuzzle({ pool: pool.filter((p) => p.id !== 'a' && p.id !== 'e').concat(mk('a', 800), mk('e', 1900)), states: new Map(), userRating: 1200, theme: null, now: 0, rnd })!.puzzle.id);
    expect(picks.size).toBeGreaterThan(1);
  });

  it('respecte le thème choisi', () => {
    const p = pickPuzzle({ pool, states: new Map(), userRating: 1200, theme: 'pin', now: 0 });
    expect(p?.puzzle.id).toBe('c');
  });

  it('évite les puzzles déjà joués', () => {
    const states = new Map([['b', row('b')], ['c', row('c')], ['d', row('d')]]);
    const p = pickPuzzle({ pool, states, userRating: 1200, theme: null, now: 0, rnd: () => 0.5 });
    expect(['a', 'e']).toContain(p?.puzzle.id);
  });

  it('propose les puzzles ratés à revoir', () => {
    const states = new Map([['d', row('d', { reviewAt: 10, reviewStep: 0 })]]);
    const p = pickPuzzle({ pool, states, userRating: 1200, theme: null, now: 100, reviewPool: [pool[3]], reviewChance: 1 });
    expect(p).toEqual({ puzzle: pool[3], review: true });
    expect(dueReviews(states, 5)).toEqual([]);
  });
});

describe('révision des puzzles ratés', () => {
  it('un échec revient le lendemain, les réussites espacent puis sortent de la file', () => {
    let s = scheduleReview(undefined, false, 0);
    expect(s).toEqual({ reviewAt: DAY, reviewStep: 0 });
    let prev = row('x', s);
    s = scheduleReview(prev, true, DAY);
    expect(s.reviewAt).toBe(DAY + 3 * DAY);
    prev = row('x', s);
    s = scheduleReview(prev, true, 4 * DAY);
    prev = row('x', s);
    s = scheduleReview(prev, true, 11 * DAY);
    prev = row('x', s);
    s = scheduleReview(prev, true, 32 * DAY);
    expect(s.reviewAt).toBeNull();
  });
  it('un puzzle réussi du premier coup n’entre pas dans la file', () => {
    expect(scheduleReview(undefined, true, 0).reviewAt).toBeNull();
  });
});

describe('validation des coups', () => {
  it('accepte le coup attendu, la promotion par défaut et un autre mat au dernier coup', () => {
    expect(acceptMove('e2e4', 'e2e4', false, false)).toBe(true);
    expect(acceptMove('e7e8', 'e7e8q', false, false)).toBe(true);
    expect(acceptMove('h5f7', 'd1d8', true, true)).toBe(true);
    expect(acceptMove('h5f7', 'd1d8', true, false)).toBe(false);
    expect(acceptMove('a2a3', 'e2e4', false, true)).toBe(false);
  });
});

describe('classement des puzzles (Glicko)', () => {
  it('le puzzle perd des points quand il est résolu', () => {
    const user = newRating(1200, 100);
    const puzzle = newRating(1250, 80);
    expect(update(puzzle, user, 0).r).toBeLessThan(1250);
    expect(update(user, puzzle, 1).r).toBeGreaterThan(1200);
  });
});

const dataDir = 'public/data/puzzles';
describe.skipIf(!existsSync(`${dataDir}/index.json`))('données Lichess générées', () => {
  const index = JSON.parse(readFileSync(`${dataDir}/index.json`, 'utf8'));
  it('environ 20 000 puzzles entre 600 et 2000', () => {
    const total = index.buckets.reduce((s: number, b: { count: number }) => s + b.count, 0);
    expect(total).toBeGreaterThan(19000);
    expect(index.buckets[0].min).toBe(600);
    expect(index.buckets.at(-1).max).toBe(2000);
  });
  it('chaque thème proposé a des puzzles', () => {
    for (const [k] of PUZZLE_THEMES) expect(index.themes[k] ?? 0).toBeGreaterThan(100);
  });
  it('un échantillon se rejoue légalement', () => {
    for (const b of index.buckets) {
      const list: PuzzleTuple[] = JSON.parse(readFileSync(`${dataDir}/${b.file}`, 'utf8'));
      for (const t of list.filter((_, i) => i % 50 === 0)) {
        const p = fromTuple(t);
        expect(p.rating).toBeGreaterThanOrEqual(b.min);
        expect(p.rating).toBeLessThan(b.max);
        const c = new Chess(p.fen);
        for (const u of p.moves) expect(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })).toBeTruthy();
        if (p.themes.includes('mate')) expect(c.isCheckmate()).toBe(true);
      }
    }
  });
});
