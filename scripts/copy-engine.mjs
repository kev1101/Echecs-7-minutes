// Copie le moteur Stockfish (lite, mono-thread) dans public/engine pour qu'il soit servi tel quel.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve('stockfish/package.json'));
const out = join(dirname(new URL(import.meta.url).pathname), '..', 'public', 'engine');
mkdirSync(out, { recursive: true });
for (const f of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']) {
  copyFileSync(join(pkgDir, 'bin', f), join(out, f));
}
copyFileSync(join(pkgDir, 'Copying.txt'), join(out, 'COPYING-stockfish.txt'));
console.log('Moteur copié dans', out);
