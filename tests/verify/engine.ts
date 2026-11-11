// Stockfish (WASM) dans Node, pour vérifier le contenu d'échecs.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export interface NodeEngine {
  eval(fen: string, opts?: { depth?: number; searchmoves?: string[]; multipv?: number }): Promise<{ cp: number; mate?: number; pv: string[]; lines: { cp: number; pv: string[] }[] }>;
  quit(): void;
}

const MATE = 100000;
export function toCp(kind: string, v: number) {
  if (kind === 'mate') return v > 0 ? MATE - v * 10 : -MATE - v * 10;
  return v;
}

export function startEngine(): Promise<NodeEngine> {
  return new Promise((resolve) => {
    let listener: ((l: string) => void) | null = null;
    const sf = require('stockfish')('lite-single', (line: string) => listener?.(line));
    const send = (c: string) => sf.processCommand(c);
    const wait = (cmd: string, done: (l: string) => boolean, onLine?: (l: string) => void) =>
      new Promise<string>((res) => {
        listener = (l) => {
          onLine?.(l);
          if (done(l)) res(l);
        };
        send(cmd);
      });
    void (async () => {
      await wait('uci', (l) => l === 'uciok');
      send('setoption name Hash value 64');
      await wait('isready', (l) => l === 'readyok');
      let multi = 1;
      resolve({
        async eval(fen, o = {}) {
          const mp = o.multipv ?? 1;
          if (mp !== multi) {
            send(`setoption name MultiPV value ${mp}`);
            multi = mp;
            await wait('isready', (l) => l === 'readyok');
          }
          send('ucinewgame');
          send(`position fen ${fen}`);
          const lines = new Map<number, { cp: number; mate?: number; pv: string[] }>();
          let cmd = `go depth ${o.depth ?? 16}`;
          if (o.searchmoves?.length) cmd += ` searchmoves ${o.searchmoves.join(' ')}`;
          await wait(cmd, (l) => l.startsWith('bestmove'), (l) => {
            const m = l.match(/ multipv (\d+) score (cp|mate) (-?\d+)(?: (?:lower|upper)bound)?.* pv (.+)$/);
            if (!m || /(lower|upper)bound/.test(l)) return;
            const kind = m[2];
            const v = Number(m[3]);
            lines.set(Number(m[1]), { cp: toCp(kind, v), mate: kind === 'mate' ? v : undefined, pv: m[4].split(' ') });
          });
          const arr = [...lines.entries()].sort((a, b) => a[0] - b[0]).map((x) => x[1]);
          const best = arr[0] ?? { cp: 0, pv: [] };
          return { ...best, lines: arr };
        },
        quit() {
          send('quit');
        }
      });
    })();
  });
}
