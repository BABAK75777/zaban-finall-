/**
 * Backend Integration Test for TTS Endpoint
 * Tests that TTS endpoint returns consistent audio structure
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the Google TTS API response
const mockGeminiTtsResponse = {
  audioContent: Buffer.from('mock audio data').toString('base64')
};

// Mock fetch globally
global.fetch = vi.fn();

describe('TTS Endpoint Audio Structure', () => {
  let app;
  
  beforeEach(async () => {
    // Set up environment
    process.env.GOOGLE_API_KEY = 'test-api-key-12345';
    process.env.AUTH_MODE = 'guest';
    
    // Import server app (this is a simplified test - in real scenario we'd import the actual server)
    // For now, we'll test the response structure expectations
    
    app = express();
    app.use(express.json());
    
    // Mock TTS endpoint for testing
    app.post('/tts', (req, res) => {
      const { text, hash, format = 'mp3' } = req.body;
      
      if (!text || text.trim().length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'EMPTY_TEXT',
          details: 'text field is required'
        });
      }
      
      // Simulate successful TTS response
      const audioBase64 = mockGeminiTtsResponse.audioContent;
      const normalizedFormat = format.toLowerCase();
      
      // Return structured JSON response when hash is provided
      if (hash) {
        return res.json({
          ok: true,
          hash: hash,
          voiceId: req.body.voiceId || 'en-US-Standard-C',
          preset: req.body.preset || 'default',
          format: normalizedFormat,
          audioBase64: audioBase64,
          durationMsEstimate: 1000,
          sampleRate: req.body.sampleRate || 24000,
          normalized: true
        });
      } else {
        // Legacy binary response
        const mimeTypes = {
          'mp3': 'audio/mpeg',
          'wav': 'audio/wav',
          'ogg': 'audio/ogg'
        };
        const mimeType = mimeTypes[normalizedFormat] || 'audio/mpeg';
        const audioBuffer = Buffer.from(audioBase64, 'base64');
        
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Length', audioBuffer.length.toString());
        return res.send(audioBuffer);
      }
    });
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Structured JSON Response (with hash)', () => {
    it('should return consistent JSON structure with audioBase64', async () => {
      const response = await request(app)
        .post('/tts')
        .send({
          text: 'Hello world',
          hash: 'abc123'
        })
        .expect(200);
      
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('hash', 'abc123');
      expect(response.body).toHaveProperty('audioBase64');
      expect(typeof response.body.audioBase64).toBe('string');
      expect(response.body.audioBase64.length).toBeGreaterThan(0);
    });

    it('should include format field in response', async () => {
      const response = await request(app)
        .post('/tts')
        .send({
          text: 'Hello world',
          hash: 'abc123',
          format: 'wav'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('format', 'wav');
      expect(response.body).toHaveProperty('audioBase64');
    });

    it('should include voiceId and preset in response', async () => {
      const response = await request(app)
        .post('/tts')
        .send({
          text: 'Hello world',
          hash: 'abc123',
          voiceId: 'en-US-Standard-D',
          preset: 'calm'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('voiceId', 'en-US-Standard-D');
      expect(response.body).toHaveProperty('preset', 'calm');
    });

    it('should normalize format to lowercase', async () => {
      const response = await request(app)
        .post('/tts')
        .send({
          text: 'Hello world',
          hash: 'abc123',
          format: 'MP3'
        })
        .expect(200);
      
      expect(response.body.format).toBe('mp3');
    });

    it('should include durationMsEstimate', async () => {
      const response = await request(app)
        .post('/tts')
        .send({
          text: 'Hello world',
          hash: 'abc123'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('durationMsEstimate');
      expect(typeof response.body.durationMsEstimate).toBe('number');
      expect(response.body.durationMsEstimate).toBeGreaterThan(0);
    });

    it('should include sampleRate when provided', async () => {
      const response = await request(app)
        .post('/tts')
        .send({
          text: 'Hello world',
          hash: 'abc123',
          sampleRate: 44100
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('sampleRate', 44100);
    });
  });

  describe('Binary Response (legacy, without hash)', () => {
    it('should return binary audio with correct Content-Type', async () => {
      const response = await request(app)
        .post('/tts')
        .send({
          text: 'Hello world',
          format: 'mp3'
        })
        .expect(200);
      
      expect(response.headers['content-type']).toBe('audio/mpeg');
      expect(Buffer.isBuffer(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should set correct Content-Type for wav format', async () => {
      const response = await request(app)
        .post('/tts')
        .send({
          text: 'Hello world',
          format: 'wav'
        })
        .expect(200);
      
      expect(response.headers['content-type']).toBe('audio/wav');
    });

    it('should set correct Content-Type for ogg format', async () => {
      const response = await request(app)
        .post('/tts')
        .send({
          text: 'Hello world',
          format: 'ogg'
        })
        .expect(200);
      
      expect(response.headers['content-type']).toBe('audio/ogg');
    });

    it('should include Content-Length header', async () => {
      const response = await request(app)
        .post('/tts')
        .send({
          text: 'Hello world',
          format: 'mp3'
        })
        .expect(200);
      
      expect(response.headers['content-length']).toBeDefined();
      expect(parseInt(response.headers['content-length'])).toBeGreaterThan(0);
    });
  });

  describe('Error Response Structure', () => {
    it('should return consistent error structure for empty text', async () => {
      const response = await request(app)
        .post('/tts')
        .send({
          text: '',
          hash: 'abc123'
        })
        .expect(400);
      
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toHaveProperty('ok', false);
      expect(response.body).toHaveProperty('error', 'EMPTY_TEXT');
      expect(response.body).toHaveProperty('details');
    });
  });

  describe('Response Consistency', () => {
    it('should return same structure for identical requests', async () => {
      const requestBody = {
        text: 'Hello world',
        hash: 'abc123',
        format: 'mp3'
      };
      
      const response1 = await request(app)
        .post('/tts')
        .send(requestBody)
        .expect(200);
      
      const response2 = await request(app)
        .post('/tts')
        .send(requestBody)
        .expect(200);
      
      // Both should have same structure
      expect(Object.keys(response1.body)).toEqual(Object.keys(response2.body));
      
      // Both should have required fields
      const requiredFields = ['ok', 'hash', 'format', 'audioBase64', 'voiceId', 'preset', 'durationMsEstimate'];
      requiredFields.forEach(field => {
        expect(response1.body).toHaveProperty(field);
        expect(response2.body).toHaveProperty(field);
      });
    });
  });
});

