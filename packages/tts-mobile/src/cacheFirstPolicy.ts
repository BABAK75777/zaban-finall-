/**
 * Cache-first network policy for play sources (Step D).
 */

export type PlaySource = 'hear' | 'replay' | 'nav';

/**
 * Allow POST /tts when there is no cached file for this sentence.
 * Cache HIT → always local playback (all sources).
 * Generated lock → never re-fetch (hear/replay/nav).
 * Cache MISS → hear and nav may fetch once; replay never fetches.
 */
export function allowNetworkForSource(
  source: PlaySource,
  cachedPath: string | null,
  sentenceGenerated = false
): boolean {
  if (cachedPath != null) return false;
  if (sentenceGenerated) return false;
  if (source === 'replay') return false;
  return true;
}
