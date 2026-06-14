/**
 * Sentence-level audio cache: files on disk, metadata in AsyncStorage only.
 * Active reading: bounded retention via setActiveSentenceRing(keepSentenceIds).
 * Idle: clearSentenceCacheIfIdleExpired clears all after CACHE_IDLE_TTL_MS.
 */

export type SentenceCacheSplitMode = 'full' | 'half' | 'quarter' | 'eighth';

/** Sentence-level retention window from splitMode (playback unchanged; eviction only). */
export function getRetentionWindowSize(splitMode: SentenceCacheSplitMode): number {
  switch (splitMode) {
    case 'half':
    case 'quarter':
    case 'eighth':
      return 3;
    case 'full':
    default:
      return 2;
  }
}

import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logRingCleanup } from './enduranceDiagnostics';

const AUDIO_DIR = `${FileSystem.documentDirectory}tts_sentences/`;
const META_KEY = '@zaban/sentence_audio_cache_v1';
const LAST_ACTIVITY_KEY = '@zaban/sentence_cache_last_activity';

/** Clear sentence audio cache after this much idle time (ms). */
export const CACHE_IDLE_TTL_MS = 10 * 60 * 1000;

export interface SentenceCacheEntry {
  sentenceId: string;
  audioPath: string;
  hash: string;
  durationMsEstimate?: number;
  createdAt: number;
}

interface CacheIndex {
  entries: Record<string, SentenceCacheEntry>;
  currentSentenceId: string | null;
  previousSentenceId: string | null;
  /** Locked after successful cache write — no second POST /tts for this sentenceId. */
  generatedIds?: Record<string, number>;
}

function generatedIdsOf(index: CacheIndex): Record<string, number> {
  if (!index.generatedIds) {
    index.generatedIds = {};
  }
  return index.generatedIds;
}

/** True if this sentenceId already had a successful network fetch + cache write. */
export async function isSentenceGenerated(sentenceId: string): Promise<boolean> {
  const index = await loadIndex();
  return Object.prototype.hasOwnProperty.call(generatedIdsOf(index), sentenceId);
}

async function markSentenceGenerated(sentenceId: string): Promise<void> {
  const index = await loadIndex();
  generatedIdsOf(index)[sentenceId] = Date.now();
  await saveIndex(index);
  console.log(`[SentenceCache] locked sentenceId=${sentenceId} (generated, no re-fetch)`);
}

async function ensureAudioDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(AUDIO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
  }
}

async function loadIndex(): Promise<CacheIndex> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    if (!raw) {
      return { entries: {}, currentSentenceId: null, previousSentenceId: null };
    }
    return JSON.parse(raw) as CacheIndex;
  } catch {
    return { entries: {}, currentSentenceId: null, previousSentenceId: null };
  }
}

async function saveIndex(index: CacheIndex): Promise<void> {
  await AsyncStorage.setItem(META_KEY, JSON.stringify(index));
}

function audioPathFor(sentenceId: string): string {
  return `${AUDIO_DIR}${sentenceId}.mp3`;
}

export async function getCachedSentenceAudio(sentenceId: string): Promise<string | null> {
  const index = await loadIndex();
  const locked = Object.prototype.hasOwnProperty.call(generatedIdsOf(index), sentenceId);
  const entry = index.entries[sentenceId];
  if (!entry?.audioPath) {
    if (locked) {
      console.error(`[SentenceCache] cache missing for locked sentenceId=${sentenceId}`);
    }
    return null;
  }

  const info = await FileSystem.getInfoAsync(entry.audioPath);
  if (!info.exists) {
    delete index.entries[sentenceId];
    await saveIndex(index);
    if (locked) {
      console.error(
        `[SentenceCache] cache file missing for locked sentenceId=${sentenceId} path=${entry.audioPath}`
      );
    }
    return null;
  }
  return entry.audioPath;
}

export async function putCachedSentenceAudio(
  sentenceId: string,
  hash: string,
  audioBytes: Uint8Array,
  durationMsEstimate?: number
): Promise<string> {
  await ensureAudioDir();
  const path = audioPathFor(sentenceId);

  let binary = '';
  for (let i = 0; i < audioBytes.length; i++) {
    binary += String.fromCharCode(audioBytes[i]);
  }
  const base64 = btoa(binary);

  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const index = await loadIndex();
  index.entries[sentenceId] = {
    sentenceId,
    audioPath: path,
    hash,
    durationMsEstimate,
    createdAt: Date.now(),
  };
  await saveIndex(index);
  await markSentenceGenerated(sentenceId);
  console.log(`[SentenceCache] stored sentenceId=${sentenceId} path=${path}`);
  return path;
}

