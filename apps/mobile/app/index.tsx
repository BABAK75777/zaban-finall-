/**
 * Mobile Reading screen — thin UI wiring to @zaban/tts-mobile (sentence cache + playback).
 */

import Constants from 'expo-constants';
import { Audio } from 'expo-av';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
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
  splitIntoSentences,
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
import { AdBanner } from '../src/components/AdBanner';
import { TappableHeroSentence } from '../src/ui/TappableHeroSentence';
import { DictionarySettingsModal } from '../src/ui/DictionarySettingsModal';
import { WordLookupSheet } from '../src/ui/WordLookupSheet';
import { NavPills } from '../src/ui/NavPills';
import { AiPromptModal, type AiVoiceType } from '../src/ui/AiPromptModal';
import { SettingSlider } from '../src/ui/SettingSlider';
import { SliderEndpointRow } from '../src/ui/SliderEndpointRow';
import { TopAmbientBar } from '../src/ui/TopAmbientBar';
import { useResponsiveLayoutMetrics } from '../src/ui/responsiveLayout';
import { READING_TEST_IDS, voiceTestId } from '../src/ui/testIds';
import { space } from '../src/ui/spacing';
import {
  disposeShadowRecording as disposeShadowRecordingSession,
  startShadowRecording,
  stopShadowRecording as stopShadowRecordingSession,
} from '../src/audio/shadowRecordingSession';

import { API_BASE_URL } from '../src/config/apiBaseUrl';
import {
  defaultDictionarySettings,
  findDictionaryEntry,
  getPracticeWordsForAi,
  hashReadingText,
  incrementLookupCount,
  loadDictionaryStore,
  recordWordInReadingText,
  removeDictionaryEntry,
  removePracticeWordsUsedInAiText,
  requestWordLookup,
  saveDictionaryStore,
  updateDictionarySettings,
  upsertDictionaryEntry,
  type DictionaryEntry,
  type DictionarySettingsV1,
} from '../src/dictionary';
import { requestOcrFromImageDataUrl } from '../src/ocr/ocrApi';

const DEFAULT_TTS_VOICE: AiVoiceType = 'female';
const DEFAULT_AI_SPEED = 1.0;
const DEFAULT_TEXT_SIZE = 40;
const DEFAULT_READ_UNIT = '1' as const;
type ReadUnit = '1/4' | '1/2' | '3/4' | '1' | '2' | '3' | '4' | '1p' | '2p' | 'page';

function splitHalfSentence(sentence: string): string[] {
  const midPoint = sentence.indexOf(',', Math.floor(sentence.length / 3));
  if (midPoint !== -1 && midPoint < sentence.length * 0.7) {
    return [sentence.slice(0, midPoint + 1).trim(), sentence.slice(midPoint + 1).trim()];
  }
  const words = sentence.split(/\s+/);
  if (words.length <= 1) return [sentence];
  const half = Math.ceil(words.length / 2);
  return [words.slice(0, half).join(' '), words.slice(half).join(' ')];
}

function splitSentenceFraction(sentence: string, parts: number, take: number): string[] {
  const words = sentence.split(/\s+/).filter(Boolean);
  if (words.length <= 1 || parts <= 1) return [sentence];
  if (take >= parts) return [sentence];
  const chunkSize = Math.max(1, Math.ceil(words.length / parts));
  const result: string[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    result.push(words.slice(i, i + chunkSize).join(' '));
  }
  if (take === 1) return result;
  const merged: string[] = [];
  for (let i = 0; i < result.length; i += take) {
    merged.push(result.slice(i, i + take).join(' '));
  }
  return merged.filter(Boolean);
}

