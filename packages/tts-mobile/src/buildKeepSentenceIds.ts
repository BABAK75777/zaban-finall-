import {
  getRetentionWindowSize,
  type SentenceCacheSplitMode,
} from './sentenceAudioCache';

/**
 * Sentence IDs to retain in cache for the active reading window (Step E).
 */
export async function buildKeepSentenceIds(
  sentenceIndex: number,
  sentences: string[],
  splitMode: SentenceCacheSplitMode,
  sentenceToId: (sentence: string) => Promise<string>
): Promise<string[]> {
  const windowSize = getRetentionWindowSize(splitMode);
  const start = Math.max(0, sentenceIndex - windowSize + 1);
  const ids: string[] = [];
  for (let i = start; i <= sentenceIndex; i++) {
    const sentence = sentences[i];
    if (sentence) {
      ids.push(await sentenceToId(sentence));
    }
  }
  return ids;
}
