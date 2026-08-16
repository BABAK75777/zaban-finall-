import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ThemePalette } from '../theme/themeTypes';
import type { DictionaryLanguageCode } from '../dictionary';
import {
  getVisibleDictionaryLanguages,
  IN_PROGRESS_BADGE_LABEL,
  LANGUAGE_REQUEST_CTA_LABEL,
  isDictionaryLanguageProductActive,
} from '../dictionary/languageAvailability';
import { showInProgressLanguageDialog } from './inProgressLanguageDialog';

export const DICTIONARY_LANGUAGE_PICKER_TEST_IDS = {
  modal: 'dictionary-language-picker-modal',
  close: 'dictionary-language-picker-close',
  option: (code: DictionaryLanguageCode | string) => `dictionary-language-option-${code}`,
  inProgressBadge: (code: string) => `dictionary-language-in-progress-${code}`,
  languageRequestCta: 'dictionary-language-request-cta',
} as const;

type Props = {
  visible: boolean;
  theme: ThemePalette;
  selected: DictionaryLanguageCode;
  onSelect: (code: DictionaryLanguageCode) => void;
  onClose: () => void;
  title?: string;
};

/**
 * In-modal overlay language list (no nested RN Modal).
 * Must be rendered inside an already-presented parent Modal / shell.
 */
export function DictionaryLanguagePicker({
  visible,
  theme,
  selected,
  onSelect,
  onClose,
  title = 'Translate meanings to',
}: Props) {
  const colors = theme;
  const languages = getVisibleDictionaryLanguages();

  if (!visible) {
    return null;
  }

  return (
    <View
      style={styles.overlayRoot}
      pointerEvents="auto"
      testID={DICTIONARY_LANGUAGE_PICKER_TEST_IDS.modal}
      accessibilityViewIsModal
    >
      <Pressable
        style={styles.backdropDismiss}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss language list"
      />
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
          {languages.map((lang) => {
            const isSelected = selected === lang.id;
            const inProgress = lang.status === 'in_progress';
            return (
              <Pressable
                key={lang.id}
                onPress={() => {
                  if (inProgress || !isDictionaryLanguageProductActive(lang.id)) {
                    showInProgressLanguageDialog();
                    return;
                  }
                  onSelect(lang.id as DictionaryLanguageCode);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected, disabled: inProgress }}
                accessibilityLabel={
                  inProgress ? `${lang.label}, ${IN_PROGRESS_BADGE_LABEL}` : lang.label
                }
                testID={DICTIONARY_LANGUAGE_PICKER_TEST_IDS.option(lang.id)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    borderColor: isSelected ? colors.selection.border : colors.border,
                    backgroundColor: isSelected ? colors.selection.bg : 'transparent',
                    opacity: inProgress ? 0.72 : 1,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.optionMain}>
                  <Text
                    style={[
                      styles.optionText,
                      { color: isSelected ? colors.selection.text : colors.text },
                    ]}
                  >
                    {lang.label}
                  </Text>
                  {inProgress ? (
                    <Text
                      style={[styles.inProgress, { color: colors.textMuted }]}
                      testID={DICTIONARY_LANGUAGE_PICKER_TEST_IDS.inProgressBadge(lang.id)}
                    >
                      {IN_PROGRESS_BADGE_LABEL}
                    </Text>
                  ) : null}
                </View>
                {isSelected && !inProgress ? (
                  <Text style={[styles.check, { color: colors.selection.text }]}>✓</Text>
                ) : null}
              </Pressable>
            );
          })}
          <Text
            style={[styles.requestCta, { color: colors.textMuted }]}
            testID={DICTIONARY_LANGUAGE_PICKER_TEST_IDS.languageRequestCta}
            accessibilityRole="text"
          >
            {LANGUAGE_REQUEST_CTA_LABEL}
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 50,
    elevation: 50,
  },
  backdropDismiss: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    zIndex: 1,
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
  optionMain: {
    flex: 1,
    paddingRight: 8,
    gap: 2,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  inProgress: {
    fontSize: 12,
    fontWeight: '600',
  },
  check: {
    fontSize: 16,
    fontWeight: '700',
  },
  requestCta: {
    marginTop: 10,
    marginBottom: 4,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});
