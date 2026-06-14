/**
 * Reading session persistence — text, read unit, and sentence position (AsyncStorage).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const READING_SESSION_KEY = '@zaban/reading_session_v1';
const LEGACY_PROGRESS_V2_KEY = '@zaban/reading_progress_v2';
const LEGACY_PROGRESS_V1_KEY = '@zaban/reading_progress_v1';

/** Max stored text length (chars) — avoids AsyncStorage pressure on huge pastes. */
export const MAX_READING_TEXT_CHARS = 500_000;

export type ReadingSessionReadUnit =
  | '1/4'
  | '1/2'
  | '3/4'
  | '1'
  | '2'
  | '3'
  | '4'
  | '1p'
  | '2p'
  | 'page';

export interface ReadingSessionV1 {
  version: 1;
  text: string;
  readUnit: ReadingSessionReadUnit;
  sentenceIndex: number;
  sentenceId: string | null;
  aiSpeed: number;
  ttsVoiceType?: 'male' | 'female';
  savedAt: number;
}

const READ_UNITS: ReadingSessionReadUnit[] = [
  '1/4',
  '1/2',
  '3/4',
  '1',
  '2',
  '3',
  '4',
  '1p',
  '2p',
  'page',
];

export function isReadingSessionReadUnit(value: unknown): value is ReadingSessionReadUnit {
  return typeof value === 'string' && (READ_UNITS as string[]).includes(value);
}

/** Only clear persisted session when both text and active sentences are empty. */
export function shouldClearReadingSession(text: string, activeSentenceCount: number): boolean {
  return text.trim().length === 0 && activeSentenceCount === 0;
}

/**
 * When React text state is empty but sentence chunks still exist (commit/persist race),
 * rebuild persistable text from chunks so force-stop does not lose the session.
 */
export function deriveReadingTextForPersist(text: string, sentences: string[]): string {
  const trimmed = text.trim();
  if (trimmed) {
    return text;
  }
  if (sentences.length === 0) {
    return '';
  }
  return sentences.join(' ');
}

function normalizeText(text: string): string {
  if (text.length <= MAX_READING_TEXT_CHARS) {
    return text;
  }
  console.warn(
    `[ReadingSession] text truncated from ${text.length} to ${MAX_READING_TEXT_CHARS} chars`
  );
  return text.slice(0, MAX_READING_TEXT_CHARS);
}

function parseSession(raw: string): ReadingSessionV1 | null {
  try {
    const data = JSON.parse(raw) as Partial<ReadingSessionV1>;
    if (data.version !== 1) {
      console.warn('[ReadingSession] parse rejected: wrong version');
      return null;
    }
    if (typeof data.text !== 'string' || !data.text.trim()) {
      console.warn('[ReadingSession] parse rejected: empty text');
      return null;
    }
    if (!isReadingSessionReadUnit(data.readUnit)) {
      console.warn('[ReadingSession] parse rejected: invalid readUnit');
      return null;
    }
    const sentenceIndex =
      typeof data.sentenceIndex === 'number' && Number.isFinite(data.sentenceIndex)
        ? Math.max(0, Math.floor(data.sentenceIndex))
        : 0;
    const sentenceId =
      typeof data.sentenceId === 'string' && data.sentenceId.length > 0
        ? data.sentenceId
        : null;
    const aiSpeed =
      typeof data.aiSpeed === 'number' && data.aiSpeed > 0 && Number.isFinite(data.aiSpeed)
        ? data.aiSpeed
        : 1.0;
    const ttsVoiceType =
      data.ttsVoiceType === 'male' || data.ttsVoiceType === 'female'
        ? data.ttsVoiceType
        : undefined;
    const savedAt =
      typeof data.savedAt === 'number' && Number.isFinite(data.savedAt)
        ? data.savedAt
        : Date.now();

    return {
      version: 1,
      text: normalizeText(data.text),
      readUnit: data.readUnit,
      sentenceIndex,
      sentenceId,
      aiSpeed,
      ttsVoiceType,
      savedAt,
    };
  } catch {
    return null;
  }
}

async function removeLegacyProgressKeys(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(LEGACY_PROGRESS_V1_KEY),
    AsyncStorage.removeItem(LEGACY_PROGRESS_V2_KEY),
  ]).catch(() => {});
}

/**
 * Pick restored sentence index: clamp, then match sentenceId if possible.
 */
export function resolveRestoredSentenceIndex(
  sentences: string[],
  savedIndex: number,
  savedSentenceId: string | null,
  sentenceToId: (sentence: string) => string
): number {
  if (sentences.length === 0) {
    return 0;
  }

  const clamped = Math.min(Math.max(0, savedIndex), sentences.length - 1);

  if (!savedSentenceId) {
    return clamped;
  }

  const atClamped = sentences[clamped];
  if (atClamped && sentenceToId(atClamped) === savedSentenceId) {
    return clamped;
  }

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    if (s && sentenceToId(s) === savedSentenceId) {
      console.log(`[ReadingSession] restore id match at index=${i} (saved was ${savedIndex})`);
      return i;
    }
  }

  console.log(
    `[ReadingSession] restore id mismatch — using clamped index=${clamped} (saved was ${savedIndex})`
  );
  return clamped;
}

export async function loadReadingSession(): Promise<ReadingSessionV1 | null> {
  try {
    const raw = await AsyncStorage.getItem(READING_SESSION_KEY);
    if (raw) {
      const session = parseSession(raw);
      if (session) {
        console.log(
          `[ReadingSession] load ok index=${session.sentenceIndex} unit=${session.readUnit} len=${session.text.length}`
        );
        return session;
      }
      console.warn(`[ReadingSession] corrupt session — clearing (rawLen=${raw.length})`);
      await AsyncStorage.removeItem(READING_SESSION_KEY);
    } else {
      console.log('[ReadingSession] load empty (no key)');
    }

    await removeLegacyProgressKeys();
    return null;
  } catch (err) {
    console.warn('[ReadingSession] load failed', err);
    return null;
  }
}

export async function saveReadingSession(session: ReadingSessionV1): Promise<void> {
  const trimmed = session.text.trim();
  if (!trimmed) {
    await clearReadingSession();
    return;
  }

  const payload: ReadingSessionV1 = {
    version: 1,
    text: normalizeText(session.text),
    readUnit: session.readUnit,
    sentenceIndex: Math.max(0, Math.floor(session.sentenceIndex)),
    sentenceId: session.sentenceId,
    aiSpeed: session.aiSpeed > 0 ? session.aiSpeed : 1.0,
    ttsVoiceType:
      session.ttsVoiceType === 'male' || session.ttsVoiceType === 'female'
        ? session.ttsVoiceType
        : undefined,
    savedAt: session.savedAt || Date.now(),
  };

  try {
    const serialized = JSON.stringify(payload);
    await AsyncStorage.setItem(READING_SESSION_KEY, serialized);
    const verify = await AsyncStorage.getItem(READING_SESSION_KEY);
    if (!verify) {
      console.warn('[ReadingSession] save verify failed: key missing after setItem');
    } else if (verify.length !== serialized.length) {
      console.warn(
        `[ReadingSession] save verify length mismatch wrote=${serialized.length} read=${verify.length}`
      );
    }
    console.log(
      `[ReadingSession] save index=${payload.sentenceIndex} unit=${payload.readUnit} len=${payload.text.length}`
    );
    await removeLegacyProgressKeys();
  } catch (err) {
    console.warn('[ReadingSession] save failed', err);
  }
}

export async function clearReadingSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(READING_SESSION_KEY);
    console.log('[ReadingSession] cleared (empty text)');
  } catch {
    /* ignore */
  }
}
