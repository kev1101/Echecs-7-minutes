import { describe, expect, it } from 'vitest';
import { decay, expected, newRating, update } from '../src/rating/glicko2';

describe('Glicko-2', () => {
  it('reproduit l’exemple de l’article de Glickman (premier adversaire)', () => {
    // Joueur 1500/200/0.06 bat un 1400/30 : le classement monte
    const p = update({ r: 1500, rd: 200, vol: 0.06 }, { r: 1400, rd: 30, vol: 0.06 }, 1);
    expect(p.r).toBeGreaterThan(1500);
    expect(p.r).toBeLessThan(1600);
    expect(p.rd).toBeLessThan(200);
  });

  it('une victoire fait monter, une défaite descendre', () => {
    const me = newRating(1200, 150);
    const opp = newRating(1200, 80);
    expect(update(me, opp, 1).r).toBeGreaterThan(1200);
    expect(update(me, opp, 0).r).toBeLessThan(1200);
    expect(Math.abs(update(me, opp, 0.5).r - 1200)).toBeLessThan(1);
  });

  it('battre un adversaire plus fort rapporte plus', () => {
    const me = newRating(1200, 150);
    const gainStrong = update(me, newRating(1600, 80), 1).r - 1200;
    const gainWeak = update(me, newRating(900, 80), 1).r - 1200;
    expect(gainStrong).toBeGreaterThan(gainWeak);
  });

  it('le score attendu est symétrique', () => {
    const a = newRating(1300, 100);
    const b = newRating(1100, 100);
    expect(expected(a, b) + expected(b, a)).toBeCloseTo(1, 6);
    expect(expected(a, b)).toBeGreaterThan(0.5);
  });

  it('l’incertitude augmente avec l’inactivité sans dépasser 350', () => {
    const p = newRating(1200, 60);
    expect(decay(p, 30).rd).toBeGreaterThan(60);
    expect(decay(p, 100000).rd).toBeLessThanOrEqual(350);
  });

  it('converge vers le bon niveau', () => {
    // Joueur réel 1400 : gagne selon la probabilité attendue contre des puzzles variés
    let me = newRating(1000, 300);
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 400; i++) {
      const opp = newRating(me.r + (rnd() - 0.5) * 300, 80);
      const pWin = 1 / (1 + Math.pow(10, (opp.r - 1400) / 400));
      me = update(me, opp, rnd() < pWin ? 1 : 0);
    }
    expect(Math.abs(me.r - 1400)).toBeLessThan(150);
  });
});
