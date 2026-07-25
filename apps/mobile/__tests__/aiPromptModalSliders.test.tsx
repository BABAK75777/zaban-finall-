import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TestSafeAreaProvider } from '../src/test/testProviders';
import { AiPromptModal } from '../src/ui/AiPromptModal';
import { SLIDER_ENDPOINT_TEST_IDS } from '../src/ui/SliderEndpointRow';
import { READING_TEST_IDS } from '../src/ui/testIds';
import { getTheme } from '../src/theme/themes';

function renderAiModal() {
  return render(
    <TestSafeAreaProvider>
      <AiPromptModal
        visible
        onClose={() => {}}
        onGenerated={() => {}}
        apiBaseUrl="http://localhost:3000"
        theme={getTheme('dark')}
        themeId="dark"
        dictionaryTargetLanguage="en-US"
      />
    </TestSafeAreaProvider>
  );
}

describe('AiPromptModal slider endpoints', () => {
  it('renders Lucide icon endpoints for tone and text length only', () => {
    renderAiModal();

    expect(screen.queryByTestId(SLIDER_ENDPOINT_TEST_IDS.difficulty.min)).toBeNull();
    expect(screen.queryByTestId(SLIDER_ENDPOINT_TEST_IDS.difficulty.max)).toBeNull();
    expect(screen.getByTestId(SLIDER_ENDPOINT_TEST_IDS.textLength.min)).toBeTruthy();
    expect(screen.getByTestId(SLIDER_ENDPOINT_TEST_IDS.textLength.max)).toBeTruthy();
  });

  it('exposes icon accessibility labels on tone and sentence length sliders', () => {
    renderAiModal();

    expect(screen.queryByLabelText('Beginner')).toBeNull();
    expect(screen.queryByLabelText('Advanced')).toBeNull();
    expect(screen.getByLabelText('Short')).toBeTruthy();
    expect(screen.getByLabelText('Long')).toBeTruthy();
  });

  it('keeps tone/style words visible', () => {
    renderAiModal();

    expect(screen.getByText('Academic')).toBeTruthy();
    expect(screen.getByText('Street')).toBeTruthy();
  });

  it('renders CEFR row and two titled slider rows in the AI modal', () => {
    renderAiModal();
    expect(screen.queryByText('Difficulty')).toBeNull();
    expect(screen.getByText('Tone / Style')).toBeTruthy();
    expect(screen.getByText('Sentence Length')).toBeTruthy();
    expect(screen.getByTestId(READING_TEST_IDS.aiCefrSlider)).toBeTruthy();
  });

  it('shows prompt text literally in TextInput, never as HTML', () => {
    renderAiModal();
    const unsafePrompt = '<script>alert(1)</script>';
    const input = screen.getByTestId(READING_TEST_IDS.aiPromptInput);

    fireEvent.changeText(input, unsafePrompt);

    expect(input.props.value).toBe(unsafePrompt);
    expect(screen.queryByText('alert(1)')).toBeNull();
  });
});
