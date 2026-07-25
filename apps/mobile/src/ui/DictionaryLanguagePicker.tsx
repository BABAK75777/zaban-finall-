import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ThemePalette } from '../theme/themeTypes';
import {
  DICTIONARY_LANGUAGES,
  dictionaryLanguageLabel,
  type DictionaryLanguageCode,
} from '../dictionary';

export const DICTIONARY_LANGUAGE_PICKER_TEST_IDS = {
  modal: 'dictionary-language-picker-modal',
  close: 'dictionary-language-picker-close',
  option: (code: DictionaryLanguageCode) => `dictionary-language-option-${code}`,
} as const;

type Props = {
  visible: boolean;
  theme: ThemePalette;
  selected: DictionaryLanguageCode;
  onSelect: (code: DictionaryLanguageCode) => void;
  onClose: () => void;
  title?: string;
};

export function DictionaryLanguagePicker({
  visible,
  theme,
  selected,
  onSelect,
  onClose,
  title = 'Translate meanings to',
}: Props) {
  const colors = theme;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      testID={DICTIONARY_LANGUAGE_PICKER_TEST_IDS.modal}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close language list"
              testID={DICTIONARY_LANGUAGE_PICKER_TEST_IDS.close}
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
            {DICTIONARY_LANGUAGES.map((lang) => {
              const isSelected = selected === lang.code;
              return (
                <Pressable
                  key={lang.code}
                  onPress={() => {
                    onSelect(lang.code);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={lang.label}
                  testID={DICTIONARY_LANGUAGE_PICKER_TEST_IDS.option(lang.code)}
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
        </View>
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
    maxHeight: '70%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    paddingRight: 8,
  },
  close: {
    fontSize: 20,
    padding: 4,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 24,
    gap: 6,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  check: {
    fontSize: 16,
    fontWeight: '700',
  },
});
