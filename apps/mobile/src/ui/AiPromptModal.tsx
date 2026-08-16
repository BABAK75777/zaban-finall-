import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { glassStyle } from '../theme/glass';
import type { ThemeId, ThemePalette } from '../theme/themeTypes';
import { CefrLevelSlider } from './CefrLevelSlider';
import { SettingSlider } from './SettingSlider';
import { SliderEndpointRow, type SliderEndpointPresetKey } from './SliderEndpointRow';
import { READING_TEST_IDS } from './testIds';
import { space } from './spacing';
import {
  cefrLevelFromIndex,
  DEFAULT_CEFR_INDEX,
  type CefrLevel,
} from '../ai/cefrLevels';
import {
  resolvePracticeOutputLanguage,
} from '../utils/resolvePracticeOutputLanguage';
import {
  dictionaryLanguageLabel,
  getAiInstruction,
  resolvePracticeLanguage,
} from '../dictionary/dictionaryLanguages';
import type { DictionaryLanguageCode } from '../dictionary/dictionaryLanguages';
import type { PracticeWordForAi } from '../dictionary/practiceQueueTypes';
import {
  AI_PROMPT_MAX_LENGTH,
  CODE_GENERATION_USER_MESSAGE,
  guardAiInput,
  validateAiPrompt,
} from '../utils/aiPromptValidation';
import { REQUEST_TIMEOUT_MS } from '../utils/requestTimeouts';
import { requestAiGenerate, type AiGeneratePayload } from '../ai/aiLanguageChange';

export type AiVoiceType = 'male' | 'female';

export interface AiPromptSettings {
  prompt: string;
  grammarFocus: boolean;
  idiomsExpressions: boolean;
  speakingPractice: boolean;
  cefrIndex: number;
  tone: number;
  textLength: number;
}

const FEATURE_TOGGLES = [
  { key: 'grammarFocus' as const, label: 'Grammar Focus' },
  { key: 'idiomsExpressions' as const, label: 'Idioms & Expressions' },
  { key: 'speakingPractice' as const, label: 'Speaking Practice' },
];

function defaultSettings(): AiPromptSettings {
  return {
    prompt: '',
    grammarFocus: false,
    idiomsExpressions: false,
    speakingPractice: false,
    cefrIndex: DEFAULT_CEFR_INDEX,
    tone: 0.5,
    textLength: 0.35,
  };
}

export type { AiGeneratePayload };

export interface AiGeneratedMeta {
  practiceWordDetails?: PracticeWordForAi[];
}

interface AiPromptModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerated: (text: string, meta?: AiGeneratedMeta) => void;
  onGeneratingChange?: (generating: boolean) => void;
  apiBaseUrl: string;
  theme: ThemePalette;
  themeId: ThemeId;
  practiceWordDetails?: PracticeWordForAi[];
  useDictionaryInAi?: boolean;
  /** AI Generation Language (practiceLanguage storage key). */
  dictionaryTargetLanguage: DictionaryLanguageCode;
  onOpenAiGenerationLanguage?: () => void;
  /** Bumped by parent on AI language change so stale generates are ignored. */
  generationTokenRef?: React.MutableRefObject<number>;
}

