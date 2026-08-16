import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestOcrFromImageDataUrl } from '../apps/mobile/src/ocr/ocrApi';

vi.mock('../apps/mobile/src/config/apiBaseUrl', () => ({
  API_BASE_URL: 'https://example.test',
}));

describe('ocrApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns trimmed text from successful OCR response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, text: '  Hello from photo  ' }),
      })
    );

    await expect(requestOcrFromImageDataUrl('data:image/jpeg;base64,abc')).resolves.toBe(
      'Hello from photo'
    );
  });

  it('throws when OCR response has no text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, text: '' }),
      })
    );

    await expect(requestOcrFromImageDataUrl('data:image/jpeg;base64,abc')).rejects.toThrow(
      'No readable text found in this image.'
    );
  });

  it('throws server error message on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: 'OCR unavailable', details: 'Vision model offline' }),
      })
    );

    await expect(requestOcrFromImageDataUrl('data:image/jpeg;base64,abc')).rejects.toThrow(
      'Vision model offline'
    );
  });
});
