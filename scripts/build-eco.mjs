// Construit public/data/eco.json à partir du dépôt lichess-org/chess-openings (CC0).
// Chaque position (EPD) reçoit son code ECO et un nom traduit en français.
// Usage : npm run data:eco
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';
import { translateOpening } from './eco-fr.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cache = join(root, 'scripts', 'cache');
mkdirSync(cache, { recursive: true });

const rows = [];
for (const f of ['a', 'b', 'c', 'd', 'e']) {
  const file = join(cache, `eco-${f}.tsv`);
  if (!existsSync(file)) {
    const url = `https://raw.githubusercontent.com/lichess-org/chess-openings/master/${f}.tsv`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Téléchargement impossible : ${url}`);
    writeFileSync(file, await res.text());
  }
  for (const line of readFileSync(file, 'utf8').split('\n').slice(1)) {
    if (!line.trim()) continue;
    const [eco, name, pgn] = line.split('\t');
    rows.push({ eco, name, pgn });
  }
}

const epd = (fen) => fen.split(' ').slice(0, 4).join(' ');
const out = {};
let bad = 0;
for (const r of rows) {
  const c = new Chess();
  try {
    for (const t of r.pgn.replace(/\d+\./g, ' ').trim().split(/\s+/)) c.move(t);
  } catch {
    bad++;
    continue;
  }
  const key = epd(c.fen());
  // En cas de doublon, on garde le nom le plus court (le plus général)
  const fr = translateOpening(r.name);
  if (!out[key] || out[key][1].length > fr.length) out[key] = [r.eco, fr, c.history().length];
}
mkdirSync(join(root, 'public', 'data'), { recursive: true });
const compact = Object.fromEntries(Object.entries(out).map(([k, [eco, name]]) => [k, [eco, name]]));
writeFileSync(join(root, 'public', 'data', 'eco.json'), JSON.stringify(compact));
console.log(`${Object.keys(compact).length} positions nommées (${bad} lignes illisibles ignorées).`);
