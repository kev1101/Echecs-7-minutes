/**
 * Glicko-2 (Glickman, 2012), une partie à la fois.
 * Échelle « Elo » : r ≈ 1500, rd ≈ 350 au départ.
 */
export interface Glicko {
  r: number;
  rd: number;
  vol: number;
}

const SCALE = 173.7178;
const TAU = 0.5;
const EPS = 1e-6;
export const RD_MIN = 45;
export const RD_MAX = 350;

export function newRating(r = 1200, rd = 200, vol = 0.06): Glicko {
  return { r, rd, vol };
}

const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
const E = (mu: number, muj: number, phij: number) => 1 / (1 + Math.exp(-g(phij) * (mu - muj)));

/** Probabilité de gagner (score attendu) de a contre b. */
export function expected(a: Glicko, b: Glicko): number {
  return E((a.r - 1500) / SCALE, (b.r - 1500) / SCALE, Math.hypot(a.rd, b.rd) / SCALE);
}

/** Met à jour `player` après un résultat (1, 0.5, 0) contre `opp`. */
export function update(player: Glicko, opp: Glicko, score: number): Glicko {
  const mu = (player.r - 1500) / SCALE;
  const phi = player.rd / SCALE;
  const muj = (opp.r - 1500) / SCALE;
  const phij = opp.rd / SCALE;
  const gj = g(phij);
  const ej = E(mu, muj, phij);
  const v = 1 / (gj * gj * ej * (1 - ej));
  const delta = v * gj * (score - ej);

  // Nouvelle volatilité (algorithme d'Illinois)
  const a = Math.log(player.vol * player.vol);
  const f = (x: number) => {
    const ex = Math.exp(x);
    const num = ex * (delta * delta - phi * phi - v - ex);
    const den = 2 * Math.pow(phi * phi + v + ex, 2);
    return num / den - (x - a) / (TAU * TAU);
  };
  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) B = Math.log(delta * delta - phi * phi - v);
  else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    B = a - k * TAU;
  }
  let fA = f(A);
  let fB = f(B);
  for (let i = 0; i < 100 && Math.abs(B - A) > EPS; i++) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else fA /= 2;
    B = C;
    fB = fC;
  }
  const vol = Math.exp(A / 2);

  const phiStar = Math.sqrt(phi * phi + vol * vol);
  const phiNew = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const muNew = mu + phiNew * phiNew * gj * (score - ej);
  return {
    r: muNew * SCALE + 1500,
    rd: Math.min(RD_MAX, Math.max(RD_MIN, phiNew * SCALE)),
    vol
  };
}

/** L'incertitude remonte avec le temps d'inactivité (une « période » par jour). */
export function decay(p: Glicko, days: number): Glicko {
  if (days <= 0) return p;
  const phi = p.rd / SCALE;
  const phiNew = Math.sqrt(phi * phi + days * p.vol * p.vol);
  return { ...p, rd: Math.min(RD_MAX, phiNew * SCALE) };
}

export function clampRating(p: Glicko, min = 400, max = 2800): Glicko {
  return { ...p, r: Math.min(max, Math.max(min, p.r)) };
}
