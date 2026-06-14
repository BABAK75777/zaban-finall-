import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      'expo-file-system': path.join(repoRoot, 'tests/mocks/expo-file-system.ts'),
      '@react-native-async-storage/async-storage': path.join(
        repoRoot,
        'tests/mocks/async-storage.ts'
      ),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});

