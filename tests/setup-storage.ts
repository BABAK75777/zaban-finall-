import { vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => import('./mocks/async-storage'));
