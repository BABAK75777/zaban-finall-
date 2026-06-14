import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { glassStyle } from '../theme/glass';
import type { ThemePalette } from '../theme/themeTypes';
import { controlSizes, space } from './spacing';

interface TopAmbientBarProps {
  theme: ThemePalette;
  onMenuPress: () => void;
}

export function TopAmbientBar({ theme, onMenuPress }: TopAmbientBarProps) {
  return (
    <View style={styles.wrap}>
      <Pressable
        style={({ pressed }) => [
          styles.iconBtn,
          glassStyle(theme),
          pressed && { opacity: 0.88 },
        ]}
        onPress={onMenuPress}
        hitSlop={14}
        accessibilityLabel="Menu"
      >
        <Text style={[styles.menuDots, { color: theme.textMuted }]}>⋯</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingTop: space.xs,
    paddingBottom: space.xs,
    zIndex: 10,
  },
  iconBtn: {
    width: controlSizes.topIcon,
    height: controlSizes.topIcon,
    borderRadius: controlSizes.topIcon / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDots: { fontSize: 22, fontWeight: '600', marginTop: -4 },
});
