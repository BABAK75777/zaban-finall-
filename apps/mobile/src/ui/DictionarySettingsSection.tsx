import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ThemePalette } from '../theme/themeTypes';
import {
  dictionaryLanguageLabel,
  type DictionaryEntry,
  type DictionarySettingsV1,
} from '../dictionary';
import { SavedWordsList } from './SavedWordsList';

export const DICTIONARY_SETTINGS_TEST_IDS = {
  section: 'dictionary-settings-section',
  languageRow: 'dictionary-language-row',
} as const;

interface DictionarySettingsSectionProps {
  theme: ThemePalette;
  settings: DictionarySettingsV1;
  entries: DictionaryEntry[];
  onEntriesChange: (entries: DictionaryEntry[]) => void;
  onOpenLanguagePicker: () => void;
}

export function DictionarySettingsSection({
  theme,
  settings,
  entries,
  onEntriesChange,
  onOpenLanguagePicker,
}: DictionarySettingsSectionProps) {
  return (
    <View style={styles.wrap} testID={DICTIONARY_SETTINGS_TEST_IDS.section}>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Tap any word on the reading screen to see its meaning.
      </Text>

      <Pressable
        onPress={onOpenLanguagePicker}
        accessibilityRole="button"
        accessibilityLabel={`Translation language ${dictionaryLanguageLabel(settings.translationLanguage)}`}
        testID={DICTIONARY_SETTINGS_TEST_IDS.languageRow}
        style={({ pressed }) => [
          styles.selectorRow,
          { borderColor: theme.border, backgroundColor: theme.bg },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={[styles.selectorLabel, { color: theme.textDim }]}>Translate meanings to</Text>
        <View style={styles.selectorValueWrap}>
          <Text style={[styles.selectorValue, { color: theme.text }]}>
            {dictionaryLanguageLabel(settings.translationLanguage)}
          </Text>
          <Text style={[styles.selectorChevron, { color: theme.textMuted }]}>˅</Text>
        </View>
      </Pressable>

      <SavedWordsList
        theme={theme}
        entries={entries}
        targetLanguage={settings.translationLanguage}
        onEntriesChange={onEntriesChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
    marginBottom: 12,
    gap: 8,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  selectorValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  selectorValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  selectorChevron: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
});
