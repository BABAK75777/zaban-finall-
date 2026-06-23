import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TestSafeAreaProvider } from '../src/test/testProviders';
import { AiPromptModal } from '../src/ui/AiPromptModal';
import { SLIDER_ENDPOINT_TEST_IDS } from '../src/ui/SliderEndpointRow';
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
      />
    </TestSafeAreaProvider>
  );
}

describe('AiPromptModal slider endpoints', () => {
  it('renders Lucide icon endpoints for difficulty, tone, and text length', () => {
    renderAiModal();

    expect(screen.getByTestId(SLIDER_ENDPOINT_TEST_IDS.difficulty.min)).toBeTruthy();
    expect(screen.getByTestId(SLIDER_ENDPOINT_TEST_IDS.difficulty.max)).toBeTruthy();
    expect(screen.getByTestId(SLIDER_ENDPOINT_TEST_IDS.textLength.min)).toBeTruthy();
    expect(screen.getByTestId(SLIDER_ENDPOINT_TEST_IDS.textLength.max)).toBeTruthy();
  });

  it('exposes icon accessibility labels on Chat with AI sliders', () => {
    renderAiModal();

    expect(screen.getByLabelText('Beginner')).toBeTruthy();
    expect(screen.getByLabelText('Advanced')).toBeTruthy();
    expect(screen.getByLabelText('Short')).toBeTruthy();
    expect(screen.getByLabelText('Long')).toBeTruthy();
  });

  it('keeps tone/style words visible', () => {
    renderAiModal();

    expect(screen.getByText('Academic')).toBeTruthy();
    expect(screen.getByText('Street')).toBeTruthy();
  });

  it('renders three slider rows in the AI modal', () => {
    renderAiModal();
    expect(screen.getByText('Difficulty')).toBeTruthy();
    expect(screen.getByText('Tone / Style')).toBeTruthy();
    expect(screen.getByText('Sentence Length')).toBeTruthy();
  });
});