function createReadingChunks(text: string, unit: ReadUnit): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  let result: string[] = [];
  switch (unit) {
    case '1/4':
      splitIntoSentences(trimmed).forEach((s) => {
        result.push(...splitSentenceFraction(s, 4, 1));
      });
      break;
    case '1/2':
      splitIntoSentences(trimmed).forEach((s) => {
        result.push(...splitHalfSentence(s));
      });
      break;
    case '3/4':
      splitIntoSentences(trimmed).forEach((s) => {
        const words = s.split(/\s+/).filter(Boolean);
        if (words.length <= 1) {
          result.push(s);
        } else {
          const end = Math.max(1, Math.ceil(words.length * 0.75));
          result.push(words.slice(0, end).join(' '));
        }
      });
      break;
    case '2':
    case '3':
    case '4': {
      const n = parseInt(unit, 10);
      const sentences = splitIntoSentences(trimmed);
      for (let i = 0; i < sentences.length; i += n) {
        result.push(sentences.slice(i, i + n).join(' '));
      }
      break;
    }
    case '1p':
    case '2p': {
      const pn = unit === '1p' ? 1 : 2;
      const paragraphs = trimmed.split(/\n\s*\n/).filter((p) => p.trim());
      for (let i = 0; i < paragraphs.length; i += pn) {
        result.push(paragraphs.slice(i, i + pn).join('\n\n'));
      }
      break;
    }
    case 'page':
      result = [trimmed];
      break;
    case '1':
    default:
      result = splitIntoSentences(trimmed);
  }

  return result.filter((r) => r.trim());
}

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
/** Cache id includes voice + TTS speed so audio is generated at the learner's pace (not stretched client-side). */

function formatTtsSpeed(speed: number): string {
  const clamped = Math.max(0.5, Math.min(1.5, speed));
  return (Math.round(clamped * 10) / 10).toFixed(1);
}

type PlaybackRateCapable = {
  setPlaybackRate?: (rate: number) => void;
  getPlaybackRate?: () => number;
};

