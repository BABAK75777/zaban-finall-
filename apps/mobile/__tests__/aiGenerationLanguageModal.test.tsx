import { Alert } from 'react-native';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TestSafeAreaProvider } from '../src/test/testProviders';
import {
  AiGenerationLanguageModal,
  AI_GENERATION_LANGUAGE_MODAL_TEST_IDS,
} from '../src/ui/AiGenerationLanguageModal';
import { getTheme } from '../src/theme/themes';
import {
  getVisiblePracticeLanguages,
  IN_PROGRESS_DIALOG_BUTTON,
  IN_PROGRESS_DIALOG_MESSAGE,
  IN_PROGRESS_DIALOG_TITLE,
  LANGUAGE_REQUEST_CTA_LABEL,
} from '../src/dictionary/languageAvailability';

describe('AiGenerationLanguageModal availability', () => {
  const theme = getTheme('dark');
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  function renderModal(
    props: Partial<React.ComponentProps<typeof AiGenerationLanguageModal>> = {}
  ) {
    return render(
      <TestSafeAreaProvider>
        <AiGenerationLanguageModal
          visible
          theme={theme}
          selected="en-US"
          onAccept={() => {}}
          onClose={() => {}}
          {...props}
        />
      </TestSafeAreaProvider>
    );
  }

  it('renders exactly the 8 product-visible Practice languages', () => {
    const { queryByTestId, getByTestId } = renderModal();
    const visible = getVisiblePracticeLanguages();
    expect(visible).toHaveLength(8);
    for (const lang of visible) {
      expect(getByTestId(AI_GENERATION_LANGUAGE_MODAL_TEST_IDS.option(lang.id))).toBeTruthy();
    }
    expect(queryByTestId(AI_GENERATION_LANGUAGE_MODAL_TEST_IDS.option('ja-JP'))).toBeNull();
    expect(queryByTestId(AI_GENERATION_LANGUAGE_MODAL_TEST_IDS.option('ar'))).toBeNull();
    expect(queryByTestId(AI_GENERATION_LANGUAGE_MODAL_TEST_IDS.option('fa'))).toBeNull();
  });

  it('shows In Progress badge on unavailable rows without lock icons', () => {
    const { getByTestId, queryAllByText } = renderModal();
    for (const id of ['fr-FR', 'de-DE', 'ru-RU', 'en-GB', 'it-IT', 'es-ES']) {
      expect(getByTestId(AI_GENERATION_LANGUAGE_MODAL_TEST_IDS.inProgressBadge(id))).toBeTruthy();
    }
    expect(queryAllByText('In Progress').length).toBeGreaterThanOrEqual(6);
    expect(queryAllByText(/🔒|lock/i)).toHaveLength(0);
  });

  it('active languages can become pending selection and Accept', () => {
    const onAccept = jest.fn();
    const { getByTestId } = renderModal({ selected: 'en-US', onAccept });
    fireEvent.press(getByTestId(AI_GENERATION_LANGUAGE_MODAL_TEST_IDS.option('tr-TR')));
    expect(onAccept).not.toHaveBeenCalled();
    fireEvent.press(getByTestId(AI_GENERATION_LANGUAGE_MODAL_TEST_IDS.accept));
    expect(onAccept).toHaveBeenCalledWith('tr-TR');
  });

  it('In Progress tap shows dialog and does not become pending selection', () => {
    const onAccept = jest.fn();
    const { getByTestId } = renderModal({ selected: 'en-US', onAccept });
    fireEvent.press(getByTestId(AI_GENERATION_LANGUAGE_MODAL_TEST_IDS.option('fr-FR')));
    expect(alertSpy).toHaveBeenCalledWith(
      IN_PROGRESS_DIALOG_TITLE,
      IN_PROGRESS_DIALOG_MESSAGE,
      expect.arrayContaining([expect.objectContaining({ text: IN_PROGRESS_DIALOG_BUTTON })])
    );
    fireEvent.press(getByTestId(AI_GENERATION_LANGUAGE_MODAL_TEST_IDS.accept));
    expect(onAccept).toHaveBeenCalledWith('en-US');
    expect(onAccept).not.toHaveBeenCalledWith('fr-FR');
  });

  it('renders language request CTA text (no invented form URL)', () => {
    const { getByTestId } = renderModal();
    expect(getByTestId(AI_GENERATION_LANGUAGE_MODAL_TEST_IDS.languageRequestCta).props.children).toBe(
      LANGUAGE_REQUEST_CTA_LABEL
    );
  });
});
