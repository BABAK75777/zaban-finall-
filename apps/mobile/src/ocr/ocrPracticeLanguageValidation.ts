import {
  DEFAULT_PRACTICE_LANGUAGE,
  migrateAiGenerationLanguageId,
} from '../dictionary/dictionaryLanguages';
import { isPracticeLanguageProductActive } from '../dictionary/languageAvailability';

/** Result of Practice-language validation for Camera / Gallery / OCR import. */
export type OcrPracticeLanguageValidationStatus =
  | 'ALLOW'
  | 'LANGUAGE_MISMATCH'
  | 'LANGUAGE_UNAVAILABLE';

export type OcrPracticeLanguageValidationResult = {
  status: OcrPracticeLanguageValidationStatus;
  practiceLanguageId: string;
  detectedContentLanguage?: DetectedOcrContentLanguage;
};

export type DetectedOcrContentLanguage = 'en' | 'tr' | 'fa' | 'other' | 'mixed';

export const LANGUAGE_MISMATCH_DIALOG_TITLE = 'Language Mismatch';
export const LANGUAGE_MISMATCH_DIALOG_BUTTON = 'OK';

const PERSIAN_ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const CYRILLIC_SCRIPT = /[\u0400-\u04FF]/;
const GREEK_SCRIPT = /[\u0370-\u03FF]/;
const CJK_SCRIPT = /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/;
const TURKISH_LATIN_MARKERS = /[ğüşöçıİĞÜŞÖÇ]/;

/** Common Turkish tokens for Latin-only OCR without diacritics. */
const TURKISH_WORD_PATTERN =
  /\b(merhaba|ve|bir|bu|için|ile|de|da|mi|mu|mı|mü|var|yok|ben|sen|biz|siz|onlar|nasıl|tesekkur|teşekkür|evet|hayır|guzel|güzel|bugun|bugün|yarin|yarın|dun|dün|cok|çok|az|iyi|kotu|kötü|lutfen|lütfen|tamam|hos|hoş|geldiniz|ederim|selam|turkce|türkçe)\b/giu;

/** Common English tokens for Latin OCR. */
const ENGLISH_WORD_PATTERN =
  /\b(the|and|is|are|was|were|have|has|had|this|that|with|from|they|what|when|where|which|who|will|would|could|should|hello|world|please|thank|you|your|about|into|through|during|before|after|here|there|some|such|only|other|than|too|very|can|just|not|but|for|of|to|in|on|at|by|an|be|as|or|if|it|he|she|we|my|me|his|her|its|our|their|them|these|those|being|been|having|doing|say|said|says|get|got|make|made|know|think|see|want|come|look|use|find|give|tell|work|call|try|ask|need|feel|become|leave|put|mean|keep|let|begin|seems|help|show|hear|play|run|move|live|believe|bring|happen|write|provide|sit|stand|lose|pay|meet|include|continue|set|learn|change|lead|understand|watch|follow|stop|create|speak|read|allow|add|spend|grow|open|walk|win|offer|remember|love|consider|appear|buy|wait|serve|send|expect|build|stay|fall|cut|reach|kill|remain|suggest|raise|pass|sell|require|report|decide|pull)\b/gi;

function countPatternMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) || []).length;
}

function hasPersianArabicScript(text: string): boolean {
  return PERSIAN_ARABIC_SCRIPT.test(text);
}

function hasNonLatinScript(text: string): boolean {
  return CYRILLIC_SCRIPT.test(text) || GREEK_SCRIPT.test(text) || CJK_SCRIPT.test(text);
}

function hasTurkishLatinMarkers(text: string): boolean {
  return TURKISH_LATIN_MARKERS.test(text);
}

function inferLatinContentLanguage(text: string): 'en' | 'tr' | 'ambiguous' {
  if (hasTurkishLatinMarkers(text)) {
    return 'tr';
  }
  const turkishScore = countPatternMatches(text, TURKISH_WORD_PATTERN);
  const englishScore = countPatternMatches(text, ENGLISH_WORD_PATTERN);
  if (turkishScore > englishScore && turkishScore >= 1) {
    return 'tr';
  }
  if (englishScore > turkishScore && englishScore >= 1) {
    return 'en';
  }
  if (turkishScore > 0 && englishScore > 0) {
    return 'ambiguous';
  }
  return 'ambiguous';
}

/** Deterministic content-language analysis for OCR text (active Practice langs only). */
export function analyzeOcrContentLanguage(text: string): DetectedOcrContentLanguage {
  const trimmed = text.trim();
  if (!trimmed) {
    return 'mixed';
  }

  if (hasNonLatinScript(trimmed)) {
    return 'other';
  }

  const hasPersian = hasPersianArabicScript(trimmed);
  const latinLanguage = inferLatinContentLanguage(trimmed);

  if (hasPersian && latinLanguage !== 'ambiguous') {
    return 'mixed';
  }
  if (hasPersian) {
    return 'fa';
  }
  if (latinLanguage === 'ambiguous') {
    // Latin OCR without clear lexical signal defaults to English (blocks under Turkish practice).
    return 'en';
  }
  return latinLanguage;
}

export function getLanguageMismatchMessage(practiceLanguageId: string): string {
  const id = migrateAiGenerationLanguageId(practiceLanguageId, DEFAULT_PRACTICE_LANGUAGE);
  if (id === 'tr-TR') {
    return 'This content is not in Turkish. Please change your practice language.';
  }
  return 'This content is not in English. Please change your practice language.';
}

function expectedContentLanguageForPractice(
  practiceLanguageId: string
): 'en' | 'tr' | null {
  const id = migrateAiGenerationLanguageId(practiceLanguageId, DEFAULT_PRACTICE_LANGUAGE);
  if (id === 'en-US') return 'en';
  if (id === 'tr-TR') return 'tr';
  return null;
}

/** Gate before Camera/Gallery/OCR when Practice language is unavailable. */
export function validatePracticeLanguageForOcrEntry(
  practiceLanguageId: string | null | undefined
): OcrPracticeLanguageValidationResult {
  const migrated = migrateAiGenerationLanguageId(
    practiceLanguageId,
    DEFAULT_PRACTICE_LANGUAGE
  );
  if (!isPracticeLanguageProductActive(practiceLanguageId)) {
    return {
      status: 'LANGUAGE_UNAVAILABLE',
      practiceLanguageId: migrated,
    };
  }
  return {
    status: 'ALLOW',
    practiceLanguageId: migrated,
  };
}

/** Central post-OCR content guard — blocks mismatched imported text. */
export function validateOcrContentForPractice(
  practiceLanguageId: string,
  ocrText: string
): OcrPracticeLanguageValidationResult {
  const entry = validatePracticeLanguageForOcrEntry(practiceLanguageId);
  if (entry.status !== 'ALLOW') {
    return entry;
  }

  const expected = expectedContentLanguageForPractice(entry.practiceLanguageId);
  const detected = analyzeOcrContentLanguage(ocrText);

  if (!expected) {
    return {
      status: 'LANGUAGE_UNAVAILABLE',
      practiceLanguageId: entry.practiceLanguageId,
      detectedContentLanguage: detected,
    };
  }

  if (detected === 'mixed' || detected === 'other' || detected === 'fa' || detected !== expected) {
    return {
      status: 'LANGUAGE_MISMATCH',
      practiceLanguageId: entry.practiceLanguageId,
      detectedContentLanguage: detected,
    };
  }

  return {
    status: 'ALLOW',
    practiceLanguageId: entry.practiceLanguageId,
    detectedContentLanguage: detected,
  };
}
