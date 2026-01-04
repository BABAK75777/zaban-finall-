/**
 * Backend Production Tests
 * Tests for rate limiting, validation, timeouts, security, and caching
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock environment variables
process.env.GOOGLE_API_KEY = 'test-api-key-12345';
process.env.PORT = '3002'; // Use different port for tests

// Import server after setting env vars
let app;
let server;

beforeEach(async () => {
  // Clear module cache to get fresh server instance
  const serverModule = await import('./server.js');
  // Note: server.js exports the app via module.exports or we need to refactor
  // For now, we'll test the endpoints directly
  app = express();
  
  // Set up basic test app structure
  app.use(express.json({ limit: '256kb' }));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('Backend Production Hardening Tests', () => {
  describe('Schema Validation', () => {
    it('should return 400 EMPTY_TEXT for empty text', async () => {
      const response = await request(app)
        .post('/tts')
        .send({ text: '' })
        .expect(400);
      
      expect(response.body).toMatchObject({
        ok: false,
        error: 'EMPTY_TEXT'
      });
    });

    it('should return 400 INVALID_REQUEST for missing text', async () => {
      const response = await request(app)
        .post('/tts')
        .send({})
        .expect(400);
      
      expect(response.body).toMatchObject({
        ok: false,
        error: 'INVALID_REQUEST'
      });
    });

    it('should return 400 INVALID_REQUEST for text exceeding 5000 chars', async () => {
      const longText = 'a'.repeat(5001);
      const response = await request(app)
        .post('/tts')
        .send({ text: longText })
        .expect(400);
      
      expect(response.body).toMatchObject({
        ok: false,
        error: 'INVALID_REQUEST'
      });
    });

    it('should return 400 INVALID_REQUEST for path traversal attempt', async () => {
      const response = await request(app)
        .post('/tts')
        .send({ 
          text: 'Hello',
          path: '../etc/passwd'
        })
        .expect(400);
      
      expect(response.body).toMatchObject({
        ok: false,
        error: 'INVALID_REQUEST'
      });
    });

    it('should accept valid text input', async () => {
      // This will fail at Gemini API call, but validation should pass
      const response = await request(app)
        .post('/tts')
        .send({ text: 'Hello world' });
      
      // Should not be a validation error (400)
      expect(response.status).not.toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 RATE_LIMITED after exceeding limit', async () => {
      // Make 31 requests (limit is 30 per 5 min)
      const requests = [];
      for (let i = 0; i < 31; i++) {
        requests.push(
          request(app)
            .post('/tts')
            .send({ text: `Request ${i}` })
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.find(r => r.status === 429);
      
      expect(rateLimited).toBeDefined();
      expect(rateLimited.body).toMatchObject({
        ok: false,
        error: 'RATE_LIMITED'
      });
    });
  });

  describe('Timeout Handling', () => {
    it('should return 504 TTS_TIMEOUT for slow Gemini responses', async () => {
      // Mock fetch to delay response
      const originalFetch = global.fetch;
      global.fetch = vi.fn(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ audioContent: 'test' })
          }), 20000) // 20s delay (exceeds 15s timeout)
        )
      );

      const response = await request(app)
        .post('/tts')
        .send({ text: 'Test timeout' })
        .timeout(25000); // Allow test to wait

      // Restore fetch
      global.fetch = originalFetch;

      // Should timeout
      expect([504, 408]).toContain(response.status);
    });
  });

  describe('Path Traversal Protection', () => {
    it('should reject paths with ..', async () => {
      const response = await request(app)
        .post('/tts')
        .send({ 
          text: 'Hello',
          path: '../../etc/passwd'
        })
        .expect(400);
      
      expect(response.body.error).toBe('INVALID_REQUEST');
    });

    it('should reject paths with invalid characters', async () => {
      const response = await request(app)
        .post('/tts')
        .send({ 
          text: 'Hello',
          path: 'test<script>alert(1)</script>'
        })
        .expect(400);
      
      expect(response.body.error).toBe('INVALID_REQUEST');
    });
  });

  describe('Cache Functionality', () => {
    it('should return cache hit on second identical request', async () => {
      const text = 'Cache test text';
      const hash = 'test-hash-123';
      
      // First request (cache miss)
      const firstResponse = await request(app)
        .post('/tts')
        .send({ text, hash });
      
      // Second request (should be cache hit)
      const secondResponse = await request(app)
        .post('/tts')
        .send({ text, hash });
      
      // Check for cache hit header
      expect(secondResponse.headers['x-cache-hit']).toBe('true');
    });
  });

  describe('Health Endpoints', () => {
    it('should return 200 for /healthz', async () => {
      const response = await request(app)
        .get('/healthz')
        .expect(200);
      
      expect(response.body).toMatchObject({ ok: true });
    });

    it('should return readiness status for /readyz', async () => {
      const response = await request(app)
        .get('/readyz');
      
      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('checks');
    });
  });

  describe('Metrics Endpoint', () => {
    it('should return metrics data', async () => {
      // Make a request first to generate metrics
      await request(app)
        .post('/tts')
        .send({ text: 'Test' });
      
      const response = await request(app)
        .get('/metrics')
        .expect(200);
      
      expect(response.body).toHaveProperty('requests');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('cache');
      expect(response.body).toHaveProperty('gemini');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers from helmet', async () => {
      const response = await request(app)
        .get('/healthz');
      
      // Helmet adds various security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
    });
  });

  describe('Payload Limits', () => {
    it('should reject payloads exceeding 256kb', async () => {
      const largePayload = { text: 'a'.repeat(300000) }; // ~300kb
      
      const response = await request(app)
        .post('/tts')
        .send(largePayload);
      
      // Should reject with 413 or 400
      expect([413, 400, 500]).toContain(response.status);
    });
  });
});

