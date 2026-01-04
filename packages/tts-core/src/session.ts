/**
 * Session metadata types and utilities
 */

export interface SessionMetadata {
  sessionKey: string;
  sessionId?: string;
  createdAt: number;
  updatedAt: number;
  totalChunks: number;
  lastPlayedIndex: number;
  chunkHashes: string[];
  title?: string;
  voiceId?: string;
  speed?: number;
  format?: string;
  fullText?: string;
}

export interface ChunkMetadata {
  hash: string;
  format: 'wav' | 'mp3' | 'ogg';
  voiceId: string;
  speed: number;
  pitch?: number;
  createdAt: number;
  sizeBytes: number;
}

/**
 * Create a new session metadata object
 */
export function createSessionMetadata(
  sessionKey: string,
  totalChunks: number,
  chunkHashes: string[],
  options?: {
    sessionId?: string;
    title?: string;
    voiceId?: string;
    speed?: number;
    format?: string;
    fullText?: string;
  }
): SessionMetadata {
  return {
    sessionKey,
    sessionId: options?.sessionId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    totalChunks,
    lastPlayedIndex: 0,
    chunkHashes,
    title: options?.title,
    voiceId: options?.voiceId,
    speed: options?.speed,
    format: options?.format,
    fullText: options?.fullText,
  };
}

/**
 * Update session's last played index
 */
export function updateSessionLastPlayed(
  session: SessionMetadata,
  lastPlayedIndex: number
): SessionMetadata {
  return {
    ...session,
    lastPlayedIndex,
    updatedAt: Date.now(),
  };
}

