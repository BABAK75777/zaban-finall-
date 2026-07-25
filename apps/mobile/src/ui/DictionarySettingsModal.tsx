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

type PickerMode = 'practice' | 'translation' | null;

export function DictionarySettingsModal({
  visible,
  onClose,
  theme,
  settings,
  entries,
  onChange,
  onEntriesChange,
}: Props) {
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);

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
            onOpenPracticeLanguagePicker={() => setPickerMode('practice')}
            onOpenLanguagePicker={() => setPickerMode('translation')}
          />
        </ScrollView>
      </FullScreenModalShell>

      <DictionaryLanguagePicker
        visible={visible && pickerMode === 'practice'}
        theme={theme}
        title="Practice language"
        selected={settings.practiceLanguage}
        onSelect={(code) => onChange({ practiceLanguage: code })}
        onClose={() => setPickerMode(null)}
      />

      <DictionaryLanguagePicker
        visible={visible && pickerMode === 'translation'}
        theme={theme}
        title="Translate meanings to"
        selected={settings.translationLanguage}
        onSelect={(code) => onChange({ translationLanguage: code })}
        onClose={() => setPickerMode(null)}
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
