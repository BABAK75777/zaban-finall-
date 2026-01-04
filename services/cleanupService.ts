
import { AppState } from '../types';
import { storageService } from './storageService';

export const cleanupService = {
  async cleanup(state: AppState): Promise<AppState> {
    const now = Date.now();
    const newState = { ...state };
    const keysToDelete: string[] = [];

    // Cleanup AI Chunks
    Object.entries(newState.aiByChunk).forEach(([chunkId, meta]) => {
      if (meta.deleteAt && meta.deleteAt < now) {
        keysToDelete.push(meta.path);
        delete newState.aiByChunk[chunkId];
      }
    });

    // Cleanup Session Data
    if (newState.previousSession && newState.previousSession.deleteAt < now) {
      // Find all blobs related to the previous session
      const prevSessionId = newState.previousSession.sessionId;
      
      // Iterate over localStorage to find blobs matching the old session ID
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes(`_${prevSessionId}_`)) {
          keysToDelete.push(key.replace('echoread_blob_', ''));
        }
      }
      
      delete newState.previousSession;
    }

    // Physical deletion
    for (const path of keysToDelete) {
      await storageService.deleteBlob(path).catch(() => {}); // Graceful handling if missing
    }

    await storageService.saveState(newState);
    return newState;
  }
};
