export type ShadowPhase = 'idle' | 'starting' | 'recording' | 'playing';

export type UiStatus = 'idle' | 'fetching' | 'playing' | 'stopped' | 'error';

export type AdInteractionInput = {
  status: UiStatus;
  shadowPhase: ShadowPhase;
  ocrLoading: boolean;
  wordLookupLoading: boolean;
  isGenerating: boolean;
  isNavigating: boolean;
  showPracticeTextInput: boolean;
  showAiPrompt: boolean;
  wordLookupVisible: boolean;
  appStateActive: boolean;
  operationGuardActive: boolean;
};

export type AdInteractionState = {
  isPlayingTTS: boolean;
  isRecordingShadow: boolean;
  isOCRRunning: boolean;
  isGenerating: boolean;
  isTranslating: boolean;
  isNavigating: boolean;
  appStateActive: boolean;
  isAppBusy: boolean;
  interactionSafeForAds: boolean;
};

/**
 * Tracks when the app is in an active/busy state (TTS, shadow, OCR, modals, etc.).
 * Used for layout diagnostics — banner visibility is controlled by safe spacing, not this flag.
 */
export function deriveAdInteractionState(input: AdInteractionInput): AdInteractionState {
  const isPlayingTTS = input.status === 'fetching' || input.status === 'playing';
  const isRecordingShadow = input.shadowPhase === 'recording';
  const shadowActive = input.shadowPhase !== 'idle';
  const isOCRRunning = input.ocrLoading;
  const isGenerating = input.isGenerating;
  const isTranslating = input.wordLookupLoading;
  const isNavigating = input.isNavigating;
  const appStateActive = input.appStateActive;
  const operationGuardActive = input.operationGuardActive;

  const activeWork =
    isPlayingTTS ||
    shadowActive ||
    isOCRRunning ||
    isGenerating ||
    isTranslating ||
    isNavigating ||
    operationGuardActive ||
    !appStateActive;

  const activeStudyFlow =
    input.showPracticeTextInput || input.showAiPrompt || input.wordLookupVisible;

  const interactionSafeForAds = !activeWork && !activeStudyFlow;
  const isAppBusy = activeWork || activeStudyFlow;

  return {
    isPlayingTTS,
    isRecordingShadow,
    isOCRRunning,
    isGenerating,
    isTranslating,
    isNavigating,
    appStateActive,
    isAppBusy,
    interactionSafeForAds,
  };
}

export function formatAdBusyStateLog(
  input: AdInteractionInput,
  state: AdInteractionState
): string {
  const flags: string[] = [];
  if (!state.appStateActive) flags.push('app_inactive');
  if (state.isPlayingTTS) flags.push('tts');
  if (input.shadowPhase === 'starting') flags.push('shadow_starting');
  if (state.isRecordingShadow) flags.push('shadow_recording');
  if (input.shadowPhase === 'playing') flags.push('shadow_playing');
  if (state.isOCRRunning) flags.push('ocr');
  if (state.isGenerating) flags.push('generating');
  if (state.isTranslating) flags.push('translating');
  if (state.isNavigating) flags.push('navigating');
  if (input.showPracticeTextInput) flags.push('practice_text');
  if (input.showAiPrompt) flags.push('ai_prompt');
  if (input.wordLookupVisible) flags.push('word_lookup');
  if (input.operationGuardActive) flags.push('operation_guard');
  return flags.length > 0 ? flags.join(',') : 'none';
}
