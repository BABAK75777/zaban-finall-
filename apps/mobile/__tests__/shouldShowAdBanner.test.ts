import { shouldShowAdBanner } from '../src/ads/shouldShowAdBanner';

const idleHome = {
  aiAudioActive: false,
  shadowPhase: 'idle' as const,
  showSettings: false,
  showDictionarySettings: false,
  showPracticeTextInput: false,
  showAiPrompt: false,
  wordLookupVisible: false,
};

describe('shouldShowAdBanner', () => {
  it('shows on idle home', () => {
    expect(shouldShowAdBanner(idleHome)).toBe(true);
  });

  it('shows when settings sheet is open', () => {
    expect(shouldShowAdBanner({ ...idleHome, showSettings: true })).toBe(true);
  });

  it('hides during AI playback', () => {
    expect(shouldShowAdBanner({ ...idleHome, aiAudioActive: true })).toBe(false);
  });

  it('hides during shadow recording', () => {
    expect(
      shouldShowAdBanner({ ...idleHome, shadowPhase: 'recording' })
    ).toBe(false);
  });

  it('hides during shadow playback', () => {
    expect(shouldShowAdBanner({ ...idleHome, shadowPhase: 'playing' })).toBe(false);
  });

  it('hides during practice text entry', () => {
    expect(
      shouldShowAdBanner({ ...idleHome, showPracticeTextInput: true })
    ).toBe(false);
  });

  it('hides during AI prompt practice', () => {
    expect(shouldShowAdBanner({ ...idleHome, showAiPrompt: true })).toBe(false);
  });

  it('hides during word lookup', () => {
    expect(shouldShowAdBanner({ ...idleHome, wordLookupVisible: true })).toBe(false);
  });

  it('hides during OCR', () => {
    expect(shouldShowAdBanner({ ...idleHome, ocrLoading: true })).toBe(false);
  });
});