/** Never crash if player lacks rate control (CHAT2 / stale bundles). */
function safeSetPlaybackRate(player: PlaybackRateCapable | null | undefined, rate: number): void {
  if (player == null) {
    console.log('[PlaybackRate] unavailable');
    return;
  }
  try {
    const setter = player.setPlaybackRate;
    if (typeof setter !== 'function') {
      console.log('[PlaybackRate] unavailable');
      return;
    }
    setter.call(player, rate);
  } catch {
    console.log('[PlaybackRate] unavailable');
  }
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
function sentenceToMobileId(sentence: string, voiceApi: string, speed = 1.0): string {
  const normalized = sentence.trim().replace(/\s+/g, ' ').replace(/\n+/g, '\n');
  const speedKey = formatTtsSpeed(speed);
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
  const [text, setText] = useState('');
  const [sentences, setSentences] = useState<string[]>([]);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [status, setStatus] = useState<UiStatus>('idle');
  const [statusDetail, setStatusDetail] = useState('Paste or write text to begin.');
  const [showTextInput, setShowTextInput] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [showDictionarySettings, setShowDictionarySettings] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const { themeId, theme, setTheme, resetTheme } = useTheme();
  const [aiSpeed, setAiSpeed] = useState(DEFAULT_AI_SPEED);
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
  const [settingsScrollEnabled, setSettingsScrollEnabled] = useState(true);
  const [dictionarySettings, setDictionarySettings] = useState<DictionarySettingsV1>(
    defaultDictionarySettings()
  );
  const [dictionaryEntries, setDictionaryEntries] = useState<DictionaryEntry[]>([]);
  const dictionaryEntriesRef = useRef<DictionaryEntry[]>([]);
  const aiPracticeWords = useMemo(
    () => getPracticeWordsForAi(dictionaryEntries),
    [dictionaryEntries]
  );
  const [wordLookupVisible, setWordLookupVisible] = useState(false);
  const [wordLookupLoading, setWordLookupLoading] = useState(false);
  const [wordLookupError, setWordLookupError] = useState<string | null>(null);
  const [wordLookupMeaning, setWordLookupMeaning] = useState<string | null>(null);
  const [wordLookupPartOfSpeech, setWordLookupPartOfSpeech] = useState<string | null>(null);
  const [wordLookupDisplay, setWordLookupDisplay] = useState('');
  const [wordLookupKey, setWordLookupKey] = useState<string | null>(null);
  const [wordLookupSaved, setWordLookupSaved] = useState(false);
  const [wordLookupAppearanceCount, setWordLookupAppearanceCount] = useState(1);
  const [wordLookupCount, setWordLookupCount] = useState(1);
  const wordLookupGenRef = useRef(0);
  const readingTextHashRef = useRef<string | null>(null);

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
  }, [aiSpeed]);

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
    readingTextHashRef.current = textHash;

    void (async () => {
      const store = await loadDictionaryStore();
      const nextEntries = recordWordInReadingText(store.entries, fullText, textHash);
      if (nextEntries !== store.entries) {
        await saveDictionaryStore({ ...store, entries: nextEntries });
        setDictionaryEntries(nextEntries);
      }
    })();
  }, [text]);

  const handleSliderDragStart = useCallback(() => {
    setSettingsScrollEnabled(false);
  }, []);

  const handleSliderDragEnd = useCallback(() => {
    setSettingsScrollEnabled(true);
  }, []);

  const handleAiSpeedChange = useCallback((next: number) => {
    setAiSpeed(next);
    aiSpeedRef.current = next;
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
      Promise.resolve(
        sentenceToMobileId(
          sentence,
          mapTtsVoiceToApi(ttsVoiceTypeRef.current),
          aiSpeedRef.current
        )
      ),
    []
  );

  const fetchTtsAudio = useCallback(async (sentenceId: string, sentence: string): Promise<Uint8Array> => {
    if (inFlightFetchRef.current.hasInFlight(sentenceId)) {
      console.log('[TTS:Mobile] duplicate fetch blocked sentenceId=', sentenceId);
    }
    const ttsSpeed = formatTtsSpeed(aiSpeedRef.current);
    return inFlightFetchRef.current.getOrFetch(sentenceId, async () => {
      const response = await fetch(`${API_BASE_URL}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sentence,
          voice: mapTtsVoiceToApi(ttsVoiceTypeRef.current),
          speed: Number(ttsSpeed),
        }),
      });
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

  const syncSentencesFromText = useCallback(
    (raw: string, unit: ReadUnit = readUnitRef.current, forceResetIndex = false) => {
      const parts = createReadingChunks(raw, unit);
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
      const speed = aiSpeedRef.current;
      const keepIds = parts.map((s) => sentenceToMobileId(s, voice, speed));
      void pruneSentenceCacheToKeepIds(keepIds).catch((err) => {
        console.error('[TTS:Mobile] prune cache after text sync failed:', err);
      });
      console.log(
        '[TTS:Mobile] text_ready sentences=',
        parts.length,
        'textLen=',
        raw.trim().length
      );
      setStatusDetail(`Ready — 1 of ${parts.length}.`);
    } else {
      setStatusDetail('Paste or write text to begin.');
    }
    return parts;
  }, []);

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
      parts = persistText.trim() ? createReadingChunks(persistText, unit) : [];
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
      ? sentenceToMobileId(sentence, mapTtsVoiceToApi(ttsVoiceTypeRef.current), aiSpeedRef.current)
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
          setAiSpeed(session.aiSpeed);
          aiSpeedRef.current = session.aiSpeed;
        }
        if (session.ttsVoiceType === 'male' || session.ttsVoiceType === 'female') {
          setTtsVoiceType(session.ttsVoiceType);
          ttsVoiceTypeRef.current = session.ttsVoiceType;
        }
        const restoredVoice =
          session.ttsVoiceType === 'male' || session.ttsVoiceType === 'female'
            ? session.ttsVoiceType
            : DEFAULT_TTS_VOICE;
        const parts = createReadingChunks(session.text, unit);
        setSentences(parts);
        const idx = resolveRestoredSentenceIndex(
          parts,
          session.sentenceIndex,
          session.sentenceId,
          (s) =>
            sentenceToMobileId(
              s,
              mapTtsVoiceToApi(restoredVoice),
              session.aiSpeed > 0 ? session.aiSpeed : DEFAULT_AI_SPEED
            )
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
        const parts = createReadingChunks(seed, DEFAULT_READ_UNIT);
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
    textRef.current = raw;
    setText(raw);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      commitReadingText();
      if (sessionHydratedRef.current) {
        void persistReadingSession();
      }
    }, 300);
    return () => clearTimeout(id);
  }, [text, readUnit, commitReadingText, persistReadingSession]);

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
        setSentenceIndex(index);
        setStatus('fetching');
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
        const requestId = player.getNextRequestId();
        await player.play(resolved.audioPath, requestId, { playbackRate: 1.0 });

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
          setStatusDetail(source === 'replay' ? 'Replay failed' : msg);
          console.error('[TTS:Mobile] playSentence error:', err);
        }
      } finally {
        guard.release(token, 'ai_playback');
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
    const nextSentence = parts[next] ?? '';
    const nextId = sentenceToMobileId(
      nextSentence,
      mapTtsVoiceToApi(ttsVoiceTypeRef.current),
      aiSpeedRef.current
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
    await persistReadingSession();
    await playSentence(next, 'nav', parts);
  }, [cancelPlayback, persistReadingSession, playSentence, sentenceIndex, sentences, syncSentencesFromText]);

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
    const prevSentence = parts[prev] ?? '';
    const prevId = sentenceToMobileId(
      prevSentence,
      mapTtsVoiceToApi(ttsVoiceTypeRef.current),
      aiSpeedRef.current
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
    await persistReadingSession();
    await playSentence(prev, 'nav', parts);
  }, [cancelPlayback, persistReadingSession, playSentence, sentenceIndex, sentences, syncSentencesFromText]);

  /** Internal defaults reset — not exposed in settings UI. */
  const resetSettings = useCallback(() => {
    resetTheme();
    setAiSpeed(DEFAULT_AI_SPEED);
    setTtsVoiceType(DEFAULT_TTS_VOICE);
    setTextSize(DEFAULT_TEXT_SIZE);
    setReadUnit(DEFAULT_READ_UNIT);
    readUnitRef.current = DEFAULT_READ_UNIT;
    aiSpeedRef.current = DEFAULT_AI_SPEED;
    ttsVoiceTypeRef.current = DEFAULT_TTS_VOICE;
    syncSentencesFromText(textRef.current, DEFAULT_READ_UNIT);
    setSentenceIndex(0);
    setStatusDetail('Settings reset to defaults.');
  }, [resetTheme, syncSentencesFromText]);

  const handleWritePress = useCallback(() => {
    setShowSettings(false);
    setShowTextInput(true);
  }, []);

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
    })();
  }, []);

  const handleDictionaryEntriesChange = useCallback((entries: DictionaryEntry[]) => {
    void (async () => {
      const store = await loadDictionaryStore();
      await saveDictionaryStore({ ...store, entries });
      setDictionaryEntries(entries);
    })();
  }, []);

  const handlePhotoOcr = useCallback(
    async (source: 'library' | 'camera') => {
      if (ocrLoading) return;

      const permission =
        source === 'library'
          ? await ImagePicker.requestMediaLibraryPermissionsAsync()
          : await ImagePicker.requestCameraPermissionsAsync();
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
            })
          : await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.85,
              base64: true,
            });
      if (result.canceled || !result.assets[0]?.base64) return;

      const asset = result.assets[0];
      const mime = asset.mimeType ?? 'image/jpeg';
      const dataUrl = `data:${mime};base64,${asset.base64}`;

      setOcrLoading(true);
      try {
        const extracted = await requestOcrFromImageDataUrl(dataUrl);
        setShowSettings(false);
        handleTextChange(extracted);
        syncSentencesFromText(extracted, readUnitRef.current, true);
        setStatus('idle');
        setStatusDetail('Text loaded from photo.');
        void persistReadingSession();
      } catch (err) {
        Alert.alert(
          'Photo read failed',
          err instanceof Error ? err.message : 'Could not read text from this image.'
        );
      } finally {
        setOcrLoading(false);
      }
    },
    [handleTextChange, ocrLoading, persistReadingSession, syncSentencesFromText]
  );

  const handlePhotoOcrFromAlbum = useCallback(
    () => void handlePhotoOcr('library'),
    [handlePhotoOcr]
  );

  const handlePhotoOcrFromCamera = useCallback(
    () => void handlePhotoOcr('camera'),
    [handlePhotoOcr]
  );

  const handleWordPress = useCallback(
    (lookup: string, displayWord: string) => {
      if (!lookup || sentencesRef.current.length === 0) return;

      const targetLanguage = dictionarySettings.translationLanguage;
      const existing = findDictionaryEntry(dictionaryEntriesRef.current, lookup, targetLanguage);
      const context =
        sentencesRef.current[sentenceIndexRef.current] ?? sentencesRef.current[0] ?? '';

      setWordLookupKey(lookup);
      setWordLookupDisplay(displayWord);
      setWordLookupVisible(true);
      setWordLookupLoading(true);
      setWordLookupError(null);
      setWordLookupMeaning(existing?.meaning ?? null);
      setWordLookupPartOfSpeech(existing?.partOfSpeech ?? null);
      setWordLookupSaved(Boolean(existing));
      setWordLookupAppearanceCount(existing?.textAppearanceCount ?? 1);
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

          setWordLookupMeaning(result.meaning);
          setWordLookupPartOfSpeech(result.partOfSpeech ?? null);
          setWordLookupLoading(false);
          setWordLookupError(null);

          if (existing) {
            const store = await loadDictionaryStore();
            const nextEntries = incrementLookupCount(store.entries, lookup, targetLanguage);
            await saveDictionaryStore({ ...store, entries: nextEntries });
            setDictionaryEntries(nextEntries);
            const touched = findDictionaryEntry(nextEntries, lookup, targetLanguage);
            setWordLookupCount(touched?.lookupCount ?? existing.lookupCount + 1);
            setWordLookupAppearanceCount(
              touched?.textAppearanceCount ?? existing.textAppearanceCount
            );
          }
        } catch (err) {
          if (wordLookupGenRef.current !== lookupGen) return;
          setWordLookupLoading(false);
          setWordLookupError(err instanceof Error ? err.message : 'Lookup failed.');
        }
      })();
    },
    [dictionarySettings.translationLanguage]
  );

  const handleWordLookupToggleSave = useCallback(() => {
    if (!wordLookupKey || !wordLookupMeaning || wordLookupLoading) return;

    void (async () => {
      const targetLanguage = dictionarySettings.translationLanguage;
      const store = await loadDictionaryStore();

      if (wordLookupSaved) {
        const nextEntries = removeDictionaryEntry(store.entries, wordLookupKey, targetLanguage);
        await saveDictionaryStore({ ...store, entries: nextEntries });
        setDictionaryEntries(nextEntries);
        setWordLookupSaved(false);
        return;
      }

      const textHash = hashReadingText(textRef.current);
      const withAppearance = recordWordInReadingText(store.entries, textRef.current, textHash);
      const nextEntries = upsertDictionaryEntry(withAppearance, {
        displayWord: wordLookupDisplay,
        meaning: wordLookupMeaning,
        partOfSpeech: wordLookupPartOfSpeech ?? undefined,
        targetLanguage,
        textAppearanceCount:
          findDictionaryEntry(withAppearance, wordLookupKey, targetLanguage)?.textAppearanceCount ?? 1,
      });
      const saved = findDictionaryEntry(nextEntries, wordLookupKey, targetLanguage);
      await saveDictionaryStore({ ...store, entries: nextEntries });
      setDictionaryEntries(nextEntries);
      setWordLookupSaved(true);
      setWordLookupCount(saved?.lookupCount ?? 1);
      setWordLookupAppearanceCount(saved?.textAppearanceCount ?? 1);
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
    (generatedText: string, meta?: { practiceWords?: string[] }) => {
      cancelPlayback();
      handleTextChange(generatedText);
      syncSentencesFromText(generatedText, readUnitRef.current, true);
      setShowAiPrompt(false);
      setShowSettings(false);

      const practiced = meta?.practiceWords ?? [];
      if (practiced.length > 0) {
        const nextEntries = removePracticeWordsUsedInAiText(
          dictionaryEntriesRef.current,
          generatedText,
          practiced
        );
        if (nextEntries.length !== dictionaryEntriesRef.current.length) {
          handleDictionaryEntriesChange(nextEntries);
        }
      }

      void persistReadingSession();
    },
    [
      cancelPlayback,
      handleDictionaryEntriesChange,
      handleTextChange,
      persistReadingSession,
      syncSentencesFromText,
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
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

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
          mapTtsVoiceToApi(ttsVoiceTypeRef.current),
          aiSpeedRef.current
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
          ? 'Microphone blocked. Open Settings → Zaban TTS → Permissions → Microphone.'
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

      if (next === 'background' || next === 'inactive') {
        void (async () => {
          await persistReadingSession();
        })();
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
  }, [guard, logEnduranceSnapshot, persistReadingSession, player]);

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
    const duration = shadowRecording ? 700 : 2200;
    const peak = shadowRecording ? 1.035 : 1.022;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(micBreath, {
          toValue: peak,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(micBreath, {
          toValue: 1,
          duration,
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
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <AtmosphereBackground theme={theme} />
        <Animated.View style={[styles.container, { opacity: themeFade }]}>
          <TopAmbientBar
            theme={theme}
            onMenuPress={() => setShowSettings(true)}
            onAlbumPress={handlePhotoOcrFromAlbum}
            onCameraPress={handlePhotoOcrFromCamera}
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
                    <Text style={[styles.settingsTitle, { color: colors.textDim }]}>Settings</Text>
                    <Pressable
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
                          onPress={handlePhotoOcrFromAlbum}
                          disabled={ocrLoading}
                          accessibilityRole="button"
                          accessibilityLabel="Choose photo from album"
                          testID={READING_TEST_IDS.settingsAlbum}
                        >
                          <Text style={styles.settingsTileCompactIcon}>🖼️</Text>
                          <Text style={[styles.settingsTileCompactLabel, { color: colors.textMuted }]}>
                            Album
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
                            setShowSettings(false);
                            setShowAiPrompt(true);
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
                            ocrLoading && { opacity: 0.6 },
                          ]}
                          onPress={handlePhotoOcrFromCamera}
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
                    </View>
                    <View style={styles.settingsDicRow}>
                      <Pressable
                          style={({ pressed }) => [
                            styles.settingsTileCompact,
                            { borderColor: colors.border, backgroundColor: colors.bg },
                            pressed && { opacity: 0.85 },
                          ]}
                          onPress={() => setShowDictionarySettings(true)}
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

                  <Text style={[styles.settingsSectionLabel, { color: colors.textDim }]}>
                    Voice type
                  </Text>
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

                  <View style={styles.inlineSettingRow}>
                    <Text
                      style={[styles.settingsSectionLabel, styles.inlineSettingLabel, { color: colors.textDim }]}
                    >
                      AI SPEED: {aiSpeed.toFixed(1)}x
                    </Text>
                    <View style={styles.inlineSettingControl}>
                      <SliderEndpointRow
                        value={aiSpeed}
                        min={0.5}
                        max={1.5}
                        mutedColor={colors.textMuted}
                        accentColor={colors.accent}
                        preset="aiSpeed"
                        labelMarginBottom={0}
                        inline
                      >
                        <SettingSlider
                          value={aiSpeed}
                          min={0.5}
                          max={1.5}
                          step={0.1}
                          onChange={handleAiSpeedChange}
                          onDragStart={handleSliderDragStart}
                          onDragEnd={handleSliderDragEnd}
                          accent={colors.slider.fill}
                          border={colors.slider.border}
                          track={colors.slider.track}
                          compact
                          bilateral
                        />
                      </SliderEndpointRow>
                    </View>
                  </View>

                  <View style={styles.inlineSettingRow}>
                    <Text
                      style={[styles.settingsSectionLabel, styles.inlineSettingLabel, { color: colors.textDim }]}
                    >
                      Text size: {textSize}
                    </Text>
                    <View style={styles.inlineSettingControl}>
                      <View style={styles.inlineTextSizeSlider}>
                        <Text style={[styles.sliderEndpointLabel, { color: colors.textMuted }]}>Aa</Text>
                        <View style={styles.inlineSliderTrack}>
                          <SettingSlider
                            value={textSize}
                            min={22}
                            max={48}
                            step={2}
                            onChange={setTextSize}
                            onDragStart={handleSliderDragStart}
                            onDragEnd={handleSliderDragEnd}
                            accent={colors.slider.fill}
                            border={colors.slider.border}
                            track={colors.slider.track}
                            compact
                            bilateral
                          />
                        </View>
                        <Text style={[styles.sliderEndpointLabel, { color: colors.textMuted, fontSize: 15 }]}>
                          Aa
                        </Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>

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
            onGenerated={handleAiGenerated}
            apiBaseUrl={API_BASE_URL}
            theme={theme}
            themeId={themeId}
            practiceWords={aiPracticeWords}
            useDictionaryInAi={
              dictionarySettings.useDictionaryInAi && aiPracticeWords.length > 0
            }
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
            textAppearanceCount={wordLookupAppearanceCount}
            lookupCount={wordLookupCount}
            canToggleSave={Boolean(wordLookupMeaning) && !wordLookupLoading && !wordLookupError}
            onClose={() => setWordLookupVisible(false)}
            onToggleSave={handleWordLookupToggleSave}
          />

          {showTextInput ? (
            <View style={[styles.textInputWrap, { marginHorizontal: layout.textInputMarginH }]} testID={READING_TEST_IDS.practiceText}>
              <Text style={[styles.textInputLabel, { color: colors.textDim }]}>Practice text</Text>
              <View
                style={[
                  styles.textInputCard,
                  { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                ]}
              >
                <Pressable
                  onPress={dismissPracticeTextInput}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Close practice text"
                  testID={READING_TEST_IDS.practiceTextClose}
                  style={({ pressed }) => [
                    styles.textInputClose,
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Text style={[styles.textInputCloseLabel, { color: colors.textMuted }]}>✕</Text>
                </Pressable>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: colors.inputText,
                    },
                  ]}
                  multiline
                  placeholder="Paste reading text…"
                  placeholderTextColor={colors.inputPlaceholder}
                  cursorColor={colors.inputText}
                  selectionColor={colors.accentSoft}
                  keyboardAppearance={themeId === 'light' || themeId === 'cream' ? 'light' : 'dark'}
                  underlineColorAndroid="transparent"
                  value={text}
                  onChangeText={handleTextChange}
                  editable={!busy}
                  onBlur={() => commitReadingText()}
                  testID={READING_TEST_IDS.practiceTextInput}
                />
              </View>
            </View>
          ) : null}

          <TappableHeroSentence
            theme={theme}
            text={currentSentence}
            fontSize={textSize}
            isPlaceholder={total === 0}
            opacity={sentenceFade}
            waveformActive={waveformActive}
            onWordPress={total > 0 ? handleWordPress : undefined}
            selectedWord={wordLookupKey}
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
        <AdBanner backgroundColor={colors.bg} />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, backgroundColor: 'transparent' },
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingsTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  settingsClose: { fontSize: 18, padding: 4 },
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
  settingsDicRow: {
    alignItems: 'center',
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
    marginBottom: 10,
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
  inlineSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  inlineSettingLabel: {
    width: 92,
    marginBottom: 0,
    flexShrink: 0,
  },
  inlineSettingControl: {
    flex: 1,
    minWidth: 0,
  },
  inlineTextSizeSlider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineSliderTrack: {
    flex: 1,
    minWidth: 0,
  },
  sliderEndpointLabel: {
    fontSize: 11,
    fontWeight: '600',
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
    paddingBottom: space.md,
    gap: space.lg,
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 8,
    width: '100%',
  },
});
