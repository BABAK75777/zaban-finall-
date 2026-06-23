import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ThemePalette } from '../theme/themeTypes';
import { FullScreenModalShell } from './FullScreenModalShell';
import { READING_TEST_IDS } from './testIds';
import { space } from './spacing';

type Props = {
  visible: boolean;
  onClose: () => void;
  theme: ThemePalette;
  onPickLibrary: () => void;
  onPickCamera: () => void;
  loading?: boolean;
};

export function PhotoSourceModal({
  visible,
  onClose,
  theme,
  onPickLibrary,
  onPickCamera,
  loading = false,
}: Props) {
  const colors = theme;

  return (
    <FullScreenModalShell
      visible={visible}
      onClose={onClose}
      theme={theme}
      title="Album"
      testID={READING_TEST_IDS.photoSourceModal}
      closeTestID={READING_TEST_IDS.photoSourceClose}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.body}>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Choose a photo from your library or take a new one with the camera.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.accent, borderColor: colors.accent },
              pressed && { opacity: 0.88 },
              loading && { opacity: 0.6 },
            ]}
            onPress={onPickLibrary}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Open photo library"
            testID={READING_TEST_IDS.photoSourceLibrary}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.actionBtnText}>🖼️  Choose from library</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.secondaryBtn,
              { borderColor: colors.border, backgroundColor: colors.bg },
              pressed && { opacity: 0.88 },
              loading && { opacity: 0.6 },
            ]}
            onPress={onPickCamera}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Open camera"
            testID={READING_TEST_IDS.photoSourceCamera}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                📷  Take photo
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </FullScreenModalShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: space.xxl,
  },
  body: {
    alignItems: 'stretch',
    gap: space.md,
    paddingTop: space.md,
    paddingHorizontal: space.sm,
  },
  hint: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: space.sm,
  },
  actionBtn: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {},
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
