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
  migrateAiGenerationLanguageId,
  DEFAULT_PRACTICE_LANGUAGE,
} from '../dictionary/dictionaryLanguages';
import {
  getVisiblePracticeLanguages,
  IN_PROGRESS_BADGE_LABEL,
  LANGUAGE_REQUEST_CTA_LABEL,
  isPracticeLanguageProductActive,
} from '../dictionary/languageAvailability';
import type { ThemePalette } from '../theme/themeTypes';
import { showInProgressLanguageDialog } from './inProgressLanguageDialog';
import { space } from './spacing';

export const AI_GENERATION_LANGUAGE_MODAL_TEST_IDS = {
  modal: 'ai-generation-language-modal',
  close: 'ai-generation-language-close',
  accept: 'ai-generation-language-accept',
  option: (code: string) => `ai-generation-language-option-${code}`,
  inProgressBadge: (code: string) => `ai-generation-language-in-progress-${code}`,
  languageRequestCta: 'ai-generation-language-request-cta',
} as const;

type Props = {
  visible: boolean;
  theme: ThemePalette;
  selected: string;
  onAccept: (code: string) => void;
  onClose: () => void;
  /** Disables Accept while a language change is being applied. */
  accepting?: boolean;
};

export function AiGenerationLanguageModal({
  visible,
  theme,
  selected,
  onAccept,
  onClose,
  accepting = false,
}: Props) {
  const colors = theme;
  const languages = getVisiblePracticeLanguages();
  const savedId = migrateAiGenerationLanguageId(selected, DEFAULT_PRACTICE_LANGUAGE);
  const [tempSelected, setTempSelected] = useState(
    isPracticeLanguageProductActive(savedId) ? savedId : DEFAULT_PRACTICE_LANGUAGE
  );

  useEffect(() => {
    if (visible) {
      const next = migrateAiGenerationLanguageId(selected, DEFAULT_PRACTICE_LANGUAGE);
      setTempSelected(
        isPracticeLanguageProductActive(next) ? next : DEFAULT_PRACTICE_LANGUAGE
      );
    }
  }, [visible, selected]);

  const handleClose = () => {
    if (accepting) return;
    onClose();
  };

  const handleAccept = () => {
    if (accepting) return;
    const id = migrateAiGenerationLanguageId(tempSelected, DEFAULT_PRACTICE_LANGUAGE);
    if (!isPracticeLanguageProductActive(id)) {
      showInProgressLanguageDialog();
      return;
    }
    onAccept(id);
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
              const inProgress = lang.status === 'in_progress';
              return (
                <Pressable
                  key={lang.id}
                  onPress={() => {
                    if (inProgress) {
                      showInProgressLanguageDialog();
                      return;
                    }
                    setTempSelected(lang.id);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, disabled: inProgress }}
                  accessibilityLabel={
                    inProgress ? `${lang.label}, ${IN_PROGRESS_BADGE_LABEL}` : lang.label
                  }
                  testID={AI_GENERATION_LANGUAGE_MODAL_TEST_IDS.option(lang.id)}
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
                        testID={AI_GENERATION_LANGUAGE_MODAL_TEST_IDS.inProgressBadge(lang.id)}
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
              testID={AI_GENERATION_LANGUAGE_MODAL_TEST_IDS.languageRequestCta}
              accessibilityRole="text"
            >
              {LANGUAGE_REQUEST_CTA_LABEL}
            </Text>
          </ScrollView>

          <View
            style={[
              styles.footer,
              { borderTopColor: colors.border, backgroundColor: colors.bg },
            ]}
          >
            <Pressable
              onPress={handleAccept}
              disabled={accepting}
              accessibilityRole="button"
              accessibilityLabel="Accept"
              accessibilityState={{ disabled: accepting, busy: accepting }}
              testID={AI_GENERATION_LANGUAGE_MODAL_TEST_IDS.accept}
              style={({ pressed }) => [
                styles.acceptBtn,
                {
                  backgroundColor: colors.selection.bg,
                  borderColor: colors.selection.border,
                  opacity: accepting ? 0.72 : 1,
                },
                pressed && !accepting && { opacity: 0.9 },
              ]}
            >
              <Text style={[styles.acceptLabel, { color: colors.selection.text }]}>
                {accepting ? 'Updating…' : 'Accept'}
              </Text>
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
  optionMain: {
    flex: 1,
    paddingRight: 8,
    gap: 2,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
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
    marginTop: 8,
    marginBottom: 4,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
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
