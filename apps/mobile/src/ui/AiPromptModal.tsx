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
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { glassStyle } from '../theme/glass';
import type { ThemeId, ThemePalette } from '../theme/themeTypes';
import { SettingSlider } from './SettingSlider';
import { space } from './spacing';

export type AiVoiceType = 'male' | 'female';

export interface AiPromptSettings {
  prompt: string;
  grammarFocus: boolean;
  idiomsExpressions: boolean;
  speakingPractice: boolean;
  difficulty: number;
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
    difficulty: 0.5,
    tone: 0.5,
    textLength: 0.35,
  };
}

export interface AiGeneratePayload {
  prompt: string;
  difficulty: number;
  tone: number;
  textLength: number;
}

interface AiGenerateResponse {
  ok: boolean;
  text?: string;
  error?: string;
  details?: string;
}

async function requestAiGenerate(apiBaseUrl: string, payload: AiGeneratePayload): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/ai/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let data: AiGenerateResponse;
  try {
    data = (await response.json()) as AiGenerateResponse;
  } catch {
    throw new Error(`Invalid response from server (${response.status}).`);
  }

  if (!response.ok || !data.ok) {
    throw new Error(data.details || data.error || `Request failed (${response.status}).`);
  }

  const generated = typeof data.text === 'string' ? data.text.trim() : '';
  if (!generated) {
    throw new Error('AI returned empty text.');
  }

  return generated;
}

interface AiPromptModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerated: (text: string) => void;
  apiBaseUrl: string;
  theme: ThemePalette;
  themeId: ThemeId;
}

