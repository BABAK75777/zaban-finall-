import fs from 'fs';
import path from 'path';
import React from 'react';
import { render } from '@testing-library/react-native';
import { TestSafeAreaProvider } from '../src/test/testProviders';
import { MAX_CONTENT_WIDTH } from '../src/ui/responsiveLayout';
import { WordLookupSheet, WORD_LOOKUP_TEST_IDS } from '../src/ui/WordLookupSheet';
import { getTheme } from '../src/theme/themes';

describe('responsive overlay layout regressions', () => {
  const theme = getTheme('dark');

  it('WordLookupSheet caps panel width and remains renderable with safe-area insets', () => {
    const { getByTestId } = render(
      <TestSafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 414, height: 896 },
          insets: { top: 59, bottom: 34, left: 0, right: 0 },
        }}
      >
        <WordLookupSheet
          visible
          theme={theme}
          displayWord="hello"
          targetLanguage="fa"
          meaning="سلام"
          loading={false}
          error={null}
          savedToDictionary={false}
          practiceUsedCount={0}
          practiceTargetUses={3}
          practiceStarred={false}
          lookupCount={1}
          canToggleSave
          onClose={() => {}}
          onToggleSave={() => {}}
        />
      </TestSafeAreaProvider>
    );

    const panel = getByTestId(WORD_LOOKUP_TEST_IDS.sheet);
    const flat = Array.isArray(panel.props.style)
      ? Object.assign({}, ...panel.props.style)
      : panel.props.style;
    expect(flat.maxWidth).toBe(MAX_CONTENT_WIDTH);
    expect(flat.width).toBe('100%');
  });

  it('Settings modal uses dynamic top inset (not fixed paddingTop only)', () => {
    const indexSrc = fs.readFileSync(path.join(__dirname, '..', 'app', 'index.tsx'), 'utf8');
    expect(indexSrc).toContain('safeInsets.top');
    expect(indexSrc).toContain('MAX_CONTENT_WIDTH');
    expect(indexSrc).toMatch(/paddingTop:\s*Math\.max\(56,\s*safeInsets\.top/);
  });

  it('FullScreenModalShell does not double-apply top SafeArea with fixed top:48', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'ui', 'FullScreenModalShell.tsx'),
      'utf8'
    );
    expect(src).toContain("edges={['bottom']}");
    expect(src).toContain('useSafeAreaInsets');
    expect(src).not.toMatch(/top:\s*48/);
    expect(src).not.toMatch(/edges=\{\['top',\s*'bottom'\]\}/);
  });

  it('AiPromptModal sheet top uses insets once (keyboard footer unchanged)', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'ui', 'AiPromptModal.tsx'),
      'utf8'
    );
    expect(src).toMatch(/panelTopMargin\s*=\s*Math\.max\(16,\s*insets\.top\)/);
    expect(src).toContain('marginTop: panelTopMargin');
    expect(src).toContain('edges={[]}');
    // Prompt 3 keyboard-open request box shrink.
    expect(src).toContain('inputShellKeyboard');
    expect(src).toContain('promptInputKeyboard');
    expect(src).toContain('keyboardOpen');
    expect(src).toContain('KeyboardAvoidingView');
    expect(src).toMatch(/paddingBottom:\s*keyboardOpen\s*\?\s*space\.sm\s*:\s*insets\.bottom/);
    // Unified form scroll (Android + iOS) — no flexGrow bottom-push on scroll content.
    expect(src).toContain('aiModalFormScroll');
    expect(src).not.toContain('aiModalSettingsScroll');
    expect(src).toContain('promptSectionInScroll');
    expect(src).not.toMatch(/styles\.promptFooter[^K]/);
    const scrollContentBlock = src.match(/scrollContent:\s*\{[^}]*\}/);
    expect(scrollContentBlock?.[0] ?? '').not.toMatch(/flexGrow:\s*1/);
    expect(scrollContentBlock?.[0] ?? '').not.toMatch(/justifyContent:\s*['"]space-between['"]/);
    // Android Modal keyboard reflow uses measured keyboard height (not adjustResize alone).
    expect(src).toContain('androidKeyboardHeight');
    expect(src).toContain('paddingBottom: androidKeyboardHeight');
    expect(src).toContain('endCoordinates');
    // Sheet body is a View — Pressable ancestors steal Android ScrollView pans.
    expect(src).toMatch(/testID=\{READING_TEST_IDS\.aiModal\}/);
    expect(src).not.toMatch(/onPress=\{\(e\)\s*=>\s*e\.stopPropagation\(\)\}/);
  });

  it('PracticeTextModal input minHeight scales with window height', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'ui', 'PracticeTextModal.tsx'),
      'utf8'
    );
    expect(src).toContain('useWindowDimensions');
    expect(src).toContain('windowHeight * 0.35');
    expect(src).not.toMatch(/inputShell:[\s\S]*?minHeight:\s*320/);
    expect(src).not.toMatch(/input:[\s\S]*?minHeight:\s*280/);
  });
});
