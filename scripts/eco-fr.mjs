// Traduction des noms d'ouvertures (anglais → français). Les noms propres restent tels quels.

const FAMILIES = {
  'Sicilian Defense': 'Défense sicilienne',
  'Ruy Lopez': 'Partie espagnole',
  'French Defense': 'Défense française',
  "Queen's Gambit Declined": 'Gambit dame refusé',
  "Queen's Gambit Accepted": 'Gambit dame accepté',
  "Queen's Gambit": 'Gambit dame',
  'Italian Game': 'Partie italienne',
  'English Opening': 'Ouverture anglaise',
  "King's Gambit Accepted": 'Gambit du roi accepté',
  "King's Gambit Declined": 'Gambit du roi refusé',
  "King's Gambit": 'Gambit du roi',
  "King's Indian Defense": 'Défense est-indienne',
  "King's Indian Attack": 'Attaque est-indienne',
  'Caro-Kann Defense': 'Défense Caro-Kann',
  'Nimzo-Indian Defense': 'Défense nimzo-indienne',
  "Queen's Pawn Game": 'Partie du pion dame',
  'Semi-Slav Defense Accepted': 'Défense semi-slave acceptée',
  'Semi-Slav Defense': 'Défense semi-slave',
  'Slav Defense': 'Défense slave',
  'Slav Indian': 'Slave indienne',
  'Dutch Defense': 'Défense hollandaise',
  'Benoni Defense': 'Défense Benoni',
  'Grünfeld Defense': 'Défense Grünfeld',
  'Neo-Grünfeld Defense': 'Défense néo-Grünfeld',
  "Queen's Indian Defense": 'Défense ouest-indienne',
  "Queen's Indian Accelerated": 'Ouest-indienne accélérée',
  'Pseudo Queen\'s Indian Defense': 'Pseudo ouest-indienne',
  'Bogo-Indian Defense': 'Défense bogo-indienne',
  'Old Indian Defense': 'Défense vieille-indienne',
  'East Indian Defense': 'Défense est-indienne (début)',
  'Indian Defense': 'Défense indienne',
  'Alekhine Defense': 'Défense Alekhine',
  'Scotch Game': 'Partie écossaise',
  "Petrov's Defense": 'Défense Petrov',
  'Four Knights Game': 'Partie des quatre cavaliers',
  'Three Knights Opening': 'Partie des trois cavaliers',
  'Zukertort Opening': 'Ouverture Zukertort',
  'Scandinavian Defense': 'Défense scandinave',
  'Philidor Defense': 'Défense Philidor',
  'Réti Opening': 'Ouverture Réti',
  'Nimzowitsch Defense': 'Défense Nimzowitsch',
  'Vienna Game': 'Partie viennoise',
  'Vienna Gambit': 'Gambit viennois',
  "Bishop's Opening": 'Ouverture du fou',
  'Modern Defense': 'Défense moderne',
  "King's Pawn Game": 'Partie du pion roi',
  "King's Pawn Opening": 'Ouverture du pion roi',
  "King's Knight Opening": 'Ouverture du cavalier roi',
  'Catalan Opening': 'Ouverture catalane',
  'Pirc Defense': 'Défense Pirc',
  'Bird Opening': 'Ouverture Bird',
  'Tarrasch Defense': 'Défense Tarrasch',
  'Polish Opening': 'Ouverture polonaise',
  'Polish Defense': 'Défense polonaise',
  'Hungarian Opening': 'Ouverture hongroise',
  'Center Game Accepted': 'Partie du centre acceptée',
  'Center Game': 'Partie du centre',
  'Latvian Gambit Accepted': 'Gambit letton accepté',
  'Latvian Gambit': 'Gambit letton',
  'Ponziani Opening': 'Ouverture Ponziani',
  'Trompowsky Attack': 'Attaque Trompowsky',
  'Benko Gambit Accepted': 'Gambit Benko accepté',
  'Benko Gambit Declined': 'Gambit Benko refusé',
  'Benko Gambit': 'Gambit Benko',
  'Englund Gambit Declined': 'Gambit Englund refusé',
  'Englund Gambit': 'Gambit Englund',
  'Owen Defense': 'Défense Owen',
  'English Defense': 'Défense anglaise',
  'London System': 'Système de Londres',
  'Colle System': 'Système Colle',
  'Torre Attack': 'Attaque Torre',
  'Danish Gambit Accepted': 'Gambit danois accepté',
  'Danish Gambit Declined': 'Gambit danois refusé',
  'Danish Gambit': 'Gambit danois',
  'Elephant Gambit': 'Gambit de l’éléphant',
  'Blackmar-Diemer Gambit Accepted': 'Gambit Blackmar-Diemer accepté',
  'Blackmar-Diemer Gambit Declined': 'Gambit Blackmar-Diemer refusé',
  'Blackmar-Diemer Gambit': 'Gambit Blackmar-Diemer',
  'Richter-Veresov Attack': 'Attaque Richter-Veresov',
  'Rapport-Jobava System': 'Système Rapport-Jobava',
  'Hippopotamus Defense': 'Défense hippopotame',
  'Rat Defense': 'Défense du rat',
  'Lion Defense': 'Défense du lion',
  'Kangaroo Defense': 'Défense kangourou',
  'Mexican Defense': 'Défense mexicaine',
  'Portuguese Opening': 'Ouverture portugaise',
  'Dresden Opening': 'Ouverture de Dresde',
  'Amsterdam Attack': 'Attaque d’Amsterdam',
  'Australian Defense': 'Défense australienne',
  'Czech Defense': 'Défense tchèque',
  'Irish Gambit': 'Gambit irlandais',
  'Basque Opening': 'Ouverture basque',
  'Valencia Opening': 'Ouverture de Valence',
  'Saragossa Opening': 'Ouverture de Saragosse',
  'St. George Defense': 'Défense Saint-Georges',
  'Blumenfeld Countergambit Accepted': 'Contre-gambit Blumenfeld accepté',
  'Blumenfeld Countergambit': 'Contre-gambit Blumenfeld',
  'Grob Opening': 'Ouverture Grob',
  'Nimzo-Larsen Attack': 'Attaque Nimzo-Larsen',
  'English Orangutan': 'Orang-outan anglais',
  'Bongcloud Attack': 'Attaque Bongcloud'
};

