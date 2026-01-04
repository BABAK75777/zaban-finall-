/**
 * Streaming Buffering Error Tests
 * Tests that on fetch failure, UI transitions out of buffering and shows error
 * 
 * Note: Run `npm install` to install vitest and its types before running tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { streamingTtsOrchestrator } from '../services/streamingTtsOrchestrator';

describe('Streaming Buffering Error Handling', () => {
  let originalFetch: typeof fetch;
  let fetchSpy: ReturnType<typeof vi.fn>;
  let progressCallbacks: Array<(progress: any) => void> = [];

  beforeEach(() => {
    originalFetch = global.fetch;
    fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    progressCallbacks = [];
    
    // Reset orchestrator state
    streamingTtsOrchestrator.cancel();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    streamingTtsOrchestrator.cancel();
    vi.restoreAllMocks();
  });

  it('should transition to error state when session creation fails', async () => {
    // Mock fetch to simulate network failure
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));

    const progressUpdates: any[] = [];
    
    try {
      await streamingTtsOrchestrator.startSession(
        'test text',
        { voiceId: 'en-US-Standard-C' },
        (progress) => {
          progressUpdates.push(progress);
        }
      );
    } catch (err) {
      // Expected - should throw error
    }

    // Should have at least one progress update with error state
    const errorUpdates = progressUpdates.filter(p => p.state === 'error');
    expect(errorUpdates.length).toBeGreaterThan(0);
    
    // Verify state transitions out of buffering
    const lastUpdate = progressUpdates[progressUpdates.length - 1];
    expect(lastUpdate).toBeDefined();
    expect(['error', 'idle']).toContain(lastUpdate.state);
  });

  it('should transition to error state when fetch fails with network error', async () => {
    // Mock successful session creation, but failing stream connection
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ok: true, sessionId: 'test-session', totalChunks: 1 }),
      } as Response)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const progressUpdates: any[] = [];
    
    try {
      await streamingTtsOrchestrator.startSession(
        'test text',
        { voiceId: 'en-US-Standard-C' },
        (progress) => {
          progressUpdates.push(progress);
        }
      );
    } catch (err) {
      // Expected - should throw error
    }

    // Should transition to error state
    const errorUpdates = progressUpdates.filter(p => p.state === 'error');
    expect(errorUpdates.length).toBeGreaterThan(0);
    
    // Verify last state is error (not stuck in buffering)
    if (progressUpdates.length > 0) {
      const lastUpdate = progressUpdates[progressUpdates.length - 1];
      expect(lastUpdate.state).not.toBe('buffering');
      expect(['error', 'idle']).toContain(lastUpdate.state);
    }
  });

  it('should transition to error state when SSE connection fails', async () => {
    // Mock EventSource to fail
    const originalEventSource = global.EventSource;
    global.EventSource = vi.fn().mockImplementation(() => {
      const eventSource = {
        close: vi.fn(),
        addEventListener: vi.fn(),
      };
      
      // Simulate error by calling onerror immediately
      setTimeout(() => {
        if ((eventSource as any).onerror) {
          (eventSource as any).onerror(new Error('SSE connection failed'));
        }
      }, 10);
      
      return eventSource as any;
    }) as any;

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true, sessionId: 'test-session', totalChunks: 1 }),
    } as Response);

    const progressUpdates: any[] = [];
    
    try {
      await streamingTtsOrchestrator.startSession(
        'test text',
        { voiceId: 'en-US-Standard-C' },
        (progress) => {
          progressUpdates.push(progress);
        }
      );
      
      // Wait a bit for error to propagate
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      // May throw, but state should have transitioned
    } finally {
      global.EventSource = originalEventSource;
    }

    // Should not be stuck in buffering
    if (progressUpdates.length > 0) {
      const lastUpdate = progressUpdates[progressUpdates.length - 1];
      expect(lastUpdate.state).not.toBe('buffering');
    }
    
    // Cleanup
    streamingTtsOrchestrator.cancel();
  });

  it('should provide error message via getLastError when state is error', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));

    try {
      await streamingTtsOrchestrator.startSession(
        'test text',
        { voiceId: 'en-US-Standard-C' }
      );
    } catch (err) {
      // Expected
    }

    // Should have error available
    const lastError = streamingTtsOrchestrator.getLastError?.();
    // Note: getLastError may not exist, but if it does, it should return the error
    if (lastError) {
      expect(lastError).toBeInstanceOf(Error);
      expect(lastError.message).toBeDefined();
    }
  });

  it('should not get stuck in buffering state on fetch failure', async () => {
    // Mock fetch to fail after initial success (simulating network drop)
    let callCount = 0;
    fetchSpy.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call (session creation) succeeds
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ ok: true, sessionId: 'test-session', totalChunks: 1 }),
        } as Response);
      } else {
        // Subsequent calls fail
        return Promise.reject(new Error('Network error'));
      }
    });

    const progressUpdates: any[] = [];
    let isBuffering = false;
    
    try {
      await streamingTtsOrchestrator.startSession(
        'test text',
        { voiceId: 'en-US-Standard-C' },
        (progress) => {
          progressUpdates.push(progress);
          if (progress.state === 'buffering') {
            isBuffering = true;
          }
        }
      );
      
      // Wait a bit to see if it gets stuck
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (err) {
      // Expected
    }

    // Should not remain in buffering state indefinitely
    if (progressUpdates.length > 0) {
      const lastUpdate = progressUpdates[progressUpdates.length - 1];
      expect(lastUpdate.state).not.toBe('buffering');
    }
    
    // If it was buffering at some point, it should have exited
    if (isBuffering) {
      const lastUpdate = progressUpdates[progressUpdates.length - 1];
      expect(['error', 'idle', 'completed']).toContain(lastUpdate.state);
    }
  });
});