interface SliderRowProps {
  title: string;
  preset: SliderEndpointPresetKey;
  value: number;
  onChange: (v: number) => void;
  theme: ThemePalette;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

function SliderRow({ title, preset, value, onChange, theme, onDragStart, onDragEnd }: SliderRowProps) {
  const colors = theme;
  const s = colors.slider;
  return (
    <View style={styles.sliderSection}>
      <Text style={[styles.sliderSectionTitle, { color: colors.textDim }]}>{title}</Text>
      <SliderEndpointRow
        value={value}
        min={0}
        max={1}
        mutedColor={colors.textMuted}
        accentColor={colors.accent}
        preset={preset}
        labelMarginBottom={2}
      />
      <SettingSlider
        value={value}
        min={0}
        max={1}
        step={0.05}
        onChange={onChange}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        accent={s.fill}
        border={s.border}
        track={s.track}
        compact
        bilateral
      />
    </View>
  );
}

export function AiPromptModal({
  visible,
  onClose,
  onGenerated,
  onGeneratingChange,
  apiBaseUrl,
  theme,
  themeId,
  practiceWordDetails = [],
  useDictionaryInAi = false,
  dictionaryTargetLanguage,
  onOpenAiGenerationLanguage,
  generationTokenRef,
}: AiPromptModalProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const inputRef = useRef<TextInput>(null);
  const generateInFlightRef = useRef(false);
  const [settings, setSettings] = useState<AiPromptSettings>(defaultSettings);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  /** Android Modal does not reliably resize with adjustResize — track height explicitly. */
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const colors = theme;
  const keyboardAppearance = themeId === 'light' || themeId === 'cream' ? 'light' : 'dark';
  const panelTopMargin = Math.max(16, insets.top);
  /** Viewport-relative bottom breathing room inside the unified form scroll. */
  const formScrollBottomPad = Math.max(
    space.md,
    Math.round(windowHeight * (keyboardOpen ? 0.02 : 0.04))
  );
  /**
   * Android Modal is a separate window — activity adjustResize does not shrink the sheet.
   * Lift via backdrop paddingBottom; iOS relies on KeyboardAvoidingView padding.
   */
  const androidKeyboardOpen = Platform.OS === 'android' && androidKeyboardHeight > 0;

  const handleSliderDragStart = useCallback(() => {
    setScrollEnabled(false);
  }, []);

  const handleSliderDragEnd = useCallback(() => {
    setScrollEnabled(true);
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardOpen(true);
      if (Platform.OS === 'android') {
        const height = Math.max(0, Math.round(event.endCoordinates?.height ?? 0));
        setAndroidKeyboardHeight(height);
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardOpen(false);
      setAndroidKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      setKeyboardOpen(false);
      setAndroidKeyboardHeight(0);
      setGenerating(false);
      setScrollEnabled(true);
      generateInFlightRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    onGeneratingChange?.(generating);
  }, [generating, onGeneratingChange]);

  const patch = useCallback((partial: Partial<AiPromptSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const toggleFeature = useCallback((key: keyof Pick<AiPromptSettings, 'grammarFocus' | 'idiomsExpressions' | 'speakingPractice'>) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (generateInFlightRef.current || generating) {
      return;
    }

    const prompt = settings.prompt.trim();
    if (!prompt) {
      Alert.alert('Missing request', 'Describe what you want to practice first.');
      return;
    }

    const validation = validateAiPrompt(prompt);
    if (!validation.ok) {
      Alert.alert('Invalid prompt', validation.error);
      return;
    }

    const inputSafety = guardAiInput(validation.prompt, { source: 'ai_story_modal' });
    if (!inputSafety.allowed) {
      Alert.alert('Not available', inputSafety.userMessage);
      return;
    }

    const outputLanguage = resolvePracticeOutputLanguage(
      inputSafety.input,
      dictionaryTargetLanguage
    );
    const langMeta = resolvePracticeLanguage(outputLanguage.code);
    const targetLocale = langMeta?.locale ?? outputLanguage.code;
    const targetLanguageInstruction =
      langMeta?.aiInstruction ?? getAiInstruction(outputLanguage.code);
    const includePractice = useDictionaryInAi && practiceWordDetails.length > 0;
    console.log(
      `[LANGUAGE:AI_GENERATE] target=${outputLanguage.language} code=${outputLanguage.code} locale=${targetLocale} explicit=${outputLanguage.explicit}`
    );
    const selectedCefrLevel = cefrLevelFromIndex(settings.cefrIndex);
    const payload: AiGeneratePayload = {
      prompt: inputSafety.input,
      cefrLevel: selectedCefrLevel,
      tone: settings.tone,
      textLength: settings.textLength,
      grammarFocus: settings.grammarFocus,
      speakingPractice: settings.speakingPractice,
      idiomsExpressions: settings.idiomsExpressions,
      targetLanguage: outputLanguage.code,
      targetLanguageName: outputLanguage.language,
      targetLocale,
      targetLanguageInstruction,
      ...(includePractice
        ? {
            practiceWords: practiceWordDetails.map((w) => w.displayWord),
            practiceWordDetails,
          }
        : {}),
    };

    generateInFlightRef.current = true;
    setGenerating(true);
    Keyboard.dismiss();
    const tokenAtStart = generationTokenRef?.current ?? 0;

    try {
      const result = await requestAiGenerate(apiBaseUrl, payload);
      if (generationTokenRef && tokenAtStart !== generationTokenRef.current) {
        return;
      }
      if (result.blocked) {
        Alert.alert('Not available', result.userMessage ?? CODE_GENERATION_USER_MESSAGE);
        return;
      }
      onGenerated(
        result.text,
        includePractice ? { practiceWordDetails: [...practiceWordDetails] } : undefined
      );
      onClose();
    } catch (error) {
      if (generationTokenRef && tokenAtStart !== generationTokenRef.current) {
        return;
      }
      const message = error instanceof Error ? error.message : 'Generation failed.';
      Alert.alert('AI generation failed', message);
    } finally {
      generateInFlightRef.current = false;
      setGenerating(false);
    }
  }, [apiBaseUrl, dictionaryTargetLanguage, generating, generationTokenRef, onClose, onGenerated, practiceWordDetails, settings, useDictionaryInAi]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const generateButton = (
    <Pressable
      onPress={() => void handleGenerate()}
      disabled={generating}
      style={({ pressed }) => [
        styles.generateBtn,
        keyboardOpen && styles.generateBtnKeyboard,
        {
          backgroundColor: colors.selection.bg,
          borderColor: colors.selection.border,
          shadowColor: colors.buttons.micGlow,
          opacity: generating ? 0.72 : 1,
        },
        pressed && !generating && { opacity: 0.92, transform: [{ scale: 0.99 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Generate"
      accessibilityState={{ disabled: generating, busy: generating }}
      testID={READING_TEST_IDS.aiModalGenerate}
    >
      {generating ? (
        <View style={styles.generateLoadingRow}>
          <ActivityIndicator color={colors.selection.text} size="small" />
          <Text style={[styles.generateLabel, { color: colors.selection.text }]}>
            Generating…
          </Text>
        </View>
      ) : (
        <Text style={[styles.generateLabel, { color: colors.selection.text }]}>Generate</Text>
      )}
    </Pressable>
  );

  const promptField = (
    <View
      style={[
        styles.inputShell,
        keyboardOpen && styles.inputShellKeyboard,
        glassStyle(theme, true),
        { borderColor: colors.border },
      ]}
    >
      <TextInput
        ref={inputRef}
        style={[
          styles.promptInput,
          keyboardOpen && styles.promptInputKeyboard,
          { color: colors.inputText },
        ]}
        multiline
        scrollEnabled
        maxLength={AI_PROMPT_MAX_LENGTH}
        placeholder="What do you want to practice today?"
        placeholderTextColor={colors.inputPlaceholder}
        value={settings.prompt}
        onChangeText={(prompt) => patch({ prompt })}
        keyboardAppearance={keyboardAppearance}
        cursorColor={colors.accent}
        selectionColor={colors.accentSoft}
        underlineColorAndroid="transparent"
        textAlignVertical="top"
        testID={READING_TEST_IDS.aiPromptInput}
      />
    </View>
  );

  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;

  const swipeCloseResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy > 10 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 72 || gesture.vy > 0.65) {
          handleCloseRef.current();
        }
      },
    })
  ).current;

  const settingsFields = (
    <View testID={READING_TEST_IDS.aiModalSettingsSection}>
      <CefrLevelSlider
        valueIndex={settings.cefrIndex}
        onChange={(cefrIndex) => patch({ cefrIndex })}
        onDragStart={handleSliderDragStart}
        onDragEnd={handleSliderDragEnd}
        theme={theme}
      />

      {onOpenAiGenerationLanguage ? (
        <Pressable
          onPress={onOpenAiGenerationLanguage}
          accessibilityRole="button"
          accessibilityLabel={`AI Generation Language ${dictionaryLanguageLabel(dictionaryTargetLanguage)}`}
          testID={READING_TEST_IDS.settingsAiLanguage}
          style={({ pressed }) => [
            styles.languageRow,
            glassStyle(theme),
            { borderColor: colors.border },
            pressed && { opacity: 0.88 },
          ]}
        >
          <Text style={[styles.languageRowLabel, { color: colors.textDim }]}>
            AI Generation Language
          </Text>
          <View style={styles.languageRowValueWrap}>
            <Text
              style={[styles.languageRowValue, { color: colors.text }]}
              numberOfLines={1}
            >
              {dictionaryLanguageLabel(dictionaryTargetLanguage)}
            </Text>
            <Text style={[styles.languageRowChevron, { color: colors.textMuted }]}>˅</Text>
          </View>
        </Pressable>
      ) : null}

      <SliderRow
        title="Tone / Style"
        preset="toneStyle"
        value={settings.tone}
        onChange={(tone) => patch({ tone })}
        onDragStart={handleSliderDragStart}
        onDragEnd={handleSliderDragEnd}
        theme={theme}
      />

      <SliderRow
        title="Sentence Length"
        preset="textLength"
        value={settings.textLength}
        onChange={(textLength) => patch({ textLength })}
        onDragStart={handleSliderDragStart}
        onDragEnd={handleSliderDragEnd}
        theme={theme}
      />

      <View style={styles.featureRow}>
        {FEATURE_TOGGLES.map((feat) => {
          const on = settings[feat.key];
          return (
            <Pressable
              key={feat.key}
              onPress={() => toggleFeature(feat.key)}
              style={({ pressed }) => [
                styles.featureChip,
                glassStyle(theme),
                {
                  borderColor: on ? colors.selection.border : colors.border,
                  backgroundColor: on ? colors.selection.bg : theme.glass.bg,
                },
                pressed && { opacity: 0.88 },
              ]}
            >
              <Text
                style={[
                  styles.featureChipText,
                  { color: on ? colors.selection.text : colors.textMuted },
                ]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {on ? '✓ ' : ''}
                {feat.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const requestSection = (
    <View
      style={[
        styles.promptSectionInScroll,
        keyboardOpen && styles.promptFooterKeyboard,
        { borderTopColor: colors.border },
      ]}
      testID={READING_TEST_IDS.aiModalRequestSection}
    >
      <Text
        style={[
          styles.sectionTitle,
          styles.promptSectionTitle,
          { color: colors.textDim },
        ]}
      >
        Your Request
      </Text>
      {promptField}
      {generateButton}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable
        style={[
          styles.backdrop,
          // Android Modal: lift content above keyboard (adjustResize does not resize Modal).
          androidKeyboardOpen && { paddingBottom: androidKeyboardHeight },
        ]}
        onPress={handleClose}
        accessibilityLabel="Dismiss"
        testID={READING_TEST_IDS.aiModalDismiss}
      >
        {/*
          Use View (not Pressable) for the sheet: a Pressable ancestor steals vertical
          pans from ScrollView on Android and makes the form feel like two regions.
        */}
        <View
          style={[
            styles.panel,
            {
              backgroundColor: colors.bg,
              borderColor: colors.border,
              // Clear status bar once — do not also pad via SafeArea top (double inset).
              marginTop: panelTopMargin,
            },
          ]}
          testID={READING_TEST_IDS.aiModal}
        >
          <SafeAreaView style={styles.safe} edges={[]}>
            <KeyboardAvoidingView
              style={styles.flex}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={0}
            >
              <View style={styles.header} {...swipeCloseResponder.panHandlers}>
                <View style={styles.headerCenter}>
                  <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
                  <Text style={[styles.headerTitle, { color: colors.text }]}>Chat with AI</Text>
                </View>
                <Pressable
                  onPress={handleClose}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  testID={READING_TEST_IDS.aiModalClose}
                  style={({ pressed }) => [
                    styles.closeBtn,
                    glassStyle(theme, true),
                    { borderColor: colors.border },
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <Text style={[styles.closeBtnLabel, { color: colors.text }]}>✕</Text>
                </Pressable>
              </View>

              {/*
                ONE form ScrollView (Android + iOS): settings + Your Request + Generate
                flow together — no fixed footer sibling that creates a middle gap.
              */}
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                  styles.scrollContent,
                  {
                    paddingBottom: keyboardOpen
                      ? space.sm
                      : insets.bottom + formScrollBottomPad,
                  },
                ]}
                showsVerticalScrollIndicator={false}
                scrollEnabled={scrollEnabled}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                nestedScrollEnabled
                testID={READING_TEST_IDS.aiModalFormScroll}
              >
                {settingsFields}
                {requestSection}
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </Pressable>
    </Modal>
  );
}

const CLOSE_SIZE = 44;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  panel: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
    paddingHorizontal: space.lg,
  },
  header: {
    position: 'relative',
    paddingTop: space.sm,
    paddingBottom: space.md,
    zIndex: 2,
    minHeight: CLOSE_SIZE + space.sm,
  },
  headerCenter: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: CLOSE_SIZE + space.sm,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: space.md,
    opacity: 0.55,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'center',
    alignSelf: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: space.sm,
    right: 0,
    width: CLOSE_SIZE,
    height: CLOSE_SIZE,
    borderRadius: CLOSE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnLabel: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: space.md,
    // Intentionally no flexGrow / vertical space distribution —
    // those push Your Request away from the settings on tall screens.
  },
  promptSectionInScroll: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space.md,
    marginTop: space.md,
    flexGrow: 0,
  },
  sliderSection: {
    marginBottom: 2,
    width: '100%',
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: space.sm,
    gap: 8,
  },
  languageRowLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  languageRowValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    maxWidth: '58%',
  },
  languageRowValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  languageRowChevron: {
    fontSize: 14,
  },
  sliderSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
    alignSelf: 'center',
    width: '100%',
    marginBottom: 2,
  },
  section: {
    marginBottom: space.sm,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    textAlign: 'center',
    alignSelf: 'center',
    width: '100%',
    marginBottom: space.md,
    marginTop: space.sm,
  },
  promptSectionTitle: {
    marginTop: 0,
    marginBottom: space.sm,
  },
  promptFooterKeyboard: {
    paddingTop: space.xs,
  },
  inputShell: {
    borderRadius: 16,
    padding: space.md,
    minHeight: 120,
    maxHeight: 180,
    marginBottom: space.xs,
    flexShrink: 1,
  },
  /** Keyboard-open: shrink so Generate stays visible above the keyboard. */
  inputShellKeyboard: {
    minHeight: 56,
    maxHeight: 88,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    marginBottom: 0,
  },
  promptInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 96,
    maxHeight: 148,
    padding: 0,
  },
  promptInputKeyboard: {
    fontSize: 15,
    lineHeight: 20,
    minHeight: 40,
    maxHeight: 64,
  },
  featureRow: {
    flexDirection: 'row',
    gap: space.xs,
    marginBottom: 0,
  },
  featureChip: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  featureChipText: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 12,
  },
  generateBtn: {
    marginTop: space.md,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.22,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  generateBtnKeyboard: {
    marginTop: space.sm,
    paddingVertical: 10,
  },
  generateLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  generateLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
