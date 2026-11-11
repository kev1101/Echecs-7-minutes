import { useEffect, useMemo, useState } from 'react';
import { parsePgn } from '../../chess/pgn';
import { buildTree, conflicts } from '../../chess/tree';
import { formatLine, fr, replay, type Color } from '../../chess/notation';
import { loadEco, openingName } from '../../chess/eco';
import { db } from '../../db/db';
import { invalidateRepertoire, type Repertoire } from '../../state/repertoire';
import { Board } from '../../board/Board';

/** Ajout d'une ligne de répertoire en collant un PGN (variantes acceptées). */
export function AddLine({ rep, onClose }: { rep: Repertoire; onClose: () => void }) {
  const [pgn, setPgn] = useState('');
  const [side, setSide] = useState<Color>('w');
  const [name, setName] = useState('');
  const [idea, setIdea] = useState('');
  const [eco, setEco] = useState<Record<string, [string, string]>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void loadEco().then(setEco);
  }, []);

  const check = useMemo(() => {
    if (!pgn.trim()) return null;
    try {
      const p = parsePgn(pgn);
      if (!p.lines.length) return { error: 'Aucun coup trouvé.' };
      if (p.startFen.split(' ')[0] !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR') {
        return { error: 'Seules les lignes depuis la position de départ sont acceptées.' };
      }
      // Conflits avec le répertoire existant : deux réponses différentes dans une même position
      const entries = rep.lines.filter((l) => l.side === side).map((l) => ({ id: l.id, lines: rep.parsed.get(l.id) ?? [] }));
      const t = buildTree(side, [...entries, { id: 'new', lines: p.lines }]);
      const cs = conflicts(t);
      const longest = p.lines.reduce((a, b) => (b.length > a.length ? b : a));
      const named = openingName(eco, longest);
      return { lines: p.lines, conflicts: cs, named, longest };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [pgn, side, rep, eco]);

  const describeConflict = (epd: string, sans: string[]) => {
    // Retrouve la suite de coups qui mène à la position
    const t = buildTree(side, [{ id: 'x', lines: check && 'lines' in check ? check.lines! : [] }]);
    const path = t.paths.map((p) => p.sans).find((s) => {
      for (let k = 0; k <= s.length; k++) {
        const fen = replay(s.slice(0, k)).fen();
        if (fen.split(' ').slice(0, 4).join(' ') === epd) return true;
      }
      return false;
    });
    let prefix = '';
    if (path) {
      for (let k = 0; k <= path.length; k++) {
        if (replay(path.slice(0, k)).fen().split(' ').slice(0, 4).join(' ') === epd) {
          prefix = formatLine(path.slice(0, k));
          break;
        }
      }
    }
    return `Après ${prefix || 'la position de départ'}, votre répertoire aurait deux coups : ${sans.map(fr).join(' et ')}.`;
  };

  const ok = check && 'lines' in check && check.conflicts!.length === 0;
  const save = async () => {
    if (!ok || !check || !('lines' in check)) return;
    const auto = check.named?.name ?? formatLine(check.longest!.slice(0, 6));
    await db.repLines.put({
      id: `u-${Date.now().toString(36)}`,
      side,
      group: side === 'w' ? 'Mes lignes · Blancs' : 'Mes lignes · Noirs',
      name: name.trim() || auto,
      pgn,
      idea: idea.trim() || undefined,
      created: Date.now()
    });
    invalidateRepertoire();
    setSaved(true);
    setTimeout(onClose, 800);
  };

  const preview = check && 'longest' in check ? replay(check.longest!).fen() : undefined;

  return (
    <main className="layout">
      <div className="board-col">
        <Board fen={preview ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'} orientation={side} movable={null} />
      </div>
      <section className="panel">
        <div className="ph">
          <h2>Ajouter une ligne</h2>
          <button className="btn small" onClick={onClose}>Retour</button>
        </div>
        <p className="sub">Collez un PGN (exporté de Lichess, Chess.com ou écrit à la main). Les variantes entre parenthèses deviennent des branches : l’adversaire les jouera tour à tour.</p>
        <label className="field">
          PGN
          <textarea value={pgn} onChange={(e) => setPgn(e.target.value)} placeholder="1.e4 c6 2.d4 d5 3.Nc3 (3.e5 Bf5) dxe4 4.Nxe4 Bf5" spellCheck={false} />
          <small>Notation anglaise (Nf3) ou française (Cf3).</small>
        </label>
        <div className="grid2">
          <label className="field">
            Vous jouez
            <select value={side} onChange={(e) => setSide(e.target.value as Color)}>
              <option value="w">les blancs</option>
              <option value="b">les noirs</option>
            </select>
          </label>
          <label className="field">
            Nom (facultatif)
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={check && 'named' in check ? check.named?.name ?? '' : ''} />
          </label>
        </div>
        <label className="field">
          Idée à retenir (facultatif)
          <input type="text" value={idea} onChange={(e) => setIdea(e.target.value)} />
        </label>
        {check && 'error' in check && <div className="msg bad">{check.error}</div>}
        {check && 'lines' in check && (
          <div className={`msg ${check.conflicts!.length ? 'bad' : 'good'}`}>
            {check.conflicts!.length ? (
              <>
                {check.conflicts!.map((c) => <span key={c.epd} className="idea">{describeConflict(c.epd, c.sans)}</span>)}
                <span className="idea">Un répertoire ne donne qu’une réponse par position : corrigez la ligne ou supprimez l’ancienne.</span>
              </>
            ) : (
              <>
                {check.lines!.length} variante{check.lines!.length > 1 ? 's' : ''} lue{check.lines!.length > 1 ? 's' : ''}, tous les coups sont légaux.
                {check.named && <span className="idea">{check.named.eco} · {check.named.name}</span>}
              </>
            )}
          </div>
        )}
        <div className="row">
          <button className="btn primary" disabled={!ok || saved} onClick={save}>{saved ? 'Ajoutée ✓' : 'Ajouter au répertoire'}</button>
        </div>
      </section>
    </main>
  );
}
