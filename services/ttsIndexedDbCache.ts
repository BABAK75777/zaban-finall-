/**
 * TTS IndexedDB Cache - Persistent storage for TTS chunks and sessions
 * 
 * Features:
 * - Persistent chunk storage (survives page refresh)
 * - Session tracking for resume functionality
 * - LRU eviction policy
 * - Cache statistics and management
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'tts_cache';
const DB_VERSION = 1;

// Database schema
interface TTSChunk {
  hash: string;
  format: 'wav' | 'mp3' | 'ogg';
  voiceId: string;
  speed: number;
  pitch?: number;
  createdAt: number;
  sizeBytes: number;
  audioBlob: Blob;
}

interface TTSSession {
  sessionKey: string;
  createdAt: number;
  updatedAt: number;
  totalChunks: number;
  lastPlayedIndex: number;
  chunkHashes: string[];
  title?: string;
  voiceId?: string;
  preset?: string;
  speed?: number;
  pitch?: number;
  format?: string;
  sampleRate?: number;
  fullText?: string; // Optional: store full text for resume (can be large)
}

interface TTSCacheDB extends DBSchema {
  ttsChunks: {
    key: string; // chunkHash
    value: TTSChunk;
    indexes: { 'by-createdAt': number };
  };
  ttsSessions: {
    key: string; // sessionKey
    value: TTSSession;
    indexes: { 'by-updatedAt': number };
  };
}

// Normalize text for consistent hashing (same as textChunker)
function normalize(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n');
}

// Compute SHA1 hash (browser-compatible)
async function sha1Hash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Open database connection
let dbPromise: Promise<IDBPDatabase<TTSCacheDB>> | null = null;

function getDB(): Promise<IDBPDatabase<TTSCacheDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TTSCacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create chunks store
        if (!db.objectStoreNames.contains('ttsChunks')) {
          const chunkStore = db.createObjectStore('ttsChunks', { keyPath: 'hash' });
          chunkStore.createIndex('by-createdAt', 'createdAt');
        }

        // Create sessions store
        if (!db.objectStoreNames.contains('ttsSessions')) {
          const sessionStore = db.createObjectStore('ttsSessions', { keyPath: 'sessionKey' });
          sessionStore.createIndex('by-updatedAt', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
}

// Generate session key from full text and options
// Updated signature to include all parameters
export async function generateSessionKey(
  fullText: string,
  voiceId: string,
  preset: string,
  speed: number,
  pitch: number,
  format: string,
  sampleRate: number
): Promise<string> {
  const normalized = normalize(fullText);
  const input = `${normalized}|${voiceId}|${preset}|${speed}|${pitch}|${format}|${sampleRate}`;
  return sha1Hash(input);
}

// Export types
export type { TTSChunk, TTSSession };

export const ttsIndexedDbCache = {
  /**
   * Get chunk from IndexedDB
   */
  async getChunk(hash: string): Promise<Blob | null> {
    try {
      const db = await getDB();
      const chunk = await db.get('ttsChunks', hash);
      if (!chunk) return null;
      return chunk.audioBlob;
    } catch (error) {
      console.error('[TTS:IndexedDB] Error getting chunk:', error);
      return null;
    }
  },

  /**
   * Store chunk in IndexedDB (non-blocking, fire-and-forget)
   */
  async putChunk(
    hash: string,
    blob: Blob,
    meta: {
      format: 'wav' | 'mp3' | 'ogg';
      voiceId: string;
      speed: number;
      pitch?: number;
    }
  ): Promise<void> {
    try {
      const db = await getDB();
      const chunk: TTSChunk = {
        hash,
        format: meta.format,
        voiceId: meta.voiceId,
        speed: meta.speed,
        pitch: meta.pitch,
        createdAt: Date.now(),
        sizeBytes: blob.size,
        audioBlob: blob,
      };
      await db.put('ttsChunks', chunk);
    } catch (error) {
      // Silently fail for storage errors (quota exceeded, etc.)
      console.warn('[TTS:IndexedDB] Failed to store chunk:', error);
    }
  },

  /**
   * Delete a chunk
   */
  async deleteChunk(hash: string): Promise<void> {
    try {
      const db = await getDB();
      await db.delete('ttsChunks', hash);
    } catch (error) {
      console.error('[TTS:IndexedDB] Error deleting chunk:', error);
    }
  },

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ count: number; bytes: number }> {
    try {
      const db = await getDB();
      const tx = db.transaction('ttsChunks', 'readonly');
      const store = tx.objectStore('ttsChunks');
      let count = 0;
      let bytes = 0;

      let cursor = await store.openCursor();
      while (cursor) {
        count++;
        bytes += cursor.value.sizeBytes;
        cursor = await cursor.continue();
      }

      return { count, bytes };
    } catch (error) {
      console.error('[TTS:IndexedDB] Error getting cache stats:', error);
      return { count: 0, bytes: 0 };
    }
  },

  /**
   * Evict least recently used chunks
   * @param maxBytes - Maximum bytes to keep (evicts oldest chunks until under limit)
   * @param maxCount - Maximum count to keep (alternative to maxBytes)
   */
  async evictLRU(options: { maxBytes?: number; maxCount?: number }): Promise<number> {
    const { maxBytes, maxCount } = options;
    if (!maxBytes && !maxCount) return 0;

    try {
      const db = await getDB();
      const tx = db.transaction('ttsChunks', 'readwrite');
      const store = tx.objectStore('ttsChunks');
      const index = store.index('by-createdAt');

      // Get all chunks sorted by creation time (oldest first)
      let cursor = await index.openCursor();
      const chunks: Array<{ key: string; value: TTSChunk }> = [];

      while (cursor) {
        chunks.push({ key: cursor.primaryKey, value: cursor.value });
        cursor = await cursor.continue();
      }

      let totalBytes = chunks.reduce((sum, c) => sum + c.value.sizeBytes, 0);
      let totalCount = chunks.length;
      let evicted = 0;

      // Evict oldest chunks until under limits
      while (chunks.length > 0 && ((maxBytes && totalBytes > maxBytes) || (maxCount && totalCount > maxCount))) {
        const oldest = chunks.shift()!;
        await store.delete(oldest.key);
        totalBytes -= oldest.value.sizeBytes;
        totalCount--;
        evicted++;
      }

      await tx.done;
      return evicted;
    } catch (error) {
      console.error('[TTS:IndexedDB] Error evicting LRU chunks:', error);
      return 0;
    }
  },

  /**
   * Clear all chunks
   */
  async clearAllChunks(): Promise<void> {
    try {
      const db = await getDB();
      await db.clear('ttsChunks');
    } catch (error) {
      console.error('[TTS:IndexedDB] Error clearing chunks:', error);
    }
  },

  /**
   * Get session by key
   */
  async getSession(sessionKey: string): Promise<TTSSession | null> {
    try {
      const db = await getDB();
      return (await db.get('ttsSessions', sessionKey)) || null;
    } catch (error) {
      console.error('[TTS:IndexedDB] Error getting session:', error);
      return null;
    }
  },

  /**
   * Store or update session
   */
  async putSession(session: TTSSession): Promise<void> {
    try {
      const db = await getDB();
      await db.put('ttsSessions', session);
    } catch (error) {
      console.error('[TTS:IndexedDB] Error storing session:', error);
    }
  },

  /**
   * Update session's last played index (throttled updates recommended)
   */
  async updateSessionLastPlayed(sessionKey: string, lastPlayedIndex: number): Promise<void> {
    try {
      const db = await getDB();
      const session = await db.get('ttsSessions', sessionKey);
      if (session) {
        session.lastPlayedIndex = lastPlayedIndex;
        session.updatedAt = Date.now();
        await db.put('ttsSessions', session);
      }
    } catch (error) {
      console.error('[TTS:IndexedDB] Error updating session:', error);
    }
  },

  /**
   * Get last session (most recently updated)
   */
  async getLastSession(): Promise<TTSSession | null> {
    try {
      const db = await getDB();
      const tx = db.transaction('ttsSessions', 'readonly');
      const index = tx.store.index('by-updatedAt');
      
      // Get last session (most recently updated)
      let cursor = await index.openCursor(null, 'prev');
      return cursor ? cursor.value : null;
    } catch (error) {
      console.error('[TTS:IndexedDB] Error getting last session:', error);
      return null;
    }
  },

  /**
   * Delete session
   */
  async deleteSession(sessionKey: string): Promise<void> {
    try {
      const db = await getDB();
      await db.delete('ttsSessions', sessionKey);
    } catch (error) {
      console.error('[TTS:IndexedDB] Error deleting session:', error);
    }
  },

  /**
   * Clear all sessions
   */
  async clearAllSessions(): Promise<void> {
    try {
      const db = await getDB();
      await db.clear('ttsSessions');
    } catch (error) {
      console.error('[TTS:IndexedDB] Error clearing sessions:', error);
    }
  },

  /**
   * Get sessions, optionally filtered by voice/preset
   */
  async getSessions(options?: { voiceId?: string; limit?: number }): Promise<TTSSession[]> {
    try {
      const db = await getDB();
      const tx = db.transaction('ttsSessions', 'readonly');
      const index = tx.store.index('by-updatedAt');
      
      const sessions: TTSSession[] = [];
      let cursor = await index.openCursor(null, 'prev'); // Most recent first
      let count = 0;

      while (cursor && (!options?.limit || count < options.limit)) {
        const session = cursor.value;
        if (!options?.voiceId || session.voiceId === options.voiceId) {
          sessions.push(session);
          count++;
        }
        cursor = await cursor.continue();
      }

      return sessions;
    } catch (error) {
      console.error('[TTS:IndexedDB] Error getting sessions:', error);
      return [];
    }
  },

  /**
   * Clear chunks for a specific voice/preset
   */
  async clearChunksForVoice(voiceId: string, speed?: number): Promise<number> {
    try {
      const db = await getDB();
      const tx = db.transaction('ttsChunks', 'readwrite');
      const store = tx.objectStore('ttsChunks');
      
      let deleted = 0;
      let cursor = await store.openCursor();

      while (cursor) {
        const chunk = cursor.value;
        if (chunk.voiceId === voiceId && (speed === undefined || chunk.speed === speed)) {
          await cursor.delete();
          deleted++;
        }
        cursor = await cursor.continue();
      }

      await tx.done;
      return deleted;
    } catch (error) {
      console.error('[TTS:IndexedDB] Error clearing chunks for voice:', error);
      return 0;
    }
  },

  /**
   * Keep only the last N sessions and delete the rest
   */
  async keepLastNSessions(n: number): Promise<number> {
    try {
      const db = await getDB();
      const tx = db.transaction('ttsSessions', 'readwrite');
      const index = tx.store.index('by-updatedAt');
      
      // Get all sessions sorted by updatedAt (most recent first)
      const sessions: string[] = [];
      let cursor = await index.openCursor(null, 'prev');

      while (cursor) {
        sessions.push(cursor.primaryKey as string);
        cursor = await cursor.continue();
      }

      // Delete sessions beyond the last N
      let deleted = 0;
      for (let i = n; i < sessions.length; i++) {
        await tx.store.delete(sessions[i]);
        deleted++;
      }

      await tx.done;
      return deleted;
    } catch (error) {
      console.error('[TTS:IndexedDB] Error keeping last N sessions:', error);
      return 0;
    }
  },
};

