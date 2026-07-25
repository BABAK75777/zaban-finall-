/**
 * Mobile Reading screen — thin UI wiring to @zaban/tts-mobile (sentence cache + playback).
 */

import Constants from 'expo-constants';
import { Audio } from 'expo-av';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  InteractionManager,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MobileAudioPlayer,
  OperationGuard,
  getCachedSentenceAudio,
  isSentenceGenerated,
  putCachedSentenceAudio,
  resolveSentenceAudio,
  setActiveSentenceRing,
  getSentenceCacheStats,
  logEndurance,
  logLifecycle,
  logNavigation,
  logTempAudioCount,
  mapLifecyclePhase,
  clearReadingSession,
  isReadingSessionReadUnit,
  loadReadingSession,
  resolveRestoredSentenceIndex,
  saveReadingSession,
  shouldClearReadingSession,
  deriveReadingTextForPersist,
  allowNetworkForSource,
  shouldRunIdleCacheCheckOnAppState,
  shouldTouchLastActivityOn,
  buildKeepSentenceIds,
  InFlightTtsFetch,
  clearSentenceCacheIfIdleExpired,
  pruneSentenceCacheToKeepIds,
  touchLastActivityAt,
  DEFAULT_UI_AI_SPEED,
  MIN_UI_AI_SPEED,
  MAX_UI_AI_SPEED,
  TTS_GENERATION_SPEED,
  clampUiSpeed,
  resolveAiPlaybackSpeed,
  uiSpeedToRuntimeRate,
  formatUiSpeed,
  logAiSpeedSettingChanged,
  logAiSpeedPersisted,
  logAiSpeedPlaybackStart,
  logAiSpeedSetPlaybackRate,
  logAiSpeedReplay,
  shouldCleanupPlaybackOnAppState,
  playbackCleanupLogMessage,
  APPSTATE_ACTIVE_RECOVERY_LOG,
  OPERATION_GUARD_BACKGROUND_RELEASE_LOG,
  shouldForceIdleOnActiveRecovery,
} from '@zaban/tts-mobile';
import type { PlaySource, SentenceCacheSplitMode } from '@zaban/tts-mobile';
import {
  AtmosphereBackground,
  glassStyle,
  ThemeSwitcher,
  useTheme,
  type UiStatus,
} from '../src/theme';
import { ActionCluster } from '../src/ui/ActionCluster';
import {
  AdBanner,
  AD_BANNER_SAFE_DISTANCE_FROM_CONTROLS,
} from '../src/components/AdBanner';
import { AD_SAFE_GAP_DP } from '../src/ads/adBannerLayout';
import { TappableHeroSentence } from '../src/ui/TappableHeroSentence';
import { DictionarySettingsModal } from '../src/ui/DictionarySettingsModal';
import { AiGenerationLanguageModal } from '../src/ui/AiGenerationLanguageModal';
import { PracticeTextModal } from '../src/ui/PracticeTextModal';
import { WordLookupSheet } from '../src/ui/WordLookupSheet';
import { NavPills } from '../src/ui/NavPills';
import { AiPromptModal, type AiVoiceType } from '../src/ui/AiPromptModal';
import { SettingSlider } from '../src/ui/SettingSlider';
import { SliderEndpointRow } from '../src/ui/SliderEndpointRow';
import {
  SETTINGS_TEXT_SIZE_MIN,
  SETTINGS_TEXT_SIZE_MAX,
  formatSettingsHeaderTitle,
} from '../src/ui/settingsPanelLayout';
import { TopAmbientBar } from '../src/ui/TopAmbientBar';
import { useResponsiveLayoutMetrics, getContentMaxWidth } from '../src/ui/responsiveLayout';
import { READING_TEST_IDS, voiceTestId } from '../src/ui/testIds';
import { space } from '../src/ui/spacing';
import {
  disposeShadowRecording as disposeShadowRecordingSession,
  startShadowRecording,
  stopShadowRecording as stopShadowRecordingSession,
} from '../src/audio/shadowRecordingSession';
import { configurePlaybackAudioMode } from '../src/audio/recordingAudioMode';
import { consumeOpenAiAfterOnboardingPending } from '../src/onboarding/onboardingStorage';

import { API_BASE_URL } from '../src/config/apiBaseUrl';
import { BRANDING } from '../src/config/branding';
import { getAppVersionLabel, logAppVersionLoaded } from '../src/config/appVersion';
import {
  deriveAdInteractionState,
  formatAdBusyStateLog,
} from '../src/ads/interactionSafeForAds';
import { useAppStateActive } from '../src/ads/useAppStateActive';
import { useWordHighlight } from '../src/reading/useWordHighlight';
import {
  defaultDictionarySettings,
  dictionaryLanguageLabel,
  findDictionaryEntry,
  addMeaningWord,
  hashReadingText,
  loadDictionaryStore,
  mutateDictionaryStore,
  recordWordInReadingText,
  removeDictionaryEntry,
  recordPracticeUsageAfterAiGeneration,
  requestWordLookup,
  selectDueWordsForAi,
  updateDictionarySettings,
  upsertDictionaryEntry,
  migrateDictionaryEntry,
  type DictionaryEntry,
  type DictionarySettingsV1,
  type PracticeWordForAi,
} from '../src/dictionary';
import {
  DEFAULT_TEXT_SIZE,
  loadAppSettings,
  saveAppSettings,
} from '../src/settings/appSettingsStorage';
import {
  AI_SPEED_SLIDER_STEP,
  formatAiSpeedLabel,
} from '../src/settings/aiSpeedSettings';
import { requestOcrFromImageDataUrl } from '../src/ocr/ocrApi';
import { imageAssetToDataUrl } from '../src/ocr/imageAssetToDataUrl';
import { logDictionaryLanguageSelection, logPracticeLanguageSelection } from '../src/utils/resolvePracticeOutputLanguage';
import { resolveTtsLocaleWithFallback } from '../src/dictionary/dictionaryLanguages';
import { fetchWithTimeout, RequestTimeoutError } from '../src/utils/fetchWithTimeout';
import {
  ASYNC_CHUNKING_THRESHOLD,
  createSafeReadingChunks,
  createSafeReadingChunksAsync,
  formatLongTextStatus,
  MAX_TTS_CHUNK_CHARS,
  REQUEST_TIMEOUT_MS,
  selectCacheKeepIds,
  shouldWarnLargeText,
  truncateForTtsRequest,
  type ReadUnit,
} from '../src/utils/longTextProcessing';

const DEFAULT_TTS_VOICE: AiVoiceType = 'female';
const DEFAULT_READ_UNIT = '1' as const;

function readUnitToSplitMode(unit: ReadUnit): SentenceCacheSplitMode {
  switch (unit) {
    case '1/4':
      return 'eighth';
    case '1/2':
    case '3/4':
      return 'quarter';
    case '2':
    case '3':
    case '4':
    case '1p':
    case '2p':
      return 'half';
    case 'page':
    case '1':
    default:
      return 'full';
  }
}

function mapTtsVoiceToApi(voiceType: AiVoiceType): string {
  return voiceType;
}

function hapticLight() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Replay never POSTs; hear/nav fetch only on first miss (not when sentenceId is locked). */
function allowNetworkForPlay(
  source: PlaySource,
  cachedPath: string | null,
  sentenceGenerated: boolean
): boolean {
  if (source === 'replay') {
    return false;
  }
  return allowNetworkForSource(source, cachedPath, sentenceGenerated);
}

type ShadowPhase = 'idle' | 'starting' | 'recording' | 'playing';

type ShadowMicPermission =
  | { granted: true }
  | { granted: false; blocked: boolean };

/** SHADOW-only mic permission; Android uses PermissionsAndroid for a real system prompt. */
async function ensureShadowMicPermission(): Promise<ShadowMicPermission> {
  if (Platform.OS === 'android') {
    const perm = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
    if (await PermissionsAndroid.check(perm)) {
      return { granted: true };
    }
    const result = await PermissionsAndroid.request(perm, {
      title: 'Microphone access',
      message: 'Shadow needs the microphone to record your pronunciation.',
      buttonPositive: 'Allow',
      buttonNegative: 'Not now',
    });
    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      return { granted: true };
    }
    return {
      granted: false,
      blocked: result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
    };
  }

  const current = await Audio.getPermissionsAsync();
  if (current.granted) {
    return { granted: true };
  }
  const requested = await Audio.requestPermissionsAsync();
  if (requested.granted) {
    return { granted: true };
  }
  return {
    granted: false,
    blocked: requested.canAskAgain === false,
  };
}

const HASH_SOURCE = 'mobile';

