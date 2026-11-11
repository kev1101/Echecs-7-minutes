import { describe, expect, it } from 'vitest';
import { buildPrompt, cleanText, movesAreReal, type CommentRequest } from '../src/llm/claude';

// 1.e4 e5 2.Cf3 Cc6 3.Fc4 Cd4? 4.Cxe5 : les blancs ont pris e5, mais 4...Dg5 attaque le cavalier e5 et g2.
const req: CommentRequest = {
  fen: 'r1bqkbnr/pppp1ppp/8/4p3/2BnP3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
  played: 'Nxe5',
  best: 'Nxd4',
  bestCp: 150,
  playedCp: -250,
  label: 'Erreur',
  color: 'w',
  refutation: ['d8g5', 'e5f7', 'g5g2'],
  ruleText: 'Après 4...Dg5, le cavalier e5 et le pion g2 sont attaqués.',
  history: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4']
};

describe('commentaires par Claude', () => {
  it('construit un message en notation française à partir des faits', () => {
    const p = buildPrompt(req);
    expect(p).toContain('Le joueur a les blancs.');
    expect(p).toContain('1.e4 e5 2.Cf3 Cc6 3.Fc4 Cd4');
    expect(p).toContain('Coup joué : Cxe5 (erreur).');
    expect(p).toContain('Meilleur coup : Cxd4.');
    expect(p).toContain('+1.5 avec Cxd4, -2.5 après Cxe5');
    expect(p).toContain('4...Dg5 5.Cxf7 Dxg2');
  });

  it('accepte les coups réels, même écrits sans désambiguïsation exacte', () => {
    expect(movesAreReal('Il fallait Cxd4 : après Cxe5, la dame noire répond Dg5 et attaque g2.', req)).toBe(true);
    expect(movesAreReal('La suite ...Dxg2 menace la tour h1.', req)).toBe(true);
    expect(movesAreReal('Le cavalier peut aussi aller en c3 avec Cbc3.', req)).toBe(true); // Cc3 est légal
  });

  it('rejette un commentaire qui invente un coup impossible', () => {
    expect(movesAreReal('Il fallait jouer Fb5 puis Dh5.', req)).toBe(true);
    expect(movesAreReal('Il fallait jouer Dxf7 tout de suite.', req)).toBe(false);
    expect(movesAreReal('Après Txe8, les noirs sont matés.', req)).toBe(false);
  });

  it('retire la mise en forme', () => {
    expect(cleanText('**Erreur** :\n\nle cavalier  e5 tombe.')).toBe('Erreur : le cavalier e5 tombe.');
  });
});
