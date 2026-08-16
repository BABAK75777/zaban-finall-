import {
  DEFAULT_PRACTICE_LANGUAGE,
  getAiInstruction,
  migrateAiGenerationLanguageId,
  resolvePracticeLanguage,
} from '../dictionary/dictionaryLanguages';
import {
  assertPracticeLanguageProcessable,
  IN_PROGRESS_DIALOG_MESSAGE,
  isPracticeLanguageProductActive,
} from '../dictionary/languageAvailability';
import type { PracticeWordForAi } from '../dictionary/practiceQueueTypes';
import { DEFAULT_CEFR_INDEX, cefrLevelFromIndex, type CefrLevel } from './cefrLevels';
import { CODE_GENERATION_USER_MESSAGE } from '../utils/aiPromptValidation';
import { fetchWithTimeout, RequestTimeoutError } from '../utils/fetchWithTimeout';
import { REQUEST_TIMEOUT_MS } from '../utils/requestTimeouts';

export type AiLanguageAcceptAction = 'noop' | 'save_only' | 'save_and_regenerate';

export interface AiGeneratePayload {
  prompt: string;
  cefrLevel: CefrLevel;
  tone: number;
  textLength: number;
  /** Stable practice language ID (e.g. en-US). Authoritative — never infer from prompt. */
  targetLanguage: string;
  targetLanguageName: string;
  /** BCP-47 locale for the selected practice language. */
  targetLocale: string;
  /** Concise AI instruction for the selected language/variant. */
  targetLanguageInstruction: string;
  practiceWords?: string[];
  practiceWordDetails?: PracticeWordForAi[];
  grammarFocus?: boolean;
  speakingPractice?: boolean;
  idiomsExpressions?: boolean;
}

/**
 * Decide what Accept should do by comparing stable language IDs.
 */
export function resolveAiLanguageAcceptAction(params: {
  savedLanguageId: string;
  acceptedLanguageId: string;
  hasGeneratedText: boolean;
}): AiLanguageAcceptAction {
  const saved = migrateAiGenerationLanguageId(
    params.savedLanguageId,
    DEFAULT_PRACTICE_LANGUAGE
  );
  const accepted = migrateAiGenerationLanguageId(
    params.acceptedLanguageId,
    DEFAULT_PRACTICE_LANGUAGE
  );
  // Unavailable / In Progress languages must never be accepted or regenerate.
  if (!isPracticeLanguageProductActive(accepted)) {
    return 'noop';
  }
  if (saved === accepted) return 'noop';
  if (!params.hasGeneratedText) return 'save_only';
  return 'save_and_regenerate';
}

/** Prompt used to rewrite existing lesson text into the newly accepted language. */
export function buildLanguageSwitchRegeneratePrompt(sourceText: string): string {
  const clipped = sourceText.trim().slice(0, 2500);
  return [
    'Write a new short practice text on the same topic and difficulty as the reference below.',
    'Do not translate word-for-word; rewrite naturally in the required output language.',
    '',
    'Reference text:',
    clipped,
  ].join('\n');
}

export function buildLanguageSwitchGeneratePayload(
  languageId: string,
  sourceText: string
): AiGeneratePayload {
  const id = migrateAiGenerationLanguageId(languageId, DEFAULT_PRACTICE_LANGUAGE);
  // Caller + requestAiGenerate still gate; keep payload ids canonical for active langs only.
  const lang = resolvePracticeLanguage(id);
  const label = lang?.label ?? id;
  const locale = lang?.locale ?? id;
  return {
    prompt: buildLanguageSwitchRegeneratePrompt(sourceText),
    cefrLevel: cefrLevelFromIndex(DEFAULT_CEFR_INDEX),
    tone: 0.5,
    textLength: 0.35,
    targetLanguage: id,
    targetLanguageName: label,
    targetLocale: locale,
    targetLanguageInstruction: lang?.aiInstruction ?? getAiInstruction(id),
  };
}

interface AiGenerateResponse {
  ok: boolean;
  text?: string;
  error?: string;
  details?: string;
  blocked?: boolean;
  userMessage?: string;
}

export async function requestAiGenerate(
  apiBaseUrl: string,
  payload: AiGeneratePayload
): Promise<{ blocked: boolean; text: string; userMessage?: string }> {
  // Central Practice-language product guard — must run before any network call.
  const guard = assertPracticeLanguageProcessable(payload.targetLanguage);
  if (!guard.allowed) {
    return {
      blocked: true,
      text: '',
      userMessage: IN_PROGRESS_DIALOG_MESSAGE,
    };
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${apiBaseUrl}/ai/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, targetLanguage: guard.languageId }),
      },
      REQUEST_TIMEOUT_MS.ai,
      'ai_generate'
    );
  } catch (err) {
    if (err instanceof RequestTimeoutError) {
      throw new Error('AI generation timed out. Check your connection and try again.');
    }
    throw err;
  }

  let data: AiGenerateResponse;
  try {
    data = (await response.json()) as AiGenerateResponse;
  } catch {
    throw new Error(`Invalid response from server (${response.status}).`);
  }

  if (!response.ok || !data.ok) {
    throw new Error(data.details || data.error || `Request failed (${response.status}).`);
  }

  if (data.blocked) {
    return {
      blocked: true,
      userMessage: data.userMessage ?? CODE_GENERATION_USER_MESSAGE,
      text: '',
    };
  }

  const generated = typeof data.text === 'string' ? data.text.trim() : '';
  if (!generated) {
    throw new Error('AI returned empty text.');
  }

  return { blocked: false, text: generated };
}
