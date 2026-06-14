import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { glassHighlight, glassStyle } from '../theme/glass';
import type { ThemePalette } from '../theme/themeTypes';
import { controlSizes, space } from './spacing';

interface NavPillsProps {
  theme: ThemePalette;
  backDisabled: boolean;
  nextDisabled: boolean;
  onBack: () => void;
  onNext: () => void;
}

export function navPillStyle(theme: ThemePalette) {
  const isDark = theme.id === 'dark';
  return {
    backgroundColor: isDark ? 'rgba(22, 32, 64, 0.82)' : theme.buttons.navBg,
    borderColor: isDark ? 'rgba(192, 132, 252, 0.22)' : theme.buttons.navBorder,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: isDark ? 'rgba(168, 85, 247, 0.35)' : theme.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.1 : 0.07,
        shadowRadius: 8,
      },
      android: { elevation: isDark ? 3 : 2 },
    }),
  };
}

export function NavPills({ theme, backDisabled, nextDisabled, onBack, onNext }: NavPillsProps) {
  const pillStyle = navPillStyle(theme);
  const labelColor = theme.text;

  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [
          styles.pill,
          glassStyle(theme),
          pillStyle,
          backDisabled && styles.disabled,
          pressed && !backDisabled && { opacity: 0.94 },
        ]}
        onPress={onBack}
        disabled={backDisabled}
        accessibilityLabel="BACK"
      >
        <View style={glassHighlight(theme)} pointerEvents="none" />
        <Text style={[styles.label, { color: labelColor }]}>← Back</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.pill,
          glassStyle(theme),
          pillStyle,
          nextDisabled && styles.disabled,
          pressed && !nextDisabled && { opacity: 0.94 },
        ]}
        onPress={onNext}
        disabled={nextDisabled}
        accessibilityLabel="NEXT"
      >
        <View style={glassHighlight(theme)} pointerEvents="none" />
        <Text style={[styles.label, { color: labelColor }]}>Next →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.md,
    width: '100%',
  },
  pill: {
    flex: 1,
    minHeight: controlSizes.navHeight,
    borderRadius: controlSizes.navHeight / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: space.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.16,
  },
  disabled: { opacity: 0.62 },
});