const PHRASES = {
  'Main Line': 'ligne principale',
  'Mainline': 'ligne principale',
  'Exchange Variation': 'variante d’échange',
  'Advance Variation': 'variante d’avance',
  'Classical Variation': 'variante classique',
  'Classical Defense': 'défense classique',
  'Modern Variation': 'variante moderne',
  'Closed Variation': 'variante fermée',
  'Open Variation': 'variante ouverte',
  'Normal Variation': 'variante normale',
  'Accelerated Dragon': 'dragon accéléré',
  'Dragon Variation': 'variante du dragon',
  'Fianchetto Variation': 'variante du fianchetto',
  'Two Knights Defense': 'défense des deux cavaliers',
  'Two Knights Attack': 'attaque des deux cavaliers',
  'Two Knights Variation': 'variante des deux cavaliers',
  'Three Knights Variation': 'variante des trois cavaliers',
  'Four Knights Variation': 'variante des quatre cavaliers',
  'Fantasy Variation': 'variante fantaisie',
  'Symmetrical Variation': 'variante symétrique',
  'Reversed': 'inversée',
  'Accepted': 'accepté',
  'Declined': 'refusé',
  'Deferred': 'différée',
  'Countergambit': 'contre-gambit',
  'Counterattack': 'contre-attaque',
  'Old Main Line': 'ancienne ligne principale',
  'Hyperaccelerated Dragon': 'dragon hyper-accéléré',
  'Alapin Variation': 'variante Alapine',
  'English Attack': 'attaque anglaise',
  'Yugoslav Attack': 'attaque yougoslave',
  'Berlin Defense': 'défense berlinoise',
  'Steinitz Defense': 'défense Steinitz',
  'Morphy Defense': 'défense Morphy',
  'Panov Attack': 'attaque Panov',
  'Panov-Botvinnik Attack': 'attaque Panov-Botvinnik',
  'Smith-Morra Gambit': 'gambit Smith-Morra',
  'Short Variation': 'variante Short',
  'Tal Variation': 'variante Tal',
  'Winawer Variation': 'variante Winawer',
  'Tarrasch Variation': 'variante Tarrasch',
  'Rubinstein Variation': 'variante Rubinstein',
  'Najdorf Variation': 'variante Najdorf',
  'Scheveningen Variation': 'variante Scheveningue',
  'Sveshnikov Variation': 'variante Sveshnikov',
  'Kan Variation': 'variante Kan',
  'Taimanov Variation': 'variante Taimanov',
  'Czech Variation': 'variante tchèque',
  'Dutch Variation': 'variante hollandaise',
  'Quiet Variation': 'variante calme',
  'King March Line': 'ligne de la marche du roi'
};

