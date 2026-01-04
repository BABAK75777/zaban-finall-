/**
 * Backend Text Chunker - Splits text into chunks for TTS
 * Matches frontend chunking logic for consistency
 */

const MAX_CHUNK_SIZE = 1500;
const TARGET_CHUNK_SIZE = 1200;
const MIN_CHUNK_SIZE = 50;

function normalize(text) {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n');
}

function splitLongText(text) {
  const parts = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let current = '';
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    
    if (trimmed.length > MAX_CHUNK_SIZE) {
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

export function chunkText(text, maxChars = MAX_CHUNK_SIZE) {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const normalized = normalize(text);

  if (normalized.length <= maxChars) {
    return [normalized];
  }

  const chunks = [];
  const paragraphs = normalized.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();

    if (currentChunk.length === 0) {
      if (trimmedPara.length <= maxChars) {
        currentChunk = trimmedPara;
      } else {
        const sentenceChunks = splitLongText(trimmedPara);
        for (const sc of sentenceChunks) {
          if (currentChunk.length + sc.length + 1 <= maxChars) {
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
      const combined = currentChunk + '\n\n' + trimmedPara;
      if (combined.length <= maxChars) {
        currentChunk = combined;
      } else {
        if (currentChunk.trim().length >= MIN_CHUNK_SIZE) {
          chunks.push(currentChunk.trim());
        }
        if (trimmedPara.length <= maxChars) {
          currentChunk = trimmedPara;
        } else {
          const sentenceChunks = splitLongText(trimmedPara);
          currentChunk = sentenceChunks[0] || '';
          for (let i = 1; i < sentenceChunks.length; i++) {
            if (currentChunk.length + sentenceChunks[i].length + 1 <= maxChars) {
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

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.trim().length >= MIN_CHUNK_SIZE || chunks.length === 1);
}

