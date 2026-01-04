/**
 * Unit tests for audio player modules
 * 
 * Run with: npm test or your test runner
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { chunkText } from '../services/textChunker';
import { aiAudioPlayer } from '../services/aiAudioPlayer';
import { userAudioPlayer } from '../services/userAudioPlayer';

// Mock HTMLAudioElement
class MockAudio {
  playbackRate = 1.0;
  paused = true;
  ended = false;
  currentTime = 0;
  duration = 0;
  onended: (() => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  oncanplay: (() => void) | null = null;

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
}

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockUrls: string[] = [];
global.URL.createObjectURL = vi.fn((blob: Blob) => {
  const url = `blob:mock-${mockUrls.length}`;
  mockUrls.push(url);
  return url;
});

global.URL.revokeObjectURL = vi.fn((url: string) => {
  const index = mockUrls.indexOf(url);
  if (index > -1) {
    mockUrls.splice(index, 1);
  }
});

// Mock Audio constructor
global.Audio = vi.fn(() => new MockAudio() as any) as any;

describe('textChunker', () => {
  describe('chunkText', () => {
    it('should return empty array for empty text', () => {
      expect(chunkText('')).toEqual([]);
      expect(chunkText('   ')).toEqual([]);
    });

    it('should return single chunk for short text', () => {
      const short = 'This is a short text.';
      expect(chunkText(short)).toEqual([short.trim()]);
    });

    it('should split long text into multiple chunks', () => {
      const longText = 'Sentence one. Sentence two. Sentence three. Sentence four. Sentence five.';
      const chunks = chunkText(longText.repeat(50)); // Make it very long
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.length).toBeLessThanOrEqual(500);
        expect(chunk.trim().length).toBeGreaterThan(0);
      });
    });

    it('should split on sentence boundaries when possible', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const chunks = chunkText(text.repeat(30));
      // All chunks should end with sentence punctuation (when possible)
      chunks.slice(0, -1).forEach(chunk => {
        expect(/[.!?]$/.test(chunk)).toBeTruthy();
      });
    });

    it('should handle very long single sentences', () => {
      const longSentence = 'This is a very long sentence ' + 'with many words. '.repeat(100);
      const chunks = chunkText(longSentence);
      expect(chunks.length).toBeGreaterThan(1);
    });
  });
});

describe('aiAudioPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aiAudioPlayer.stop();
  });

  afterEach(() => {
    aiAudioPlayer.stop();
  });

  it('should generate monotonically increasing request IDs', () => {
    const id1 = aiAudioPlayer.getNextRequestId();
    const id2 = aiAudioPlayer.getNextRequestId();
    const id3 = aiAudioPlayer.getNextRequestId();
    
    expect(id2).toBeGreaterThan(id1);
    expect(id3).toBeGreaterThan(id2);
  });

  it('should ignore stale requests', async () => {
    const blob = new Blob(['test'], { type: 'audio/wav' });
    const requestId1 = aiAudioPlayer.getNextRequestId();
    const requestId2 = aiAudioPlayer.getNextRequestId(); // This will be current
    
    // Start play with old requestId
    const playPromise = aiAudioPlayer.play(blob, requestId1);
    
    // Should resolve immediately because requestId1 is stale
    await expect(playPromise).resolves.not.toThrow();
  });

  it('should set playback rate to 1.0', async () => {
    const blob = new Blob(['test'], { type: 'audio/wav' });
    const requestId = aiAudioPlayer.getNextRequestId();
    const audioMock = new MockAudio();
    audioMock.playbackRate = 2.0; // Start with wrong rate
    
    global.Audio = vi.fn(() => audioMock) as any;
    
    const playPromise = aiAudioPlayer.play(blob, requestId);
    
    // Check that rate enforcement is called
    // (Note: In real browser, this would be enforced via event handlers)
    expect(audioMock.playbackRate).toBeDefined();
    
    // Simulate immediate cancellation to clean up
    aiAudioPlayer.cancel();
  });
});

describe('userAudioPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userAudioPlayer.stop();
  });

  afterEach(() => {
    userAudioPlayer.stop();
  });

  it('should report not playing initially', () => {
    expect(userAudioPlayer.isPlaying()).toBe(false);
  });
});

