import { API_BASE_URL } from '../config/apiBaseUrl';

export async function requestOcrFromImageDataUrl(imageDataUrl: string): Promise<string> {
  const base = API_BASE_URL;
  const res = await fetch(`${base}/ocr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageDataUrl }),
  });
  const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.error || `OCR failed (${res.status})`);
  }
  const text = typeof data.text === 'string' ? data.text.trim() : '';
  if (!text) {
    throw new Error('No text found in image');
  }
  return text;
}
