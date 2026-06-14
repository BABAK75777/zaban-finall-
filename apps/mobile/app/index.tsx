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
import { HeroSentence } from '../src/ui/HeroSentence';
import { NavPills } from '../src/ui/NavPills';
import { AiPromptModal, type AiVoiceType } from '../src/ui/AiPromptModal';
import { SettingSlider } from '../src/ui/SettingSlider';
import { TopAmbientBar } from '../src/ui/TopAmbientBar';
import { space } from '../src/ui/spacing';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  'https://zaban-api-875817275251.europe-west1.run.app';

const DEFAULT_TTS_VOICE: AiVoiceType = 'female';
const DEFAULT_AI_SPEED = 1.0;
const DEFAULT_TEXT_SIZE = 40;
const DEFAULT_READ_UNIT = '1' as const;
type ReadUnit = '1/4' | '1/2' | '3/4' | '1' | '2' | '3' | '4' | '1p' | '2p' | 'page';

const READ_UNIT_ROWS: { label: string; value: ReadUnit }[][] = [
  [
    { label: '1/4', value: '1/4' },
    { label: '1/2', value: '1/2' },
    { label: '3/4', value: '3/4' },
  ],
  [
    { label: '1 line', value: '1' },
    { label: '2 lines', value: '2' },
    { label: '3 lines', value: '3' },
    { label: '4 lines', value: '4' },
  ],
  [
    { label: '1 paragraph', value: '1p' },
    { label: '2 paragraphs', value: '2p' },
    { label: 'Page', value: 'page' },
  ],
];

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

