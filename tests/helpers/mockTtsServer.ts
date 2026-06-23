import express from 'express';
import http from 'http';
import type { AddressInfo } from 'net';

export type MockTtsServer = {
  baseUrl: string;
  close: () => Promise<void>;
};

/**
 * In-process TTS stub for regression tests — no live backend required.
 */
export async function startMockTtsServer(): Promise<MockTtsServer> {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.post('/tts', (req, res) => {
    const { text, voiceId, speed = 1, format = 'mp3' } = req.body ?? {};

    if (typeof speed === 'number' && speed > 2) {
      return res.status(400).json({ ok: false, error: 'SPEED_OUT_OF_RANGE' });
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ ok: false, error: 'EMPTY_TEXT' });
    }

    const wordCount = Math.max(1, text.trim().split(/\s+/).length);
    const voiceSeed = Array.from(String(voiceId ?? 'default')).reduce(
      (sum, ch) => sum + ch.charCodeAt(0),
      0
    );
    const audioSize = 1500 + voiceSeed * 120 + text.length;
    const audioBase64 = Buffer.alloc(audioSize, 0x41).toString('base64');
    const durationMsEstimate = Math.round((wordCount * 500) / Math.max(0.5, Number(speed) || 1));

    return res.json({
      ok: true,
      audioBase64,
      durationMsEstimate,
      format: String(format).toLowerCase(),
    });
  });

  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
