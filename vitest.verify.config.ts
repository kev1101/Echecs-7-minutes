import { defineConfig } from 'vitest/config';

// Vérification lourde du contenu avec Stockfish (npm run verify).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/verify/**/*.verify.ts'],
    testTimeout: 1_800_000,
    hookTimeout: 120_000,
    fileParallelism: true
  }
});
