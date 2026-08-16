import {
  dictionaryLanguageLabel,
  resolveDictionaryLanguage,
  type DictionaryLanguageCode,
} from './dictionaryLanguages';
import type { WordLookupResult } from './dictionaryTypes';
import { fetchWithTimeout, RequestTimeoutError } from '../utils/fetchWithTimeout';
import { REQUEST_TIMEOUT_MS } from '../utils/longTextProcessing';
import {
  CODE_GENERATION_USER_MESSAGE,
  guardDictionaryLookupInput,
} from '../utils/aiPromptValidation';

interface LookupResponse {
  ok: boolean;
  word?: string;
  meaning?: string;
  partOfSpeech?: string | null;
  targetLanguage?: string;
  error?: string;
  details?: string;
  blocked?: boolean;
  userMessage?: string;
  outputText?: string;
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
  const resolved = resolveDictionaryLanguage(params.targetLanguage);
  const targetLanguageCode = resolved?.code ?? params.targetLanguage;
  const targetLanguageName = resolved?.label ?? dictionaryLanguageLabel(params.targetLanguage);

  const lookupSafety = guardDictionaryLookupInput({
    word: params.word,
    context: params.context,
    source: 'dictionary_lookup_mobile',
  });
  if (!lookupSafety.allowed) {
    return {
      word: params.word,
      meaning: '',
      targetLanguage: targetLanguageCode,
      blocked: true,
      userMessage: lookupSafety.userMessage,
    };
  }

  console.log(    `[LANGUAGE:TRANSLATE_REQUEST] target=${targetLanguageName} code=${targetLanguageCode}`
  );

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${apiBaseUrl}/dictionary/lookup`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: params.word,
          context: params.context?.slice(0, 500),
          targetLanguage: targetLanguageCode,
          targetLanguageName,
          sourceLanguage: params.sourceLanguage,
        }),
      },
      REQUEST_TIMEOUT_MS.dictionary,
      'dictionary'
    );
  } catch (err) {
    if (err instanceof RequestTimeoutError) {
      throw new Error('Dictionary lookup timed out. Check your connection and try again.');
    }
    throw err;
  }

  let data: LookupResponse;
  try {
    data = (await response.json()) as LookupResponse;
  } catch {
    throw new Error(`Invalid response from server (${response.status}).`);
  }

  if (!response.ok || !data.ok) {
    const detail = data.details || data.error;
    if (response.status === 500 && detail?.includes('OPENROUTER')) {
      throw new Error('Dictionary service is not configured on the server.');
    }
    throw new Error(detail || `Lookup failed (${response.status}).`);
  }

  if (data.blocked) {
    return {
      word: data.word ?? params.word,
      meaning: '',
      partOfSpeech: null,
      targetLanguage: targetLanguageCode,
      blocked: true,
      userMessage: data.userMessage ?? CODE_GENERATION_USER_MESSAGE,
    };
  }

  if (!data.meaning) {
    throw new Error(data.details || data.error || 'Lookup failed.');
  }
  console.log(`[LANGUAGE:TRANSLATE_RESULT] target=${targetLanguageName}`);

  return {
    word: data.word ?? params.word,
    meaning: data.meaning,
    partOfSpeech: data.partOfSpeech,
    targetLanguage: targetLanguageCode,
  };
}