const WORDS = {
  Accelerated: 'accéléré', Orthodox: 'orthodoxe', Polish: 'polonais', Modern: 'moderne', 'Neo-Modern': 'néo-moderne',
  Classical: 'classique', Old: 'ancien', Exchange: 'd’échange', Advance: 'd’avance', Closed: 'fermé', Open: 'ouvert',
  Main: 'principal', Defensive: 'défensif', English: 'anglais', Symmetrical: 'symétrique', Reversed: 'inversé',
  Hungarian: 'hongrois', Swiss: 'suisse', Russian: 'russe', Spanish: 'espagnol', Italian: 'italien', German: 'allemand',
  Wing: 'aile', Center: 'centre', Countergambit: 'contre-gambit', Counterattack: 'contre-attaque', Normal: 'normal',
  Quiet: 'calme', Fianchetto: 'fianchetto'
};
const words = (h) => h.replace(/'s\b/g, '').split(' ').map((w) => WORDS[w] ?? w).join(' ');

function translateSegment(seg) {
  const s = seg.trim();
  if (PHRASES[s]) return PHRASES[s];
  let m;
  for (const [suffix, fr] of [
    [' Variation', 'variante'],
    [' Attack', 'attaque'],
    [' Countergambit', 'contre-gambit'],
    [' Counterattack', 'contre-attaque'],
    [' Gambit Accepted', 'gambit accepté'],
    [' Gambit Declined', 'gambit refusé'],
    [' Gambit', 'gambit'],
    [' Defense', 'défense'],
    [' Line', 'ligne'],
    [' System', 'système'],
    [' Opening', 'ouverture'],
    [' Formation', 'formation'],
    [' Trap', 'piège']
  ]) {
    if ((m = s.endsWith(suffix))) {
      const head = words(s.slice(0, -suffix.length));
      if (fr.startsWith('gambit ')) return `gambit ${head} ${fr.slice(7)}`;
      return `${fr} ${head}`;
    }
  }
  return words(s.replace(/\bAccepted\b/g, 'accepté').replace(/\bDeclined\b/g, 'refusé'));
}

export function translateOpening(name) {
  const [family, rest] = name.split(/:\s*/, 2);
  let fam = FAMILIES[family];
  if (!fam) {
    // Familles avec « , with … »
    const [base, ...extra] = family.split(', ');
    fam = FAMILIES[base] ? [FAMILIES[base], ...extra.map((e) => e.replace(/^with /, 'avec '))].join(', ') : translateSegment(family);
    fam = fam.charAt(0).toUpperCase() + fam.slice(1);
  }
  if (!rest) return fam;
  return `${fam} : ${rest.split(', ').map(translateSegment).join(', ')}`;
}
