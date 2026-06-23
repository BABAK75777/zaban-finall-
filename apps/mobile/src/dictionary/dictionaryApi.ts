import type { DictionaryLanguageCode } from './dictionaryLanguages';
import type { WordLookupResult } from './dictionaryTypes';

interface LookupResponse {
  ok: boolean;
  word?: string;
  meaning?: string;
  partOfSpeech?: string | null;
  targetLanguage?: string;
  error?: string;
  details?: string;
}

export async function requestWordLookup(
  apiBaseUrl: string,
  params: {
    word: string;
    context?: string;
    targetLanguage: DictionaryLanguageCode;
    sourceLanguage?: string;
  }
): Promise<WordLookupResult> {
  const response = await fetch(`${apiBaseUrl}/dictionary/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  let data: LookupResponse;
  try {
    data = (await response.json()) as LookupResponse;
  } catch {
    throw new Error(`Invalid response from server (${response.status}).`);
  }

  if (!response.ok || !data.ok || !data.meaning) {
    const detail = data.details || data.error;
    if (response.status === 500 && detail?.includes('OPENROUTER')) {
      throw new Error('Dictionary service is not configured on the server.');
    }
    throw new Error(detail || `Lookup failed (${response.status}).`);
  }

  return {
    word: data.word ?? params.word,
    meaning: data.meaning,
    partOfSpeech: data.partOfSpeech,
    targetLanguage: params.targetLanguage,
  };
}
