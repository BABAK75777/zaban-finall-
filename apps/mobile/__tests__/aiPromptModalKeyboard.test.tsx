import React from 'react';
import { DeviceEventEmitter, Platform, useWindowDimensions } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { TestSafeAreaProvider } from '../src/test/testProviders';
import { AiPromptModal } from '../src/ui/AiPromptModal';
import { READING_TEST_IDS } from '../src/ui/testIds';
import { getTheme } from '../src/theme/themes';

const API_URL = 'http://localhost:3000';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  default: jest.fn(() => ({ width: 390, height: 844, scale: 2, fontScale: 1 })),
}));

const mockWindowDimensions = useWindowDimensions as jest.MockedFunction<typeof useWindowDimensions>;

function flattenStyle(style: unknown): Record<string, unknown> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle));
  }
  return style as Record<string, unknown>;
}

function renderAiModal(
  props: Partial<React.ComponentProps<typeof AiPromptModal>> = {},
  metrics?: { width: number; height: number }
) {
  if (metrics) {
    mockWindowDimensions.mockReturnValue({
      width: metrics.width,
      height: metrics.height,
      scale: 2,
      fontScale: 1,
    });
  } else {
    mockWindowDimensions.mockReturnValue({
      width: 390,
      height: 844,
      scale: 2,
      fontScale: 1,
    });
  }

  return render(
    <TestSafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: metrics?.width ?? 390, height: metrics?.height ?? 844 },
        insets: { top: 47, bottom: 34, left: 0, right: 0 },
      }}
    >
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

function emitKeyboardShow(height = 320) {
  const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
  act(() => {
    DeviceEventEmitter.emit(showEvent, {
      endCoordinates: { height, screenX: 0, screenY: 844 - height, width: 390 },
      duration: 250,
      easing: 'keyboard',
    });
  });
}

function emitKeyboardHide() {
  const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
  act(() => {
    DeviceEventEmitter.emit(hideEvent, {
      endCoordinates: { height: 0, screenX: 0, screenY: 844, width: 390 },
      duration: 250,
      easing: 'keyboard',
    });
  });
}

describe('AiPromptModal keyboard layout', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, text: 'Practice text.' }),
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps a single Generate control mounted in the request section', () => {
    renderAiModal();
    expect(screen.getByTestId(READING_TEST_IDS.aiModalRequestSection)).toBeTruthy();
    expect(screen.getByTestId(READING_TEST_IDS.aiPromptInput)).toBeTruthy();
    expect(screen.getAllByTestId(READING_TEST_IDS.aiModalGenerate)).toHaveLength(1);
  });

  it('uses a taller request box while the keyboard is closed', () => {
    renderAiModal();
    const input = screen.getByTestId(READING_TEST_IDS.aiPromptInput);
    const style = flattenStyle(input.props.style);
    expect(style.maxHeight).toBe(148);
    expect(style.minHeight).toBe(96);
  });

  it('shrinks the request box and keeps Generate mounted when the keyboard opens', () => {
    renderAiModal();
    emitKeyboardShow();

    const input = screen.getByTestId(READING_TEST_IDS.aiPromptInput);
    const style = flattenStyle(input.props.style);
    expect(style.maxHeight).toBe(64);
    expect(style.minHeight).toBe(40);
    expect(input.props.scrollEnabled).toBe(true);
    expect(input.props.multiline).toBe(true);

    expect(screen.getByTestId(READING_TEST_IDS.aiModalRequestSection)).toBeTruthy();
    expect(screen.getAllByTestId(READING_TEST_IDS.aiModalGenerate)).toHaveLength(1);
  });

  it('restores the taller request box after the keyboard closes', () => {
    renderAiModal();
    emitKeyboardShow();
    emitKeyboardHide();

    const style = flattenStyle(screen.getByTestId(READING_TEST_IDS.aiPromptInput).props.style);
    expect(style.maxHeight).toBe(148);
    expect(style.minHeight).toBe(96);
  });

  it('keeps long prompt text in a bounded scrollable input while keyboard is open', () => {
    renderAiModal();
    const longPrompt = Array.from({ length: 40 }, (_, i) => `Sentence ${i + 1}.`).join(' ');

    fireEvent.changeText(screen.getByTestId(READING_TEST_IDS.aiPromptInput), longPrompt);
    emitKeyboardShow();

    const input = screen.getByTestId(READING_TEST_IDS.aiPromptInput);
    const style = flattenStyle(input.props.style);
    expect(input.props.value).toBe(longPrompt);
    expect(style.maxHeight).toBe(64);
    expect(input.props.scrollEnabled).toBe(true);
    expect(screen.getAllByTestId(READING_TEST_IDS.aiModalGenerate)).toHaveLength(1);
  });

  it('preserves Prompt 2 single top inset (no fixed marginTop:48 + SafeArea top)', () => {
    const { getByTestId } = renderAiModal();
    const panel = getByTestId(READING_TEST_IDS.aiModal);
    const style = flattenStyle(panel.props.style);
    // insets.top from TestSafeAreaProvider = 47 → Math.max(16, 47) = 47
    expect(style.marginTop).toBe(47);
  });

  it('lets Generate run while the prompt is focused (no dismiss required)', async () => {
    renderAiModal();

    const input = screen.getByTestId(READING_TEST_IDS.aiPromptInput);
    fireEvent(input, 'focus');
    fireEvent.changeText(input, 'Practice travel vocabulary');
    fireEvent.press(screen.getByTestId(READING_TEST_IDS.aiModalGenerate));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.prompt).toBe('Practice travel vocabulary');
  });
});