type ShadowPhase = 'idle' | 'recording' | 'playing';

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
/** Cache id is text-only; playback speed is applied client-side (see MobileAudioPlayer). */

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
function sentenceToMobileId(sentence: string, voiceApi: string): string {
  const normalized = sentence.trim().replace(/\s+/g, ' ').replace(/\n+/g, '\n');
  const key = `${normalized}|${HASH_SOURCE}|${voiceApi}|default|1.0|0|mp3|24000`;
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
  const { themeId, theme, setTheme, resetTheme } = useTheme();
  const [aiSpeed, setAiSpeed] = useState(DEFAULT_AI_SPEED);
  const [ttsVoiceType, setTtsVoiceType] = useState<AiVoiceType>(DEFAULT_TTS_VOICE);
  const [textSize, setTextSize] = useState(DEFAULT_TEXT_SIZE);
  const [readUnit, setReadUnit] = useState<ReadUnit>(DEFAULT_READ_UNIT);
  const [shadowPhase, setShadowPhase] = useState<ShadowPhase>('idle');
  const [shadowHint, setShadowHint] = useState<string | null>(null);
  const [settingsScrollEnabled, setSettingsScrollEnabled] = useState(true);

  const [player] = useState(() => new MobileAudioPlayer());
  const [guard] = useState(() => new OperationGuard());
  const playbackGenRef = useRef(0);
  const inFlightFetchRef = useRef(new InFlightTtsFetch<Uint8Array>());
  const shadowRecordingRef = useRef<Audio.Recording | null>(null);
  const shadowGuardTokenRef = useRef<number | null>(null);
  const shadowPlayGenRef = useRef(0);
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
    safeSetPlaybackRate(player, aiSpeed);
  }, [aiSpeed, player]);

  useEffect(() => {
    if (showSettings && status === 'playing') {
      safeSetPlaybackRate(player, aiSpeedRef.current);
      console.log(
        '[TTS:Mobile] speed_reapply_on_settings_open rate=',
        aiSpeedRef.current,
        'playerRate=',
        safeGetPlaybackRate(player, aiSpeedRef.current)
      );
    }
  }, [showSettings, status, player]);

  useEffect(() => {
    readUnitRef.current = readUnit;
  }, [readUnit]);

  const handleSliderDragStart = useCallback(() => {
    setSettingsScrollEnabled(false);
  }, []);

  const handleSliderDragEnd = useCallback(() => {
    setSettingsScrollEnabled(true);
  }, []);

  const handleAiSpeedChange = useCallback(
    (next: number) => {
      setAiSpeed(next);
      aiSpeedRef.current = next;
      safeSetPlaybackRate(player, next);
      if (status === 'playing') {
        console.log(
          '[TTS:Mobile] speed_change_during_playback rate=',
          next,
          'playerRate=',
          safeGetPlaybackRate(player, next)
        );
      }
    },
    [player, status]
  );

  const colors = theme;
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
        sentenceToMobileId(sentence, mapTtsVoiceToApi(ttsVoiceTypeRef.current))
      ),
    []
  );

  const fetchTtsAudio = useCallback(async (sentenceId: string, sentence: string): Promise<Uint8Array> => {
    if (inFlightFetchRef.current.hasInFlight(sentenceId)) {
      console.log('[TTS:Mobile] duplicate fetch blocked sentenceId=', sentenceId);
    }
    return inFlightFetchRef.current.getOrFetch(sentenceId, async () => {
      const response = await fetch(`${API_BASE_URL}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sentence,
          voice: mapTtsVoiceToApi(ttsVoiceTypeRef.current),
          speed: 1.0,
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

  const stopShadowRecording = useCallback(async () => {
    const rec = shadowRecordingRef.current;
    shadowRecordingRef.current = null;
    if (!rec) {
      return null;
    }
    try {
      await rec.stopAndUnloadAsync();
      return rec.getURI();
    } catch (err) {
      console.error('[SHADOW] stop recording error:', err);
      return null;
    }
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
    releaseShadowGuard();
    guard.cancel();
    player.cancel();
    void (async () => {
      if (shadowRecordingRef.current) {
        try {
          await shadowRecordingRef.current.stopAndUnloadAsync();
        } catch {
          /* ignore */
        }
        shadowRecordingRef.current = null;
      }
      setShadowPhase('idle');
    })();
    setStatus('stopped');
    setStatusDetail('Stopped.');
    if (shouldTouchLastActivityOn('playback_stop')) {
      void touchLastActivityAt().catch(() => {});
    }
  }, [guard, player, releaseShadowGuard]);

  const syncSentencesFromText = useCallback((raw: string, unit: ReadUnit = readUnitRef.current) => {
    const parts = createReadingChunks(raw, unit);
    setSentences(parts);
    setSentenceIndex((idx) => {
      const next = parts.length === 0 ? 0 : Math.min(idx, parts.length - 1);
      sentenceIndexRef.current = next;
      return next;
    });
    if (parts.length > 0) {
      console.log(
        '[TTS:Mobile] text_ready sentences=',
        parts.length,
        'textLen=',
        raw.trim().length
      );
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
        await player.play(resolved.audioPath, requestId);

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
    const nextId = sentenceToMobileId(nextSentence, mapTtsVoiceToApi(ttsVoiceTypeRef.current));
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
    const prevId = sentenceToMobileId(prevSentence, mapTtsVoiceToApi(ttsVoiceTypeRef.current));
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

  const handleReadUnitChange = useCallback(
    (unit: ReadUnit) => {
      setReadUnit(unit);
      readUnitRef.current = unit;
      syncSentencesFromText(textRef.current, unit);
      setSentenceIndex(0);
      sentenceIndexRef.current = 0;
      void (async () => {
        await persistReadingSession();
      })();
    },
    [persistReadingSession, syncSentencesFromText]
  );

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

  const handleAiGenerated = useCallback(
    (generatedText: string) => {
      handleTextChange(generatedText);
      commitReadingText();
      setShowAiPrompt(false);
      setShowSettings(false);
      void persistReadingSession();
    },
    [commitReadingText, handleTextChange, persistReadingSession]
  );

  const dismissPracticeTextInput = useCallback(() => {
    void (async () => {
      commitReadingText();
      setShowTextInput(false);
      await persistReadingSession();
    })();
  }, [commitReadingText, persistReadingSession]);

  const handleShadow = useCallback(async () => {
    if (shadowPhase === 'recording') {
      const uri = await stopShadowRecording();
      releaseShadowGuard();
      setShadowPhase('idle');
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
        setShadowPhase('playing');
        setStatus('playing');
        setStatusDetail('Playing shadow recording…');
        const requestId = player.getNextRequestId();
        await player.play(uri, requestId, { playbackRate: 1.0 });
        if (playGen !== shadowPlayGenRef.current) {
          return;
        }

        setShadowPhase('idle');

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
        safeSetPlaybackRate(player, aiSpeedRef.current);
        await playSentence(idx, 'hear', parts);
      } catch (err) {
        if (playGen === shadowPlayGenRef.current) {
          setShadowPhase('idle');
          setStatus('error');
          setStatusDetail(
            err instanceof Error ? err.message : 'Shadow playback failed'
          );
          console.error('[SHADOW] playback error:', err);
        }
      }
      return;
    }

    if (shadowPhase === 'playing') {
      cancelPlayback();
      return;
    }

    setShadowHint('Allow microphone access when prompted.');
    const mic = await ensureShadowMicPermission();
    if (!mic.granted) {
      setShadowHint(
        mic.blocked
          ? 'Microphone blocked. Open Settings → Zaban TTS → Permissions → Microphone.'
          : 'Microphone needed for Shadow. Tap SHADOW again and tap Allow on the prompt.'
      );
      return;
    }
    setShadowHint(null);

    playbackGenRef.current += 1;
    guard.cancel();
    player.cancel();

    const token = guard.tryAcquire('recording');
    if (token == null) {
      setStatus('error');
      setStatusDetail('Busy — another audio operation is active.');
      return;
    }
    shadowGuardTokenRef.current = token;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      shadowRecordingRef.current = recording;
      setShadowPhase('recording');
      setShadowHint(null);
      setStatus('idle');
      setStatusDetail('Shadow recording… tap again to stop and play');
    } catch (err) {
      releaseShadowGuard();
      shadowRecordingRef.current = null;
      setShadowPhase('idle');
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
    shadowPhase,
    stopShadowRecording,
    syncSentencesFromText,
  ]);

  useEffect(() => {
    return () => {
      playbackGenRef.current += 1;
      shadowPlayGenRef.current += 1;
      releaseShadowGuard();
      void stopShadowRecording();
      guard.cancel();
      player.cancel();
    };
  }, [guard, player, releaseShadowGuard, stopShadowRecording]);

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
  const shadowRecording = shadowPhase === 'recording';
  const shadowPlaying = shadowPhase === 'playing';
  const busy = aiBusy || shadowPlaying;
  const displayStatusDetail = shadowRecording
    ? 'Shadow recording… tap again to stop and play'
    : shadowHint ?? statusDetail;
  const waveformActive = aiBusy || shadowPlaying;
  const showStatusHint =
    status !== 'idle' || shadowRecording || shadowHint != null;
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
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <AtmosphereBackground theme={theme} />
        <Animated.View style={[styles.container, { opacity: themeFade }]}>
          <TopAmbientBar theme={theme} onMenuPress={() => setShowSettings(true)} />

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
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={settingsScrollEnabled}
                >
                  <View style={styles.settingsHeader}>
                    <Text style={[styles.settingsTitle, { color: colors.textDim }]}>Settings</Text>
                    <Pressable onPress={() => setShowSettings(false)} hitSlop={8}>
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

                  <View style={styles.settingsGrid}>
                    {(
                      [
                        {
                          key: 'write',
                          label: 'Edit text',
                          icon: '✍️',
                          a11y: 'Edit',
                          onPress: handleWritePress,
                        },
                        {
                          key: 'ai',
                          label: 'AI',
                          icon: '✨',
                          a11y: 'AI',
                          onPress: () => {
                            setShowSettings(false);
                            setShowAiPrompt(true);
                          },
                        },
                      ] as const
                    ).map((item) => (
                      <Pressable
                        key={item.key}
                        style={({ pressed }) => [
                          styles.settingsTile,
                          { borderColor: colors.border, backgroundColor: colors.bg },
                          pressed && { opacity: 0.85 },
                        ]}
                        onPress={item.onPress}
                        disabled={'disabled' in item ? Boolean(item.disabled) : false}
                        accessibilityRole="button"
                        accessibilityLabel={item.a11y}
                      >
                        <Text style={styles.settingsTileIcon}>{item.icon}</Text>
                        <Text style={[styles.settingsTileLabel, { color: colors.textMuted }]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.readUnitRows}>
                    {READ_UNIT_ROWS.map((row, rowIndex) => (
                      <View key={`read-unit-row-${rowIndex}`} style={styles.readUnitRow}>
                        {row.map((unit) => {
                          const selected = readUnit === unit.value;
                          return (
                            <Pressable
                              key={unit.value}
                              style={[
                                styles.readUnitBtn,
                                {
                                  borderColor: selected ? colors.accent : colors.border,
                                  backgroundColor: selected ? colors.accent : 'transparent',
                                },
                              ]}
                              onPress={() => handleReadUnitChange(unit.value)}
                            >
                              <Text
                                style={[
                                  styles.readUnitBtnText,
                                  { color: selected ? '#FFFFFF' : colors.text },
                                ]}
                                numberOfLines={2}
                              >
                                {unit.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ))}
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
                          style={[
                            styles.voiceTypeBtn,
                            {
                              borderColor: selected ? colors.accent : colors.border,
                              backgroundColor: selected ? colors.accent : 'transparent',
                            },
                          ]}
                          onPress={() => {
                            setTtsVoiceType(voice);
                            ttsVoiceTypeRef.current = voice;
                          }}
                        >
                          <Text
                            style={[
                              styles.voiceTypeBtnText,
                              { color: selected ? '#FFFFFF' : colors.text },
                            ]}
                          >
                            {voice === 'male' ? 'Male' : 'Female'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[styles.settingsSectionLabel, { color: colors.textDim }]}>
                    AI SPEED: {aiSpeed.toFixed(1)}x
                  </Text>
                  <SettingSlider
                    value={aiSpeed}
                    min={0.5}
                    max={1.5}
                    step={0.1}
                    onChange={handleAiSpeedChange}
                    onDragStart={handleSliderDragStart}
                    onDragEnd={handleSliderDragEnd}
                    accent={colors.accent}
                    border={colors.border}
                    track={colors.accentSoft}
                  />

                  <View style={styles.textSizeHeader}>
                    <Text style={[styles.settingsSectionLabel, { color: colors.textDim, marginBottom: 0 }]}>
                      Text size: {textSize}
                    </Text>
                    <View style={styles.textSizeLabels}>
                      <Text style={{ color: colors.textMuted, fontSize: 14 }}>Aa</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 22 }}>Aa</Text>
                    </View>
                  </View>
                  <SettingSlider
                    value={textSize}
                    min={22}
                    max={48}
                    step={2}
                    onChange={setTextSize}
                    onDragStart={handleSliderDragStart}
                    onDragEnd={handleSliderDragEnd}
                    accent={colors.accent}
                    border={colors.border}
                    track={colors.accentSoft}
                  />
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>

          <AiPromptModal
            visible={showAiPrompt}
            onClose={() => setShowAiPrompt(false)}
            onGenerated={handleAiGenerated}
            apiBaseUrl={API_BASE_URL}
            theme={theme}
            themeId={themeId}
          />

          {showTextInput ? (
            <View style={styles.textInputWrap}>
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
                />
              </View>
            </View>
          ) : null}

          <HeroSentence
            theme={theme}
            text={currentSentence}
            fontSize={textSize}
            isPlaceholder={total === 0}
            opacity={sentenceFade}
            waveformActive={waveformActive}
          />

          {total > 0 ? (
            <Text
              style={[styles.sentenceProgress, { color: colors.textDim }]}
              accessibilityLabel="Sentence progress"
            >
              {sentenceIndex + 1} / {total}
            </Text>
          ) : null}

          {showStatusHint ? (
            <Text style={[styles.statusHint, { color: colors.textDim }]} numberOfLines={1}>
              {displayStatusDetail}
            </Text>
          ) : null}

          <View style={styles.controlsDock}>
            <ActionCluster
              theme={theme}
              micBreath={micBreath}
              hearPulse={hearPulse}
              shadowRecording={shadowRecording}
              shadowPlaying={shadowPlaying}
              busy={busy}
              hearDisabled={
                status === 'fetching' || shadowRecording || shadowPlaying
              }
              hearLoading={aiBusy}
              onMic={() => {
                hapticLight();
                void handleShadow();
              }}
              onHear={() => {
                hapticLight();
                void handleHearAi();
              }}
            />
            <NavPills
              theme={theme}
              backDisabled={busy || total === 0 || sentenceIndex <= 0}
              nextDisabled={busy || total === 0 || sentenceIndex >= total - 1}
              onBack={handleBack}
              onNext={handleNext}
            />
          </View>
        </Animated.View>
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
  readUnitRows: { gap: 8, marginBottom: 14 },
  readUnitRow: { flexDirection: 'row', gap: 6, alignItems: 'stretch' },
  readUnitBtn: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readUnitBtnText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 13,
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
  textSizeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
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
  textInputWrap: { marginHorizontal: 20, marginBottom: 12 },
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
  sentenceProgress: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 2,
    marginHorizontal: space.heroPadH,
  },
  statusHint: {
    textAlign: 'center',
    fontSize: 12,
    marginHorizontal: space.heroPadH,
    marginBottom: space.xs,
    letterSpacing: 0.2,
    zIndex: 6,
  },
  controlsDock: {
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.md,
    gap: space.lg,
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 8,
    width: '100%',
  },
});
