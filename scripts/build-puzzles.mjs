// Prépare les puzzles à partir de la base Lichess (database.lichess.org, licence CC0).
// - garde les puzzles classés de 600 à 2000, populaires, bien joués et à faible incertitude ;
// - environ 20 000 puzzles, répartis par tranche de 100 points et par thème ;
// - chaque puzzle est rejoué avec chess.js (coups légaux, mat vérifié pour les thèmes de mat).
// Usage : npm run data:puzzles   (télécharge ~310 Mo une seule fois dans scripts/cache)
import { createReadStream, createWriteStream, existsSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Chess } from 'chess.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = join(root, 'scripts', 'cache');
const outDir = join(root, 'public', 'data', 'puzzles');
const file = join(cacheDir, 'lichess_db_puzzle.csv.zst');
const URL_DB = 'https://database.lichess.org/lichess_db_puzzle.csv.zst';

const MIN = 600, MAX = 2000, STEP = 100;
const TOTAL = 20000;
const BUCKETS = (MAX - MIN) / STEP;
const PER_BUCKET = Math.ceil(TOTAL / BUCKETS);
const RESERVOIR = 220; // par (tranche, thème)

// Même liste que src/content/puzzleThemes.ts (ordre = priorité)
const THEMES = ['mateIn1', 'mateIn2', 'mateIn3', 'backRankMate', 'smotheredMate', 'fork', 'pin', 'skewer', 'discoveredAttack',
  'doubleCheck', 'hangingPiece', 'trappedPiece', 'deflection', 'attraction', 'capturingDefender', 'interference', 'intermezzo',
  'clearance', 'xRayAttack', 'sacrifice', 'quietMove', 'defensiveMove', 'promotion', 'advancedPawn', 'exposedKing',
  'kingsideAttack', 'zugzwang', 'endgame'];

mkdirSync(cacheDir, { recursive: true });
if (!existsSync(file)) {
  console.log('Téléchargement de la base de puzzles Lichess…');
  const res = await fetch(URL_DB);
  if (!res.ok) throw new Error(`Téléchargement impossible (${res.status})`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(file));
}

// Décompression : zstd en ligne de commande si présent, sinon fzstd (plus lent, en pur JS)
async function* readCsv() {
  const hasZstd = spawnSync('zstd', ['--version']).status === 0;
  let first = true;
  if (hasZstd) {
    const z = spawn('zstd', ['-dc', file], { stdio: ['ignore', 'pipe', 'inherit'] });
    for await (const line of createInterface({ input: z.stdout, crlfDelay: Infinity })) {
      if (first) { first = false; continue; }
      yield line;
    }
    return;
  }
  const { Decompress } = await import('fzstd');
  const dec = new TextDecoder();
  let buf = '';
  let ready = [];
  const d = new Decompress((chunk) => {
    buf += dec.decode(chunk, { stream: true });
    const parts = buf.split('\n');
    buf = parts.pop();
    ready.push(...parts);
  });
  for await (const c of createReadStream(file)) {
    d.push(new Uint8Array(c));
    const out = ready;
    ready = [];
    for (const l of out) {
      if (first) { first = false; continue; }
      yield l;
    }
  }
}

let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

const reservoirs = Array.from({ length: BUCKETS }, () => new Map()); // thème → { seen, items }
let read = 0, eligible = 0;
for await (const line of readCsv()) {
  read++;
  const f = line.split(',');
  if (f.length < 8) continue;
  const [id, fen, moves, rating, rd, pop, plays, themes] = f;
  const r = Number(rating);
  if (r < MIN || r >= MAX || Number(rd) > 90 || Number(pop) < 85 || Number(plays) < 300) continue;
  const tags = themes.split(' ');
  const main = THEMES.find((t) => tags.includes(t));
  if (!main) continue;
  eligible++;
  const b = Math.floor((r - MIN) / STEP);
  const m = reservoirs[b];
  let res = m.get(main);
  if (!res) m.set(main, (res = { seen: 0, items: [] }));
  res.seen++;
  const item = [id, fen, moves, r, Number(rd), tags.join(' ')];
  if (res.items.length < RESERVOIR) res.items.push(item);
  else {
    const j = Math.floor(rnd() * res.seen);
    if (j < RESERVOIR) res.items[j] = item;
  }
  if (read % 1_000_000 === 0) console.log(`${read / 1e6} M lignes lues, ${eligible} éligibles`);
}

function verify([, fen, moves, , , tags]) {
  try {
    const c = new Chess(fen);
    for (const u of moves.split(' ')) {
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (!m) return false;
    }
    const t = tags.split(' ');
    if (t.some((x) => /^mateIn\d$/.test(x) || x === 'mate') && !c.isCheckmate()) return false;
    const n = t.find((x) => /^mateIn\d$/.test(x));
    if (n && Math.ceil((moves.split(' ').length - 1) / 2) !== Number(n.slice(-1))) return false;
    return true;
  } catch {
    return false;
  }
}

if (existsSync(outDir)) for (const f of readdirSync(outDir)) rmSync(join(outDir, f));
mkdirSync(outDir, { recursive: true });
const index = { source: 'Lichess puzzle database (CC0)', generated: new Date().toISOString(), buckets: [], themes: {} };
let rejected = 0, kept = 0;
for (let b = 0; b < BUCKETS; b++) {
  // Tour de table entre les thèmes jusqu'à remplir la tranche
  const lists = [...reservoirs[b].entries()].map(([t, r]) => ({ t, items: r.items.filter((it) => (verify(it) ? true : (rejected++, false))) }));
  const out = [];
  let k = 0;
  while (out.length < PER_BUCKET && lists.some((l) => l.items.length)) {
    const l = lists[k++ % lists.length];
    const it = l.items.pop();
    if (it) out.push(it);
  }
  out.sort((a, c) => a[3] - c[3]);
  const min = MIN + b * STEP;
  const name = `r${String(min).padStart(4, '0')}.json`;
  writeFileSync(join(outDir, name), JSON.stringify(out));
  index.buckets.push({ file: name, min, max: min + STEP, count: out.length });
  for (const it of out) for (const t of it[5].split(' ')) if (THEMES.includes(t)) index.themes[t] = (index.themes[t] ?? 0) + 1;
  kept += out.length;
}
writeFileSync(join(outDir, 'index.json'), JSON.stringify(index, null, 1));
console.log(`${read} puzzles lus, ${eligible} éligibles, ${kept} gardés, ${rejected} rejetés à la vérification.`);
