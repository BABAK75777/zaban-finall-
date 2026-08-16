import { API_BASE_URL } from '../config/apiBaseUrl';
import { fetchWithTimeout, RequestTimeoutError } from '../utils/fetchWithTimeout';
import { REQUEST_TIMEOUT_MS } from '../utils/longTextProcessing';

interface OcrResponse {
  ok?: boolean;
  text?: string;
  error?: string;
  details?: string;
  debugId?: string;
  warning?: string;
}

export async function requestOcrFromImageDataUrl(imageDataUrl: string): Promise<string> {
  const base = API_BASE_URL;
  const imageLength = imageDataUrl.length;
  const mimePrefix = imageDataUrl.slice(0, 32);
  console.log(`[OCR] request url=${base}/ocr prefix=${mimePrefix} length=${imageLength}`);

  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${base}/ocr`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageDataUrl }),
      },
      REQUEST_TIMEOUT_MS.ocr,
      'ocr'
    );
  } catch (err) {
    if (err instanceof RequestTimeoutError) {
      throw new Error('Photo read timed out. Check your connection and try again.');
    }
    throw err;
  }

  let data: OcrResponse;
  try {
    data = (await res.json()) as OcrResponse;
  } catch {
    throw new Error(`OCR failed: invalid server response (${res.status}).`);
  }

  if (!res.ok || data.ok === false) {
    const message = [data.details, data.error, data.debugId ? `id=${data.debugId}` : '']
      .filter(Boolean)
      .join(' — ');
    throw new Error(message || `OCR failed (${res.status}).`);
  }

  const text = typeof data.text === 'string' ? data.text.trim() : '';
  if (!text) {
    const hint =
      typeof data.warning === 'string' && data.warning
        ? data.warning
        : 'No readable text found in this image.';
    throw new Error(hint);
  }

  console.log(`[OCR] success textLength=${text.length}`);
  return text;
}
