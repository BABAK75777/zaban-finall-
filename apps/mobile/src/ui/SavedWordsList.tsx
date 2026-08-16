import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ThemePalette } from '../theme/themeTypes';
import { dictionaryLanguageLabel, type DictionaryLanguageCode } from '../dictionary/dictionaryLanguages';
import type { DictionaryEntry } from '../dictionary/dictionaryTypes';
import {
  addManualDictionaryEntry,
  removeDictionaryEntry,
} from '../dictionary/dictionaryStorage';
import {
  entryMatchesPracticeLanguage,
  resolveEntryPracticeLanguage,
} from '../dictionary/entryPracticeLanguage';
import {
  formatPracticeProgress,
  migrateDictionaryEntry,
} from '../dictionary/practiceQueue';

export const SAVED_WORDS_LIST_TEST_IDS = {
  empty: 'saved-words-list-empty',
  list: 'saved-words-list-scroll',
  wordInput: 'saved-words-word-input',
  addBtn: 'saved-words-add-btn',
  item: (word: string) => `saved-words-item-${word}`,
  delete: (word: string) => `saved-words-delete-${word}`,
} as const;

type Props = {
  theme: ThemePalette;
  entries: DictionaryEntry[];
  practiceLanguage: DictionaryLanguageCode;
  onEntriesChange: (entries: DictionaryEntry[]) => void;
};

function formatSavedDate(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export function SavedWordsList({ theme, entries, practiceLanguage, onEntriesChange }: Props) {
  const colors = theme;
  const [wordInput, setWordInput] = useState('');

  const visibleEntries = useMemo(() => {
    return entries
      .filter((entry) => entryMatchesPracticeLanguage(entry, practiceLanguage))
      .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
  }, [entries, practiceLanguage]);

  const handleAdd = useCallback(() => {
    const word = wordInput.trim();
    if (!word) {
      Alert.alert('Word required', 'Enter a word to save.');
      return;
    }

    const next = addManualDictionaryEntry(entries, {
      displayWord: word,
      practiceLanguage,
    });
    onEntriesChange(next);
    setWordInput('');
  }, [entries, onEntriesChange, practiceLanguage, wordInput]);

  const handleDelete = useCallback(
    (entry: DictionaryEntry) => {
      const ownership = resolveEntryPracticeLanguage(entry);
      if (!ownership) return;
      const next = removeDictionaryEntry(entries, entry.word, ownership);
      onEntriesChange(next);
    },
    [entries, onEntriesChange]
  );

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionLabel, { color: colors.textDim }]}>My words</Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Tap ★ while reading to save a word, or add one below.
      </Text>

      <View style={[styles.addCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <TextInput
          value={wordInput}
          onChangeText={setWordInput}
          placeholder="Add a word"
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
          ]}
          testID={SAVED_WORDS_LIST_TEST_IDS.wordInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          onPress={handleAdd}
          accessibilityRole="button"
          accessibilityLabel="Add word to list"
          testID={SAVED_WORDS_LIST_TEST_IDS.addBtn}
          style={({ pressed }) => [
            styles.addBtn,
            {
              borderColor: colors.selection.border,
              backgroundColor: colors.selection.bg,
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={[styles.addBtnText, { color: colors.selection.text }]}>Add</Text>
        </Pressable>
      </View>

      {visibleEntries.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]} testID={SAVED_WORDS_LIST_TEST_IDS.empty}>
          No words yet.
        </Text>
      ) : (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          testID={SAVED_WORDS_LIST_TEST_IDS.list}
        >
          {visibleEntries.map((entry) => {
            const progress = migrateDictionaryEntry(entry);
            const ownership = resolveEntryPracticeLanguage(entry) ?? practiceLanguage;
            return (
            <View
              key={`${ownership}:${entry.word}`}
              style={[styles.item, { borderColor: colors.border, backgroundColor: colors.surface }]}
              testID={SAVED_WORDS_LIST_TEST_IDS.item(entry.word)}
            >
              <View style={styles.itemBody}>
                <Text style={[styles.itemWord, { color: colors.text }]}>
                  {formatPracticeProgress(entry)}
                </Text>
                <Text style={[styles.itemMeta, { color: colors.textDim }]}>
                  {dictionaryLanguageLabel(ownership)}
                  {entry.savedAt ? ` · ${formatSavedDate(entry.savedAt)}` : ''}
                  {progress.usedCount >= progress.targetUses ? ' · completed' : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => handleDelete(entry)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${entry.displayWord}`}
                testID={SAVED_WORDS_LIST_TEST_IDS.delete(entry.word)}
                style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.75 }]}
              >
                <Text style={[styles.deleteText, { color: colors.danger }]}>✕</Text>
              </Pressable>
            </View>
          );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  hint: {
    fontSize: 11,
    lineHeight: 15,
  },
  addCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  addBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  empty: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },
  listScroll: {
    maxHeight: 280,
  },
  listContent: {
    gap: 8,
    paddingBottom: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  itemBody: {
    flex: 1,
    gap: 2,
  },
  itemWord: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemMeta: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
