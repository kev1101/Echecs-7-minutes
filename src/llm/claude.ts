import type { Color } from '../chess/notation';

export interface CommentRequest {
  fen: string;
  played: string;
  best: string;
  bestCp: number;
  playedCp: number;
  label: string;
  color: Color;
  refutation: string[];
  ruleText: string;
  history: string[];
}

/** Commentaire rédigé par Claude (étape 7). Renvoie null si indisponible. */
export async function enhanceWithClaude(_req: CommentRequest): Promise<string | null> {
  return null;
}
