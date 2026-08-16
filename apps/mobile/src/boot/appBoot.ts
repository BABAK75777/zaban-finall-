import { SPLASH_READY_TIMEOUT_MS } from '../splash/splashLayout';
import { isOnboardingComplete } from '../onboarding/onboardingStorage';

export const BOOT_STORAGE_TIMEOUT_MS = 4_000;

export type AppBootResult = {
  /** App shell may render (fonts timed out or loaded). */
  ready: boolean;
  fontsResolved: boolean;
  onboardingComplete: boolean;
  /** True when storage read timed out — treat as complete to avoid trapping users. */
  onboardingCheckTimedOut: boolean;
};

export type ResolveAppBootInput = {
  fontsLoaded: boolean;
  fontError: Error | null;
  elapsedMs: number;
  storageTimeoutMs?: number;
  splashTimeoutMs?: number;
  readOnboardingComplete?: () => Promise<boolean>;
};

/**
 * Decide when the root layout should leave the native splash.
 * Never blocks forever on fonts, storage, or onboarding checks.
 */
export async function resolveAppBoot(input: ResolveAppBootInput): Promise<AppBootResult> {
  const splashTimeoutMs = input.splashTimeoutMs ?? SPLASH_READY_TIMEOUT_MS;
  const storageTimeoutMs = input.storageTimeoutMs ?? BOOT_STORAGE_TIMEOUT_MS;
  const readOnboarding =
    input.readOnboardingComplete ?? (() => isOnboardingComplete());

  const fontsResolved = input.fontsLoaded || input.fontError != null;
  const ready = fontsResolved || input.elapsedMs >= splashTimeoutMs;

  let onboardingComplete = false;
  let onboardingCheckTimedOut = false;

  if (ready) {
    const storageRace = await Promise.race([
      readOnboarding().then((value) => ({ value, timedOut: false as const })),
      new Promise<{ value: boolean; timedOut: true }>((resolve) => {
        setTimeout(() => resolve({ value: true, timedOut: true }), storageTimeoutMs);
      }),
    ]);
    onboardingComplete = storageRace.value;
    onboardingCheckTimedOut = storageRace.timedOut;
  }

  return {
    ready,
    fontsResolved,
    onboardingComplete,
    onboardingCheckTimedOut,
  };
}
