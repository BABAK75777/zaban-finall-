import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ONBOARDING_COMPLETE_KEY,
  OPEN_AI_AFTER_ONBOARDING_KEY,
} from './constants';

const STORAGE_TIMEOUT_MS = 4_000;

async function withStorageTimeout<T>(factory: () => Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    factory(),
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), STORAGE_TIMEOUT_MS);
    }),
  ]);
}

export async function isOnboardingComplete(): Promise<boolean> {
  return withStorageTimeout(async () => {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
    return value === '1';
  }, false);
}

export async function markOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, '1');
}

export async function setOpenAiAfterOnboardingPending(): Promise<void> {
  await AsyncStorage.setItem(OPEN_AI_AFTER_ONBOARDING_KEY, '1');
}

export async function consumeOpenAiAfterOnboardingPending(): Promise<boolean> {
  return withStorageTimeout(async () => {
    const value = await AsyncStorage.getItem(OPEN_AI_AFTER_ONBOARDING_KEY);
    if (value !== '1') {
      return false;
    }
    await AsyncStorage.removeItem(OPEN_AI_AFTER_ONBOARDING_KEY);
    return true;
  }, false);
}

export async function completeOnboardingAndQueueAi(): Promise<void> {
  await AsyncStorage.multiSet([
    [ONBOARDING_COMPLETE_KEY, '1'],
    [OPEN_AI_AFTER_ONBOARDING_KEY, '1'],
  ]);
}

/** Test-only reset */
export async function __resetOnboardingStorageForTests(): Promise<void> {
  await AsyncStorage.multiRemove([ONBOARDING_COMPLETE_KEY, OPEN_AI_AFTER_ONBOARDING_KEY]);
}
