import {
  deriveAdInteractionState,
  formatAdBusyStateLog,
  type AdInteractionInput,
} from '../src/ads/interactionSafeForAds';

const idleHome: AdInteractionInput = {
  status: 'idle',
  shadowPhase: 'idle',
  ocrLoading: false,
  wordLookupLoading: false,
  isGenerating: false,
  isNavigating: false,
  showPracticeTextInput: false,
  showAiPrompt: false,
  wordLookupVisible: false,
  appStateActive: true,
  operationGuardActive: false,
};

describe('deriveAdInteractionState', () => {
  it('allows ads on idle home', () => {
    const state = deriveAdInteractionState(idleHome);
    expect(state.interactionSafeForAds).toBe(true);
    expect(state.isAppBusy).toBe(false);
  });

  it('blocks during TTS fetch', () => {
    const state = deriveAdInteractionState({ ...idleHome, status: 'fetching' });
    expect(state.isPlayingTTS).toBe(true);
    expect(state.interactionSafeForAds).toBe(false);
  });

  it('blocks during shadow recording', () => {
    const state = deriveAdInteractionState({ ...idleHome, shadowPhase: 'recording' });
    expect(state.isRecordingShadow).toBe(true);
    expect(state.interactionSafeForAds).toBe(false);
  });

  it('blocks during shadow playback', () => {
    const state = deriveAdInteractionState({ ...idleHome, shadowPhase: 'playing' });
    expect(state.interactionSafeForAds).toBe(false);
  });

  it('blocks during OCR', () => {
    const state = deriveAdInteractionState({ ...idleHome, ocrLoading: true });
    expect(state.isOCRRunning).toBe(true);
    expect(state.interactionSafeForAds).toBe(false);
  });

  it('blocks during dictionary translation', () => {
    const state = deriveAdInteractionState({ ...idleHome, wordLookupLoading: true });
    expect(state.isTranslating).toBe(true);
    expect(state.interactionSafeForAds).toBe(false);
  });

  it('blocks during story generation', () => {
    const state = deriveAdInteractionState({ ...idleHome, isGenerating: true });
    expect(state.isGenerating).toBe(true);
    expect(state.interactionSafeForAds).toBe(false);
  });

  it('blocks during navigation transition', () => {
    const state = deriveAdInteractionState({ ...idleHome, isNavigating: true });
    expect(state.isNavigating).toBe(true);
    expect(state.interactionSafeForAds).toBe(false);
  });

  it('blocks when operation guard is active', () => {
    const state = deriveAdInteractionState({ ...idleHome, operationGuardActive: true });
    expect(state.interactionSafeForAds).toBe(false);
  });

  it('blocks when app is inactive', () => {
    const state = deriveAdInteractionState({ ...idleHome, appStateActive: false });
    expect(state.appStateActive).toBe(false);
    expect(state.interactionSafeForAds).toBe(false);
  });

  it('blocks during practice flows', () => {
    expect(
      deriveAdInteractionState({ ...idleHome, showPracticeTextInput: true }).interactionSafeForAds
    ).toBe(false);
    expect(deriveAdInteractionState({ ...idleHome, showAiPrompt: true }).interactionSafeForAds).toBe(
      false
    );
    expect(
      deriveAdInteractionState({ ...idleHome, wordLookupVisible: true }).interactionSafeForAds
    ).toBe(false);
  });

  it('formats busy state for logs', () => {
    const input = { ...idleHome, status: 'playing' as const, isNavigating: true };
    const state = deriveAdInteractionState(input);
    expect(formatAdBusyStateLog(input, state)).toBe('tts,navigating');
  });
});
