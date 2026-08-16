/// <reference types="vitest" />
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // SDK 55 expo-file-system publishes package "exports" for ./legacy.
    // Prefer explicit alias entries (array form) so Vitest does not resolve
    // the real package export before the test mock.
    alias: [
      {
        find: /^expo-file-system(\/legacy)?$/,
        replacement: path.resolve(__dirname, 'tests/mocks/expo-file-system.ts'),
      },
      {
        find: 'react-native',
        replacement: path.resolve(__dirname, 'tests/mocks/react-native.ts'),
      },
      {
        find: 'expo-constants',
        replacement: path.resolve(__dirname, 'tests/mocks/expo-constants.ts'),
      },
      {
        find: 'expo-audio',
        replacement: path.resolve(__dirname, 'tests/mocks/expo-audio.ts'),
      },
      {
        find: 'expo-keep-awake',
        replacement: path.resolve(__dirname, 'tests/mocks/expo-keep-awake.ts'),
      },
      {
        find: '@react-native-async-storage/async-storage',
        replacement: path.resolve(__dirname, 'tests/mocks/async-storage.ts'),
      },
      {
        find: 'idb',
        replacement: path.resolve(__dirname, 'tests/mocks/idb.ts'),
      },
      {
        find: '@zaban/ai-prompt-validation',
        replacement: path.resolve(__dirname, 'packages/ai-prompt-validation/index.js'),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'apps/mobile/**',
      'tests/storage.test.ts',
    ],
  },
});

