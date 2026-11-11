import { Chess } from 'chess.js';
import { playSanAny, START_FEN } from './notation';

export interface ParsedPgn {
  headers: Record<string, string>;
  /** Toutes les lignes (de la racine à chaque feuille), en SAN anglaise. */
  lines: string[][];
  startFen: string;
}

type Tok = { t: 'move'; v: string } | { t: 'open' } | { t: 'close' };

function lex(body: string): Tok[] {
  const out: Tok[] = [];
  const s = body
    .replace(/\{[^}]*\}/g, ' ') // commentaires
    .replace(/;[^\n]*/g, ' ')
    .replace(/\$\d+/g, ' ') // NAG
    .replace(/\(/g, ' ( ')
    .replace(/\)/g, ' ) ');
  for (let w of s.split(/\s+/)) {
    if (!w) continue;
    if (w === '(') out.push({ t: 'open' });
    else if (w === ')') out.push({ t: 'close' });
    else {
      w = w.replace(/^\d+\.(\.\.)?/, '').replace(/^\d+…/, '');
      if (!w || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(w) || /^\d+\.*$/.test(w)) continue;
      out.push({ t: 'move', v: w });
    }
  }
  return out;
}

/**
 * Lit un PGN (avec variantes entre parenthèses, notation anglaise ou française).
 * Lève une erreur claire si un coup est illégal.
 */
export function parsePgn(text: string): ParsedPgn {
  const headers: Record<string, string> = {};
  const body = text.replace(/^\s*\[(\w+)\s+"([^"]*)"\]\s*$/gm, (_, k, v) => {
    headers[k] = v;
    return '';
  });
  const startFen = headers.FEN ?? START_FEN;
  const toks = lex(body);
  const lines: string[][] = [];
  let i = 0;

  // Lit une séquence à partir de `prefix` (SAN déjà joués) ; renvoie quand ')' ou fin.
  function seq(prefix: string[]): void {
    const chess = new Chess(startFen);
    for (const s of prefix) chess.move(s);
    const line = prefix.slice();
    let hadMove = false;
    while (i < toks.length) {
      const tk = toks[i];
      if (tk.t === 'close') {
        i++;
        break;
      }
      if (tk.t === 'open') {
        i++;
        // variante : remplace le dernier coup joué
        seq(line.slice(0, -1));
        continue;
      }
      i++;
      const m = playSanAny(chess, tk.v);
      if (!m) {
        throw new Error(`Coup illégal ou illisible « ${tk.v} » après ${line.length ? line.join(' ') : 'la position de départ'}.`);
      }
      line.push(m.san);
      hadMove = true;
    }
    if (hadMove || prefix.length === 0) lines.push(line);
  }
  seq([]);
  // Supprime les lignes qui sont le préfixe d'une autre
  const uniq = lines.filter(
    (l, k) => l.length && !lines.some((o, j) => j !== k && o.length > l.length && l.every((s, x) => o[x] === s))
  );
  const seen = new Set<string>();
  return {
    headers,
    startFen,
    lines: uniq.filter((l) => {
      const key = l.join(' ');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
  };
}

/** Sépare un fichier contenant plusieurs parties PGN. */
export function splitGames(text: string): string[] {
  const parts = text.split(/\n\s*\n(?=\s*\[Event )/);
  return parts.map((p) => p.trim()).filter(Boolean);
}
