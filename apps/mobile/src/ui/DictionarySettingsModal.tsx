import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import type { ThemePalette } from '../theme/themeTypes';
import type { DictionaryEntry, DictionarySettingsV1 } from '../dictionary';
import { DictionaryLanguagePicker } from './DictionaryLanguagePicker';
import { DictionarySettingsSection } from './DictionarySettingsSection';
import { FullScreenModalShell } from './FullScreenModalShell';
import { READING_TEST_IDS } from './testIds';
import { space } from './spacing';

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
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);

  return (
    <>
      <FullScreenModalShell
        visible={visible}
        onClose={onClose}
        theme={theme}
        title="Dictionary"
        testID={READING_TEST_IDS.settingsDictionaryModal}
        closeTestID={READING_TEST_IDS.settingsDictionaryClose}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <DictionarySettingsSection
            theme={theme}
            settings={settings}
            entries={entries}
            onEntriesChange={onEntriesChange}
            onOpenLanguagePicker={() => setLanguagePickerOpen(true)}
          />
        </ScrollView>
      </FullScreenModalShell>

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
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: space.xxl,
  },
});
