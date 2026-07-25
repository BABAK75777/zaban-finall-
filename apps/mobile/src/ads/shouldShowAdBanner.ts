import {
  deriveAdInteractionState,
  type ShadowPhase,
} from './interactionSafeForAds';

export type { ShadowPhase };

export type AdBannerVisibilityInput = {
  /** AI TTS fetch or playback in progress. */
  aiAudioActive: boolean;
  shadowPhase: ShadowPhase;
  /** Settings sheet (safe screen). */
  showSettings: boolean;
  /** Dictionary settings sheet (safe screen). */
  showDictionarySettings: boolean;
  /** Practice text entry — active speaking/writing practice. */
  showPracticeTextInput: boolean;
  /** AI practice text generator. */
  showAiPrompt: boolean;
  /** Word lookup sheet — active study. */
  wordLookupVisible: boolean;
  /** Photo OCR in progress. */
  ocrLoading?: boolean;
  wordLookupLoading?: boolean;
  isGenerating?: boolean;
  isNavigating?: boolean;
  appStateActive?: boolean;
  operationGuardActive?: boolean;
};

/**
 * @deprecated Prefer deriveAdInteractionState().interactionSafeForAds
 */
export function shouldShowAdBanner(input: AdBannerVisibilityInput): boolean {
  return deriveAdInteractionState({
    status: input.aiAudioActive ? 'playing' : 'idle',
    shadowPhase: input.shadowPhase,
    ocrLoading: input.ocrLoading ?? false,
    wordLookupLoading: input.wordLookupLoading ?? false,
    isGenerating: input.isGenerating ?? false,
    isNavigating: input.isNavigating ?? false,
    showPracticeTextInput: input.showPracticeTextInput,
    showAiPrompt: input.showAiPrompt,
    wordLookupVisible: input.wordLookupVisible,
    appStateActive: input.appStateActive ?? true,
    operationGuardActive: input.operationGuardActive ?? false,
  }).interactionSafeForAds;
}
