/**
 * Download Service - Handles chunk and session downloads
 */

import { getBaseUrl } from './api';

/**
 * Download a single chunk as audio file
 */
export async function downloadChunk(
  sessionId: string,
  chunkIndex: number,
  filename?: string
): Promise<void> {
  try {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/tts/session/${sessionId}/chunk/${chunkIndex}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download chunk: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlObj;
    a.download = filename || `chunk-${chunkIndex}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(urlObj);
  } catch (error) {
    console.error('Error downloading chunk:', error);
    throw error;
  }
}

/**
 * Download entire session as merged audio file
 */
export async function downloadSession(
  sessionId: string,
  filename?: string
): Promise<void> {
  try {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/tts/session/${sessionId}/export`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        format: 'mp3',
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.error === 'CHUNKS_INCOMPLETE' || errorData.error === 'NO_CHUNKS_READY') {
        throw new Error('Session is still being generated. Please wait and try again.');
      }
      throw new Error(`Failed to export session: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlObj;
    a.download = filename || `tts-session-${sessionId}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(urlObj);
  } catch (error) {
    console.error('Error downloading session:', error);
    throw error;
  }
}

/**
 * Download chunk from blob directly
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

