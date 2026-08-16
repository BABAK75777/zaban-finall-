/**
 * TTS Mobile Package - Mobile-specific implementations
 */

export {
  DEFAULT_AI_PLAYBACK_SPEED,
  DEFAULT_UI_AI_SPEED,
  MIN_AI_PLAYBACK_SPEED,
  MIN_UI_AI_SPEED,
  MAX_AI_PLAYBACK_SPEED,
  MAX_UI_AI_SPEED,
  TTS_GENERATION_SPEED,
  RUNTIME_RATE_AT_UI_1,
  UI_TO_RUNTIME_RATE_SLOPE_LOW,
  UI_TO_RUNTIME_RATE_SLOPE_HIGH,
  /** @deprecated Use UI_TO_RUNTIME_RATE_SLOPE_HIGH */
  UI_TO_RUNTIME_RATE_SLOPE,
  MIN_RUNTIME_PLAYBACK_RATE,
  MAX_RUNTIME_PLAYBACK_RATE,
  clampAiPlaybackSpeed,
  clampUiSpeed,
  clampRuntimePlaybackRate,
  uiSpeedToRuntimeRate,
  resolveAiPlaybackSpeed,
  normalizeAiPlaybackSpeed,
  formatAiPlaybackSpeed,
  formatUiSpeed,
  formatRuntimeRate,
  logAiSpeedSettingChanged,
  logAiSpeedPersisted,
  logAiSpeedPlaybackStart,
  logAiSpeedSetPlaybackRate,
  logAiSpeedReplay,
  logAiSpeedAppliedAfterLoad,
  logAiSpeedSoundLoaded,
} from './aiPlaybackSpeed';
export {
  shouldCleanupPlaybackOnAppState,
  playbackCleanupLogMessage,
  APPSTATE_ACTIVE_RECOVERY_LOG,
  OPERATION_GUARD_BACKGROUND_RELEASE_LOG,
  shouldForceIdleOnActiveRecovery,
} from './appPlaybackRecovery';
export { MobileAudioPlayer } from './MobileAudioPlayer';
export {
  AUDIO_KEEP_AWAKE_TAG_PLAYBACK,
  AUDIO_KEEP_AWAKE_TAG_RECORDING,
  acquireAudioKeepAwake,
  releaseAudioKeepAwake,
} from './audioKeepAwake';
export { MobileStorageAdapter } from './MobileStorageAdapter';
export { OperationGuard } from './operationGuard';
export type { PlaybackOperation } from './operationGuard';
export { splitIntoSentences } from './splitSentences';
export { uint8ArrayToBase64 } from './uint8ArrayToBase64';
export {
  getCachedSentenceAudio,
  putCachedSentenceAudio,
  setActiveSentenceRing,
  clearSentenceCache,
  getSentenceCacheStats,
  isSentenceGenerated,
  clearSentenceCacheIfIdleExpired,
  pruneSentenceCacheToKeepIds,
  touchLastActivityAt,
  getRetentionWindowSize,
  CACHE_IDLE_TTL_MS,
} from './sentenceAudioCache';
export type { SentenceCacheSplitMode } from './sentenceAudioCache';
export { allowNetworkForSource } from './cacheFirstPolicy';
export type { PlaySource } from './cacheFirstPolicy';
export {
  shouldRunIdleCacheCheckOnAppState,
  shouldTouchLastActivityOn,
} from './cacheActivityPolicy';
export type { ActivityTouchEvent } from './cacheActivityPolicy';
export { buildKeepSentenceIds } from './buildKeepSentenceIds';
export { InFlightTtsFetch } from './inFlightTtsFetch';
export {
  logEndurance,
  logGuardTransition,
  logReplaySource,
  logRingCleanup,
  logLifecycle,
  logNavigation,
  logTempAudioCount,
  mapLifecyclePhase,
  replayAudioSource,
  toEnduranceGuardState,
} from './enduranceDiagnostics';
export type {
  EnduranceGuardState,
  ReplayAudioSource,
  LifecyclePhase,
} from './enduranceDiagnostics';
export type { SentenceCacheEntry } from './sentenceAudioCache';
export { resolveSentenceAudio } from './resolveSentenceAudio';
export type {
  ResolveSentenceAudioDeps,
  ResolveSentenceAudioResult,
} from './resolveSentenceAudio';
export {
  READING_SESSION_KEY,
  MAX_READING_TEXT_CHARS,
  clearReadingSession,
  isReadingSessionReadUnit,
  loadReadingSession,
  resolveRestoredSentenceIndex,
  saveReadingSession,
  shouldClearReadingSession,
  deriveReadingTextForPersist,
} from './readingSessionStorage';
export type { ReadingSessionReadUnit, ReadingSessionV1 } from './readingSessionStorage';

