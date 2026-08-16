import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^expo-file-system(\/legacy)?$/,
        replacement: path.join(repoRoot, 'tests/mocks/expo-file-system.ts'),
      },
      {
        find: '@react-native-async-storage/async-storage',
        replacement: path.join(repoRoot, 'tests/mocks/async-storage.ts'),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
  },
});

