import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetOnboardingStorageForTests,
  completeOnboardingAndQueueAi,
  consumeOpenAiAfterOnboardingPending,
  isOnboardingComplete,
} from '../src/onboarding/onboardingStorage';
import {
  ONBOARDING_COMPLETE_KEY,
  OPEN_AI_AFTER_ONBOARDING_KEY,
} from '../src/onboarding/constants';

describe('onboardingStorage', () => {
  beforeEach(async () => {
    await __resetOnboardingStorageForTests();
  });

  it('starts incomplete on fresh install', async () => {
    expect(await isOnboardingComplete()).toBe(false);
  });

  it('marks onboarding complete and queues AI screen', async () => {
    await completeOnboardingAndQueueAi();
    expect(await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY)).toBe('1');
    expect(await AsyncStorage.getItem(OPEN_AI_AFTER_ONBOARDING_KEY)).toBe('1');
    expect(await isOnboardingComplete()).toBe(true);
  });

  it('consumes open-AI pending only once', async () => {
    await completeOnboardingAndQueueAi();
    expect(await consumeOpenAiAfterOnboardingPending()).toBe(true);
    expect(await consumeOpenAiAfterOnboardingPending()).toBe(false);
    expect(await AsyncStorage.getItem(OPEN_AI_AFTER_ONBOARDING_KEY)).toBeNull();
  });
});