describe('AiPromptModal unified whole-form layout', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, text: 'Practice text.' }),
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('has exactly one primary form ScrollView owning settings + request + Generate', () => {
    renderAiModal({ onOpenAiGenerationLanguage: () => {} });

    const formScroll = screen.getByTestId(READING_TEST_IDS.aiModalFormScroll);
    expect(screen.queryByTestId(READING_TEST_IDS.aiModalSettingsScroll)).toBeNull();
    expect(screen.getAllByTestId(READING_TEST_IDS.aiModalFormScroll)).toHaveLength(1);

    const settings = screen.getByTestId(READING_TEST_IDS.aiModalSettingsSection);
    const request = screen.getByTestId(READING_TEST_IDS.aiModalRequestSection);
    const input = screen.getByTestId(READING_TEST_IDS.aiPromptInput);
    const generate = screen.getByTestId(READING_TEST_IDS.aiModalGenerate);

    // Descendants of the SAME main ScrollView — not a settings-scroll + fixed-footer split.
    expect(formScroll).toContainElement(settings);
    expect(formScroll).toContainElement(request);
    expect(formScroll).toContainElement(screen.getByText('Tone / Style'));
    expect(formScroll).toContainElement(screen.getByText('Sentence Length'));
    expect(formScroll).toContainElement(screen.getByText('Speaking Practice'));
    expect(formScroll).toContainElement(screen.getByText('Your Request'));
    expect(formScroll).toContainElement(input);
    expect(formScroll).toContainElement(generate);

    // Request is in-flow (promptSectionInScroll), not flexShrink:0 pinned footer.
    expect(flattenStyle(request.props.style).flexShrink).not.toBe(0);
    expect(flattenStyle(request.props.style).flexGrow).toBe(0);
    expect(flattenStyle(request.props.style).position).not.toBe('absolute');

    // Sheet body must not be a Pressable (Pressable ancestors steal Android ScrollView pans).
    expect(screen.getByTestId(READING_TEST_IDS.aiModal).props.onPress).toBeUndefined();

    expect(screen.getAllByTestId(READING_TEST_IDS.aiModalGenerate)).toHaveLength(1);
    expect(input.props.multiline).toBe(true);
    expect(input.props.scrollEnabled).toBe(true);

    const scrollContentStyle = flattenStyle(formScroll.props.contentContainerStyle);
    expect(scrollContentStyle.flexGrow).toBeUndefined();
    expect(scrollContentStyle.justifyContent).not.toBe('space-between');
  });

  it('keyboard-open keeps the same unified hierarchy (no footer swap)', () => {
    renderAiModal({ onOpenAiGenerationLanguage: () => {} });
    emitKeyboardShow(320);

    const formScroll = screen.getByTestId(READING_TEST_IDS.aiModalFormScroll);
    expect(screen.queryByTestId(READING_TEST_IDS.aiModalSettingsScroll)).toBeNull();
    expect(screen.getAllByTestId(READING_TEST_IDS.aiModalFormScroll)).toHaveLength(1);
    expect(formScroll.props.scrollEnabled).not.toBe(false);

    expect(formScroll).toContainElement(screen.getByTestId(READING_TEST_IDS.aiModalSettingsSection));
    expect(formScroll).toContainElement(screen.getByTestId(READING_TEST_IDS.aiModalRequestSection));
    expect(formScroll).toContainElement(screen.getByText('Speaking Practice'));
    expect(formScroll).toContainElement(screen.getByText('Your Request'));
    expect(formScroll).toContainElement(screen.getByTestId(READING_TEST_IDS.aiPromptInput));
    expect(formScroll).toContainElement(screen.getByTestId(READING_TEST_IDS.aiModalGenerate));
    expect(screen.getAllByTestId(READING_TEST_IDS.aiModalGenerate)).toHaveLength(1);

    const input = screen.getByTestId(READING_TEST_IDS.aiPromptInput);
    expect(input.props.multiline).toBe(true);
    expect(input.props.scrollEnabled).toBe(true);
  });

  it('keeps request section in-flow with normal spacing (promptSectionInScroll)', () => {
    renderAiModal();
    const request = screen.getByTestId(READING_TEST_IDS.aiModalRequestSection);
    const style = flattenStyle(request.props.style);
    expect(style.flexGrow).toBe(0);
    expect(style.marginTop).toBeDefined();
  });

  it('remains whole-form scrollable with keyboard open and keeps Generate reachable', () => {
    renderAiModal();
    emitKeyboardShow();

    const formScroll = screen.getByTestId(READING_TEST_IDS.aiModalFormScroll);
    expect(formScroll.props.scrollEnabled).not.toBe(false);
    expect(screen.getByTestId(READING_TEST_IDS.aiPromptInput)).toBeTruthy();
    expect(screen.getAllByTestId(READING_TEST_IDS.aiModalGenerate)).toHaveLength(1);
    expect(formScroll).toContainElement(screen.getByTestId(READING_TEST_IDS.aiModalGenerate));
  });

  it('adapts on a short viewport without relying on one fixed height', () => {
    renderAiModal({}, { width: 360, height: 560 });

    expect(screen.getByTestId(READING_TEST_IDS.aiModalFormScroll)).toBeTruthy();
    expect(screen.getByTestId(READING_TEST_IDS.aiModalRequestSection)).toBeTruthy();
    expect(screen.getAllByTestId(READING_TEST_IDS.aiModalGenerate)).toHaveLength(1);

    const formScroll = screen.getByTestId(READING_TEST_IDS.aiModalFormScroll);
    const scrollContentStyle = flattenStyle(formScroll.props.contentContainerStyle);
    expect(scrollContentStyle.flexGrow).toBeUndefined();
    expect(scrollContentStyle.justifyContent).not.toBe('space-between');
  });

  it('on a large viewport does not use space-between / flexGrow to invent a middle gap', () => {
    renderAiModal({}, { width: 412, height: 915 });

    const formScroll = screen.getByTestId(READING_TEST_IDS.aiModalFormScroll);
    const scrollContentStyle = flattenStyle(formScroll.props.contentContainerStyle);
    expect(scrollContentStyle.flexGrow).toBeUndefined();
    expect(scrollContentStyle.justifyContent).not.toBe('space-between');

    const request = screen.getByTestId(READING_TEST_IDS.aiModalRequestSection);
    expect(formScroll).toContainElement(request);
    expect(flattenStyle(request.props.style).flexGrow).toBe(0);
  });

  it('preserves bounded multiline request box semantics', () => {
    renderAiModal();
    const input = screen.getByTestId(READING_TEST_IDS.aiPromptInput);
    expect(input.props.multiline).toBe(true);
    expect(input.props.scrollEnabled).toBe(true);
    const closed = flattenStyle(input.props.style);
    expect(closed.maxHeight).toBe(148);
    expect(closed.minHeight).toBe(96);

    emitKeyboardShow();
    const open = flattenStyle(screen.getByTestId(READING_TEST_IDS.aiPromptInput).props.style);
    expect(open.maxHeight).toBe(64);
    expect(open.minHeight).toBe(40);
  });

  it('keyboard open lifts Modal sheet via backdrop padding (no maxHeight pin / no footer swap)', () => {
    expect(Platform.OS).toBe('android');
    renderAiModal({}, { width: 390, height: 844 });
    emitKeyboardShow(320);

    const backdrop = screen.getByTestId(READING_TEST_IDS.aiModalDismiss);
    const panel = screen.getByTestId(READING_TEST_IDS.aiModal);
    const backdropStyle = flattenStyle(backdrop.props.style);
    const panelStyle = flattenStyle(panel.props.style);

    expect(backdropStyle.paddingBottom).toBe(320);
    // Panel is a plain View sheet — no keyboard maxHeight pin that fights free scrolling.
    expect(panelStyle.maxHeight).toBeUndefined();
    expect(panelStyle.marginTop).toBe(47);
    expect(panel.props.onPress).toBeUndefined();

    const formScroll = screen.getByTestId(READING_TEST_IDS.aiModalFormScroll);
    expect(formScroll).toContainElement(screen.getByTestId(READING_TEST_IDS.aiModalRequestSection));
    expect(formScroll).toContainElement(screen.getByTestId(READING_TEST_IDS.aiPromptInput));
    expect(screen.getAllByTestId(READING_TEST_IDS.aiModalGenerate)).toHaveLength(1);
    expect(screen.queryByTestId(READING_TEST_IDS.aiModalSettingsScroll)).toBeNull();
  });

  it('keyboard closed restores full panel geometry (no keyboard padding)', () => {
    renderAiModal({}, { width: 390, height: 844 });
    emitKeyboardShow(320);
    emitKeyboardHide();

    const backdropStyle = flattenStyle(screen.getByTestId(READING_TEST_IDS.aiModalDismiss).props.style);
    const panelStyle = flattenStyle(screen.getByTestId(READING_TEST_IDS.aiModal).props.style);

    expect(backdropStyle.paddingBottom).toBeUndefined();
    expect(panelStyle.maxHeight).toBeUndefined();
    expect(panelStyle.marginTop).toBe(47);
    expect(screen.getAllByTestId(READING_TEST_IDS.aiModalGenerate)).toHaveLength(1);
  });
});
