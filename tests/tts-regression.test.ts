/**
 * TTS Regression Test Suite
 *
 * Validates TTS client expectations against an in-process mock server
 * so CI/local runs do not require a live backend on localhost:3001.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startMockTtsServer, type MockTtsServer } from './helpers/mockTtsServer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GOLDEN_SET_PATH = path.join(__dirname, 'tts-golden.json');
const goldenSet = JSON.parse(fs.readFileSync(GOLDEN_SET_PATH, 'utf8')) as {
  tests: Array<{ id: string; text: string; category: string; description: string }>;
  validation: {
    expectedAudioLength: { min_bytes: number; max_bytes: number };
    expectedDurationRange: { min_ms_per_word: number; max_ms_per_word: number };
  };
};

let mockServer: MockTtsServer;
let API_BASE_URL: string;

async function testTtsGeneration(
  test: { id: string; text: string; category: string },
  voiceParams: Record<string, unknown> = {}
) {
  const response = await fetch(`${API_BASE_URL}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: test.text,
      hash: `test_${test.id}_${Date.now()}`,
      voiceId: voiceParams.voiceId || 'en-US-Standard-C',
      preset: voiceParams.preset || 'default',
      speed: voiceParams.speed || 1.0,
      pitch: voiceParams.pitch || 0.0,
      format: voiceParams.format || 'mp3',
      sampleRate: voiceParams.sampleRate || 24000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'UNKNOWN_ERROR' }));
    throw new Error(`HTTP ${response.status}: ${errorData.error || 'Unknown error'}`);
  }

  const data = await response.json();
  if (!data.ok || !data.audioBase64) {
    throw new Error('Invalid TTS response');
  }

  const audioBuffer = Buffer.from(data.audioBase64, 'base64');
  const { min_bytes, max_bytes } = goldenSet.validation.expectedAudioLength;
  if (audioBuffer.length < min_bytes || audioBuffer.length > max_bytes) {
    throw new Error(`Audio size out of range: ${audioBuffer.length}`);
  }

  if (data.durationMsEstimate) {
    const wordCount = test.text.trim().split(/\s+/).length;
    const msPerWord = data.durationMsEstimate / wordCount;
    const { min_ms_per_word, max_ms_per_word } = goldenSet.validation.expectedDurationRange;
    if (msPerWord < min_ms_per_word || msPerWord > max_ms_per_word) {
      throw new Error(`Duration estimate out of range: ${msPerWord.toFixed(0)}ms/word`);
    }
  }

  return {
    audioSize: audioBuffer.length,
    durationEstimate: data.durationMsEstimate,
    format: data.format,
  };
}

beforeAll(async () => {
  mockServer = await startMockTtsServer();
  API_BASE_URL = mockServer.baseUrl;
});

afterAll(async () => {
  await mockServer?.close();
});

describe('TTS regression (mock server)', () => {
  it('uses different audio for different voices', async () => {
    const testCase = goldenSet.tests[0];
    const a = await testTtsGeneration(testCase, { voiceId: 'en-US-Standard-C' });
    const b = await testTtsGeneration(testCase, { voiceId: 'en-US-Standard-D' });
    expect(a.audioSize).not.toBe(b.audioSize);
  });

  it('uses slower speed for longer duration estimate', async () => {
    const testCase = goldenSet.tests[5];
    const slow = await testTtsGeneration(testCase, { speed: 0.8 });
    const fast = await testTtsGeneration(testCase, { speed: 1.2 });
    expect(slow.durationEstimate).toBeGreaterThan(fast.durationEstimate!);
  });

  it('returns selected audio format', async () => {
    const testCase = goldenSet.tests[2];
    const wav = await testTtsGeneration(testCase, { format: 'wav' });
    const mp3 = await testTtsGeneration(testCase, { format: 'mp3' });
    expect(wav.format).toBe('wav');
    expect(mp3.format).toBe('mp3');
  });

  it('rejects invalid speed', async () => {
    const response = await fetch(`${API_BASE_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'hi', speed: 3.0 }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('SPEED_OUT_OF_RANGE');
  });

  for (const testCase of goldenSet.tests) {
    it(`golden case ${testCase.id} (${testCase.category})`, async () => {
      await expect(testTtsGeneration(testCase)).resolves.toBeDefined();
    });
  }
});
