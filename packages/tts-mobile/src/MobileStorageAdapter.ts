/**
 * Mobile Storage Adapter - FileSystem-based storage for mobile
 */

import * as FileSystem from 'expo-file-system';
import type { StorageAdapter, SessionMetadata, ChunkMetadata } from '@zaban/tts-core';

const CHUNKS_DIR = `${FileSystem.documentDirectory}tts_chunks/`;
const SESSIONS_DIR = `${FileSystem.documentDirectory}tts_sessions/`;

// Ensure directories exist
async function ensureDirectories(): Promise<void> {
  try {
    const chunksInfo = await FileSystem.getInfoAsync(CHUNKS_DIR);
    if (!chunksInfo.exists) {
      await FileSystem.makeDirectoryAsync(CHUNKS_DIR, { intermediates: true });
    }
    
    const sessionsInfo = await FileSystem.getInfoAsync(SESSIONS_DIR);
    if (!sessionsInfo.exists) {
      await FileSystem.makeDirectoryAsync(SESSIONS_DIR, { intermediates: true });
    }
  } catch (error) {
    console.error('[MobileStorage] Failed to create directories:', error);
  }
}

// Initialize on first use
let directoriesInitialized = false;

export class MobileStorageAdapter implements StorageAdapter {
  constructor() {
    if (!directoriesInitialized) {
      ensureDirectories();
      directoriesInitialized = true;
    }
  }

  private getChunkPath(hash: string): string {
    return `${CHUNKS_DIR}${hash}.mp3`;
  }

  private getSessionPath(sessionKey: string): string {
    return `${SESSIONS_DIR}${sessionKey}.json`;
  }

  async getChunk(hash: string): Promise<Blob | Uint8Array | null> {
    try {
      const path = this.getChunkPath(hash);
      const info = await FileSystem.getInfoAsync(path);
      
      if (!info.exists) {
        return null;
      }

      // Read as base64 and convert to Uint8Array
      const base64 = await FileSystem.readAsStringAsync(path, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Convert base64 to Uint8Array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      return bytes;
    } catch (error) {
      console.error('[MobileStorage] Error getting chunk:', error);
      return null;
    }
  }

  async putChunk(hash: string, data: Blob | Uint8Array, meta: ChunkMetadata): Promise<void> {
    try {
      await ensureDirectories();
      const path = this.getChunkPath(hash);
      
      let base64: string;
      if (data instanceof Uint8Array) {
        const binary = String.fromCharCode(...data);
        base64 = btoa(binary);
      } else {
        // Convert Blob to base64
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(data);
        });
      }

      await FileSystem.writeAsStringAsync(path, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (error) {
      console.warn('[MobileStorage] Failed to store chunk:', error);
    }
  }

  async deleteChunk(hash: string): Promise<void> {
    try {
      const path = this.getChunkPath(hash);
      await FileSystem.deleteAsync(path, { idempotent: true });
    } catch (error) {
      console.error('[MobileStorage] Error deleting chunk:', error);
    }
  }

  async getSession(sessionKey: string): Promise<SessionMetadata | null> {
    try {
      const path = this.getSessionPath(sessionKey);
      const info = await FileSystem.getInfoAsync(path);
      
      if (!info.exists) {
        return null;
      }

      const json = await FileSystem.readAsStringAsync(path);
      return JSON.parse(json) as SessionMetadata;
    } catch (error) {
      console.error('[MobileStorage] Error getting session:', error);
      return null;
    }
  }

  async putSession(session: SessionMetadata): Promise<void> {
    try {
      await ensureDirectories();
      const path = this.getSessionPath(session.sessionKey);
      await FileSystem.writeAsStringAsync(path, JSON.stringify(session));
    } catch (error) {
      console.error('[MobileStorage] Error storing session:', error);
    }
  }

  async getCacheStats(): Promise<{ count: number; bytes: number }> {
    try {
      await ensureDirectories();
      const files = await FileSystem.readDirectoryAsync(CHUNKS_DIR);
      let count = 0;
      let bytes = 0;

      for (const file of files) {
        const path = `${CHUNKS_DIR}${file}`;
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists && 'size' in info) {
          count++;
          bytes += info.size || 0;
        }
      }

      return { count, bytes };
    } catch (error) {
      console.error('[MobileStorage] Error getting cache stats:', error);
      return { count: 0, bytes: 0 };
    }
  }

  async evictLRU(options: { maxBytes?: number; maxCount?: number }): Promise<number> {
    const { maxBytes, maxCount } = options;
    if (!maxBytes && !maxCount) return 0;

    try {
      await ensureDirectories();
      const files = await FileSystem.readDirectoryAsync(CHUNKS_DIR);
      
      // Get file info with timestamps
      const fileInfos: Array<{ path: string; size: number; mtime: number }> = [];
      
      for (const file of files) {
        const path = `${CHUNKS_DIR}${file}`;
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists && 'size' in info && 'modificationTime' in info) {
          fileInfos.push({
            path,
            size: info.size || 0,
            mtime: info.modificationTime || 0,
          });
        }
      }

      // Sort by modification time (oldest first)
      fileInfos.sort((a, b) => a.mtime - b.mtime);

      let totalBytes = fileInfos.reduce((sum, f) => sum + f.size, 0);
      let totalCount = fileInfos.length;
      let evicted = 0;

      // Evict oldest files until under limits
      while (
        fileInfos.length > 0 &&
        ((maxBytes && totalBytes > maxBytes) || (maxCount && totalCount > maxCount))
      ) {
        const oldest = fileInfos.shift()!;
        await FileSystem.deleteAsync(oldest.path, { idempotent: true });
        totalBytes -= oldest.size;
        totalCount--;
        evicted++;
      }

      return evicted;
    } catch (error) {
      console.error('[MobileStorage] Error evicting LRU chunks:', error);
      return 0;
    }
  }
}

