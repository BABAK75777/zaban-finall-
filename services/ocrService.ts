
import { getBaseUrl } from './api';

const isDev = (import.meta as any)?.env?.DEV;

// Phase 2: OCR now uses backend, no frontend API key needed
// Log OCR status on module load (dev mode only)
if (isDev) {
  console.log('[OCR] Using backend endpoint for OCR extraction');
}

/**
 * OCR Error Codes
 */
export type OcrErrorCode = 'API_KEY_MISSING' | 'NETWORK' | 'INVALID_IMAGE' | 'UNKNOWN';

/**
 * OCR Error Class - Normalized error for graceful handling
 */
export class OcrError extends Error {
  code: OcrErrorCode;
  debugId?: string;
  details?: string;

  constructor(
    message: string,
    code: OcrErrorCode,
    options?: { debugId?: string; details?: string }
  ) {
    super(message);
    this.name = 'OcrError';
    this.code = code;
    this.debugId = options?.debugId;
    this.details = options?.details;
    
    // Maintains proper stack trace for where our error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OcrError);
    }
  }
}

export const ocrService = {
  /**
   * Extract text from image using backend OCR endpoint
   * @param base64Data - Base64 encoded image data (with or without data URL prefix)
   * @param mimeType - MIME type of the image (e.g., 'image/png', 'image/jpeg')
   * @returns Extracted text string
   * @throws Error with message "OCR_FAILED" or "OCR_API_KEY_MISSING" etc.
   */
  async extractText(base64Data: string, mimeType: string): Promise<string> {
    const requestId = Date.now().toString(36);
    
    try {
      // Prepare image data URL
      const imageDataUrl = base64Data.startsWith('data:') 
        ? base64Data 
        : `data:${mimeType};base64,${base64Data}`;

      // Test 1: Log image prefix and length before fetch
      console.log('[OCR] image prefix:', imageDataUrl?.slice(0, 30));
      console.log('[OCR] image length:', imageDataUrl?.length);

      if (isDev) {
        console.log(`[OCR:${requestId}] Sending image to backend:`, {
          mimeType,
          dataLength: base64Data.length
        });
      }

      // Call backend OCR endpoint
      const apiUrl = getBaseUrl();
      const response = await fetch(`${apiUrl}/ocr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageDataUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: 'UNKNOWN_ERROR', 
          details: `HTTP ${response.status}` 
        }));
        
        if (isDev) {
          console.error(`[OCR:${requestId}] Backend error:`, errorData);
        }

        // Map backend error codes to normalized OcrError
        if (errorData.error === 'API_KEY_MISSING') {
          throw new OcrError(
            'OCR unavailable: API key missing',
            'API_KEY_MISSING',
            { 
              debugId: errorData.debugId || requestId,
              details: errorData.details || 'OpenAI API key not configured on server'
            }
          );
        }
        
        if (errorData.error === 'API_KEY_INVALID') {
          throw new OcrError(
            'OCR unavailable: API key invalid',
            'API_KEY_MISSING', // Treat invalid as missing for UI purposes
            { 
              debugId: errorData.debugId || requestId,
              details: errorData.details || 'OpenAI API key is invalid'
            }
          );
        }
        
        if (errorData.error === 'INVALID_IMAGE') {
          throw new OcrError(
            'Invalid image provided',
            'INVALID_IMAGE',
            { 
              debugId: errorData.debugId || requestId,
              details: errorData.details || 'Image data is invalid or too short'
            }
          );
        }
        
        // Network errors
        if (response.status === 0 || response.status >= 500) {
          throw new OcrError(
            'Network error: Cannot connect to OCR service',
            'NETWORK',
            { 
              debugId: errorData.debugId || requestId,
              details: errorData.details || `HTTP ${response.status}`
            }
          );
        }
        
        // Unknown error
        throw new OcrError(
          'OCR processing failed',
          'UNKNOWN',
          { 
            debugId: errorData.debugId || requestId,
            details: errorData.details || errorData.error || 'Unknown error'
          }
        );
      }

      const data = await response.json();

      if (!data.ok) {
        if (isDev) {
          console.error(`[OCR:${requestId}] Backend returned error:`, data);
        }
        
        // Handle API_KEY_MISSING from response body
        if (data.error === 'API_KEY_MISSING') {
          throw new OcrError(
            'OCR unavailable: API key missing',
            'API_KEY_MISSING',
            { 
              debugId: data.debugId || requestId,
              details: data.details || 'OpenAI API key not configured on server'
            }
          );
        }
        
        if (data.error === 'INVALID_IMAGE') {
          throw new OcrError(
            'Invalid image provided',
            'INVALID_IMAGE',
            { 
              debugId: data.debugId || requestId,
              details: data.details || 'Image data is invalid'
            }
          );
        }
        
        // Unknown error from backend
        throw new OcrError(
          'OCR processing failed',
          'UNKNOWN',
          { 
            debugId: data.debugId || requestId,
            details: data.details || data.error || 'Unknown error'
          }
        );
      }

      const extractedText = data.text || '';
      
      if (isDev) {
        console.log(`[OCR:${requestId}] ✅ Text extracted:`, {
          textLength: extractedText.length,
          preview: extractedText.substring(0, 100) + (extractedText.length > 100 ? '...' : '')
        });
      }

      return extractedText;

    } catch (err: any) {
      if (isDev) {
        console.error(`[OCR:${requestId}] ❌ Error:`, err);
      }

      // If it's already an OcrError, re-throw as-is
      if (err instanceof OcrError) {
        throw err;
      }

      // Network errors (fetch failures, connection issues)
      if (err.message?.includes('fetch') || 
          err.message?.includes('network') || 
          err.message?.includes('Failed to fetch') ||
          err.name === 'TypeError' && err.message?.includes('fetch')) {
        throw new OcrError(
          'Network error: Cannot connect to OCR service',
          'NETWORK',
          { debugId: requestId }
        );
      }

      // Unknown error - wrap in OcrError
      throw new OcrError(
        'OCR processing failed',
        'UNKNOWN',
        { 
          debugId: requestId,
          details: err.message || 'Unknown error occurred'
        }
      );
    }
  }
};
