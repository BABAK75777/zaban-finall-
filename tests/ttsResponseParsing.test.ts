/**
 * Unit tests for TTS response parsing
 * Tests the function that extracts audio base64 + mimeType from multiple response shapes
 */

import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Parses TTS response to extract audio base64 and mimeType
 * Handles multiple response formats from backend
 */
function parseTtsResponse(data: unknown, contentType?: string | null): { base64: string; mimeType: string } | null {
  // Handle binary response (contentType is audio/*)
  if (contentType && contentType.startsWith('audio/')) {
    // Binary responses are handled elsewhere (via response.blob())
    return null;
  }

  // Handle JSON response
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    
    // Format 1: { ok: true, audioBase64: string, format: string }
    if (obj.ok === true && typeof obj.audioBase64 === 'string') {
      const format = typeof obj.format === 'string' ? obj.format.toLowerCase() : 'mp3';
      const mimeTypes: Record<string, string> = {
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg'
      };
      const mimeType = mimeTypes[format] || 'audio/mpeg';
      return { base64: obj.audioBase64, mimeType };
    }
    
    // Format 2: { ok: true, audio: string, format?: string } (legacy)
    if (obj.ok === true && typeof obj.audio === 'string') {
      const format = typeof obj.format === 'string' ? obj.format.toLowerCase() : 'mp3';
      const mimeTypes: Record<string, string> = {
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg'
      };
      const mimeType = mimeTypes[format] || 'audio/mpeg';
      return { base64: obj.audio, mimeType };
    }
    
    // Format 3: SSE chunk event { index: number, audioBase64: string, format?: string }
    if (typeof obj.index === 'number' && typeof obj.audioBase64 === 'string') {
      const format = typeof obj.format === 'string' ? obj.format.toLowerCase() : 'mp3';
      const mimeTypes: Record<string, string> = {
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg'
      };
      const mimeType = mimeTypes[format] || 'audio/mpeg';
      return { base64: obj.audioBase64, mimeType };
    }
  }
  
  return null;
}

describe('TTS Response Parsing', () => {
  describe('parseTtsResponse', () => {
    it('should parse standard JSON response with audioBase64 and format', () => {
      const response = {
        ok: true,
        audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
        format: 'mp3',
        hash: 'abc123',
        durationMsEstimate: 1000
      };
      
      const result = parseTtsResponse(response, 'application/json');
      
      expect(result).not.toBeNull();
      expect(result?.base64).toBe(response.audioBase64);
      expect(result?.mimeType).toBe('audio/mpeg');
    });

    it('should parse JSON response with wav format', () => {
      const response = {
        ok: true,
        audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
        format: 'wav',
        hash: 'abc123'
      };
      
      const result = parseTtsResponse(response, 'application/json');
      
      expect(result).not.toBeNull();
      expect(result?.base64).toBe(response.audioBase64);
      expect(result?.mimeType).toBe('audio/wav');
    });

    it('should parse JSON response with ogg format', () => {
      const response = {
        ok: true,
        audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
        format: 'ogg',
        hash: 'abc123'
      };
      
      const result = parseTtsResponse(response, 'application/json');
      
      expect(result).not.toBeNull();
      expect(result?.mimeType).toBe('audio/ogg');
    });

    it('should default to audio/mpeg when format is missing', () => {
      const response = {
        ok: true,
        audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
        hash: 'abc123'
      };
      
      const result = parseTtsResponse(response, 'application/json');
      
      expect(result).not.toBeNull();
      expect(result?.mimeType).toBe('audio/mpeg');
    });

    it('should parse legacy format with audio field', () => {
      const response = {
        ok: true,
        audio: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
        format: 'mp3',
        path: '/some/path'
      };
      
      const result = parseTtsResponse(response, 'application/json');
      
      expect(result).not.toBeNull();
      expect(result?.base64).toBe(response.audio);
      expect(result?.mimeType).toBe('audio/mpeg');
    });

    it('should parse SSE chunk event format', () => {
      const response = {
        index: 0,
        hash: 'abc123',
        audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
        format: 'wav',
        durationMsEstimate: 500,
        cacheHit: false
      };
      
      const result = parseTtsResponse(response, 'application/json');
      
      expect(result).not.toBeNull();
      expect(result?.base64).toBe(response.audioBase64);
      expect(result?.mimeType).toBe('audio/wav');
    });

    it('should handle case-insensitive format values', () => {
      const response = {
        ok: true,
        audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
        format: 'MP3'
      };
      
      const result = parseTtsResponse(response, 'application/json');
      
      expect(result).not.toBeNull();
      expect(result?.mimeType).toBe('audio/mpeg');
    });

    it('should return null for binary content-type', () => {
      const response = {
        ok: true,
        audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
      };
      
      const result = parseTtsResponse(response, 'audio/mpeg');
      
      expect(result).toBeNull();
    });

    it('should return null for invalid response shape', () => {
      const response = {
        ok: false,
        error: 'TTS_FAILED'
      };
      
      const result = parseTtsResponse(response, 'application/json');
      
      expect(result).toBeNull();
    });

    it('should return null for response without audio data', () => {
      const response = {
        ok: true,
        hash: 'abc123',
        format: 'mp3'
      };
      
      const result = parseTtsResponse(response, 'application/json');
      
      expect(result).toBeNull();
    });

    it('should handle null or undefined input gracefully', () => {
      expect(parseTtsResponse(null, 'application/json')).toBeNull();
      expect(parseTtsResponse(undefined, 'application/json')).toBeNull();
    });

    it('should handle non-object input gracefully', () => {
      expect(parseTtsResponse('string', 'application/json')).toBeNull();
      expect(parseTtsResponse(123, 'application/json')).toBeNull();
      expect(parseTtsResponse([], 'application/json')).toBeNull();
    });
  });
});

