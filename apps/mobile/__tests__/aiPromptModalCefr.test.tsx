import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { TestSafeAreaProvider } from '../src/test/testProviders';
import { CEFR_LEVELS, cefrLevelFromIndex } from '../src/ai/cefrLevels';
import { AiPromptModal } from '../src/ui/AiPromptModal';
import { SLIDER_ENDPOINT_TEST_IDS } from '../src/ui/SliderEndpointRow';
import { READING_TEST_IDS } from '../src/ui/testIds';
import { getTheme } from '../src/theme/themes';

const API_URL = 'http://localhost:3000';

function renderAiModal(
  props: Partial<React.ComponentProps<typeof AiPromptModal>> = {}
) {
  return render(
    <TestSafeAreaProvider>
      <AiPromptModal
        visible
        onClose={() => {}}
        onGenerated={() => {}}
        apiBaseUrl={API_URL}
        theme={getTheme('dark')}
        themeId="dark"
        dictionaryTargetLanguage="en-US"
        {...props}
      />
    </TestSafeAreaProvider>
  );
}

describe('AiPromptModal CEFR difficulty', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, text: 'Practice text.' }),
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not show DIFFICULTY title', () => {
    renderAiModal();
    expect(screen.queryByText('Difficulty')).toBeNull();
    expect(screen.queryByText('DIFFICULTY')).toBeNull();
  });

  it('renders all CEFR labels A1–C2', () => {
    renderAiModal();
    for (const level of CEFR_LEVELS) {
      expect(screen.getByTestId(READING_TEST_IDS.aiCefrLabel(level))).toBeTruthy();
    }
  });

  it('defaults to B1 as the active CEFR label', () => {
    renderAiModal();
    const b1 = screen.getByTestId(READING_TEST_IDS.aiCefrLabel('B1'));
    expect(b1.props.accessibilityState?.selected).toBe(true);
  });

  it('maps slider indices 0–5 to CEFR levels', () => {
    expect(cefrLevelFromIndex(0)).toBe('A1');
    expect(cefrLevelFromIndex(3)).toBe('B2');
    expect(cefrLevelFromIndex(5)).toBe('C2');
  });

  it('includes cefrLevel in AI generation payload', async () => {
    renderAiModal({ dictionaryTargetLanguage: 'de-DE' });

    fireEvent.changeText(
      screen.getByTestId(READING_TEST_IDS.aiPromptInput),
      'Practice travel vocabulary'
    );
    fireEvent.press(screen.getByTestId(READING_TEST_IDS.aiModalGenerate));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.cefrLevel).toBe('B1');
    expect(body.targetLanguage).toBe('de-DE');
    expect(body.targetLocale).toBe('de-DE');
    expect(body.targetLanguageInstruction).toMatch(/german/i);
    expect(body.targetLanguageInstruction.toLowerCase()).not.toContain('persian (farsi)');
    expect(body.difficulty).toBeUndefined();
  });

  it('sends distinct en-US and en-GB locale instructions (mocked fetch)', async () => {
    for (const [lang, localeRe, cue] of [
      ['en-US', /^en-US$/, /american/i],
      ['en-GB', /^en-GB$/, /british/i],
    ] as const) {
      (global.fetch as jest.Mock).mockClear();
      const screen = render(
        <TestSafeAreaProvider>
          <AiPromptModal
            visible
            onClose={() => {}}
            onGenerated={() => {}}
            apiBaseUrl={API_URL}
            theme={getTheme('dark')}
            themeId="dark"
            dictionaryTargetLanguage={lang}
          />
        </TestSafeAreaProvider>
      );

      fireEvent.changeText(
        screen.getByTestId(READING_TEST_IDS.aiPromptInput),
        'یک متن کوتاه درباره سفر بنویس'
      );
      fireEvent.press(screen.getByTestId(READING_TEST_IDS.aiModalGenerate));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(init.body as string);
      expect(body.targetLanguage).toBe(lang);
      expect(body.targetLocale).toMatch(localeRe);
      expect(body.targetLanguageInstruction).toMatch(cue);
      expect(body.targetLanguageInstruction.toLowerCase()).not.toContain('persian (farsi)');
      screen.unmount();
    }
  });

  it('maps grocery CEFR indices A1–C1 for generation payload', () => {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
    levels.forEach((level, index) => {
      expect(cefrLevelFromIndex(index)).toBe(level);
    });
  });

  it('still opens and closes the modal', () => {
    const onClose = jest.fn();
    const { rerender } = render(
      <TestSafeAreaProvider>
        <AiPromptModal
          visible
          onClose={onClose}
          onGenerated={() => {}}
          apiBaseUrl={API_URL}
          theme={getTheme('dark')}
          themeId="dark"
          dictionaryTargetLanguage="fa"
        />
      </TestSafeAreaProvider>
    );

    expect(screen.getByText('Chat with AI')).toBeTruthy();
    fireEvent.press(screen.getByTestId(READING_TEST_IDS.aiModalClose));
    expect(onClose).toHaveBeenCalled();

    rerender(
      <TestSafeAreaProvider>
        <AiPromptModal
          visible={false}
          onClose={onClose}
          onGenerated={() => {}}
          apiBaseUrl={API_URL}
          theme={getTheme('dark')}
          themeId="dark"
          dictionaryTargetLanguage="fa"
        />
      </TestSafeAreaProvider>
    );
  });

  it('does not depend on English-only assumptions when target language changes', () => {
    const { rerender } = renderAiModal({ dictionaryTargetLanguage: 'en-US' });
    expect(screen.getByTestId(READING_TEST_IDS.aiCefrLabel('A1'))).toBeTruthy();

    rerender(
      <TestSafeAreaProvider>
        <AiPromptModal
          visible
          onClose={() => {}}
          onGenerated={() => {}}
          apiBaseUrl={API_URL}
          theme={getTheme('dark')}
          themeId="dark"
          dictionaryTargetLanguage="ur"
        />
      </TestSafeAreaProvider>
    );

    expect(screen.getByTestId(READING_TEST_IDS.aiCefrLabel('C2'))).toBeTruthy();
    expect(screen.getByText('Tone / Style')).toBeTruthy();
  });

  it('keeps tone and sentence length sliders with icon endpoints', () => {
    renderAiModal();
    expect(screen.getByTestId(SLIDER_ENDPOINT_TEST_IDS.toneStyle.min)).toBeTruthy();
    expect(screen.getByTestId(SLIDER_ENDPOINT_TEST_IDS.textLength.min)).toBeTruthy();
    expect(screen.queryByTestId(SLIDER_ENDPOINT_TEST_IDS.difficulty.min)).toBeNull();
  });
});
