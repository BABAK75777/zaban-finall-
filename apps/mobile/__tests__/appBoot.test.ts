import { resolveAppBoot } from '../src/boot/appBoot';

describe('resolveAppBoot', () => {
  it('becomes ready when fonts load', async () => {
    const result = await resolveAppBoot({
      fontsLoaded: true,
      fontError: null,
      elapsedMs: 100,
      readOnboardingComplete: async () => false,
    });
    expect(result.ready).toBe(true);
    expect(result.fontsResolved).toBe(true);
    expect(result.onboardingComplete).toBe(false);
  });

  it('becomes ready when font loading fails', async () => {
    const result = await resolveAppBoot({
      fontsLoaded: false,
      fontError: new Error('font failed'),
      elapsedMs: 50,
      readOnboardingComplete: async () => true,
    });
    expect(result.ready).toBe(true);
    expect(result.fontsResolved).toBe(true);
  });

  it('becomes ready after splash timeout even if fonts hang', async () => {
    const result = await resolveAppBoot({
      fontsLoaded: false,
      fontError: null,
      elapsedMs: 5000,
      splashTimeoutMs: 5000,
      readOnboardingComplete: async () => true,
    });
    expect(result.ready).toBe(true);
    expect(result.fontsResolved).toBe(false);
  });

  it('fails open when onboarding storage check times out', async () => {
    const result = await resolveAppBoot({
      fontsLoaded: true,
      fontError: null,
      elapsedMs: 100,
      storageTimeoutMs: 1,
      readOnboardingComplete: () => new Promise(() => {}),
    });
    expect(result.onboardingComplete).toBe(true);
    expect(result.onboardingCheckTimedOut).toBe(true);
  });
});
