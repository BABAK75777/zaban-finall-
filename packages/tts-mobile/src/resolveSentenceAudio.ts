/**
 * Resolve sentence audio path: cache first, optional network fetch on miss.
 * Callers set allowNetwork from cacheFirstPolicy / allowNetworkForPlay.
 */

import { logReplaySource, replayAudioSource } from './enduranceDiagnostics';

export interface ResolveSentenceAudioDeps {
  getCached: (sentenceId: string) => Promise<string | null>;
  fetchAudio: () => Promise<Uint8Array>;
  putCached: (sentenceId: string, hash: string, bytes: Uint8Array) => Promise<string>;
}

export interface ResolveSentenceAudioResult {
  audioPath: string;
  fromCache: boolean;
}

export async function resolveSentenceAudio(
  sentenceId: string,
  deps: ResolveSentenceAudioDeps,
  options: { allowNetwork: boolean; trigger?: 'hear' | 'replay' | 'nav' }
): Promise<ResolveSentenceAudioResult | null> {
  const cached = await deps.getCached(sentenceId);
  if (cached) {
    const result = { audioPath: cached, fromCache: true };
    if (options.trigger) {
      logReplaySource({
        sentenceId,
        trigger: options.trigger,
        audioSource: replayAudioSource(result, options.allowNetwork),
        allowNetwork: options.allowNetwork,
      });
    }
    return result;
  }

  console.log(
    `[SentenceCache] cache MISS sentenceId=${sentenceId} allowNetwork=${options.allowNetwork}`
  );

  if (!options.allowNetwork) {
    if (options.trigger) {
      logReplaySource({
        sentenceId,
        trigger: options.trigger,
        audioSource: 'none',
        allowNetwork: options.allowNetwork,
      });
    }
    return null;
  }

  const bytes = await deps.fetchAudio();
  const audioPath = await deps.putCached(sentenceId, sentenceId, bytes);
  const result = { audioPath, fromCache: false };
  if (options.trigger) {
    logReplaySource({
      sentenceId,
      trigger: options.trigger,
      audioSource: replayAudioSource(result, options.allowNetwork),
      allowNetwork: options.allowNetwork,
    });
  }
  return result;
}
