/** Réglage de la force de Stockfish à partir d'un Elo cible. */
export const UCI_ELO_MIN = 1320;
export const UCI_ELO_MAX = 3190;

export interface Strength {
  /** Options UCI à envoyer avant la recherche. */
  options: Record<string, string | number | boolean>;
  /** Commande « go » à utiliser. */
  go: string;
}

/**
 * Au-dessus de 1320 : UCI_LimitStrength + UCI_Elo (calibrage officiel de Stockfish).
 * En dessous : UCI_Elo n'existe plus, on passe par Skill Level et on limite la profondeur,
 * ce qui affaiblit nettement le moteur (il ne voit plus les tactiques à plusieurs coups).
 */
export function strengthFor(elo: number): Strength {
  const e = Math.round(elo);
  if (e >= UCI_ELO_MIN) {
    return {
      options: { UCI_LimitStrength: true, UCI_Elo: Math.min(UCI_ELO_MAX, e), 'Skill Level': 20 },
      go: 'go movetime 500'
    };
  }
  // 600 → profondeur 1, 1300 → profondeur 6 ; Skill Level de 0 à 3
  const t = Math.max(0, Math.min(1, (e - 600) / (UCI_ELO_MIN - 600)));
  const depth = 1 + Math.round(t * 5);
  const skill = Math.round(t * 3);
  return {
    options: { UCI_LimitStrength: false, 'Skill Level': skill },
    go: `go depth ${depth} movetime 400`
  };
}

/** Réglages pour l'analyse (pleine force). */
export const FULL_STRENGTH: Record<string, string | number | boolean> = {
  UCI_LimitStrength: false,
  'Skill Level': 20
};
