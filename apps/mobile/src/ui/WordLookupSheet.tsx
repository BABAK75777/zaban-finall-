import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { glassStyle } from '../theme/glass';
import type { ThemePalette } from '../theme/themeTypes';
import { dictionaryLanguageLabel, type DictionaryLanguageCode } from '../dictionary';
import { MAX_CONTENT_WIDTH } from './responsiveLayout';
import { space } from './spacing';

export const WORD_LOOKUP_TEST_IDS = {
  sheet: 'word-lookup-sheet',
  close: 'word-lookup-close',
  meaning: 'word-lookup-meaning',
  saveStar: 'word-lookup-save-star',
} as const;

interface WordLookupSheetProps {
  visible: boolean;
  theme: ThemePalette;
  displayWord: string;
  targetLanguage: DictionaryLanguageCode;
  meaning: string | null;
  partOfSpeech?: string | null;
  loading: boolean;
  error: string | null;
  savedToDictionary: boolean;
  practiceUsedCount: number;
  practiceTargetUses: number;
  practiceStarred: boolean;
  lookupCount: number;
  canToggleSave: boolean;
  onClose: () => void;
  onToggleSave: () => void;
}

export function WordLookupSheet({
  visible,
  theme,
  displayWord,
  targetLanguage,
  meaning,
  partOfSpeech,
  loading,
  error,
  savedToDictionary,
  practiceUsedCount,
  practiceTargetUses,
  practiceStarred,
  lookupCount,
  canToggleSave,
  onClose,
  onToggleSave,
}: WordLookupSheetProps) {
  const colors = theme;
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable
        style={[
          styles.backdrop,
          {
            paddingTop: space.md,
            paddingHorizontal: space.md,
            paddingBottom: Math.max(space.md, insets.bottom + space.sm),
          },
        ]}
        onPress={onClose}
      >
        <Pressable
          style={[
            styles.panel,
            glassStyle(theme),
            {
              borderColor: colors.border,
              maxWidth: MAX_CONTENT_WIDTH,
              width: '100%',
              alignSelf: 'center',
            },
          ]}
          onPress={(e) => e.stopPropagation()}
          testID={WORD_LOOKUP_TEST_IDS.sheet}
        >
          <View style={styles.header}>
            <Text style={[styles.word, { color: colors.text }]}>{displayWord}</Text>
            <View style={styles.headerActions}>
              {canToggleSave ? (
                <Pressable
                  onPress={onToggleSave}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityState={{ selected: savedToDictionary }}
                  accessibilityLabel={
                    savedToDictionary ? 'Remove from my words' : 'Save to my words'
                  }
                  testID={WORD_LOOKUP_TEST_IDS.saveStar}
                  style={({ pressed }) => [styles.starBtn, pressed && { opacity: 0.75 }]}
                >
                  <Text
                    style={[
                      styles.star,
                      { color: savedToDictionary ? colors.accent : colors.textMuted },
                    ]}
                  >
                    {savedToDictionary ? '★' : '☆'}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={onClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close word lookup"
                testID={WORD_LOOKUP_TEST_IDS.close}
              >
                <Text style={[styles.close, { color: colors.textMuted }]}>✕</Text>
              </Pressable>
            </View>
          </View>

          <Text style={[styles.lang, { color: colors.textDim }]}>
            {dictionaryLanguageLabel(targetLanguage)}
          </Text>

          {loading && !meaning ? (
            <ActivityIndicator color={colors.accent} style={styles.loader} />
          ) : null}

          {error ? (
            <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
          ) : null}

          {meaning ? (
            <Text
              style={[styles.meaning, { color: colors.text }]}
              testID={WORD_LOOKUP_TEST_IDS.meaning}
            >
              {meaning}
            </Text>
          ) : !loading && !error ? (
            <Text style={[styles.error, { color: colors.textMuted }]}>No meaning found.</Text>
          ) : null}

          {partOfSpeech ? (
            <Text style={[styles.pos, { color: colors.textMuted }]}>{partOfSpeech}</Text>
          ) : null}

          {lookupCount > 1 ? (
            <Text style={[styles.meta, { color: colors.textDim }]}>
              Looked up {lookupCount} times
            </Text>
          ) : null}

          {savedToDictionary ? (
            <Text style={[styles.meta, { color: colors.accent }]}>
              {practiceStarred ? '★ ' : ''}
              Practice progress: {practiceUsedCount}/{practiceTargetUses}
            </Text>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  panel: {
    borderRadius: 16,
    borderWidth: 1,
    padding: space.md,
    gap: space.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  word: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
    flexShrink: 1,
  },
  starBtn: {
    padding: 4,
  },
  star: {
    fontSize: 24,
    lineHeight: 26,
  },
  close: {
    fontSize: 20,
    padding: 4,
  },
  lang: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  meaning: {
    fontSize: 17,
    lineHeight: 24,
    marginTop: space.xs,
  },
  pos: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  meta: {
    fontSize: 12,
    marginTop: space.xs,
  },
  error: {
    fontSize: 14,
    marginTop: space.xs,
  },
  loader: {
    marginVertical: space.sm,
  },
});