interface SliderRowProps {
  title: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
  onChange: (v: number) => void;
  theme: ThemePalette;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

function SliderRow({ title, leftLabel, rightLabel, value, onChange, theme, onDragStart, onDragEnd }: SliderRowProps) {
  const colors = theme;
  return (
    <View style={styles.sliderSection}>
      <Text style={[styles.sliderSectionTitle, { color: colors.textDim }]}>{title}</Text>
      <View style={styles.sliderLabels}>
        <Text style={[styles.sliderEndpoint, { color: colors.textMuted }]}>{leftLabel}</Text>
        <Text style={[styles.sliderEndpoint, { color: colors.textMuted }]}>{rightLabel}</Text>
      </View>
      <SettingSlider
        value={value}
        min={0}
        max={1}
        step={0.05}
        onChange={onChange}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        accent={colors.accent}
        border={colors.border}
        track={colors.accentSoft}
        compact
      />
    </View>
  );
}

const KEYBOARD_FOOTER_HEIGHT = 52;

export function AiPromptModal({
  visible,
  onClose,
  onGenerated,
  apiBaseUrl,
  theme,
  themeId,
}: AiPromptModalProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const generateInFlightRef = useRef(false);
  const [settings, setSettings] = useState<AiPromptSettings>(defaultSettings);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const colors = theme;
  const isDark = themeId === 'dark';
  const keyboardAppearance = themeId === 'light' || themeId === 'cream' ? 'light' : 'dark';
  const keyboardOpen = keyboardHeight > 0;

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
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      setGenerating(false);
      setScrollEnabled(true);
      generateInFlightRef.current = false;
    }
  }, [visible]);

  const scrollBottomPadding = keyboardOpen
    ? KEYBOARD_FOOTER_HEIGHT + space.sm
    : insets.bottom + space.xxl;

  const focusPromptInput = useCallback(() => {
    const delay = Platform.OS === 'android' ? 160 : 60;
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, delay);
  }, []);

  useEffect(() => {
    if (keyboardHeight > 0) {
      const delay = Platform.OS === 'android' ? 120 : 40;
      const timer = setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [keyboardHeight]);

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

    const payload: AiGeneratePayload = {
      prompt,
      difficulty: settings.difficulty,
      tone: settings.tone,
      textLength: settings.textLength,
    };

    generateInFlightRef.current = true;
    setGenerating(true);
    Keyboard.dismiss();

    try {
      const generatedText = await requestAiGenerate(apiBaseUrl, payload);
      onGenerated(generatedText);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed.';
      Alert.alert('AI generation failed', message);
    } finally {
      generateInFlightRef.current = false;
      setGenerating(false);
    }
  }, [apiBaseUrl, generating, onClose, onGenerated, settings]);

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
          backgroundColor: colors.accent,
          borderColor: colors.accentGlow,
          shadowColor: colors.accent,
          opacity: generating ? 0.72 : 1,
        },
        pressed && !generating && { opacity: 0.92, transform: [{ scale: 0.99 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Generate"
      accessibilityState={{ disabled: generating, busy: generating }}
    >
      {generating ? (
        <View style={styles.generateLoadingRow}>
          <ActivityIndicator color="#FFFFFF" size="small" />
          <Text style={styles.generateLabel}>Generating…</Text>
        </View>
      ) : (
        <Text style={styles.generateLabel}>Generate</Text>
      )}
    </Pressable>
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={handleClose} accessibilityLabel="Dismiss">
        <Pressable
          style={[styles.panel, { backgroundColor: colors.bg, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
              style={[styles.flex, styles.flexRelative]}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
            >
              <View style={[styles.glowOrb, isDark && styles.glowOrbDark]} pointerEvents="none" />

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

              <ScrollView
                ref={scrollRef}
                style={styles.scroll}
                contentContainerStyle={[
                  styles.scrollContent,
                  { paddingBottom: scrollBottomPadding },
                ]}
                showsVerticalScrollIndicator={false}
                scrollEnabled={scrollEnabled}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                nestedScrollEnabled
              >
                <SliderRow
                  title="Difficulty"
                  leftLabel="Beginner"
                  rightLabel="Advanced"
                  value={settings.difficulty}
                  onChange={(difficulty) => patch({ difficulty })}
                  onDragStart={handleSliderDragStart}
                  onDragEnd={handleSliderDragEnd}
                  theme={theme}
                />

                <SliderRow
                  title="Tone / Style"
                  leftLabel="Academic"
                  rightLabel="Street"
                  value={settings.tone}
                  onChange={(tone) => patch({ tone })}
                  onDragStart={handleSliderDragStart}
                  onDragEnd={handleSliderDragEnd}
                  theme={theme}
                />

                <SliderRow
                  title="Text Length"
                  leftLabel="Short"
                  rightLabel="Long"
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
                            borderColor: on ? colors.accent : colors.border,
                            backgroundColor: on ? colors.accentSoft : theme.glass.bg,
                          },
                          pressed && { opacity: 0.88 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.featureChipText,
                            { color: on ? colors.accent : colors.textMuted },
                          ]}
                        >
                          {on ? '✓ ' : ''}
                          {feat.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.sectionTitle, styles.promptSectionTitle, { color: colors.textDim }]}>
                  Your Request
                </Text>
                <View style={[styles.inputShell, glassStyle(theme, true), { borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.promptInput, { color: colors.inputText }]}
                    multiline
                    placeholder="What do you want to practice today?"
                    placeholderTextColor={colors.inputPlaceholder}
                    value={settings.prompt}
                    onChangeText={(prompt) => patch({ prompt })}
                    onFocus={focusPromptInput}
                    keyboardAppearance={keyboardAppearance}
                    cursorColor={colors.accent}
                    selectionColor={colors.accentSoft}
                    underlineColorAndroid="transparent"
                    textAlignVertical="top"
                  />
                </View>

                {!keyboardOpen ? generateButton : null}
              </ScrollView>

              {keyboardOpen ? (
                <View
                  style={[
                    styles.keyboardFooter,
                    {
                      bottom: Platform.OS === 'android' ? keyboardHeight : 0,
                      backgroundColor: colors.bg,
                      borderTopColor: colors.border,
                    },
                  ]}
                >
                  {generateButton}
                </View>
              ) : null}
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Pressable>
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
    marginTop: 48,
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
  flexRelative: {
    position: 'relative',
  },
  glowOrb: {
    position: 'absolute',
    top: -80,
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    opacity: 0.6,
  },
  glowOrbDark: {
    backgroundColor: 'rgba(168, 85, 247, 0.22)',
    opacity: 1,
  },
  header: {
    position: 'relative',
    paddingTop: space.sm,
    paddingBottom: space.lg,
    zIndex: 2,
    minHeight: CLOSE_SIZE + space.md,
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
    gap: space.xs,
  },
  sliderSection: {
    marginBottom: space.sm,
    width: '100%',
  },
  sliderSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    textAlign: 'center',
    alignSelf: 'center',
    width: '100%',
    marginBottom: space.xs,
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
    marginTop: space.lg,
  },
  inputShell: {
    borderRadius: 16,
    padding: space.md,
    minHeight: 148,
    maxHeight: 220,
    marginBottom: space.xs,
  },
  promptInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 120,
    maxHeight: 184,
    padding: 0,
  },
  segmentRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    width: '48%',
    maxWidth: 188,
    borderRadius: 9,
    padding: 2,
    borderWidth: 1,
    marginBottom: space.sm,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: space.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginBottom: space.md,
  },
  featureChip: {
    borderRadius: 18,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 7,
    borderWidth: 1,
  },
  featureChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sliderEndpoint: {
    fontSize: 11,
    fontWeight: '600',
  },
  generateBtn: {
    marginTop: space.md,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  generateBtnKeyboard: {
    marginTop: 0,
  },
  keyboardFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  generateLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  generateLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
