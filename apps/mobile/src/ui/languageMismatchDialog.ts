import { Alert } from 'react-native';
import {
  getLanguageMismatchMessage,
  LANGUAGE_MISMATCH_DIALOG_BUTTON,
  LANGUAGE_MISMATCH_DIALOG_TITLE,
} from '../ocr/ocrPracticeLanguageValidation';

/** Short blocking dialog when OCR content language does not match Practice language. */
export function showLanguageMismatchDialog(practiceLanguageId: string): void {
  Alert.alert(
    LANGUAGE_MISMATCH_DIALOG_TITLE,
    getLanguageMismatchMessage(practiceLanguageId),
    [{ text: LANGUAGE_MISMATCH_DIALOG_BUTTON, style: 'default' }]
  );
}
