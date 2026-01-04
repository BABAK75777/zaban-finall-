/**
 * Text Chunking - Deterministic text splitting for TTS
 */

export interface Chunk {
  index: number;
  text: string;
  hash: string;
  charCount: number;
}

export interface ChunkInfo {
  text: string;
  index: number;
  total: number;
}

// Chunk size configuration
const MAX_CHUNK_SIZE = 1500;
const TARGET_CHUNK_SIZE = 1200;
const MIN_CHUNK_SIZE = 50;

/**
 * Normalize text for consistent hashing
 */
export function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n');
}

/**
 * Split text into chunks at paragraph/sentence boundaries
 * Deterministic: same input always produces same chunks
 */
export function chunkText(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const normalized = normalizeText(text);

  // If text is short enough, return as single chunk
  if (normalized.length <= MAX_CHUNK_SIZE) {
    return [normalized];
  }

  const chunks: string[] = [];

  // First, try to split by paragraphs (double newlines)
  const paragraphs = normalized.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();

    // If paragraph fits, add it
    if (currentChunk.length === 0) {
      if (trimmedPara.length <= MAX_CHUNK_SIZE) {
        currentChunk = trimmedPara;
      } else {
        // Paragraph too long, split by sentences
        const sentenceChunks = splitLongText(trimmedPara);
        for (const sc of sentenceChunks) {
          if (currentChunk.length + sc.length + 1 <= MAX_CHUNK_SIZE) {
            currentChunk = currentChunk ? currentChunk + ' ' + sc : sc;
          } else {
            if (currentChunk.trim().length >= MIN_CHUNK_SIZE) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = sc;
          }
        }
      }
    } else {
      // Try to add paragraph to current chunk
      const combined = currentChunk + '\n\n' + trimmedPara;
      if (combined.length <= MAX_CHUNK_SIZE) {
        currentChunk = combined;
      } else {
        // Current chunk is full, save it
        if (currentChunk.trim().length >= MIN_CHUNK_SIZE) {
          chunks.push(currentChunk.trim());
        }
        // Start new chunk with this paragraph
        if (trimmedPara.length <= MAX_CHUNK_SIZE) {
          currentChunk = trimmedPara;
        } else {
          // Split long paragraph
          const sentenceChunks = splitLongText(trimmedPara);
          currentChunk = sentenceChunks[0] || '';
          for (let i = 1; i < sentenceChunks.length; i++) {
            if (currentChunk.length + sentenceChunks[i].length + 1 <= MAX_CHUNK_SIZE) {
              currentChunk = currentChunk + ' ' + sentenceChunks[i];
            } else {
              if (currentChunk.trim().length >= MIN_CHUNK_SIZE) {
                chunks.push(currentChunk.trim());
              }
              currentChunk = sentenceChunks[i];
            }
          }
        }
      }
    }
  }

  // Add remaining chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  // Filter out empty chunks
  return chunks.filter(chunk => chunk.trim().length >= MIN_CHUNK_SIZE || chunks.length === 1);
}

/**
 * Split long text by sentences, then by punctuation if needed
 */
function splitLongText(text: string): string[] {
  const parts: string[] = [];
  
  // Split by sentences first
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let current = '';
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    
    if (trimmed.length > MAX_CHUNK_SIZE) {
      // Sentence is too long, split by commas/semicolons
      if (current.trim().length >= MIN_CHUNK_SIZE) {
        parts.push(current.trim());
      }
      current = '';
      
      const commaParts = trimmed.split(/([,;:]\s+)/);
      for (const part of commaParts) {
        if ((current + part).length <= MAX_CHUNK_SIZE) {
          current += part;
        } else {
          if (current.trim().length >= MIN_CHUNK_SIZE) {
            parts.push(current.trim());
          }
          current = part;
        }
      }
    } else {
      // Normal sentence
      if ((current + ' ' + trimmed).length <= MAX_CHUNK_SIZE) {
        current = current ? current + ' ' + trimmed : trimmed;
      } else {
        if (current.trim().length >= MIN_CHUNK_SIZE) {
          parts.push(current.trim());
        }
        current = trimmed;
      }
    }
  }
  
  if (current.trim().length > 0) {
    parts.push(current.trim());
  }
  
  return parts.filter(p => p.trim().length >= MIN_CHUNK_SIZE);
}

/**
 * Get chunk information for UI display
 */
export function getChunkInfo(chunks: string[], index: number): ChunkInfo {
  return {
    text: chunks[index] || '',
    index: index + 1,
    total: chunks.length,
  };
}