/**
 * Evict cached audio outside keepSentenceIds. Retain entries in the keep set.
 */
export async function setActiveSentenceRing(
  keepSentenceIds: string[],
  playingPath: string | null = null
): Promise<{ evictedCount: number }> {
  const index = await loadIndex();
  const keep = new Set(keepSentenceIds);

  let evictedCount = 0;
  const evictedSentenceIds: string[] = [];
  for (const [id, entry] of Object.entries(index.entries)) {
    if (keep.has(id)) continue;
    if (playingPath && entry.audioPath === playingPath) {
      console.log(`[SentenceCache] skip delete in-use path=${entry.audioPath}`);
      continue;
    }
    await FileSystem.deleteAsync(entry.audioPath, { idempotent: true }).catch(() => {});
    delete index.entries[id];
    if (Object.prototype.hasOwnProperty.call(generatedIdsOf(index), id)) {
      delete generatedIdsOf(index)[id];
      console.log(`[SentenceCache] unlocked sentenceId=${id} reason=ring_eviction`);
    }
    evictedCount += 1;
    evictedSentenceIds.push(id);
    console.log(`[SentenceCache] evicted sentenceId=${id}`);
  }

  index.currentSentenceId = keepSentenceIds[keepSentenceIds.length - 1] ?? null;
  index.previousSentenceId =
    keepSentenceIds.length >= 2 ? keepSentenceIds[keepSentenceIds.length - 2] : null;
  await saveIndex(index);
  const retainedSentenceIds = Object.keys(index.entries);
  console.log(
    `[SentenceCache] ring updated current=${index.currentSentenceId} previous=${index.previousSentenceId ?? 'none'} evictedCount=${evictedCount} entryCount=${retainedSentenceIds.length}`
  );
  logRingCleanup({
    evictedCount,
    retainedCount: retainedSentenceIds.length,
    retainedSentenceIds,
    evictedSentenceIds,
  });
  return { evictedCount };
}

export async function getSentenceCacheStats(): Promise<{
  entryCount: number;
  fileCount: number;
  currentSentenceId: string | null;
  previousSentenceId: string | null;
}> {
  const index = await loadIndex();
  const entryCount = Object.keys(index.entries).length;
  let fileCount = 0;
  try {
    const info = await FileSystem.getInfoAsync(AUDIO_DIR);
    if (info.exists) {
      const names = await FileSystem.readDirectoryAsync(AUDIO_DIR);
      fileCount = names.filter((n) => n.endsWith('.mp3')).length;
    }
  } catch {
    fileCount = entryCount;
  }
  return {
    entryCount,
    fileCount,
    currentSentenceId: index.currentSentenceId,
    previousSentenceId: index.previousSentenceId,
  };
}

/**
 * Last user/cache activity time (metadata only — not audio).
 */
export async function touchLastActivityAt(now: number = Date.now()): Promise<void> {
  await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(now));
}

export async function getLastActivityAt(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
    if (raw == null || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/**
 * If idle longer than CACHE_IDLE_TTL_MS, clear sentence cache (files + index metadata).
 * @returns true if cache was cleared
 */
export async function clearSentenceCacheIfIdleExpired(
  now: number = Date.now()
): Promise<boolean> {
  const last = await getLastActivityAt();
  if (last == null) return false;
  if (now - last <= CACHE_IDLE_TTL_MS) return false;

  console.log('[SentenceCache] idle TTL expired — clearing cache');
  await clearSentenceCache();
  await AsyncStorage.removeItem(LAST_ACTIVITY_KEY);
  console.log('[SentenceCache] cleared after 10 minutes inactive');
  return true;
}

export async function clearSentenceCache(): Promise<void> {
  await AsyncStorage.removeItem(META_KEY);
  await FileSystem.deleteAsync(AUDIO_DIR, { idempotent: true }).catch(() => {});
  await ensureAudioDir();
}
