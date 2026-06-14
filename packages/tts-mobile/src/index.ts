/**
 * TTS Mobile Package - Mobile-specific implementations
 */

export { MobileAudioPlayer } from './MobileAudioPlayer';
export { MobileStorageAdapter } from './MobileStorageAdapter';
export { OperationGuard } from './operationGuard';
export type { PlaybackOperation } from './operationGuard';
export { splitIntoSentences } from './splitSentences';
export {
  getCachedSentenceAudio,
  putCachedSentenceAudio,
  setActiveSentenceRing,
  clearSentenceCache,
  getSentenceCacheStats,
  isSentenceGenerated,
  clearSentenceCacheIfIdleExpired,
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

