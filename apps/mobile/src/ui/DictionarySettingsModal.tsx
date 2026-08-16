import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPickerOpen(false);
    }
  }, [visible]);

  const handleShellClose = () => {
    if (pickerOpen) {
      setPickerOpen(false);
      return;
    }
    onClose();
  };

  return (
    <FullScreenModalShell
      visible={visible}
      onClose={handleShellClose}
      theme={theme}
      title="Dictionary"
      testID={READING_TEST_IDS.settingsDictionaryModal}
      closeTestID={READING_TEST_IDS.settingsDictionaryClose}
    >
      <View style={styles.body}>
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
            onOpenLanguagePicker={() => setPickerOpen(true)}
          />
        </ScrollView>

        {/* Overlay inside the parent Modal — avoids nested RN Modal stacking failures. */}
        <DictionaryLanguagePicker
          visible={pickerOpen}
          theme={theme}
          title="Translate meanings to"
          selected={settings.translationLanguage}
          onSelect={(code) => onChange({ translationLanguage: code })}
          onClose={() => setPickerOpen(false)}
        />
      </View>
    </FullScreenModalShell>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: space.md,
    paddingBottom: space.lg,
  },
});
