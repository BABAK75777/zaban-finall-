/**
 * Web Storage Adapter - IndexedDB-based storage for web
 */

import type { StorageAdapter, SessionMetadata, ChunkMetadata } from '@zaban/tts-core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'tts_cache';
const DB_VERSION = 1;

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
  speed?: number;
  format?: string;
  fullText?: string;
}

interface TTSCacheDB extends DBSchema {
  ttsChunks: {
    key: string;
    value: TTSChunk;
    indexes: { 'by-createdAt': number };
  };
  ttsSessions: {
    key: string;
    value: TTSSession;
    indexes: { 'by-updatedAt': number };
  };
}

let dbPromise: Promise<IDBPDatabase<TTSCacheDB>> | null = null;

function getDB(): Promise<IDBPDatabase<TTSCacheDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TTSCacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('ttsChunks')) {
          const chunkStore = db.createObjectStore('ttsChunks', { keyPath: 'hash' });
          chunkStore.createIndex('by-createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('ttsSessions')) {
          const sessionStore = db.createObjectStore('ttsSessions', { keyPath: 'sessionKey' });
          sessionStore.createIndex('by-updatedAt', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
}

export class WebStorageAdapter implements StorageAdapter {
  async getChunk(hash: string): Promise<Blob | null> {
    try {
      const db = await getDB();
      const chunk = await db.get('ttsChunks', hash);
      return chunk ? chunk.audioBlob : null;
    } catch (error) {
      console.error('[WebStorage] Error getting chunk:', error);
      return null;
    }
  }

  async putChunk(hash: string, data: Blob | Uint8Array, meta: ChunkMetadata): Promise<void> {
    try {
      const blob = data instanceof Blob ? data : new Blob([data], { type: `audio/${meta.format}` });
      const db = await getDB();
      const chunk: TTSChunk = {
        hash,
        format: meta.format,
        voiceId: meta.voiceId,
        speed: meta.speed,
        pitch: meta.pitch,
        createdAt: meta.createdAt,
        sizeBytes: meta.sizeBytes,
        audioBlob: blob,
      };
      await db.put('ttsChunks', chunk);
    } catch (error) {
      console.warn('[WebStorage] Failed to store chunk:', error);
    }
  }

  async deleteChunk(hash: string): Promise<void> {
    try {
      const db = await getDB();
      await db.delete('ttsChunks', hash);
    } catch (error) {
      console.error('[WebStorage] Error deleting chunk:', error);
    }
  }

  async getSession(sessionKey: string): Promise<SessionMetadata | null> {
    try {
      const db = await getDB();
      const session = await db.get('ttsSessions', sessionKey);
      return session ? (session as unknown as SessionMetadata) : null;
    } catch (error) {
      console.error('[WebStorage] Error getting session:', error);
      return null;
    }
  }

  async putSession(session: SessionMetadata): Promise<void> {
    try {
      const db = await getDB();
      await db.put('ttsSessions', session as unknown as TTSSession);
    } catch (error) {
      console.error('[WebStorage] Error storing session:', error);
    }
  }

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
      console.error('[WebStorage] Error getting cache stats:', error);
      return { count: 0, bytes: 0 };
    }
  }

  async evictLRU(options: { maxBytes?: number; maxCount?: number }): Promise<number> {
    const { maxBytes, maxCount } = options;
    if (!maxBytes && !maxCount) return 0;

    try {
      const db = await getDB();
      const tx = db.transaction('ttsChunks', 'readwrite');
      const store = tx.objectStore('ttsChunks');
      const index = store.index('by-createdAt');

      let cursor = await index.openCursor();
      const chunks: Array<{ key: string; value: TTSChunk }> = [];

      while (cursor) {
        chunks.push({ key: cursor.primaryKey, value: cursor.value });
        cursor = await cursor.continue();
      }

      let totalBytes = chunks.reduce((sum, c) => sum + c.value.sizeBytes, 0);
      let totalCount = chunks.length;
      let evicted = 0;

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
      console.error('[WebStorage] Error evicting LRU chunks:', error);
      return 0;
    }
  }
}

