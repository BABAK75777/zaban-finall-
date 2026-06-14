import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { glassHighlight, glassStyle } from '../theme/glass';
import { UI_FONT_SEMIBOLD } from '../theme/themes';
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
  const b = theme.buttons;
  return {
    backgroundColor: b.navBg,
    borderColor: b.navBorder,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: theme.id === 'dark' ? theme.accentGlow : theme.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: theme.id === 'dark' ? 0.1 : 0.07,
        shadowRadius: 8,
      },
      android: { elevation: theme.id === 'dark' ? 3 : 2 },
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
        <Text style={[styles.label, { color: labelColor, fontFamily: UI_FONT_SEMIBOLD }]}>← Back</Text>
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
        <Text style={[styles.label, { color: labelColor, fontFamily: UI_FONT_SEMIBOLD }]}>Next →</Text>
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
    letterSpacing: 0.16,
  },
  disabled: { opacity: 0.62 },
});
