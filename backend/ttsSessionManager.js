/**
 * TTS Session Manager - In-memory session storage with TTL cleanup
 * 
 * Manages streaming TTS sessions with:
 * - Session metadata
 * - Chunk generation status
 * - Cache integration
 * - TTL-based cleanup
 */

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Cleanup every 5 minutes

class TtsSessionManager {
  constructor() {
    this.sessions = new Map();
    this.metrics = {
      sessionsCreated: 0,
      sessionsCompleted: 0,
      sessionsCancelled: 0,
      sessionsExpired: 0,
      chunksGenerated: 0,
      cacheHits: 0,
      cacheMisses: 0,
      geminiFailures: 0,
      chunkLatencies: [],
    };
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, CLEANUP_INTERVAL_MS);
    
    console.log('[TTS:SessionManager] Initialized with TTL:', SESSION_TTL_MS, 'ms');
  }

  /**
   * Create a new TTS session
   */
  createSession(options) {
    const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
    const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session = {
      sessionId,
      requestId,
      status: 'active', // active, completed, cancelled, error
      createdAt: Date.now(),
      lastActivity: Date.now(),
      options: {
        text: options.text,
        voiceId: options.voiceId || 'en-US-Standard-C',
        format: options.format || 'mp3',
        chunkMaxChars: options.chunkMaxChars || 1600,
        speed: options.speed || 1.0,
      },
      chunks: [], // Array of { index, hash, status, audioBase64?, error?, cacheHit?, latencyMs? }
      totalChunks: 0, // Set after chunking
      generatedChunks: 0,
      failedChunks: new Set(), // Set of chunk indices that failed
      abortController: null,
      sseClients: new Set(), // Track active SSE connections
    };

    this.sessions.set(sessionId, session);
    this.metrics.sessionsCreated++;
    
    console.log(`[TTS:SessionManager:${sessionId}] Session created:`, {
      requestId,
      textLength: options.text.length,
      options: session.options
    });

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
    return session;
  }

  /**
   * Update session status
   */
  updateSessionStatus(sessionId, status) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      session.lastActivity = Date.now();
      
      if (status === 'completed') {
        this.metrics.sessionsCompleted++;
      } else if (status === 'cancelled') {
        this.metrics.sessionsCancelled++;
      }
    }
  }

  /**
   * Register SSE client connection
   */
  registerSseClient(sessionId, res) {
    const session = this.getSession(sessionId);
    if (session) {
      session.sseClients.add(res);
      session.lastActivity = Date.now();
      
      // Cleanup on client disconnect
      res.on('close', () => {
        session.sseClients.delete(res);
        console.log(`[TTS:SessionManager:${sessionId}] SSE client disconnected`);
      });
    }
  }

  /**
   * Unregister SSE client
   */
  unregisterSseClient(sessionId, res) {
    const session = this.getSession(sessionId);
    if (session) {
      session.sseClients.delete(res);
    }
  }

  /**
   * Cancel session
   */
  cancelSession(sessionId) {
    const session = this.getSession(sessionId);
    if (session) {
      session.status = 'cancelled';
      session.lastActivity = Date.now();
      
      // Abort generation if in progress
      if (session.abortController) {
        session.abortController.abort();
      }
      
      // Close all SSE connections
      for (const res of session.sseClients) {
        try {
          res.end();
        } catch (err) {
          console.error(`[TTS:SessionManager:${sessionId}] Error closing SSE connection:`, err);
        }
      }
      session.sseClients.clear();
      
      this.metrics.sessionsCancelled++;
      console.log(`[TTS:SessionManager:${sessionId}] Session cancelled`);
      
      return true;
    }
    return false;
  }

  /**
   * Add chunk to session
   */
  addChunk(sessionId, chunkData) {
    const session = this.getSession(sessionId);
    if (session) {
      const { index, hash, audioBase64, error, cacheHit, latencyMs, durationMsEstimate } = chunkData;
      
      // Find or create chunk entry
      let chunk = session.chunks.find(c => c.index === index);
      if (!chunk) {
        chunk = { index, hash, status: 'pending' };
        session.chunks.push(chunk);
        session.chunks.sort((a, b) => a.index - b.index);
      }
      
      chunk.status = error ? 'error' : 'ready';
      chunk.lastUpdated = Date.now();
      
      if (audioBase64) {
        chunk.audioBase64 = audioBase64;
      }
      
      if (error) {
        chunk.error = error;
        session.failedChunks.add(index);
      } else {
        session.failedChunks.delete(index);
        session.generatedChunks++;
        this.metrics.chunksGenerated++;
      }
      
      if (cacheHit !== undefined) {
        chunk.cacheHit = cacheHit;
        if (cacheHit) {
          this.metrics.cacheHits++;
        } else {
          this.metrics.cacheMisses++;
        }
      }
      
      if (latencyMs !== undefined) {
        chunk.latencyMs = latencyMs;
        this.metrics.chunkLatencies.push(latencyMs);
        // Keep only last 1000 latencies
        if (this.metrics.chunkLatencies.length > 1000) {
          this.metrics.chunkLatencies.shift();
        }
      }
      
      if (durationMsEstimate !== undefined) {
        chunk.durationMsEstimate = durationMsEstimate;
      }
      
      session.lastActivity = Date.now();
    }
  }

  /**
   * Set total chunks for session
   */
  setTotalChunks(sessionId, totalChunks) {
    const session = this.getSession(sessionId);
    if (session) {
      session.totalChunks = totalChunks;
    }
  }

  /**
   * Get metrics
   */
  getMetrics() {
    const latencies = this.metrics.chunkLatencies;
    const avgLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;
    
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const p95Latency = sortedLatencies.length > 0
      ? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)]
      : 0;

    return {
      ...this.metrics,
      sessionsActive: this.sessions.size,
      avgChunkLatencyMs: Math.round(avgLatency),
      p95ChunkLatencyMs: Math.round(p95Latency),
      cacheHitRate: this.metrics.cacheHits + this.metrics.cacheMisses > 0
        ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(1) + '%'
        : '0%',
    };
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    let expiredCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now - session.lastActivity;
      if (age > SESSION_TTL_MS) {
        // Close SSE connections
        for (const res of session.sseClients) {
          try {
            res.end();
          } catch (err) {
            // Ignore errors
          }
        }
        
        this.sessions.delete(sessionId);
        expiredCount++;
        this.metrics.sessionsExpired++;
      }
    }

    if (expiredCount > 0) {
      console.log(`[TTS:SessionManager] Cleaned up ${expiredCount} expired sessions`);
    }
  }

  /**
   * Shutdown cleanup
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Close all SSE connections
    for (const [sessionId, session] of this.sessions.entries()) {
      for (const res of session.sseClients) {
        try {
          res.end();
        } catch (err) {
          // Ignore
        }
      }
    }
    
    this.sessions.clear();
    console.log('[TTS:SessionManager] Shutdown complete');
  }
}

// Export singleton
export const sessionManager = new TtsSessionManager();

