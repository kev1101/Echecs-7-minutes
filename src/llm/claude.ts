import { Chess } from 'chess.js';
import { formatLine, fr, playUci, sideLower, uciLineToSan, type Color } from '../chess/notation';
import { getKV } from '../db/db';

/** Modèle rapide et peu coûteux : environ 0,02 centime par commentaire (≈ 700 jetons lus, 150 écrits). */
export const CLAUDE_MODEL = 'claude-haiku-5-5';

export interface CommentRequest {
  fen: string; // position avant le coup de l'utilisateur
  played: string; // SAN anglaise
  best: string; // SAN anglaise
  bestCp: number; // point de vue de l'utilisateur
  playedCp: number;
  label: string;
  color: Color;
  refutation: string[]; // UCI, à partir de la position après le coup joué
  ruleText: string;
  history: string[]; // SAN anglaises avant le coup
}

const SYSTEM = `Tu es un entraîneur d'échecs bienveillant qui commente la partie d'un joueur d'environ 1200 Elo.
Écris en français, en notation française (R roi, D dame, T tour, F fou, C cavalier), en 2 ou 3 phrases simples, sans titre, sans liste et sans mise en forme.
Explique concrètement pourquoi le coup joué est moins bon et ce que le meilleur coup apportait : menace, pièce en prise, case faible, principe.
Ne cite que les coups fournis dans le message ou des coups légaux dans la position donnée. N'invente aucune variante.
Ne donne pas d'évaluation chiffrée et ne parle pas de moteur.`;

function pawns(cp: number): string {
  if (Math.abs(cp) >= 90000) return cp > 0 ? 'mat pour le joueur' : 'mat contre le joueur';
  return `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(1)}`;
}

/** Message envoyé à Claude, construit uniquement à partir de faits vérifiés par chess.js et Stockfish. */
export function buildPrompt(r: CommentRequest): string {
  const after = new Chess(r.fen);
  after.move(r.played);
  const refut = uciLineToSan(after.fen(), r.refutation.slice(0, 6));
  const start = r.history.length ? formatLine(r.history) : '(début de partie)';
  return [
    `Le joueur a les ${sideLower(r.color)}.`,
    `Coups joués jusqu'ici : ${start}`,
    `Position avant son coup (FEN) : ${r.fen}`,
    `Coup joué : ${fr(r.played)} (${r.label.toLowerCase()}).`,
    `Meilleur coup : ${fr(r.best)}.`,
    `Évaluation pour le joueur : ${pawns(r.bestCp)} avec ${fr(r.best)}, ${pawns(r.playedCp)} après ${fr(r.played)}.`,
    refut.length ? `Suite probable après ${fr(r.played)} : ${formatLine(refut, after.fen())}` : '',
    r.ruleText ? `Analyse automatique (à reformuler plus clairement, sans la contredire) : ${r.ruleText}` : '',
    'Commente ce coup pour le joueur.'
  ].filter(Boolean).join('\n');
}

const MOVE_RE = /\b(?:[RDTFC][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8](?:=[DTFC])?)\b/g;

/** Vérifie que chaque coup cité par Claude existe : légal avant ou après le coup joué, ou dans les lignes fournies. */
export function movesAreReal(text: string, r: CommentRequest): boolean {
  // Clé = pièce + case d'arrivée : tolère « Cbd2 » pour « Cd2 » ou un « x » oublié.
  const key = (s: string) => (/^[RDTFC]/.test(s) ? s[0] : 'p') + (s.match(/[a-h][1-8]/g)?.at(-1) ?? '');
  const ok = new Set<string>();
  const add = (s: string) => ok.add(key(fr(s)));
  const before = new Chess(r.fen);
  before.moves().forEach(add);
  const after = new Chess(r.fen);
  after.move(r.played);
  after.moves().forEach(add);
  [r.played, r.best, ...r.history, ...uciLineToSan(after.fen(), r.refutation)].forEach(add);
  // Coups possibles juste après la réfutation (ex. « la dame est perdue après ...Dxd5 »)
  const c = new Chess(after.fen());
  for (const u of r.refutation.slice(0, 4)) {
    if (!playUci(c, u)) break;
    c.moves().forEach(add);
  }
  for (const m of text.matchAll(MOVE_RE)) {
    if (!ok.has(key(m[0]))) return false;
  }
  return true;
}

/** Retire la mise en forme Markdown éventuelle et limite la longueur. */
export function cleanText(t: string): string {
  return t.replace(/\*\*?|__|^#+\s*/gm, '').replace(/\s+/g, ' ').trim().slice(0, 600);
}

let lastError: string | null = null;
/** Dernière erreur de l'API (affichée dans les réglages). */
export const claudeLastError = () => lastError;

async function client(apiKey: string) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  // La clé reste sur l'appareil : l'appel part directement du navigateur vers l'API Anthropic.
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 20000 });
}

async function ask(apiKey: string, user: string, maxTokens: number): Promise<string | null> {
  const anthropic = await client(apiKey);
  const res = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system: SYSTEM,
    thinking: { type: 'disabled' },
    output_config: { effort: 'low' },
    messages: [{ role: 'user', content: user }]
  });
  if (res.stop_reason === 'refusal') return null;
  const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  return text.trim() || null;
}

/** Commentaire rédigé par Claude. Renvoie null (et l'application garde son texte) si indisponible ou douteux. */
export async function enhanceWithClaude(req: CommentRequest): Promise<string | null> {
  const apiKey = await getKV<string>('apiKey', '');
  if (!apiKey || !navigator.onLine) return null;
  try {
    const raw = await ask(apiKey, buildPrompt(req), 400);
    lastError = null;
    if (!raw) return null;
    const text = cleanText(raw);
    return movesAreReal(text, req) ? text : null;
  } catch (e) {
    lastError = describeError(e);
    return null;
  }
}

/** Test de la clé depuis les réglages. */
export async function testKey(apiKey: string): Promise<{ ok: boolean; text: string }> {
  try {
    const t = await ask(apiKey, 'Réponds seulement : « Clé valide. »', 20);
    return { ok: true, text: t ?? 'Clé valide.' };
  } catch (e) {
    return { ok: false, text: describeError(e) };
  }
}

function describeError(e: unknown): string {
  const status = (e as { status?: number }).status;
  if (status === 401) return 'Clé API refusée : vérifiez-la.';
  if (status === 402 || status === 403) return 'Compte sans crédit ou accès refusé.';
  if (status === 429) return 'Trop de requêtes : réessayez dans un moment.';
  if (status && status >= 500) return 'Service Anthropic indisponible pour le moment.';
  return `Connexion impossible (${(e as Error).message ?? 'erreur inconnue'}).`;
}
