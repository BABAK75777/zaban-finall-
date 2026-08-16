import { splitIntoSentences } from '@zaban/tts-mobile';

/** Stay under backend POST /tts limit (5000) with margin for encoding. */
export const MAX_TTS_CHUNK_CHARS = 4500;

/** Warn once when pasted text exceeds this size. */
export const LARGE_TEXT_WARN_CHARS = 100_000;

/** Build chunks on a background turn when input exceeds this. */
export const ASYNC_CHUNKING_THRESHOLD = 8_000;

/** Max sentence IDs to hash/prune in one sync (avoids UI freeze). */
export const MAX_CACHE_PRUNE_IDS = 120;

import { REQUEST_TIMEOUT_MS } from './requestTimeouts';

export { REQUEST_TIMEOUT_MS };

export type ReadUnit = '1/4' | '1/2' | '3/4' | '1' | '2' | '3' | '4' | '1p' | '2p' | 'page';

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

function splitByWords(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const out: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) out.push(current);
    if (word.length > maxChars) {
      for (let i = 0; i < word.length; i += maxChars) {
        out.push(word.slice(i, i + maxChars));
      }
      current = '';
    } else {
      current = word;
    }
  }
  if (current) out.push(current);
  return out.filter((c) => c.trim());
}

/** Split a single chunk that exceeds TTS limits at sentence/word boundaries. */
export function splitOversizedForTts(text: string, maxChars = MAX_TTS_CHUNK_CHARS): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxChars) return [trimmed];

  const sentences = splitIntoSentences(trimmed);
  const result: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      if (current) {
        result.push(current);
        current = '';
      }
      result.push(...splitByWords(sentence, maxChars));
      continue;
    }
    const combined = current ? `${current} ${sentence}` : sentence;
    if (combined.length <= maxChars) {
      current = combined;
    } else {
      if (current) result.push(current);
      current = sentence;
    }
  }
  if (current) result.push(current);
  return result.filter((c) => c.trim());
}

export function applyTtsSafeChunkLimits(
  chunks: string[],
  maxChars = MAX_TTS_CHUNK_CHARS
): string[] {
  const out: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length <= maxChars) {
      out.push(chunk);
    } else {
      out.push(...splitOversizedForTts(chunk, maxChars));
    }
  }
  return out.filter((c) => c.trim());
}

/** Read-unit chunking without TTS size cap (used internally). */
export function createUnitReadingChunks(text: string, unit: ReadUnit): string[] {
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
      result = splitIntoSentences(trimmed);
      break;
    case '1':
    default:
      result = splitIntoSentences(trimmed);
  }

  return result.filter((r) => r.trim());
}

export function createSafeReadingChunks(text: string, unit: ReadUnit): string[] {
  const trimmed = text.trim();
  if (__DEV__) {
    console.log(`[LONG_TEXT] inputLength=${trimmed.length}`);
  }
  const unitChunks = createUnitReadingChunks(trimmed, unit);
  const safe = applyTtsSafeChunkLimits(unitChunks);
  if (__DEV__) {
    console.log(`[LONG_TEXT] chunksCreated=${safe.length}`);
  }
  return safe;
}

export function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

export async function createSafeReadingChunksAsync(
  text: string,
  unit: ReadUnit
): Promise<string[]> {
  if (text.trim().length < ASYNC_CHUNKING_THRESHOLD) {
    return createSafeReadingChunks(text, unit);
  }
  await yieldToUi();
  const chunks = createSafeReadingChunks(text, unit);
  await yieldToUi();
  return chunks;
}

export function selectCacheKeepIds(
  chunks: string[],
  centerIndex: number,
  toId: (chunk: string) => string
): string[] {
  if (chunks.length <= MAX_CACHE_PRUNE_IDS) {
    return chunks.map(toId);
  }
  const half = Math.floor(MAX_CACHE_PRUNE_IDS / 2);
  const start = Math.max(0, centerIndex - half);
  const end = Math.min(chunks.length, start + MAX_CACHE_PRUNE_IDS);
  const sliceStart = Math.max(0, end - MAX_CACHE_PRUNE_IDS);
  return chunks.slice(sliceStart, end).map(toId);
}

export function truncateForTtsRequest(text: string, maxChars = MAX_TTS_CHUNK_CHARS): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  console.log(`[LONG_TEXT] chunkFailed index=current reason=oversized len=${trimmed.length}`);
  return splitOversizedForTts(trimmed, maxChars)[0] ?? trimmed.slice(0, maxChars);
}

export function shouldWarnLargeText(charCount: number): boolean {
  return charCount > LARGE_TEXT_WARN_CHARS;
}

export function formatLongTextStatus(index: number, total: number): string {
  return `Ready — ${index + 1} of ${total}.`;
}
