/// <reference types="vitest" />
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'react-native': path.resolve(__dirname, 'tests/mocks/react-native.ts'),
      'expo-constants': path.resolve(__dirname, 'tests/mocks/expo-constants.ts'),
      'expo-av': path.resolve(__dirname, 'tests/mocks/expo-av.ts'),
      'expo-file-system': path.resolve(__dirname, 'tests/mocks/expo-file-system.ts'),
      '@react-native-async-storage/async-storage': path.resolve(
        __dirname,
        'tests/mocks/async-storage.ts'
      ),
      idb: path.resolve(__dirname, 'tests/mocks/idb.ts'),
    },
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

