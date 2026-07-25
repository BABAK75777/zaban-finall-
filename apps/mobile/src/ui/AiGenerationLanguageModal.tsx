import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getAiGenerationLanguages,
  migrateAiGenerationLanguageId,
  DEFAULT_PRACTICE_LANGUAGE,
} from '../dictionary/dictionaryLanguages';
import type { ThemePalette } from '../theme/themeTypes';
import { space } from './spacing';

export const AI_GENERATION_LANGUAGE_MODAL_TEST_IDS = {
  modal: 'ai-generation-language-modal',
  close: 'ai-generation-language-close',
  accept: 'ai-generation-language-accept',
  option: (code: string) => `ai-generation-language-option-${code}`,
} as const;

type Props = {
  visible: boolean;
  theme: ThemePalette;
  selected: string;
  onAccept: (code: string) => void;
  onClose: () => void;
};

export function AiGenerationLanguageModal({
  visible,
  theme,
  selected,
  onAccept,
  onClose,
}: Props) {
  const colors = theme;
  const languages = getAiGenerationLanguages();
  const savedId = migrateAiGenerationLanguageId(selected, DEFAULT_PRACTICE_LANGUAGE);
  const [tempSelected, setTempSelected] = useState(savedId);

  useEffect(() => {
    if (visible) {
      setTempSelected(migrateAiGenerationLanguageId(selected, DEFAULT_PRACTICE_LANGUAGE));
    }
  }, [visible, selected]);

  const handleClose = () => {
    onClose();
  };

  const handleAccept = () => {
    onAccept(migrateAiGenerationLanguageId(tempSelected, DEFAULT_PRACTICE_LANGUAGE));
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
      testID={AI_GENERATION_LANGUAGE_MODAL_TEST_IDS.modal}
    >
      <View style={styles.backdrop}>
        <SafeAreaView
          style={[styles.sheet, { backgroundColor: colors.bg, borderColor: colors.border }]}
          edges={['top', 'bottom']}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              AI Generation Language
            </Text>
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
              testID={AI_GENERATION_LANGUAGE_MODAL_TEST_IDS.close}
            >
              <Text style={[styles.close, { color: colors.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            {languages.map((lang) => {
              const isSelected = tempSelected === lang.id;
              return (
                <Pressable
                  key={lang.id}
                  onPress={() => setTempSelected(lang.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={lang.label}
                  testID={AI_GENERATION_LANGUAGE_MODAL_TEST_IDS.option(lang.id)}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      borderColor: isSelected ? colors.selection.border : colors.border,
                      backgroundColor: isSelected ? colors.selection.bg : 'transparent',
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: isSelected ? colors.selection.text : colors.text },
                    ]}
                  >
                    {lang.label}
                  </Text>
                  {isSelected ? (
                    <Text style={[styles.check, { color: colors.selection.text }]}>✓</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <View
            style={[
              styles.footer,
              { borderTopColor: colors.border, backgroundColor: colors.bg },
            ]}
          >
            <Pressable
              onPress={handleAccept}
              accessibilityRole="button"
              accessibilityLabel="Accept"
              testID={AI_GENERATION_LANGUAGE_MODAL_TEST_IDS.accept}
              style={({ pressed }) => [
                styles.acceptBtn,
                {
                  backgroundColor: colors.selection.bg,
                  borderColor: colors.selection.border,
                },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={[styles.acceptLabel, { color: colors.selection.text }]}>Accept</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  close: {
    fontSize: 20,
    paddingHorizontal: 4,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: space.md,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingRight: 8,
  },
  check: {
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    paddingTop: 12,
    paddingBottom: 12,
  },
  acceptBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
});
