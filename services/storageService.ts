
import { AppState, AISpeed } from '../types';

const STORAGE_KEY = 'echoread_app_state';
const BLOB_STORE_PREFIX = 'echoread_blob_';

/**
 * Simple deterministic hash for string content to create stable keys.
 */
function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Base 36 for shorter keys, absolute to avoid negative signs in keys
  return Math.abs(hash).toString(36);
}

export const storageService = {
  async loadState(): Promise<AppState | null> {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  },

  async saveState(state: AppState): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },

  /**
   * Generates a persistent, deterministic path based on text content.
   * This ignores session IDs and speed to allow the app to reuse the same 
   * master audio file across different speeds and app reloads.
   */
  getAiPath(text: string): string {
    return `ai_v1_${hashCode(text)}`;
  },

  getUserPath(sessionId: string, chunkId: number): string {
    return `user_${sessionId}_${chunkId}`;
  },

  async saveBlob(key: string, blob: Blob): Promise<void> {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onloadend = () => {
        try {
          localStorage.setItem(`${BLOB_STORE_PREFIX}${key}`, reader.result as string);
          resolve();
        } catch (e) {
          console.warn("Storage quota likely exceeded. Audio not cached.");
          resolve(); // Resolve anyway to allow playback, even if cache failed
        }
      };
      reader.readAsDataURL(blob);
    });
  },

  async getBlob(key: string): Promise<Blob | null> {
    const dataUrl = localStorage.getItem(`${BLOB_STORE_PREFIX}${key}`);
    if (!dataUrl) return null;
    
    try {
      const response = await fetch(dataUrl);
      return await response.blob();
    } catch (e) {
      return null;
    }
  },

  async deleteBlob(key: string): Promise<void> {
    localStorage.removeItem(`${BLOB_STORE_PREFIX}${key}`);
  },

  /**
   * Aggressively removes all AI audio blobs from storage except those 
   * explicitly provided in the keepPaths list.
   */
  async purgeUnusedAiAudio(keepPaths: string[]): Promise<void> {
    const allowedFullKeys = keepPaths.map(p => `${BLOB_STORE_PREFIX}${p}`);
    const toDelete: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Only target AI cache keys (ai_v1_)
      if (key && key.startsWith(`${BLOB_STORE_PREFIX}ai_v1_`)) {
        if (!allowedFullKeys.includes(key)) {
          toDelete.push(key);
        }
      }
    }
    
    toDelete.forEach(k => {
      localStorage.removeItem(k);
      console.debug(`[Storage] Evicted unused AI audio: ${k}`);
    });
  }
};
