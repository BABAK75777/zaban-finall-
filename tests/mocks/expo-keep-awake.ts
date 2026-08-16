/**
 * Mock expo-keep-awake for Vitest (no native wake lock in Node).
 */
import { vi } from 'vitest';

export const activateKeepAwakeAsync = vi.fn(async (_tag?: string) => undefined);
export const deactivateKeepAwake = vi.fn(async (_tag?: string) => undefined);
export const activateKeepAwake = vi.fn(async (_tag?: string) => undefined);
export const useKeepAwake = vi.fn((_tag?: string) => undefined);
export const ExpoKeepAwakeTag = 'ExpoKeepAwakeDefaultTag';
