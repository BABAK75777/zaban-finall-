import { Alert } from 'react-native';
import {
  IN_PROGRESS_DIALOG_BUTTON,
  IN_PROGRESS_DIALOG_MESSAGE,
  IN_PROGRESS_DIALOG_TITLE,
} from '../dictionary/languageAvailability';

/** Short blocking dialog for unavailable (In Progress) languages. */
export function showInProgressLanguageDialog(): void {
  Alert.alert(IN_PROGRESS_DIALOG_TITLE, IN_PROGRESS_DIALOG_MESSAGE, [
    { text: IN_PROGRESS_DIALOG_BUTTON, style: 'default' },
  ]);
}
