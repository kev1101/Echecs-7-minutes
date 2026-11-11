import { FULL_STRENGTH, strengthFor } from './strength';

export interface Score {
  /** Centipions, du point de vue du camp au trait. */
  cp?: number;
  /** Mat en n (positif : le camp au trait mate). */
  mate?: number;
}

export interface EngineLine extends Score {
  multipv: number;
  depth: number;
  pv: string[];
}

export interface Analysis {
  bestmove: string | null;
  lines: EngineLine[];
}

export interface AnalyseOptions {
  depth?: number;
  movetime?: number;
  multipv?: number;
}

type Job = () => Promise<void>;

/** Échelle unique : un mat vaut ±100 000 moins la distance au mat. */
export const MATE_CP = 100000;
export function scoreToCp(s: Score): number {
  if (s.mate !== undefined) {
    if (s.mate === 0) return -MATE_CP; // le camp au trait est mat
    return s.mate > 0 ? MATE_CP - s.mate * 10 : -MATE_CP - s.mate * 10;
  }
  return s.cp ?? 0;
}

export function parseInfo(line: string): EngineLine | null {
  if (!line.startsWith('info ') || !line.includes(' pv ') || line.includes(' bound')) return null;
  const tok = line.split(' ');
  const out: EngineLine = { multipv: 1, depth: 0, pv: [] };
  for (let i = 1; i < tok.length; i++) {
    const t = tok[i];
    if (t === 'depth') out.depth = Number(tok[++i]);
    else if (t === 'multipv') out.multipv = Number(tok[++i]);
    else if (t === 'score') {
      const kind = tok[++i];
      const v = Number(tok[++i]);
      if (kind === 'cp') out.cp = v;
      else if (kind === 'mate') out.mate = v;
    } else if (t === 'pv') {
      out.pv = tok.slice(i + 1);
      break;
    }
  }
  return out;
}

/**
 * Stockfish (WASM lite, mono-thread) dans un Web Worker.
 * Les recherches sont mises en file : une seule à la fois par instance.
 */
export class StockfishEngine {
  private worker: Worker | null = null;
  private listeners = new Set<(line: string) => void>();
  private chain: Promise<void> = Promise.resolve();
  private ready: Promise<void> | null = null;
  private current: Record<string, string | number | boolean> = {};

  constructor(private url: string) {}

  private ensure(): Promise<void> {
    if (this.ready) return this.ready;
    this.worker = new Worker(this.url);
    this.worker.onmessage = (ev: MessageEvent) => {
      const text = typeof ev.data === 'string' ? ev.data : String(ev.data);
      for (const l of text.split('\n')) for (const fn of this.listeners) fn(l);
    };
    this.ready = (async () => {
      await this.waitFor('uci', (l) => l === 'uciok');
      this.send('setoption name Hash value 32');
      await this.isReady();
    })();
    return this.ready;
  }

  private send(cmd: string) {
    this.worker?.postMessage(cmd);
  }

  private waitFor(cmd: string, done: (l: string) => boolean, onLine?: (l: string) => void): Promise<string> {
    return new Promise((resolve) => {
      const fn = (l: string) => {
        onLine?.(l);
        if (done(l)) {
          this.listeners.delete(fn);
          resolve(l);
        }
      };
      this.listeners.add(fn);
      this.send(cmd);
    });
  }

  private isReady() {
    return this.waitFor('isready', (l) => l === 'readyok');
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    let resolve!: (v: T) => void;
    let reject!: (e: unknown) => void;
    const p = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const job: Job = async () => {
      try {
        await this.ensure();
        resolve(await fn());
      } catch (e) {
        reject(e);
      }
    };
    this.chain = this.chain.then(job, job);
    return p;
  }

  private async setOptions(opts: Record<string, string | number | boolean>) {
    let changed = false;
    for (const [k, v] of Object.entries(opts)) {
      if (this.current[k] === v) continue;
      this.current[k] = v;
      this.send(`setoption name ${k} value ${v}`);
      changed = true;
    }
    if (changed) await this.isReady();
  }

  private async search(fen: string, go: string, onLine?: (l: EngineLine) => void): Promise<Analysis> {
    const lines = new Map<number, EngineLine>();
    this.send(`position fen ${fen}`);
    const last = await this.waitFor(go, (l) => l.startsWith('bestmove'), (l) => {
      const info = parseInfo(l);
      if (info) {
        lines.set(info.multipv, info);
        onLine?.(info);
      }
    });
    const bm = last.split(' ')[1];
    return {
      bestmove: bm && bm !== '(none)' ? bm : null,
      lines: [...lines.values()].sort((a, b) => a.multipv - b.multipv)
    };
  }

  /** Analyse à pleine force. Scores du point de vue du camp au trait. */
  analyse(fen: string, o: AnalyseOptions = {}, onLine?: (l: EngineLine) => void): Promise<Analysis> {
    return this.enqueue(async () => {
      await this.setOptions({ ...FULL_STRENGTH, MultiPV: o.multipv ?? 1 });
      const parts = ['go'];
      if (o.depth) parts.push('depth', String(o.depth));
      if (o.movetime) parts.push('movetime', String(o.movetime));
      if (parts.length === 1) parts.push('depth', '12');
      return this.search(fen, parts.join(' '), onLine);
    });
  }

  /** Coup joué par l'ordinateur à un niveau donné. */
  play(fen: string, elo: number): Promise<string | null> {
    return this.enqueue(async () => {
      const s = strengthFor(elo);
      await this.setOptions({ ...s.options, MultiPV: 1 });
      const r = await this.search(fen, s.go);
      return r.bestmove;
    });
  }

  /** Meilleur coup à pleine force (finales, indices). */
  async best(fen: string, movetime = 800): Promise<string | null> {
    const r = await this.analyse(fen, { movetime });
    return r.bestmove;
  }

  /** Interrompt la recherche en cours (elle renvoie aussitôt son meilleur coup). */
  stop() {
    this.send('stop');
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
    this.current = {};
  }
}

const url = `${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`;
let player: StockfishEngine | null = null;
let analyst: StockfishEngine | null = null;

/** Instance qui joue contre l'utilisateur (force réglée). */
export function playerEngine() {
  return (player ??= new StockfishEngine(url));
}
/** Instance qui analyse (pleine force) : en parallèle du joueur. */
export function analysisEngine() {
  return (analyst ??= new StockfishEngine(url));
}
