/**
 * Unit tests for hashing utilities
 * Tests both Node.js and browser-like environments
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sha1Hash, generateChunkHash, generateSessionKey } from './hashing';

describe('sha1Hash', () => {
  it('should compute correct SHA1 hash in Node.js (known test vector)', async () => {
    // Known SHA1 test vector: sha1('abc') = a9993e364706816aba3e25717850c26c9cd0d89d
    const input = 'abc';
    const expected = 'a9993e364706816aba3e25717850c26c9cd0d89d';
    
    const result = await sha1Hash(input);
    
    expect(result).toBe(expected);
    expect(result).toMatch(/^[0-9a-f]{40}$/); // SHA1 is 40 hex chars
  });

  it('should return lowercase hex string', async () => {
    const input = 'test string';
    const result = await sha1Hash(input);
    
    expect(result).toBe(result.toLowerCase());
    expect(result).toMatch(/^[0-9a-f]{40}$/);
  });

  it('should handle empty string', async () => {
    const input = '';
    const result = await sha1Hash(input);
    
    // SHA1 of empty string: da39a3ee5e6b4b0d3255bfef95601890afd80709
    const expected = 'da39a3ee5e6b4b0d3255bfef95601890afd80709';
    expect(result).toBe(expected);
  });

  it('should handle unicode characters', async () => {
    const input = 'Hello 世界 🌍';
    const result = await sha1Hash(input);
    
    expect(result).toMatch(/^[0-9a-f]{40}$/);
    expect(result).toBe(result.toLowerCase());
  });

  it('should be deterministic (same input produces same hash)', async () => {
    const input = 'deterministic test';
    
    const hash1 = await sha1Hash(input);
    const hash2 = await sha1Hash(input);
    
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different inputs', async () => {
    const hash1 = await sha1Hash('input1');
    const hash2 = await sha1Hash('input2');
    
    expect(hash1).not.toBe(hash2);
  });

  describe('browser-like environment (WebCrypto simulation)', () => {
    let originalCrypto: Crypto | undefined;
    let originalTextEncoder: typeof TextEncoder | undefined;

    beforeEach(() => {
      // Store original values
      originalCrypto = globalThis.crypto;
      originalTextEncoder = globalThis.TextEncoder;
    });

    afterEach(() => {
      // Restore original values
      if (originalCrypto !== undefined) {
        (globalThis as any).crypto = originalCrypto;
      } else {
        delete (globalThis as any).crypto;
      }
      
      if (originalTextEncoder !== undefined) {
        globalThis.TextEncoder = originalTextEncoder;
      } else {
        delete (globalThis as any).TextEncoder;
      }
    });

    it('should use WebCrypto when available', async () => {
      // Mock WebCrypto API
      const mockSubtle = {
        digest: vi.fn(async (algorithm: string, data: Uint8Array) => {
          // Use Node crypto for the actual hashing in test
          const crypto = await import('node:crypto');
          const hash = crypto.createHash('sha1').update(Buffer.from(data)).digest();
          return hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.byteLength);
        })
      };

      const mockCrypto = {
        subtle: mockSubtle
      } as unknown as Crypto;

      const mockTextEncoder = class {
        encode(str: string): Uint8Array {
          return new TextEncoder().encode(str);
        }
      } as typeof TextEncoder;

      // Inject mocks
      (globalThis as any).crypto = mockCrypto;
      globalThis.TextEncoder = mockTextEncoder;

      const input = 'test';
      const result = await sha1Hash(input);
      
      expect(result).toMatch(/^[0-9a-f]{40}$/);
      expect(mockSubtle.digest).toHaveBeenCalledWith('SHA-1', expect.any(Uint8Array));
    });
  });
});

describe('generateChunkHash', () => {
  it('should generate consistent hash for same inputs', async () => {
    const text = 'Hello world';
    const voiceId = 'en-US-Standard-C';
    const preset = 'default';
    const speed = 1.0;
    const pitch = 0.0;
    const format = 'mp3';
    const sampleRate = 24000;

    const hash1 = await generateChunkHash(text, voiceId, preset, speed, pitch, format, sampleRate);
    const hash2 = await generateChunkHash(text, voiceId, preset, speed, pitch, format, sampleRate);

    expect(hash1).toBe(hash2);
  });

  it('should generate different hash when parameters change', async () => {
    const text = 'Hello world';
    
    const hash1 = await generateChunkHash(text, 'en-US-Standard-C', 'default', 1.0, 0.0, 'mp3', 24000);
    const hash2 = await generateChunkHash(text, 'en-US-Standard-D', 'default', 1.0, 0.0, 'mp3', 24000);
    const hash3 = await generateChunkHash(text, 'en-US-Standard-C', 'default', 1.5, 0.0, 'mp3', 24000);

    expect(hash1).not.toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  it('should normalize text (trim and collapse whitespace)', async () => {
    const text1 = '  Hello   world\n\n  ';
    const text2 = 'Hello world';
    
    const hash1 = await generateChunkHash(text1);
    const hash2 = await generateChunkHash(text2);

    expect(hash1).toBe(hash2);
  });
});

describe('generateSessionKey', () => {
  it('should generate consistent session key for same inputs', async () => {
    const fullText = 'This is a long text for session';
    const voiceId = 'en-US-Standard-C';
    const speed = 1.0;
    const format = 'mp3';

    const key1 = await generateSessionKey(fullText, voiceId, speed, format);
    const key2 = await generateSessionKey(fullText, voiceId, speed, format);

    expect(key1).toBe(key2);
    expect(key1).toMatch(/^[0-9a-f]{40}$/);
  });

  it('should generate different keys for different inputs', async () => {
    const key1 = await generateSessionKey('Text 1', 'voice1', 1.0, 'mp3');
    const key2 = await generateSessionKey('Text 2', 'voice1', 1.0, 'mp3');
    const key3 = await generateSessionKey('Text 1', 'voice2', 1.0, 'mp3');

    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
  });
});

