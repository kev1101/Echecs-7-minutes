/** Thèmes de puzzles Lichess retenus, avec leur nom en français (ordre = priorité pour le thème principal). */
export const PUZZLE_THEMES: [string, string][] = [
  ['mateIn1', 'Mat en 1'],
  ['mateIn2', 'Mat en 2'],
  ['mateIn3', 'Mat en 3'],
  ['backRankMate', 'Mat du couloir'],
  ['smotheredMate', 'Mat à l’étouffée'],
  ['fork', 'Fourchette'],
  ['pin', 'Clouage'],
  ['skewer', 'Enfilade'],
  ['discoveredAttack', 'Attaque à la découverte'],
  ['doubleCheck', 'Échec double'],
  ['hangingPiece', 'Pièce en prise'],
  ['trappedPiece', 'Pièce piégée'],
  ['deflection', 'Déviation'],
  ['attraction', 'Attraction'],
  ['capturingDefender', 'Élimination du défenseur'],
  ['interference', 'Interception'],
  ['intermezzo', 'Coup intermédiaire'],
  ['clearance', 'Dégagement'],
  ['xRayAttack', 'Attaque aux rayons X'],
  ['sacrifice', 'Sacrifice'],
  ['quietMove', 'Coup calme'],
  ['defensiveMove', 'Coup défensif'],
  ['promotion', 'Promotion'],
  ['advancedPawn', 'Pion avancé'],
  ['exposedKing', 'Roi exposé'],
  ['kingsideAttack', 'Attaque à l’aile roi'],
  ['zugzwang', 'Zugzwang'],
  ['endgame', 'Finale']
];

/** Autres étiquettes Lichess affichées comme indice (sans servir de filtre). */
export const EXTRA_THEME_LABELS: Record<string, string> = {
  mateIn4: 'Mat en 4',
  mate: 'Mat',
  arabianMate: 'Mat arabe',
  anastasiaMate: 'Mat d’Anastasia',
  bodenMate: 'Mat de Boden',
  dovetailMate: 'Mat de la queue d’aronde',
  doubleBishopMate: 'Mat des deux fous',
  hookMate: 'Mat du crochet',
  rookEndgame: 'Finale de tours',
  pawnEndgame: 'Finale de pions',
  queenEndgame: 'Finale de dames',
  bishopEndgame: 'Finale de fous',
  knightEndgame: 'Finale de cavaliers',
  queenRookEndgame: 'Finale dame et tour',
  enPassant: 'Prise en passant',
  castling: 'Roque',
  underPromotion: 'Sous-promotion',
  equality: 'Égalisation',
  attackingF2F7: 'Attaque sur f2/f7',
  queensideAttack: 'Attaque à l’aile dame',
  opening: 'Ouverture',
  middlegame: 'Milieu de partie',
  crushing: 'Gain décisif',
  advantage: 'Avantage'
};

export function themeLabel(key: string): string | undefined {
  return PUZZLE_THEMES.find(([k]) => k === key)?.[1] ?? EXTRA_THEME_LABELS[key];
}