/** FNV-1a 32-bit — deterministic, Hermes-safe (no WebCrypto / node:crypto). */
function fnv1a32(input: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function toHex8(n: number): string {
  return (n >>> 0).toString(16).padStart(8, '0');
}

/**
 * Stable sentenceId for cache keys — same text + voice + source always yields same id.
 * Does not use @zaban/tts-core generateChunkHash (not RN-safe).
 */
/** Cache id is voice + text only — tempo is applied client-side for consistency. */

function formatTtsSpeed(_speed: number): string {
  return formatUiSpeed(TTS_GENERATION_SPEED);
}

type PlaybackRateCapable = {
  setPlaybackRate?: (rate: number) => void;
  getPlaybackRate?: () => number;
};

/** Never crash if player lacks rate control (CHAT2 / stale bundles). */
function applyAiPlaybackRate(
  player: PlaybackRateCapable | null | undefined,
  uiSpeed: number,
  reason?: string
): number {
  const { runtimeRate } = resolveAiPlaybackSpeed(uiSpeed);
  if (player == null) {
    logAiSpeedSetPlaybackRate(uiSpeed, 'player_unavailable');
    return runtimeRate;
  }
  try {
    const setter = player.setPlaybackRate;
    if (typeof setter !== 'function') {
      logAiSpeedSetPlaybackRate(uiSpeed, 'setPlaybackRate_unavailable');
      return runtimeRate;
    }
    setter.call(player, runtimeRate);
    if (reason) {
      logAiSpeedSetPlaybackRate(uiSpeed, reason);
    }
  } catch {
    logAiSpeedSetPlaybackRate(uiSpeed, 'setPlaybackRate_threw');
  }
  return runtimeRate;
}

function safeGetPlaybackRate(
  player: PlaybackRateCapable | null | undefined,
  fallback: number
): number {
  if (player == null) {
    return fallback;
  }
  try {
    const getter = player.getPlaybackRate;
    if (typeof getter !== 'function') {
      return fallback;
    }
    return getter.call(player);
  } catch {
    return fallback;
  }
}
function sentenceToMobileId(sentence: string, voiceApi: string): string {
  const normalized = sentence.trim().replace(/\s+/g, ' ').replace(/\n+/g, '\n');
  const speedKey = formatTtsSpeed(TTS_GENERATION_SPEED);
  const key = `${normalized}|${HASH_SOURCE}|${voiceApi}|default|${speedKey}|0|mp3|24000`;
  const h1 = fnv1a32(key, 0x811c9dc5);
  const h2 = fnv1a32(key, 0x01000193);
  const h3 = fnv1a32(key, 0x9e3779b9);
  const h4 = fnv1a32(key.split('').reverse().join(''), 0x85ebca6b);
  return `m${toHex8(h1)}${toHex8(h2)}${toHex8(h3)}${toHex8(h4)}`;
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default function ReadingScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const contentMaxWidth = getContentMaxWidth(screenWidth);
  const [text, setText] = useState('');
  const [sentences, setSentences] = useState<string[]>([]);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [status, setStatus] = useState<UiStatus>('idle');
  const [statusDetail, setStatusDetail] = useState('Paste or write text to begin.');
  const [showTextInput, setShowTextInput] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [showDictionarySettings, setShowDictionarySettings] = useState(false);
  const [showAiLanguageModal, setShowAiLanguageModal] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const ocrLoadingRef = useRef(false);
  const { themeId, theme, setTheme, resetTheme } = useTheme();
  const [aiSpeed, setAiSpeed] = useState(DEFAULT_UI_AI_SPEED);
  const [ttsVoiceType, setTtsVoiceType] = useState<AiVoiceType>(DEFAULT_TTS_VOICE);
  const [textSize, setTextSize] = useState(DEFAULT_TEXT_SIZE);
  const [readUnit, setReadUnit] = useState<ReadUnit>(DEFAULT_READ_UNIT);
  const [shadowPhase, setShadowPhase] = useState<ShadowPhase>('idle');
  const shadowPhaseRef = useRef<ShadowPhase>('idle');
  const setShadowPhaseSync = useCallback((phase: ShadowPhase) => {
    shadowPhaseRef.current = phase;
    setShadowPhase(phase);
  }, []);
  const [shadowHint, setShadowHint] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const appStateActive = useAppStateActive();
  const [settingsScrollEnabled, setSettingsScrollEnabled] = useState(true);
  const [dictionarySettings, setDictionarySettings] = useState<DictionarySettingsV1>(
    defaultDictionarySettings()
  );
  const [dictionaryEntries, setDictionaryEntries] = useState<DictionaryEntry[]>([]);
  const dictionaryEntriesRef = useRef<DictionaryEntry[]>([]);
  const dictionarySettingsRef = useRef(dictionarySettings);
  const aiPracticeBatch = useMemo(
    () => selectDueWordsForAi(dictionaryEntries, undefined, dictionarySettings.practiceLanguage),
    [dictionaryEntries, dictionarySettings.practiceLanguage]
  );
  const appVersionLabel = useMemo(() => getAppVersionLabel(), []);

  useEffect(() => {
    logAppVersionLoaded(appVersionLabel);
  }, [appVersionLabel]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const openAi = await consumeOpenAiAfterOnboardingPending();
      if (!cancelled && openAi) {
        setShowAiPrompt(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const [wordLookupVisible, setWordLookupVisible] = useState(false);
  const [wordLookupLoading, setWordLookupLoading] = useState(false);
  const [wordLookupError, setWordLookupError] = useState<string | null>(null);
  const [wordLookupMeaning, setWordLookupMeaning] = useState<string | null>(null);
  const [wordLookupPartOfSpeech, setWordLookupPartOfSpeech] = useState<string | null>(null);
  const [wordLookupDisplay, setWordLookupDisplay] = useState('');
  const [wordLookupKey, setWordLookupKey] = useState<string | null>(null);
  const { highlightedWord, setHighlightedWord, clearHighlightedWord } = useWordHighlight();
  const [wordLookupSaved, setWordLookupSaved] = useState(false);
  const [wordLookupCount, setWordLookupCount] = useState(1);
  const wordLookupGenRef = useRef(0);
  const activeWordPractice = useMemo(() => {
    if (!wordLookupKey) return null;
    const entry = findDictionaryEntry(
      dictionaryEntries,
      wordLookupKey,
      dictionarySettings.translationLanguage
    );
    return entry ? migrateDictionaryEntry(entry) : null;
  }, [dictionaryEntries, wordLookupKey, dictionarySettings.translationLanguage]);
  const readingTextHashRef = useRef<string | null>(null);
  const chunkSyncGenRef = useRef(0);
  const largeTextWarnedRef = useRef(false);
  const fetchingStartedAtRef = useRef<number | null>(null);

  const [player] = useState(() => new MobileAudioPlayer());
  const [guard] = useState(() => new OperationGuard());
  const playbackGenRef = useRef(0);
  const inFlightFetchRef = useRef(new InFlightTtsFetch<Uint8Array>());
  const shadowGuardTokenRef = useRef<number | null>(null);
  const shadowPlayGenRef = useRef(0);
  const shadowRecordGenRef = useRef(0);
  const totalNetworkRequestsRef = useRef(0);
  const sessionStartRef = useRef(Date.now());
  const appStateRef = useRef(AppState.currentState);
  const aiSpeedRef = useRef(aiSpeed);
  const ttsVoiceTypeRef = useRef(ttsVoiceType);
  const readUnitRef = useRef(readUnit);
  const textRef = useRef(text);
  const sentenceIndexRef = useRef(sentenceIndex);
  const sentencesRef = useRef(sentences);
  const sessionHydratedRef = useRef(false);
  const persistSkipLoggedRef = useRef(false);
  const statusRef = useRef<UiStatus>('idle');

  useEffect(() => {
    ocrLoadingRef.current = ocrLoading;
  }, [ocrLoading]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (status !== 'fetching') {
      return;
    }
    const deadlineMs = REQUEST_TIMEOUT_MS.tts + 5_000;
    const timer = setTimeout(() => {
      if (statusRef.current !== 'fetching') {
        return;
      }
      console.log(`[LONG_TEXT] timeout op=playback_watchdog ms=${deadlineMs}`);
      playbackGenRef.current += 1;
      guard.cancel();
      player.cancel();
      fetchingStartedAtRef.current = null;
      setStatus('error');
      setStatusDetail('Audio request took too long. Tap AI to retry this chunk.');
      console.log('[OPERATION_GUARD] released after long-text op');
    }, deadlineMs);
    return () => clearTimeout(timer);
  }, [status, guard, player]);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    sentenceIndexRef.current = sentenceIndex;
  }, [sentenceIndex]);

  useEffect(() => {
    sentencesRef.current = sentences;
  }, [sentences]);

  useEffect(() => {
    aiSpeedRef.current = aiSpeed;
    applyAiPlaybackRate(player, aiSpeed);
  }, [aiSpeed, player]);

  useEffect(() => {
    ttsVoiceTypeRef.current = ttsVoiceType;
  }, [ttsVoiceType]);

  useEffect(() => {
    readUnitRef.current = readUnit;
  }, [readUnit]);

  useEffect(() => {
    dictionaryEntriesRef.current = dictionaryEntries;
  }, [dictionaryEntries]);

  useEffect(() => {
    dictionarySettingsRef.current = dictionarySettings;
  }, [dictionarySettings]);

  useEffect(() => {
    void (async () => {
      const settings = await loadAppSettings();
      const speed = clampUiSpeed(settings.aiPlaybackSpeed);
      setAiSpeed(speed);
      aiSpeedRef.current = speed;
      setTextSize(settings.textSize);
      applyAiPlaybackRate(player, speed, 'settings_restore');
    })();
  }, [player]);

  useEffect(() => {
    void (async () => {
      const store = await loadDictionaryStore();
      setDictionarySettings(store.settings);
      setDictionaryEntries(store.entries);
    })();
  }, []);

  useEffect(() => {
    const fullText = text.trim();
    if (!fullText || dictionaryEntriesRef.current.length === 0) return;

    const textHash = hashReadingText(fullText);
    if (readingTextHashRef.current === textHash) return;

    const task = InteractionManager.runAfterInteractions(() => {
      readingTextHashRef.current = textHash;
      void (async () => {
        const store = await mutateDictionaryStore((current) => {
          const nextEntries = recordWordInReadingText(current.entries, fullText, textHash);
          if (nextEntries === current.entries) return current;
          return { ...current, entries: nextEntries };
        });
        setDictionaryEntries(store.entries);
      })();
    });

    return () => task.cancel();
  }, [text]);

  const handleSliderDragStart = useCallback(() => {
    setSettingsScrollEnabled(false);
  }, []);

  const handleSliderDragEnd = useCallback(() => {
    setSettingsScrollEnabled(true);
  }, []);

  const handleAiSpeedLiveChange = useCallback(
    (next: number) => {
      const clamped = clampUiSpeed(next);
      setAiSpeed(clamped);
      aiSpeedRef.current = clamped;
      logAiSpeedSettingChanged(clamped);
      applyAiPlaybackRate(
        player,
        clamped,
        status === 'playing' ? 'during_playback' : undefined
      );
    },
    [player, status]
  );

  const handleAiSpeedPersist = useCallback((next: number) => {
    const clamped = clampUiSpeed(next);
    void saveAppSettings({ aiPlaybackSpeed: clamped });
  }, []);

  const handleAiSpeedDragEnd = useCallback(() => {
    setSettingsScrollEnabled(true);
    handleAiSpeedPersist(aiSpeedRef.current);
  }, [handleAiSpeedPersist]);

  const handleTextSizeChange = useCallback((next: number) => {
    setTextSize(next);
    void saveAppSettings({ textSize: next });
  }, []);

  const colors = theme;
  const layout = useResponsiveLayoutMetrics();
  const themeFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    themeFade.setValue(0.92);
    Animated.timing(themeFade, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [themeId, themeFade]);

  const logEnduranceSnapshot = useCallback(
    async (event: string, extra: Record<string, unknown> = {}) => {
      const cache = await getSentenceCacheStats();
      logEndurance(event, {
        elapsedMs: Date.now() - sessionStartRef.current,
        totalNetworkRequests: totalNetworkRequestsRef.current,
        sentenceIndex,
        sentenceId: extra.sentenceId ?? null,
        operationGuard: guard.getActive(),
        operationGuardGen: guard.getGeneration(),
        playbackPath: player.getActivePlaybackPath(),
        tempFileCount: player.getTempFileCount(),
        cacheEntryCount: cache.entryCount,
        cacheFileCount: cache.fileCount,
        cacheCurrentId: cache.currentSentenceId,
        cachePreviousId: cache.previousSentenceId,
        memoryWarning: 'not_available_in_js',
        ...extra,
      });
    },
    [guard, player, sentenceIndex]
  );

  const sentenceToId = useCallback(
    (sentence: string) =>
      Promise.resolve(sentenceToMobileId(sentence, mapTtsVoiceToApi(ttsVoiceTypeRef.current))),
    []
  );

  const fetchTtsAudio = useCallback(async (sentenceId: string, sentence: string): Promise<Uint8Array> => {
    if (inFlightFetchRef.current.hasInFlight(sentenceId)) {
      console.log('[TTS:Mobile] duplicate fetch blocked sentenceId=', sentenceId);
    }
    const ttsText = truncateForTtsRequest(sentence);
    if (ttsText.length < sentence.trim().length) {
      console.log(
        `[LONG_TEXT] processing chunk=truncated len=${ttsText.length} max=${MAX_TTS_CHUNK_CHARS}`
      );
    }
    return inFlightFetchRef.current.getOrFetch(sentenceId, async () => {
      let response: Response;
      try {
        response = await fetchWithTimeout(
          `${API_BASE_URL}/tts`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: ttsText,
              voice: mapTtsVoiceToApi(ttsVoiceTypeRef.current),
              speed: TTS_GENERATION_SPEED,
              locale: resolveTtsLocaleWithFallback(
                dictionarySettingsRef.current.practiceLanguage
              ).locale,
              languageId: dictionarySettingsRef.current.practiceLanguage,
            }),
          },
          REQUEST_TIMEOUT_MS.tts,
          'tts'
        );
      } catch (err) {
        if (err instanceof RequestTimeoutError) {
          throw new Error('Audio fetch timed out. Tap AI to retry this chunk.');
        }
        throw err;
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok || typeof data.audioBase64 !== 'string') {
        const msg =
          data?.details || data?.error || `TTS request failed (${response.status})`;
        throw new Error(typeof msg === 'string' ? msg : 'TTS request failed');
      }
      totalNetworkRequestsRef.current += 1;
      console.log(
        '[TTS:Mobile] network POST /tts sentenceId=',
        sentenceId,
        'totalNetworkRequests=',
        totalNetworkRequestsRef.current
      );
      console.log('[LONG_TEXT] chunkSuccess index=network sentenceId=', sentenceId);
      return base64ToBytes(data.audioBase64);
    });
  }, []);

  const releaseShadowGuard = useCallback(() => {
    const token = shadowGuardTokenRef.current;
    if (token != null) {
      guard.release(token, 'recording');
      shadowGuardTokenRef.current = null;
    }
  }, [guard]);

  const cancelPlayback = useCallback(() => {
    playbackGenRef.current += 1;
    shadowPlayGenRef.current += 1;
    shadowRecordGenRef.current += 1;
    releaseShadowGuard();
    guard.cancel();
    player.cancel();
    void (async () => {
      await disposeShadowRecordingSession();
      setShadowPhaseSync('idle');
    })();
    setStatus('stopped');
    setStatusDetail('Stopped.');
    if (shouldTouchLastActivityOn('playback_stop')) {
      void touchLastActivityAt().catch(() => {});
    }
  }, [guard, player, releaseShadowGuard, setShadowPhaseSync]);

  const interruptForAppLifecycle = useCallback(
    async (nextState: string) => {
      const phase = shadowPhaseRef.current;
      const wasRecording = phase === 'recording' || phase === 'starting';
      const wasAudioBusy =
        statusRef.current === 'fetching' ||
        statusRef.current === 'playing' ||
        phase === 'playing' ||
        player.isPlaying();

      if (wasAudioBusy || wasRecording) {
        console.log(playbackCleanupLogMessage(nextState));
      }

      playbackGenRef.current += 1;
      shadowPlayGenRef.current += 1;
      shadowRecordGenRef.current += 1;
      fetchingStartedAtRef.current = null;

      if (wasAudioBusy) {
        console.log('[AUDIO_INTERRUPT] stopping playback');
        player.cancel();
      }

      if (wasRecording) {
        console.log('[RECORDING_INTERRUPT] stopping recording');
        await disposeShadowRecordingSession();
        setShadowPhaseSync('idle');
      }

      releaseShadowGuard();
      const guardWasBusy = guard.getActive() !== 'idle';
      guard.cancel();
      if (guardWasBusy || wasAudioBusy || wasRecording) {
        console.log(OPERATION_GUARD_BACKGROUND_RELEASE_LOG);
      }

      setNavigating(false);
      setAiGenerating(false);

      if (ocrLoadingRef.current) {
        setOcrLoading(false);
      }

      if (wasAudioBusy || wasRecording || statusRef.current === 'fetching') {
        setStatus('idle');
        setStatusDetail('Paused — tap AI or Shadow to continue.');
      }
    },
    [guard, player, releaseShadowGuard, setShadowPhaseSync]
  );

  const recoverAppActive = useCallback(() => {
    applyAiPlaybackRate(player, aiSpeedRef.current, 'app_active_recovery');

    const needsForceIdle = shouldForceIdleOnActiveRecovery(
      statusRef.current,
      shadowPhaseRef.current,
      guard.getActive()
    );

    if (needsForceIdle) {
      playbackGenRef.current += 1;
      player.cancel();
      releaseShadowGuard();
      guard.cancel();
      console.log(OPERATION_GUARD_BACKGROUND_RELEASE_LOG);
      setShadowPhaseSync('idle');
      setNavigating(false);
      setAiGenerating(false);
      fetchingStartedAtRef.current = null;
      setStatus('idle');
      setStatusDetail('Paused — tap AI or Shadow to continue.');
    } else {
      setNavigating(false);
      setAiGenerating(false);
      if (guard.getActive() !== 'idle') {
        guard.cancel();
        console.log(OPERATION_GUARD_BACKGROUND_RELEASE_LOG);
      }
    }

    console.log(APPSTATE_ACTIVE_RECOVERY_LOG);
  }, [guard, player, releaseShadowGuard, setShadowPhaseSync]);

  const applySentenceParts = useCallback(
    (
      parts: string[],
      raw: string,
      forceResetIndex: boolean,
      centerIndex = sentenceIndexRef.current
    ) => {
      const prevFirst = sentencesRef.current[0]?.trim() ?? '';
      const nextFirst = parts[0]?.trim() ?? '';
      const textReplaced =
        prevFirst.length > 0 && nextFirst.length > 0 && prevFirst !== nextFirst;
      const shouldResetIndex = forceResetIndex || textReplaced;

      setSentences(parts);
      setSentenceIndex((idx) => {
        const next =
          shouldResetIndex || parts.length === 0
            ? 0
            : Math.min(idx, parts.length - 1);
        sentenceIndexRef.current = next;
        return next;
      });

      if (parts.length > 0) {
        const voice = mapTtsVoiceToApi(ttsVoiceTypeRef.current);
        const keepIds = selectCacheKeepIds(parts, centerIndex, (s) =>
          sentenceToMobileId(s, voice)
        );
        void pruneSentenceCacheToKeepIds(keepIds).catch((err) => {
          console.error('[TTS:Mobile] prune cache after text sync failed:', err);
        });
        console.log(
          '[TTS:Mobile] text_ready sentences=',
          parts.length,
          'textLen=',
          raw.trim().length
        );
        setStatusDetail(formatLongTextStatus(sentenceIndexRef.current, parts.length));
      } else {
        setStatusDetail('Paste or write text to begin.');
      }
      return parts;
    },
    []
  );

  const syncSentencesFromText = useCallback(
    (raw: string, unit: ReadUnit = readUnitRef.current, forceResetIndex = false) => {
      const parts = createSafeReadingChunks(raw, unit);
      return applySentenceParts(parts, raw, forceResetIndex);
    },
    [applySentenceParts]
  );

  const syncSentencesFromTextAsync = useCallback(
    async (
      raw: string,
      unit: ReadUnit = readUnitRef.current,
      forceResetIndex = false
    ) => {
      const syncGen = chunkSyncGenRef.current + 1;
      chunkSyncGenRef.current = syncGen;
      const trimmed = raw.trim();

      if (trimmed.length >= ASYNC_CHUNKING_THRESHOLD) {
        setStatusDetail('Preparing text chunks…');
      }

      const parts =
        trimmed.length >= ASYNC_CHUNKING_THRESHOLD
          ? await createSafeReadingChunksAsync(trimmed, unit)
          : createSafeReadingChunks(trimmed, unit);

      if (chunkSyncGenRef.current !== syncGen) {
        return parts;
      }

      return applySentenceParts(parts, raw, forceResetIndex);
    },
    [applySentenceParts]
  );

  const commitReadingText = useCallback(
    (unit: ReadUnit = readUnitRef.current) => syncSentencesFromText(textRef.current, unit),
    [syncSentencesFromText]
  );

  const persistReadingSession = useCallback(async () => {
    if (!sessionHydratedRef.current) {
      if (!persistSkipLoggedRef.current) {
        persistSkipLoggedRef.current = true;
        console.log('[ReadingSession] persist skipped: not hydrated yet');
        logEndurance('reading_session_persist_skip', { reason: 'not_hydrated' });
      }
      return;
    }
    const unit = readUnitRef.current;
    const trimmedText = textRef.current.trim();
    let parts: string[];
    let persistText: string;

    if (trimmedText) {
      parts = commitReadingText();
      persistText = textRef.current;
    } else {
      const active = sentencesRef.current;
      persistText = deriveReadingTextForPersist(textRef.current, active);
      parts = persistText.trim() ? createSafeReadingChunks(persistText, unit) : [];
    }

    const raw = persistText.trim();
    if (shouldClearReadingSession(raw, parts.length)) {
      await clearReadingSession();
      logEndurance('reading_session_cleared', {
        reason: 'empty_text',
        activeSentenceCount: parts.length,
        textLen: persistText.length,
      });
      return;
    }

    const maxIdx = parts.length === 0 ? 0 : parts.length - 1;
    const idx = Math.min(Math.max(0, sentenceIndexRef.current), maxIdx);
    const sentence = parts[idx] ?? '';
    const sentenceId = sentence
      ? sentenceToMobileId(sentence, mapTtsVoiceToApi(ttsVoiceTypeRef.current))
      : null;
    await saveReadingSession({
      version: 1,
      text: persistText,
      readUnit: unit,
      sentenceIndex: idx,
      sentenceId,
      aiSpeed: aiSpeedRef.current,
      ttsVoiceType: ttsVoiceTypeRef.current,
      savedAt: Date.now(),
    });
    logEndurance('reading_session_saved', {
      sentenceIndex: idx,
      total: parts.length,
      readUnit: unit,
      textLen: persistText.length,
      fromSentences: persistText !== textRef.current,
    });
  }, [commitReadingText]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await loadReadingSession();
      if (cancelled) {
        return;
      }
      if (session?.text.trim()) {
        const unit: ReadUnit = isReadingSessionReadUnit(session.readUnit)
          ? session.readUnit
          : DEFAULT_READ_UNIT;
        textRef.current = session.text;
        setText(session.text);
        setReadUnit(unit);
        readUnitRef.current = unit;
        if (session.aiSpeed > 0) {
          logAiSpeedPersisted(clampUiSpeed(session.aiSpeed));
        }
        if (session.ttsVoiceType === 'male' || session.ttsVoiceType === 'female') {
          setTtsVoiceType(session.ttsVoiceType);
          ttsVoiceTypeRef.current = session.ttsVoiceType;
        }
        const restoredVoice =
          session.ttsVoiceType === 'male' || session.ttsVoiceType === 'female'
            ? session.ttsVoiceType
            : DEFAULT_TTS_VOICE;
        const parts = createSafeReadingChunks(session.text, unit);
        setSentences(parts);
        const idx = resolveRestoredSentenceIndex(
          parts,
          session.sentenceIndex,
          session.sentenceId,
          (s) => sentenceToMobileId(s, mapTtsVoiceToApi(restoredVoice))
        );
        sentenceIndexRef.current = idx;
        setSentenceIndex(idx);
        setStatusDetail(
          parts.length > 0
            ? `Restored ${idx + 1} of ${parts.length}.`
            : 'Paste or write text to begin.'
        );
        console.log(
          `[ReadingSession] restore index=${idx} total=${parts.length} unit=${unit}`
        );
        logEndurance('reading_session_restore', {
          sentenceIndex: idx,
          total: parts.length,
          readUnit: unit,
          session_restore_success: true,
        });
      }
      sessionHydratedRef.current = true;

      const extra = Constants.expoConfig?.extra as
        | { validationBuild?: boolean; e2eSeedText?: string }
        | undefined;
      const validationBuild =
        process.env.EXPO_PUBLIC_VALIDATION_BUILD === '1' || extra?.validationBuild === true;
      const seed = (
        process.env.EXPO_PUBLIC_E2E_SEED_TEXT ??
        extra?.e2eSeedText ??
        ''
      ).trim();
      const hadRestoredSession = Boolean(session?.text.trim());
      if (validationBuild && seed.length > 0 && !hadRestoredSession) {
        textRef.current = seed;
        setText(seed);
        setReadUnit(DEFAULT_READ_UNIT);
        readUnitRef.current = DEFAULT_READ_UNIT;
        const parts = createSafeReadingChunks(seed, DEFAULT_READ_UNIT);
        setSentences(parts);
        sentenceIndexRef.current = 0;
        setSentenceIndex(0);
        setStatusDetail(parts.length > 0 ? `Ready — 1 of ${parts.length}.` : 'Paste or write text to begin.');
        console.log('[TTS:Mobile] e2e_seed applied sentences=', parts.length);
        if (parts.length > 0) {
          console.log('[TTS:Mobile] text_ready sentences=', parts.length, 'textLen=', seed.length);
        }
        await persistReadingSession();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Position / unit / speed — persist immediately (force-stop must not lose debounced writes).
  useEffect(() => {
    if (!sessionHydratedRef.current) {
      return;
    }
    void persistReadingSession();
  }, [readUnit, sentenceIndex, aiSpeed, ttsVoiceType, persistReadingSession]);

  // Text typing — debounce; flush pending write on cleanup (unmount / rapid edits).
  useEffect(() => {
    if (!sessionHydratedRef.current) {
      return;
    }
    const id = setTimeout(() => {
      void persistReadingSession();
    }, 450);
    return () => {
      clearTimeout(id);
      void persistReadingSession();
    };
  }, [text, persistReadingSession]);

  const handleTextChange = useCallback((raw: string) => {
    clearHighlightedWord('text_replaced');
    textRef.current = raw;
    setText(raw);
    if (shouldWarnLargeText(raw.length) && !largeTextWarnedRef.current) {
      largeTextWarnedRef.current = true;
      Alert.alert(
        'Large text',
        'Very long text is split into smaller chunks for playback. Processing may take a moment, but the app should stay responsive.'
      );
    }
  }, [clearHighlightedWord]);

  useEffect(() => {
    const id = setTimeout(() => {
      void syncSentencesFromTextAsync(textRef.current).then(() => {
        if (sessionHydratedRef.current) {
          void persistReadingSession();
        }
      });
    }, 300);
    return () => clearTimeout(id);
  }, [text, readUnit, syncSentencesFromTextAsync, persistReadingSession]);

  const playSentence = useCallback(
    async (index: number, source: PlaySource, list: string[]) => {
      if (list.length === 0) {
        setStatus('error');
        setStatusDetail('No sentences — enter text first.');
        return;
      }
      if (index < 0 || index >= list.length) {
        setStatus('error');
        setStatusDetail('Sentence index out of range.');
        return;
      }

      const sentence = list[index];
      const gen = ++playbackGenRef.current;
      const token = guard.tryAcquire('ai_playback');
      if (token == null) {
        setStatus('error');
        setStatusDetail('Busy — another audio operation is active.');
        return;
      }

      try {
        console.log(`[LONG_TEXT] processing chunk=${index + 1}/${list.length}`);
        setSentenceIndex(index);
        setStatus('fetching');
        fetchingStartedAtRef.current = Date.now();
        setStatusDetail(`Fetching audio (${source})…`);

        if (shouldTouchLastActivityOn('playback_start')) {
          await touchLastActivityAt();
        }

        const sentenceId = await sentenceToId(sentence);
        const cachedPath = await getCachedSentenceAudio(sentenceId);
        const sentenceGenerated = await isSentenceGenerated(sentenceId);

        if (source === 'replay') {
          setStatusDetail(cachedPath ? 'Replay from cache…' : 'Replay failed (no cache)…');
        }

        const allowNetwork =
          allowNetworkForPlay(source, cachedPath, sentenceGenerated) ||
          (source === 'hear' && sentenceGenerated && !cachedPath);

        const resolved = await resolveSentenceAudio(
          sentenceId,
          {
            getCached: getCachedSentenceAudio,
            fetchAudio: () => fetchTtsAudio(sentenceId, sentence),
            putCached: putCachedSentenceAudio,
          },
          {
            allowNetwork,
            trigger: source === 'replay' ? 'replay' : source === 'nav' ? 'nav' : 'hear',
          }
        );

        if (gen !== playbackGenRef.current) {
          return;
        }

        if (!resolved) {
          if (sentenceGenerated && !cachedPath) {
            console.error(
              '[TTS:Mobile] cache missing for locked sentenceId=',
              sentenceId,
              'source=',
              source
            );
            setStatus('error');
            setStatusDetail('Cached audio missing for this sentence (locked; no re-fetch).');
          } else if (source === 'nav') {
            console.log('[TTS:Mobile] nav skip — no audio sentenceId=', sentenceId);
            setStatus('stopped');
            setStatusDetail('Could not load audio for navigation.');
          } else if (source === 'replay') {
            console.log('[TTS:Mobile] replay failed sentenceId=', sentenceId);
            setStatus('error');
            setStatusDetail('Replay failed: could not load audio for this sentence.');
          } else {
            setStatus('error');
            setStatusDetail('Could not load audio for this sentence.');
          }
          return;
        }

        if (resolved.fromCache) {
          console.log('[TTS:Mobile] cache HIT sentenceId=', sentenceId);
          if (source === 'replay') {
            console.log('[TTS:Mobile] replay from cache sentenceId=', sentenceId);
          } else if (source !== 'hear') {
            console.log('[TTS:Mobile] local playback only sentenceId=', sentenceId);
          }
        } else if (source === 'replay') {
          console.log('[TTS:Mobile] replay refetched sentenceId=', sentenceId);
        }

        const keepIds = await buildKeepSentenceIds(
          index,
          list,
          readUnitToSplitMode(readUnitRef.current),
          sentenceToId
        );
        await setActiveSentenceRing(keepIds, resolved.audioPath);

        if (gen !== playbackGenRef.current) {
          return;
        }

        setStatus('playing');
        if (source === 'replay') {
          setStatusDetail(
            resolved.fromCache ? 'Replay from cache' : 'Replay refetched audio'
          );
        } else {
          setStatusDetail(`Playing ${index + 1} of ${list.length}…`);
        }
        const uiSpeed = aiSpeedRef.current;
        if (source === 'replay') {
          logAiSpeedReplay(uiSpeed);
        }
        logAiSpeedPlaybackStart(uiSpeed);
        const runtimeRate = applyAiPlaybackRate(player, uiSpeed, `play_${source}`);
        const requestId = player.getNextRequestId();
        await player.play(resolved.audioPath, requestId, { playbackRate: runtimeRate });

        if (gen !== playbackGenRef.current) {
          return;
        }

        setStatus('idle');
        if (source === 'replay') {
          setStatusDetail(
            resolved.fromCache ? 'Replay from cache' : 'Replay refetched audio'
          );
        } else {
          setStatusDetail(`Finished ${index + 1} of ${list.length}.`);
        }
        if (shouldTouchLastActivityOn('playback_stop')) {
          await touchLastActivityAt();
        }
        logTempAudioCount(player.getTempFileCount(), `play_complete_${source}`);
        void logEnduranceSnapshot('play_complete', {
          sentenceId,
          source,
          fromCache: resolved.fromCache,
        });
      } catch (err) {
        if (gen === playbackGenRef.current) {
          setStatus('error');
          const msg = err instanceof Error ? err.message : 'Playback failed';
          console.log(`[LONG_TEXT] chunkFailed index=${index} reason=${msg}`);
          setStatusDetail(source === 'replay' ? 'Replay failed' : msg);
          console.error('[TTS:Mobile] playSentence error:', err);
        }
      } finally {
        fetchingStartedAtRef.current = null;
        guard.release(token, 'ai_playback');
        console.log('[OPERATION_GUARD] released after long-text op');
      }
    },
    [fetchTtsAudio, guard, logEnduranceSnapshot, player, sentenceToId]
  );

  const handleHearAi = useCallback(async () => {
    const parts =
      sentences.length > 0 ? sentences : syncSentencesFromText(textRef.current);
    console.log(
      '[TTS:Mobile] hear_ai start sentences=',
      parts.length,
      'textLen=',
      textRef.current.trim().length,
      'sentenceIndex=',
      sentenceIndex
    );
    if (parts.length === 0) {
      setStatus('error');
      setStatusDetail('Enter some text to read.');
      return;
    }
    cancelPlayback();
    const idx = Math.min(Math.max(0, sentenceIndex), parts.length - 1);
    await playSentence(idx, 'hear', parts);
  }, [cancelPlayback, playSentence, sentenceIndex, sentences, syncSentencesFromText]);

  const handleStop = useCallback(() => {
    void logEnduranceSnapshot('stop_pressed');
    cancelPlayback();
  }, [cancelPlayback, logEnduranceSnapshot]);

  const handleNext = useCallback(async () => {
    const parts =
      sentences.length > 0 ? sentences : syncSentencesFromText(textRef.current);
    console.log(
      '[TTS:Mobile] nav_next_enter',
      'sentenceIndex=',
      sentenceIndex,
      'total=',
      parts.length,
      'textLen=',
      textRef.current.trim().length
    );
    if (parts.length === 0) {
      console.log('[TTS:Mobile] nav_next_blocked reason=no_sentences');
      return;
    }
    cancelPlayback();
    const next = Math.min(sentenceIndex + 1, parts.length - 1);
    if (next === sentenceIndex) {
      console.log('[TTS:Mobile] nav_next_blocked reason=at_last_sentence', 'index=', sentenceIndex);
      return;
    }
    clearHighlightedWord('navigation');
    const nextSentence = parts[next] ?? '';
    const nextId = sentenceToMobileId(
      nextSentence,
      mapTtsVoiceToApi(ttsVoiceTypeRef.current)
    );
    sentenceIndexRef.current = next;
    setSentenceIndex(next);
    logNavigation({ direction: 'next', sentenceIndex: next, sentenceId: nextId });
    console.log(
      '[TTS:Mobile] nav_next_applied',
      'sentenceIndex=',
      next,
      'sentenceId=',
      nextId
    );
    setNavigating(true);
    try {
      await persistReadingSession();
      await playSentence(next, 'nav', parts);
    } finally {
      setNavigating(false);
    }
  }, [cancelPlayback, clearHighlightedWord, persistReadingSession, playSentence, sentenceIndex, sentences, syncSentencesFromText]);

  const handleBack = useCallback(async () => {
    const parts =
      sentences.length > 0 ? sentences : syncSentencesFromText(textRef.current);
    console.log(
      '[TTS:Mobile] nav_back_enter',
      'sentenceIndex=',
      sentenceIndex,
      'total=',
      parts.length,
      'textLen=',
      textRef.current.trim().length
    );
    if (parts.length === 0) {
      console.log('[TTS:Mobile] nav_back_blocked reason=no_sentences');
      return;
    }
    cancelPlayback();
    const prev = Math.max(sentenceIndex - 1, 0);
    if (prev === sentenceIndex) {
      console.log('[TTS:Mobile] nav_back_blocked reason=at_first_sentence', 'index=', sentenceIndex);
      return;
    }
    clearHighlightedWord('navigation');
    const prevSentence = parts[prev] ?? '';
    const prevId = sentenceToMobileId(
      prevSentence,
      mapTtsVoiceToApi(ttsVoiceTypeRef.current)
    );
    sentenceIndexRef.current = prev;
    setSentenceIndex(prev);
    logNavigation({ direction: 'back', sentenceIndex: prev, sentenceId: prevId });
    console.log(
      '[TTS:Mobile] nav_back_applied',
      'sentenceIndex=',
      prev,
      'sentenceId=',
      prevId
    );
    setNavigating(true);
    try {
      await persistReadingSession();
      await playSentence(prev, 'nav', parts);
    } finally {
      setNavigating(false);
    }
  }, [cancelPlayback, clearHighlightedWord, persistReadingSession, playSentence, sentenceIndex, sentences, syncSentencesFromText]);

  /** Internal defaults reset — not exposed in settings UI. */
  const resetSettings = useCallback(() => {
    resetTheme();
    setAiSpeed(DEFAULT_UI_AI_SPEED);
    setTtsVoiceType(DEFAULT_TTS_VOICE);
    setTextSize(DEFAULT_TEXT_SIZE);
    setReadUnit(DEFAULT_READ_UNIT);
    readUnitRef.current = DEFAULT_READ_UNIT;
    aiSpeedRef.current = DEFAULT_UI_AI_SPEED;
    ttsVoiceTypeRef.current = DEFAULT_TTS_VOICE;
    void saveAppSettings({
      aiPlaybackSpeed: DEFAULT_UI_AI_SPEED,
      textSize: DEFAULT_TEXT_SIZE,
    });
    syncSentencesFromText(textRef.current, DEFAULT_READ_UNIT);
    setSentenceIndex(0);
    setStatusDetail('Settings reset to defaults.');
  }, [resetTheme, syncSentencesFromText]);

  const openAfterSettings = useCallback((open: () => void) => {
    if (!showSettings) {
      open();
      return;
    }
    setShowSettings(false);
    InteractionManager.runAfterInteractions(() => {
      setTimeout(open, Platform.OS === 'android' ? 150 : 16);
    });
  }, [showSettings]);

  const handleWritePress = useCallback(() => {
    openAfterSettings(() => setShowTextInput(true));
  }, [openAfterSettings]);

  const toggleTextInput = useCallback(() => {
    if (showTextInput) {
      void (async () => {
        commitReadingText();
        setShowTextInput(false);
        await persistReadingSession();
      })();
    } else {
      setShowTextInput(true);
    }
  }, [commitReadingText, persistReadingSession, showTextInput]);

  const handleDictionarySettingsChange = useCallback((patch: Partial<DictionarySettingsV1>) => {
    void (async () => {
      const next = await updateDictionarySettings(patch);
      setDictionarySettings(next);
      if (patch.practiceLanguage) {
        logPracticeLanguageSelection(next.practiceLanguage);
      }
      if (patch.translationLanguage) {
        logDictionaryLanguageSelection(next.translationLanguage);
      }
    })();
  }, []);

  const handleDictionaryEntriesChange = useCallback((entries: DictionaryEntry[]) => {
    void (async () => {
      const store = await mutateDictionaryStore((current) => ({ ...current, entries }));
      setDictionaryEntries(store.entries);
    })();
  }, []);

  const handlePhotoOcr = useCallback(
    async (source: 'library' | 'camera') => {
      if (ocrLoading) return;

      console.log(`[OCR] image selected source=${source}`);
      const permission =
        source === 'library'
          ? await ImagePicker.requestMediaLibraryPermissionsAsync()
          : await ImagePicker.requestCameraPermissionsAsync();
      console.log(`[OCR] permission status=${permission.granted ? 'granted' : permission.status}`);
      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          source === 'library'
            ? 'Allow photo access to read text from images.'
            : 'Allow camera access to photograph text for reading.'
        );
        return;
      }

      const result =
        source === 'library'
          ? await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.85,
              base64: true,
              ...(Platform.OS === 'android' ? { legacy: true } : {}),
            })
          : await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.85,
              base64: true,
            });
      if (result.canceled) {
        console.log('[OCR] picker canceled');
        return;
      }

      const asset = result.assets[0];
      if (!asset) {
        Alert.alert('Photo read failed', 'No image was selected.');
        return;
      }

      console.log(`[OCR] image selected uri=${asset.uri ?? 'missing'} hasBase64=${Boolean(asset.base64?.length)}`);
      setOcrLoading(true);
      try {
        const dataUrl = await imageAssetToDataUrl(asset);
        if (!dataUrl) {
          throw new Error(
            'Could not read image data from the selected photo. Try another image or use Camera.'
          );
        }

        console.log('[OCR] request started');
        const extracted = await requestOcrFromImageDataUrl(dataUrl);
        console.log(`[OCR] result length=${extracted.length}`);
        setShowSettings(false);
        handleTextChange(extracted);
        const parts = await syncSentencesFromTextAsync(extracted, readUnitRef.current, true);
        console.log(`[OCR] applied sentences=${parts.length} textLen=${extracted.length}`);
        if (parts.length === 0) {
          throw new Error('Photo text was read but could not be split into reading sentences.');
        }
        setStatus('idle');
        setStatusDetail('Text loaded from photo.');
        void persistReadingSession();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Could not read text from this image.';
        console.log(`[OCR] failed reason=${message}`);
        Alert.alert('Photo read failed', message);
      } finally {
        setOcrLoading(false);
      }
    },
    [handleTextChange, ocrLoading, persistReadingSession, syncSentencesFromTextAsync]
  );

  const handleAlbumPhotoPress = useCallback(() => {
    if (ocrLoading) return;
    openAfterSettings(() => void handlePhotoOcr('library'));
  }, [handlePhotoOcr, ocrLoading, openAfterSettings]);

  const handleCameraPhotoPress = useCallback(() => {
    if (ocrLoading) return;
    openAfterSettings(() => void handlePhotoOcr('camera'));
  }, [handlePhotoOcr, ocrLoading, openAfterSettings]);

  const handleWordPress = useCallback(
    (lookup: string, displayWord: string) => {
      if (!lookup || sentencesRef.current.length === 0) return;

      const targetLanguage = dictionarySettingsRef.current.translationLanguage;
      console.log(
        `[LANGUAGE:TRANSLATE_REQUEST] target=${targetLanguage} word=${displayWord}`
      );
      const existing = findDictionaryEntry(dictionaryEntriesRef.current, lookup, targetLanguage);
      const context =
        sentencesRef.current[sentenceIndexRef.current] ?? sentencesRef.current[0] ?? '';

      setWordLookupKey(lookup);
      setHighlightedWord(lookup);
      setWordLookupDisplay(displayWord);
      setWordLookupVisible(true);
      setWordLookupLoading(true);
      setWordLookupError(null);
      setWordLookupMeaning(existing?.meaning ?? null);
      setWordLookupPartOfSpeech(existing?.partOfSpeech ?? null);
      setWordLookupSaved(Boolean(existing));
      setWordLookupCount((existing?.lookupCount ?? 0) + 1);

      const lookupGen = wordLookupGenRef.current + 1;
      wordLookupGenRef.current = lookupGen;

      void (async () => {
        try {
          const result = await requestWordLookup(API_BASE_URL, {
            word: displayWord,
            context,
            targetLanguage,
          });

          if (wordLookupGenRef.current !== lookupGen) return;

          if (result.blocked) {
            setWordLookupMeaning(null);
            setWordLookupPartOfSpeech(null);
            setWordLookupLoading(false);
            setWordLookupError(result.userMessage ?? 'This app is for language practice, not code generation.');
            clearHighlightedWord('lookup_error');
            return;
          }

          setWordLookupMeaning(result.meaning);
          setWordLookupPartOfSpeech(result.partOfSpeech ?? null);
          setWordLookupLoading(false);
          setWordLookupError(null);

          const store = await mutateDictionaryStore(
            (current) => ({
              ...current,
              entries: addMeaningWord(
                current.entries,
                {
                  displayWord,
                  meaning: result.meaning,
                  partOfSpeech: result.partOfSpeech,
                  targetLanguage,
                },
                { meaningAskedAgain: Boolean(existing) }
              ),
            }),
            { word: lookup, language: targetLanguage }
          );
          setDictionaryEntries(store.entries);
          const touched = findDictionaryEntry(store.entries, lookup, targetLanguage);
          setWordLookupSaved(Boolean(touched));
          setWordLookupCount(touched?.lookupCount ?? 1);
        } catch (err) {
          if (wordLookupGenRef.current !== lookupGen) return;
          setWordLookupLoading(false);
          setWordLookupError(err instanceof Error ? err.message : 'Lookup failed.');
          clearHighlightedWord('lookup_error');
        }
      })();
    },
    [clearHighlightedWord, dictionarySettings.translationLanguage, setHighlightedWord]
  );

  const handleWordLookupClose = useCallback(() => {
    wordLookupGenRef.current += 1;
    setWordLookupVisible(false);
    clearHighlightedWord('lookup_closed');
  }, [clearHighlightedWord]);

  const handleWordLookupToggleSave = useCallback(() => {
    if (!wordLookupKey || !wordLookupMeaning || wordLookupLoading) return;

    void (async () => {
      const targetLanguage = dictionarySettings.translationLanguage;

      if (wordLookupSaved) {
        const store = await mutateDictionaryStore(
          (current) => ({
            ...current,
            entries: removeDictionaryEntry(current.entries, wordLookupKey, targetLanguage),
          }),
          { word: wordLookupKey, language: targetLanguage }
        );
        setDictionaryEntries(store.entries);
        setWordLookupSaved(false);
        return;
      }

      const textHash = hashReadingText(textRef.current);
      const store = await mutateDictionaryStore(
        (current) => {
          const withAppearance = recordWordInReadingText(
            current.entries,
            textRef.current,
            textHash
          );
          const nextEntries = upsertDictionaryEntry(withAppearance, {
            displayWord: wordLookupDisplay,
            meaning: wordLookupMeaning,
            partOfSpeech: wordLookupPartOfSpeech ?? undefined,
            targetLanguage,
            textAppearanceCount:
              findDictionaryEntry(withAppearance, wordLookupKey, targetLanguage)
                ?.textAppearanceCount ?? 1,
          });
          return { ...current, entries: nextEntries };
        },
        { word: wordLookupKey, language: targetLanguage }
      );
      const saved = findDictionaryEntry(store.entries, wordLookupKey, targetLanguage);
      setDictionaryEntries(store.entries);
      setWordLookupSaved(true);
      setWordLookupCount(saved?.lookupCount ?? 1);
    })();
  }, [
    dictionarySettings.translationLanguage,
    wordLookupDisplay,
    wordLookupKey,
    wordLookupLoading,
    wordLookupMeaning,
    wordLookupPartOfSpeech,
    wordLookupSaved,
  ]);

  const handleAiGenerated = useCallback(
    (generatedText: string, meta?: { practiceWordDetails?: PracticeWordForAi[] }) => {
      cancelPlayback();
      handleTextChange(generatedText);
      void syncSentencesFromTextAsync(generatedText, readUnitRef.current, true);
      setShowAiPrompt(false);
      setShowSettings(false);

      const practiced = meta?.practiceWordDetails ?? [];
      if (practiced.length > 0) {
        void (async () => {
          const store = await mutateDictionaryStore((current) => ({
            ...current,
            entries: recordPracticeUsageAfterAiGeneration(
              current.entries,
              generatedText,
              practiced
            ),
          }));
          setDictionaryEntries(store.entries);
        })();
      }

      void persistReadingSession();
    },
    [
      cancelPlayback,
      handleTextChange,
      persistReadingSession,
      syncSentencesFromTextAsync,
    ]
  );

  const dismissPracticeTextInput = useCallback(() => {
    void (async () => {
      commitReadingText();
      setShowTextInput(false);
      await persistReadingSession();
    })();
  }, [commitReadingText, persistReadingSession]);

  const handleShadow = useCallback(async () => {
    const phase = shadowPhaseRef.current;

    if (phase === 'starting') {
      return;
    }

    if (phase === 'recording') {
      shadowRecordGenRef.current += 1;
      const uri = await stopShadowRecordingSession();
      releaseShadowGuard();
      setShadowPhaseSync('idle');
      await configurePlaybackAudioMode();

      if (!uri) {
        setStatus('error');
        setStatusDetail('Shadow recording failed');
        return;
      }

      playbackGenRef.current += 1;
      shadowPlayGenRef.current += 1;
      const playGen = shadowPlayGenRef.current;
      guard.cancel();
      player.cancel();

      try {
        setShadowPhaseSync('playing');
        setStatus('playing');
        setStatusDetail('Playing shadow recording…');
        const requestId = player.getNextRequestId();
        await player.play(uri, requestId, { playbackRate: 1.0 });
        if (playGen !== shadowPlayGenRef.current) {
          return;
        }

        setShadowPhaseSync('idle');

        const parts =
          sentencesRef.current.length > 0
            ? sentencesRef.current
            : syncSentencesFromText(textRef.current);
        if (parts.length === 0) {
          setStatus('idle');
          setStatusDetail('Shadow playback finished.');
          return;
        }

        const idx = Math.min(Math.max(0, sentenceIndexRef.current), parts.length - 1);
        const sentence = parts[idx] ?? '';
        const sentenceId = sentenceToMobileId(
          sentence,
          mapTtsVoiceToApi(ttsVoiceTypeRef.current)
        );
        const cachedPath = await getCachedSentenceAudio(sentenceId);

        if (!cachedPath) {
          setStatus('idle');
          setStatusDetail(
            (await isSentenceGenerated(sentenceId))
              ? 'Shadow done. Tap AI to reload this sentence.'
              : 'Shadow done. Tap AI first to hear this sentence.'
          );
          return;
        }

        await playSentence(idx, 'replay', parts);
      } catch (err) {
        if (playGen === shadowPlayGenRef.current) {
          setShadowPhaseSync('idle');
          setStatus('error');
          setStatusDetail(
            err instanceof Error ? err.message : 'Shadow playback failed'
          );
          console.error('[SHADOW] playback error:', err);
        }
      }
      return;
    }

    if (phase === 'playing') {
      cancelPlayback();
      return;
    }

    shadowRecordGenRef.current += 1;
    const recordGen = shadowRecordGenRef.current;
    setShadowPhaseSync('starting');

    setShadowHint('Allow microphone access when prompted.');
    const mic = await ensureShadowMicPermission();
    if (!mic.granted) {
      if (recordGen === shadowRecordGenRef.current) {
        setShadowPhaseSync('idle');
      }
      setShadowHint(
        mic.blocked
          ? `Microphone blocked. Open Settings → ${BRANDING.appName} → Permissions → Microphone.`
          : 'Microphone needed for Shadow. Tap SHADOW again and tap Allow on the prompt.'
      );
      return;
    }
    setShadowHint(null);

    if (recordGen !== shadowRecordGenRef.current) {
      return;
    }

    playbackGenRef.current += 1;
    player.cancel();
    if (guard.getActive() !== 'idle') {
      releaseShadowGuard();
      guard.cancel();
    }

    await disposeShadowRecordingSession();
    if (recordGen !== shadowRecordGenRef.current) {
      setShadowPhaseSync('idle');
      return;
    }

    const token = guard.tryAcquire('recording');
    if (token == null) {
      setShadowPhaseSync('idle');
      setStatus('error');
      setStatusDetail('Busy — another audio operation is active.');
      return;
    }
    shadowGuardTokenRef.current = token;

    try {
      if (recordGen !== shadowRecordGenRef.current) {
        releaseShadowGuard();
        setShadowPhaseSync('idle');
        return;
      }

      await startShadowRecording();

      if (recordGen !== shadowRecordGenRef.current) {
        await disposeShadowRecordingSession();
        releaseShadowGuard();
        setShadowPhaseSync('idle');
        return;
      }

      setShadowPhaseSync('recording');
      setShadowHint(null);
      setStatus('idle');
      setStatusDetail('Shadow recording… tap again to stop and play');
    } catch (err) {
      await disposeShadowRecordingSession();
      releaseShadowGuard();
      setShadowPhaseSync('idle');
      setStatus('error');
      setStatusDetail(err instanceof Error ? err.message : 'Shadow recording failed');
      console.error('[SHADOW] start recording error:', err);
    }
  }, [
    cancelPlayback,
    guard,
    player,
    playSentence,
    releaseShadowGuard,
    setShadowPhaseSync,
    syncSentencesFromText,
  ]);

  useEffect(() => {
    return () => {
      playbackGenRef.current += 1;
      shadowPlayGenRef.current += 1;
      shadowRecordGenRef.current += 1;
      releaseShadowGuard();
      void disposeShadowRecordingSession();
      guard.cancel();
      player.cancel();
    };
  }, [guard, player, releaseShadowGuard]);

  useEffect(() => {
    logEndurance('session_start', { platform: Platform.OS });
    const sub = AppState.addEventListener('change', (next) => {
      const previous = appStateRef.current;
      appStateRef.current = next;
      logLifecycle({
        phase: mapLifecyclePhase(next, previous),
        rawState: next,
        previousRawState: previous,
      });
      void logEnduranceSnapshot(`app_state_${next}`);

      if (shouldCleanupPlaybackOnAppState(next)) {
        clearHighlightedWord('app_background');
        void interruptForAppLifecycle(next);
        void (async () => {
          await persistReadingSession();
        })();
      }

      if (next === 'active' && previous !== 'active') {
        recoverAppActive();
      }

      if (!shouldRunIdleCacheCheckOnAppState(next)) {
        return;
      }
      void (async () => {
        const cleared = await clearSentenceCacheIfIdleExpired();
        if (cleared) {
          playbackGenRef.current += 1;
          guard.cancel();
          player.cancel();
          setStatus('idle');
          setStatusDetail('Cache cleared after idle — enter text to play again.');
        }
      })();
    });
    return () => sub.remove();
  }, [clearHighlightedWord, guard, interruptForAppLifecycle, logEnduranceSnapshot, persistReadingSession, player, recoverAppActive]);

  const total = sentences.length;
  const currentSentence =
    total > 0 ? sentences[sentenceIndex] ?? '' : 'Paste or write text to begin reading.';
  const aiBusy = status === 'fetching' || status === 'playing';
  const shadowStarting = shadowPhase === 'starting';
  const shadowRecording = shadowPhase === 'recording';
  const shadowPlaying = shadowPhase === 'playing';
  const busy = aiBusy || shadowPlaying || shadowStarting;
  const displayStatusDetail = shadowRecording
    ? 'Shadow recording… tap again to stop and play'
    : shadowHint ?? statusDetail;
  const waveformActive = aiBusy || shadowPlaying;
  const adInteractionInput = useMemo(
    () => ({
      status,
      shadowPhase,
      ocrLoading,
      wordLookupLoading,
      isGenerating: aiGenerating,
      isNavigating: navigating,
      showPracticeTextInput: showTextInput,
      showAiPrompt,
      wordLookupVisible,
      appStateActive,
      operationGuardActive: guard.getActive() !== 'idle',
    }),
    [
      status,
      shadowPhase,
      ocrLoading,
      wordLookupLoading,
      aiGenerating,
      navigating,
      showTextInput,
      showAiPrompt,
      wordLookupVisible,
      appStateActive,
      guard,
    ]
  );
  const adInteraction = useMemo(
    () => deriveAdInteractionState(adInteractionInput),
    [adInteractionInput]
  );
  const adBusyStateLog = useMemo(
    () => formatAdBusyStateLog(adInteractionInput, adInteraction),
    [adInteractionInput, adInteraction]
  );
  const showStatusHint =
    status !== 'idle' ||
    shadowRecording ||
    shadowHint != null ||
    (total > 0 && displayStatusDetail.startsWith('Ready'));
  const sentenceFade = useRef(new Animated.Value(1)).current;
  const hearPulse = useRef(new Animated.Value(1)).current;
  const micBreath = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(sentenceFade, {
        toValue: 0.55,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(sentenceFade, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [sentenceIndex, currentSentence, sentenceFade]);

  useEffect(() => {
    if (!shadowRecording) {
      micBreath.stopAnimation();
      micBreath.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(micBreath, {
          toValue: 1.035,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(micBreath, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [micBreath, shadowRecording]);

  useEffect(() => {
    if (status !== 'playing') {
      hearPulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hearPulse, {
          toValue: 0.92,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(hearPulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [status, hearPulse]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={colors.statusBar} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        <AtmosphereBackground theme={theme} />
        <Animated.View
          style={[styles.container, styles.tabletShell, { opacity: themeFade, maxWidth: contentMaxWidth }]}
        >
          <TopAmbientBar
            theme={theme}
            onMenuPress={() => setShowSettings(true)}
            onCameraPress={handleCameraPhotoPress}
            onDicPress={() => setShowDictionarySettings(true)}
            photoLoading={ocrLoading}
          />

          <Modal
            visible={showSettings}
            animationType="slide"
            transparent
            onRequestClose={() => setShowSettings(false)}
          >
            <Pressable style={styles.settingsBackdrop} onPress={() => setShowSettings(false)}>
              <Pressable
                style={[styles.settingsPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={(e) => e.stopPropagation()}
                testID={READING_TEST_IDS.settingsPanel}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={settingsScrollEnabled}
                >
                  <View style={styles.settingsHeader}>
                    <View style={styles.settingsHeaderSide} />
                    <Text
                      style={[styles.settingsHeaderCenter, { color: colors.textDim }]}
                      testID={READING_TEST_IDS.settingsVersion}
                      accessibilityLabel={formatSettingsHeaderTitle(appVersionLabel)}
                      numberOfLines={1}
                    >
                      {formatSettingsHeaderTitle(appVersionLabel)}
                    </Text>
                    <Pressable
                      style={styles.settingsHeaderSide}
                      onPress={() => setShowSettings(false)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Close"
                      testID={READING_TEST_IDS.settingsClose}
                    >
                      <Text style={[styles.settingsClose, { color: colors.textMuted }]}>✕</Text>
                    </Pressable>
                  </View>

                  <View style={styles.themeSwitcherWrap}>
                    <ThemeSwitcher
                      themeId={themeId}
                      theme={theme}
                      onSelect={setTheme}
                      disabled={busy}
                    />
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.helpLink,
                      { borderColor: colors.border, backgroundColor: colors.bg },
                      pressed && { opacity: 0.85 },
                    ]}
                    onPress={() => setShowAiLanguageModal(true)}
                    accessibilityRole="button"
                    accessibilityLabel={`Languages ${dictionaryLanguageLabel(dictionarySettings.practiceLanguage)}`}
                    testID={READING_TEST_IDS.settingsLanguages}
                  >
                    <Text style={[styles.helpLinkLabel, { color: colors.text }]}>Languages</Text>
                    <Text style={[styles.helpLinkValue, { color: colors.textMuted }]}>
                      {dictionaryLanguageLabel(dictionarySettings.practiceLanguage)}
                    </Text>
                  </Pressable>

                  <View style={styles.settingsActions}>
                    <View style={styles.settingsTopRow}>
                      <View style={styles.settingsLeftColumn}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.settingsTileCompact,
                            { borderColor: colors.border, backgroundColor: colors.bg },
                            pressed && { opacity: 0.85 },
                          ]}
                          onPress={handleWritePress}
                          accessibilityRole="button"
                          accessibilityLabel="Edit"
                          testID={READING_TEST_IDS.settingsEditText}
                        >
                          <Text style={styles.settingsTileCompactIcon}>✍️</Text>
                          <Text style={[styles.settingsTileCompactLabel, { color: colors.textMuted }]}>
                            Edit text
                          </Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            styles.settingsTileCompact,
                            { borderColor: colors.border, backgroundColor: colors.bg },
                            pressed && { opacity: 0.85 },
                            ocrLoading && { opacity: 0.6 },
                          ]}
                          onPress={handleAlbumPhotoPress}
                          disabled={ocrLoading}
                          accessibilityRole="button"
                          accessibilityLabel="Choose photo from album"
                          testID={READING_TEST_IDS.settingsAlbum}
                        >
                          {ocrLoading ? (
                            <ActivityIndicator size="small" color={colors.accent} />
                          ) : (
                            <Text style={styles.settingsTileCompactIcon}>🖼️</Text>
                          )}
                          <Text style={[styles.settingsTileCompactLabel, { color: colors.textMuted }]}>
                            {ocrLoading ? 'Reading…' : 'Album'}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            styles.settingsTileCompact,
                            { borderColor: colors.border, backgroundColor: colors.bg },
                            pressed && { opacity: 0.85 },
                            ocrLoading && { opacity: 0.6 },
                          ]}
                          onPress={handleCameraPhotoPress}
                          disabled={ocrLoading}
                          accessibilityRole="button"
                          accessibilityLabel="Take photo with camera"
                          testID={READING_TEST_IDS.settingsCamera}
                        >
                          {ocrLoading ? (
                            <ActivityIndicator size="small" color={colors.accent} />
                          ) : (
                            <Text style={styles.settingsTileCompactIcon}>📷</Text>
                          )}
                          <Text style={[styles.settingsTileCompactLabel, { color: colors.textMuted }]}>
                            {ocrLoading ? 'Reading…' : 'Camera'}
                          </Text>
                        </Pressable>
                      </View>
                      <View style={styles.settingsRightColumn}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.settingsTileCompact,
                            { borderColor: colors.border, backgroundColor: colors.bg },
                            pressed && { opacity: 0.85 },
                          ]}
                          onPress={() => {
                            openAfterSettings(() => setShowAiPrompt(true));
                          }}
                          accessibilityRole="button"
                          accessibilityLabel="AI"
                          testID={READING_TEST_IDS.settingsAi}
                        >
                          <Text style={styles.settingsTileCompactIcon}>✨</Text>
                          <Text style={[styles.settingsTileCompactLabel, { color: colors.textMuted }]}>
                            AI
                          </Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            styles.settingsTileCompact,
                            { borderColor: colors.border, backgroundColor: colors.bg },
                            pressed && { opacity: 0.85 },
                          ]}
                          onPress={() => {
                            openAfterSettings(() => setShowDictionarySettings(true));
                          }}
                          accessibilityRole="button"
                          accessibilityLabel="Dictionary"
                          testID={READING_TEST_IDS.settingsDic}
                        >
                          <Text style={styles.settingsTileCompactIcon}>📖</Text>
                          <Text style={[styles.settingsTileCompactLabel, { color: colors.textMuted }]}>
                            Dic
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>

                  <View style={styles.voiceTypeRow}>
                    {(['female', 'male'] as const).map((voice) => {
                      const selected = ttsVoiceType === voice;
                      return (
                        <Pressable
                          key={voice}
                          testID={voiceTestId(voice)}
                          style={[
                            styles.voiceTypeBtn,
                            {
                              borderColor: selected ? colors.selection.border : colors.border,
                              backgroundColor: selected ? colors.selection.bg : 'transparent',
                            },
                          ]}
                          onPress={() => {
                            setTtsVoiceType(voice);
                            ttsVoiceTypeRef.current = voice;
                            syncSentencesFromText(textRef.current);
                          }}
                        >
                          <Text
                            style={[
                              styles.voiceTypeBtnText,
                              { color: selected ? colors.selection.text : colors.text },
                            ]}
                          >
                            {voice === 'male' ? 'Male' : 'Female'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.stackedSettingBlock}>
                    <Text
                      style={[styles.aiSpeedMicroLabel, { color: colors.textMuted }]}
                      testID={READING_TEST_IDS.settingsAiSpeedLabel}
                      accessibilityRole="text"
                    >
                      {formatAiSpeedLabel(aiSpeed)}
                    </Text>
                    <SliderEndpointRow
                      value={aiSpeed}
                      min={MIN_UI_AI_SPEED}
                      max={MAX_UI_AI_SPEED}
                      mutedColor={colors.textMuted}
                      accentColor={colors.accent}
                      preset="aiSpeed"
                      labelMarginBottom={0}
                      inline
                    >
                      <SettingSlider
                        testID={READING_TEST_IDS.settingsAiSpeedSlider}
                        value={aiSpeed}
                        min={MIN_UI_AI_SPEED}
                        max={MAX_UI_AI_SPEED}
                        step={AI_SPEED_SLIDER_STEP}
                        onChange={handleAiSpeedLiveChange}
                        onDragStart={handleSliderDragStart}
                        onDragEnd={handleAiSpeedDragEnd}
                        accent={colors.slider.fill}
                        border={colors.slider.border}
                        track={colors.slider.track}
                        micro
                        bilateral
                      />
                    </SliderEndpointRow>
                  </View>

                  <View style={styles.stackedSettingBlock}>
                    <Text
                      style={[styles.textSizeHeading, { color: colors.textDim }]}
                      accessibilityRole="text"
                    >
                      TEXT SIZE · {textSize}
                    </Text>
                    <View style={styles.microSliderRow}>
                      <Text style={[styles.microEndpointAa, { color: colors.textMuted }]}>Aa</Text>
                      <View style={styles.microSliderTrack}>
                        <SettingSlider
                          value={textSize}
                          min={SETTINGS_TEXT_SIZE_MIN}
                          max={SETTINGS_TEXT_SIZE_MAX}
                          step={2}
                          onChange={handleTextSizeChange}
                          onDragStart={handleSliderDragStart}
                          onDragEnd={handleSliderDragEnd}
                          accent={colors.slider.fill}
                          border={colors.slider.border}
                          track={colors.slider.track}
                          micro
                          bilateral
                        />
                      </View>
                      <Text
                        style={[styles.microEndpointAa, styles.microEndpointAaLarge, { color: colors.textMuted }]}
                      >
                        Aa
                      </Text>
                    </View>
                  </View>
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>

          <TappableHeroSentence
            theme={theme}
            text={currentSentence}
            fontSize={textSize}
            isPlaceholder={total === 0}
            opacity={sentenceFade}
            waveformActive={waveformActive}
            onWordPress={total > 0 ? handleWordPress : undefined}
            selectedWord={highlightedWord}
          />

          {showStatusHint ? (
            <Text
              style={[
                styles.statusHint,
                { color: colors.textDim, marginHorizontal: layout.heroPadH },
              ]}
              numberOfLines={1}
              testID={READING_TEST_IDS.statusHint}
              accessibilityRole="text"
            >
              {displayStatusDetail}
            </Text>
          ) : null}

          <View
            style={[
              styles.controlsDock,
              { paddingHorizontal: layout.dockPadH },
            ]}
            testID={READING_TEST_IDS.controlsDock}
          >
            <NavPills
              theme={theme}
              backDisabled={busy || total === 0 || sentenceIndex <= 0}
              nextDisabled={busy || total === 0 || sentenceIndex >= total - 1}
              hearDisabled={
                status === 'fetching' ||
                shadowStarting ||
                shadowRecording ||
                shadowPlaying
              }
              hearLoading={aiBusy}
              hearPulse={hearPulse}
              onBack={handleBack}
              onNext={handleNext}
              onHear={() => {
                hapticLight();
                void handleHearAi();
              }}
            />
            <ActionCluster
              theme={theme}
              micBreath={micBreath}
              shadowRecording={shadowRecording}
              shadowStarting={shadowStarting}
              shadowPlaying={shadowPlaying}
              onMic={() => {
                hapticLight();
                void handleShadow();
              }}
            />
          </View>
        </Animated.View>
        <View
          style={styles.adSafeGap}
          testID={READING_TEST_IDS.adSafeGap}
          pointerEvents="none"
        />
        <AdBanner
          themeId={themeId}
          interactionSafeForAds={adInteraction.interactionSafeForAds}
          busyStateSummary={adBusyStateLog}
          safeDistanceFromControls={AD_BANNER_SAFE_DISTANCE_FROM_CONTROLS}
          backgroundColor={colors.bg}
        />
      </SafeAreaView>

      <PracticeTextModal
        visible={showTextInput}
        onClose={dismissPracticeTextInput}
        theme={theme}
        themeId={themeId}
        text={text}
        onChangeText={handleTextChange}
        onBlurCommit={commitReadingText}
        editable={!busy}
      />

      <DictionarySettingsModal
        visible={showDictionarySettings}
        onClose={() => setShowDictionarySettings(false)}
        theme={theme}
        settings={dictionarySettings}
        entries={dictionaryEntries}
        onChange={handleDictionarySettingsChange}
        onEntriesChange={handleDictionaryEntriesChange}
      />

      <AiPromptModal
        visible={showAiPrompt}
        onClose={() => setShowAiPrompt(false)}
        onGeneratingChange={setAiGenerating}
        onGenerated={handleAiGenerated}
        apiBaseUrl={API_BASE_URL}
        theme={theme}
        themeId={themeId}
        practiceWordDetails={aiPracticeBatch}
        dictionaryTargetLanguage={dictionarySettings.practiceLanguage}
        onOpenAiGenerationLanguage={() => setShowAiLanguageModal(true)}
        useDictionaryInAi={
          dictionarySettings.useDictionaryInAi && aiPracticeBatch.length > 0
        }
      />

      <AiGenerationLanguageModal
        visible={showAiLanguageModal}
        theme={theme}
        selected={dictionarySettings.practiceLanguage}
        onAccept={(code) => {
          void handleDictionarySettingsChange({
            practiceLanguage: code as DictionarySettingsV1['practiceLanguage'],
          });
        }}
        onClose={() => setShowAiLanguageModal(false)}
      />

      <WordLookupSheet
        visible={wordLookupVisible}
        theme={theme}
        displayWord={wordLookupDisplay}
        targetLanguage={dictionarySettings.translationLanguage}
        meaning={wordLookupMeaning}
        partOfSpeech={wordLookupPartOfSpeech}
        loading={wordLookupLoading}
        error={wordLookupError}
        savedToDictionary={wordLookupSaved}
        practiceUsedCount={activeWordPractice?.usedCount ?? 0}
        practiceTargetUses={activeWordPractice?.targetUses ?? 3}
        practiceStarred={activeWordPractice?.difficultyStarred ?? false}
        lookupCount={wordLookupCount}
        canToggleSave={Boolean(wordLookupMeaning) && !wordLookupLoading && !wordLookupError}
        onClose={handleWordLookupClose}
        onToggleSave={handleWordLookupToggleSave}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, backgroundColor: 'transparent' },
  tabletShell: {
    width: '100%',
    alignSelf: 'center',
  },
  themeSwitcherWrap: {
    marginBottom: 12,
    alignItems: 'center',
  },
  settingsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-start',
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  settingsPanel: {
    maxHeight: '82%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingsHeaderSide: {
    width: 32,
    alignItems: 'flex-end',
  },
  settingsHeaderCenter: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  settingsClose: { fontSize: 18, padding: 4 },
  helpLink: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    alignItems: 'center',
    gap: 4,
  },
  helpLinkLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  helpLinkValue: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  settingsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  settingsActions: {
    gap: 8,
    marginBottom: 12,
  },
  settingsTopRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  settingsLeftColumn: {
    flex: 1,
    maxWidth: 120,
    gap: 8,
  },
  settingsRightColumn: {
    flex: 1,
    maxWidth: 120,
    gap: 8,
  },
  settingsTileCompact: {
    flex: 1,
    maxWidth: 120,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  settingsTileCompactIcon: { fontSize: 14 },
  settingsTileCompactLabel: {
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  settingsTile: {
    flex: 1,
    maxWidth: 160,
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  settingsTileIcon: { fontSize: 20 },
  settingsTileLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  settingsSectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  voiceTypeRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    width: '52%',
    maxWidth: 176,
    gap: 6,
    marginBottom: 12,
  },
  voiceTypeBtn: {
    flex: 1,
    minHeight: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceTypeBtnText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  stackedSettingBlock: {
    marginBottom: 12,
  },
  aiSpeedMicroLabel: {
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 3,
  },
  textSizeHeading: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 4,
  },
  microSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  microSliderTrack: {
    flex: 1,
    minWidth: 0,
  },
  microEndpointAa: {
    fontSize: 8,
    fontWeight: '600',
    width: 14,
    textAlign: 'center',
  },
  microEndpointAaLarge: {
    fontSize: 11,
  },
  textSizeLabels: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },
  fontSizePreviewLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 8,
  },
  fontSizePreview: {
    textAlign: 'center',
    marginBottom: 8,
  },
  fontSizePreviewNote: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 15,
  },
  textInputWrap: { marginBottom: 12 },
  textInputLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  textInputCard: {
    position: 'relative',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  textInputClose: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 2,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInputCloseLabel: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 22,
  },
  textInput: {
    minHeight: 108,
    maxHeight: 148,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 16,
    paddingRight: 44,
    fontSize: 17,
    lineHeight: 24,
    textAlignVertical: 'top',
    backgroundColor: 'transparent',
    ...Platform.select({ android: { includeFontPadding: true } }),
  },
  statusHint: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: space.xs,
    letterSpacing: 0.2,
    zIndex: 6,
  },
  controlsDock: {
    paddingTop: space.xs,
    paddingBottom: 0,
    gap: space.lg,
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 8,
    width: '100%',
  },
  adSafeGap: {
    height: Math.max(AD_SAFE_GAP_DP, AD_BANNER_SAFE_DISTANCE_FROM_CONTROLS),
    width: '100%',
  },
});
