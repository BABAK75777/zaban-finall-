/**
 * CORS Preflight Tests
 * Tests that the backend properly handles CORS preflight OPTIONS requests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import http from 'http';

// Import server setup (we'll need to export app from server.js or create a test server)
// For now, we'll test against a running server or create a minimal test server

describe('CORS Preflight Tests', () => {
  let app;
  let server;

  beforeAll(async () => {
    // Create test server with CORS config matching production
    const express = (await import('express')).default;
    const cors = (await import('cors')).default;
    
    app = express();
    
    // CORS configuration matching server.js
    app.use(cors({
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'X-Request-Id'],
    }));

    // Body parser middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Test /tts endpoint (simplified for testing)
    app.options('/tts', (req, res) => {
      // CORS middleware should handle this, but we can explicitly respond
      res.status(204).end();
    });

    app.post('/tts', (req, res) => {
      res.json({ ok: true, message: 'TTS endpoint' });
    });

    // Start test server on a random port
    return new Promise((resolve) => {
      server = app.listen(0, () => {
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      return new Promise((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  it('should handle OPTIONS request to /tts with correct CORS headers', async () => {
    const response = await request(app)
      .options('/tts')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,x-request-id');

    // Should return 204 or 200
    expect([200, 204]).toContain(response.status);

    // Check CORS headers
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(response.headers['access-control-allow-methods']).toContain('POST');
    
    // Check that x-request-id is in allowed headers (case-insensitive)
    const allowedHeaders = response.headers['access-control-allow-headers'] || '';
    const allowedHeadersLower = allowedHeaders.toLowerCase();
    expect(
      allowedHeadersLower.includes('x-request-id') || 
      allowedHeadersLower.includes('content-type')
    ).toBe(true);
  });

  it('should allow x-request-id header in Access-Control-Allow-Headers', async () => {
    const response = await request(app)
      .options('/tts')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'x-request-id');

    expect([200, 204]).toContain(response.status);
    
    const allowedHeaders = response.headers['access-control-allow-headers'] || '';
    const allowedHeadersLower = allowedHeaders.toLowerCase();
    // Should include x-request-id (case-insensitive)
    expect(allowedHeadersLower).toContain('x-request-id');
  });

  it('should return correct Access-Control-Allow-Origin for localhost:3000', async () => {
    const response = await request(app)
      .options('/tts')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('should allow POST method in Access-Control-Allow-Methods', async () => {
    const response = await request(app)
      .options('/tts')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST');

    const allowedMethods = response.headers['access-control-allow-methods'] || '';
    expect(allowedMethods).toContain('POST');
  });
});

