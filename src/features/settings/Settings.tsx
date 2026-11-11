import { useEffect, useRef, useState } from 'react';
import { db, exportAll, getKV, importAll, setKV } from '../../db/db';
import { testKey } from '../../llm/claude';
import { level, useProfile, type Settings as S } from '../../state/profile';

export default function Settings() {
  const { profile, update } = useProfile();
  const s = profile.settings;
  const [msg, setMsg] = useState<{ tone: string; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<S>) => update((p) => ({ ...p, settings: { ...p.settings, ...patch } }));
  const [hasKey, setHasKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [keyMsg, setKeyMsg] = useState<{ tone: string; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  useEffect(() => {
    getKV<string>('apiKey', '').then((k) => setHasKey(!!k));
  }, []);

  const saveKey = async () => {
    const k = keyInput.trim();
    setTesting(true);
    const r = await testKey(k);
    setTesting(false);
    if (r.ok) {
      await setKV('apiKey', k);
      setHasKey(true);
      setKeyInput('');
      set({ claude: true });
      setKeyMsg({ tone: 'good', text: 'Clé valide, enregistrée sur cet appareil. Les commentaires de Claude sont activés.' });
    } else setKeyMsg({ tone: 'bad', text: r.text });
  };
  const removeKey = async () => {
    await db.kv.delete('apiKey');
    setHasKey(false);
    set({ claude: false });
    setKeyMsg({ tone: 'good', text: 'Clé effacée de cet appareil.' });
  };

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
        <h3>Commentaires rédigés par Claude</h3>
        <p className="sub">
          Facultatif. Pendant la partie commentée, Claude reformule l’explication de vos erreurs en langage simple.
          Sans clé, l’application garde ses propres commentaires. Les coups cités par Claude sont vérifiés ; en cas de doute, le commentaire de l’application est conservé.
        </p>
        <div className="grid2">
          <label className="check">
            <input type="checkbox" checked={s.claude} onChange={(e) => set({ claude: e.target.checked })} />
            Activer les commentaires de Claude
          </label>
          <label className="field">
            Appels maximum par partie
            <input type="number" min={1} max={60} value={s.claudeCap} onChange={(e) => set({ claudeCap: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })} />
            <small>Environ 0,02 centime par commentaire (modèle Claude Haiku).</small>
          </label>
          <label className="field">
            Clé API Anthropic
            <input type="password" autoComplete="off" spellCheck={false} placeholder={hasKey ? 'Clé enregistrée sur cet appareil' : 'sk-ant-…'}
              value={keyInput} onChange={(e) => setKeyInput(e.target.value)} />
            <small>Créez-la sur console.anthropic.com. Elle reste sur cet appareil et n’est jamais exportée.</small>
          </label>
          <div className="row">
            <button className="btn primary" disabled={!keyInput.trim() || testing} onClick={saveKey}>{testing ? 'Test…' : 'Tester et enregistrer'}</button>
            {hasKey && <button className="btn" onClick={removeKey}>Effacer la clé</button>}
          </div>
        </div>
        {keyMsg && <div className={`msg ${keyMsg.tone}`}>{keyMsg.text}</div>}
        {s.claude && !hasKey && <div className="msg warn">Ajoutez une clé pour que Claude commente vos parties.</div>}
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
