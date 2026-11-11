import { useRef, useState } from 'react';
import { exportAll, importAll } from '../../db/db';
import { level, useProfile, type Settings as S } from '../../state/profile';

export default function Settings() {
  const { profile, update } = useProfile();
  const s = profile.settings;
  const [msg, setMsg] = useState<{ tone: string; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<S>) => update((p) => ({ ...p, settings: { ...p.settings, ...patch } }));

  const doExport = async () => {
    const json = await exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `echecs7-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg({ tone: 'good', text: 'Sauvegarde exportée. Importez ce fichier sur l’autre appareil.' });
  };
  const doImport = async (f: File) => {
    try {
      await importAll(await f.text());
      setMsg({ tone: 'good', text: 'Sauvegarde importée. L’application va se recharger.' });
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      setMsg({ tone: 'bad', text: `Import impossible : ${(e as Error).message}` });
    }
  };

  return (
    <main className="single">
      <section className="panel">
        <h2>Réglages</h2>
        <div className="grid2">
          <label className="field">
            Apparence
            <select value={s.theme} onChange={(e) => set({ theme: e.target.value as S['theme'] })}>
              <option value="auto">Comme l’appareil</option>
              <option value="light">Clair</option>
              <option value="dark">Sombre</option>
            </select>
          </label>
          <label className="field">
            Niveau actuel
            <input type="number" step={50} min={400} max={2800} value={level(profile)}
              onChange={(e) => update((p) => ({ ...p, rating: { ...p.rating, r: Number(e.target.value) || p.rating.r } }))} />
            <small>Les boutons − / + en haut font la même chose.</small>
          </label>
          <label className="check">
            <input type="checkbox" checked={s.autoLevel} onChange={(e) => set({ autoLevel: e.target.checked })} />
            Ajuster le niveau automatiquement
          </label>
          <label className="field">
            Force de l’ordinateur par rapport à vous
            <input type="number" step={50} min={-600} max={600} value={s.engineOffset} onChange={(e) => set({ engineOffset: Number(e.target.value) || 0 })} />
            <small>0 = même niveau. Négatif = plus facile.</small>
          </label>
          <label className="field">
            Nouveaux coups d’ouverture par jour
            <input type="number" min={0} max={50} value={s.newCardsPerDay} onChange={(e) => set({ newCardsPerDay: Number(e.target.value) || 0 })} />
          </label>
        </div>
        <h3>Sauvegarde</h3>
        <p className="sub">Vos données restent sur cet appareil. Pour passer du téléphone à l’ordinateur, exportez puis importez le fichier.</p>
        <div className="row">
          <button className="btn primary" onClick={doExport}>Exporter (JSON)</button>
          <button className="btn" onClick={() => file.current?.click()}>Importer…</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
        </div>
        {msg && <div className={`msg ${msg.tone}`}>{msg.text}</div>}
      </section>
    </main>
  );
}
