import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { glassStyle } from '../theme/glass';
import type { ThemePalette } from '../theme/themeTypes';
import { useResponsiveLayoutMetrics } from './responsiveLayout';
import { controlSizes, space } from './spacing';
import { READING_TEST_IDS } from './testIds';

interface TopAmbientBarProps {
  theme: ThemePalette;
  onMenuPress: () => void;
  onAlbumPress?: () => void;
  onDicPress?: () => void;
  photoLoading?: boolean;
}

export function TopAmbientBar({
  theme,
  onMenuPress,
  onAlbumPress,
  onDicPress,
  photoLoading = false,
}: TopAmbientBarProps) {
  const layout = useResponsiveLayoutMetrics();
  const showTopActions = onAlbumPress != null || onDicPress != null;

  return (
    <View style={[styles.wrap, { paddingHorizontal: layout.topBarPadH }]}>
      <Pressable
        style={({ pressed }) => [
          styles.iconBtn,
          glassStyle(theme),
          pressed && { opacity: 0.88 },
        ]}
        onPress={onMenuPress}
        hitSlop={14}
        accessibilityRole="button"
        accessibilityLabel="Menu"
        testID={READING_TEST_IDS.menu}
      >
        <Text style={[styles.menuDots, { color: theme.textMuted }]}>⋯</Text>
      </Pressable>

      {showTopActions ? (
        <View style={styles.topActions}>
          {onAlbumPress ? (
            <Pressable
              style={({ pressed }) => [
                styles.iconBtn,
                glassStyle(theme),
                pressed && { opacity: 0.88 },
                photoLoading && { opacity: 0.6 },
              ]}
              onPress={onAlbumPress}
              disabled={photoLoading}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Photo from album or camera"
              testID={READING_TEST_IDS.topAlbum}
            >
              {photoLoading ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : (
                <Text style={styles.actionIcon}>🖼️</Text>
              )}
            </Pressable>
          ) : null}
          {onDicPress ? (
            <Pressable
              style={({ pressed }) => [
                styles.iconBtn,
                glassStyle(theme),
                pressed && { opacity: 0.88 },
              ]}
              onPress={onDicPress}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Dictionary"
              testID={READING_TEST_IDS.topDic}
            >
              <Text style={styles.actionIcon}>📖</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: space.xs,
    paddingBottom: space.xs,
    zIndex: 10,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  iconBtn: {
    width: controlSizes.topIcon,
    height: controlSizes.topIcon,
    borderRadius: controlSizes.topIcon / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDots: { fontSize: 22, fontWeight: '600', marginTop: -4 },
  actionIcon: { fontSize: 18 },
});
