import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { glassStyle } from '../theme/glass';
import type { ThemeId, ThemePalette } from '../theme/themeTypes';
import { FullScreenModalShell } from './FullScreenModalShell';
import { READING_TEST_IDS } from './testIds';
import { space } from './spacing';

type Props = {
  visible: boolean;
  onClose: () => void;
  theme: ThemePalette;
  themeId: ThemeId;
  text: string;
  onChangeText: (text: string) => void;
  onBlurCommit: () => void;
  editable?: boolean;
};

export function PracticeTextModal({
  visible,
  onClose,
  theme,
  themeId,
  text,
  onChangeText,
  onBlurCommit,
  editable = true,
}: Props) {
  const colors = theme;
  const { height: windowHeight } = useWindowDimensions();
  // Fixed minHeight:320 dominates short landscape; scale with viewport instead.
  const inputMinHeight = Math.max(180, Math.min(320, Math.round(windowHeight * 0.35)));
  const keyboardAppearance =
    themeId === 'light' || themeId === 'cream' ? 'light' : 'dark';

  return (
    <FullScreenModalShell
      visible={visible}
      onClose={onClose}
      theme={theme}
      title="Edit text"
      testID={READING_TEST_IDS.practiceText}
      closeTestID={READING_TEST_IDS.practiceTextClose}
      keyboardAvoiding
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Paste or write the text you want to practice reading aloud.
        </Text>
        <View
          style={[
            styles.inputShell,
            glassStyle(theme, true),
            {
              borderColor: colors.border,
              backgroundColor: colors.inputBg,
              minHeight: inputMinHeight,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              { color: colors.inputText, minHeight: Math.max(140, inputMinHeight - 40) },
            ]}
            multiline
            placeholder="Paste reading text…"
            placeholderTextColor={colors.inputPlaceholder}
            cursorColor={colors.inputText}
            selectionColor={colors.accentSoft}
            keyboardAppearance={keyboardAppearance}
            underlineColorAndroid="transparent"
            textAlignVertical="top"
            value={text}
            onChangeText={onChangeText}
            editable={editable}
            onBlur={onBlurCommit}
            testID={READING_TEST_IDS.practiceTextInput}
          />
        </View>
      </ScrollView>
    </FullScreenModalShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: space.xxl,
  },
  hint: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: space.lg,
  },
  inputShell: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: space.md,
  },
  input: {
    flex: 1,
    fontSize: 18,
    lineHeight: 28,
    padding: 0,
    ...Platform.select({ android: { includeFontPadding: true } }),
  },
});
