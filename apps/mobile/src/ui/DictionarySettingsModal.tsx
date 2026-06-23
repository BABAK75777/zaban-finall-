import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ThemePalette } from '../theme/themeTypes';
import type { DictionaryEntry, DictionarySettingsV1 } from '../dictionary';
import { DictionaryLanguagePicker } from './DictionaryLanguagePicker';
import { DictionarySettingsSection } from './DictionarySettingsSection';
import { READING_TEST_IDS } from './testIds';

type Props = {
  visible: boolean;
  onClose: () => void;
  theme: ThemePalette;
  settings: DictionarySettingsV1;
  entries: DictionaryEntry[];
  onChange: (patch: Partial<DictionarySettingsV1>) => void;
  onEntriesChange: (entries: DictionaryEntry[]) => void;
};

export function DictionarySettingsModal({
  visible,
  onClose,
  theme,
  settings,
  entries,
  onChange,
  onEntriesChange,
}: Props) {
  const colors = theme;
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
        testID={READING_TEST_IDS.settingsDictionaryModal}
      >
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.text }]}>Dictionary</Text>
              <Pressable onPress={onClose} style={styles.closeBtn} testID={READING_TEST_IDS.settingsDictionaryClose}>
                <Text style={[styles.closeText, { color: colors.accent }]}>Done</Text>
              </Pressable>
            </View>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <DictionarySettingsSection
                theme={theme}
                settings={settings}
                entries={entries}
                onEntriesChange={onEntriesChange}
                onOpenLanguagePicker={() => setLanguagePickerOpen(true)}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <DictionaryLanguagePicker
        visible={visible && languagePickerOpen}
        theme={theme}
        selected={settings.translationLanguage}
        onSelect={(code) => onChange({ translationLanguage: code })}
        onClose={() => setLanguagePickerOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
});
