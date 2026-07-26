/**
 * Pure helpers for TTS request invalidation / hang safety.
 * Kept free of React Native so unit tests can exercise contracts.
 */

export function isStaleTtsResponse(activeToken: number, responseToken: number): boolean {
  return responseToken !== activeToken;
}

export function shouldRetryTtsFailure(kind: 'timeout' | 'network' | 'invalid_voice' | 'provider'): boolean {
  // Bounded policy: one automatic retry only for transient network; never for timeout or bad config.
  return kind === 'network';
}

export type TtsUiRecovery = {
  loading: boolean;
  buttonsEnabled: boolean;
  canRetry: boolean;
  preserveText: boolean;
  preserveLanguage: boolean;
  preserveGender: boolean;
};

export function recoverFromTtsFailure(): TtsUiRecovery {
  return {
    loading: false,
    buttonsEnabled: true,
    canRetry: true,
    preserveText: true,
    preserveLanguage: true,
    preserveGender: true,
  };
}
