import React from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { glassHighlight, glassStyle } from '../theme/glass';
import { UI_FONT_SEMIBOLD } from '../theme/themes';
import type { ThemePalette } from '../theme/themeTypes';
import { HearAiIcon } from './icons/HearAiIcon';
import { READING_TEST_IDS } from './testIds';
import { useResponsiveLayoutMetrics } from './responsiveLayout';
import { controlSizes, space } from './spacing';

interface NavPillsProps {
  theme: ThemePalette;
  backDisabled: boolean;
  nextDisabled: boolean;
  hearDisabled: boolean;
  hearLoading: boolean;
  hearPulse: Animated.Value;
  onBack: () => void;
  onNext: () => void;
  onHear: () => void;
}

const PILL_ICON = 22;

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

export function NavPills({
  theme,
  backDisabled,
  nextDisabled,
  hearDisabled,
  hearLoading,
  hearPulse,
  onBack,
  onNext,
  onHear,
}: NavPillsProps) {
  const layout = useResponsiveLayoutMetrics();
  const pillStyle = navPillStyle(theme);
  const labelColor = theme.text;
  const iconColor = theme.buttons.replayText;

  return (
    <View style={[styles.row, { gap: layout.navGap }]}>
      <Pressable
        style={({ pressed }) => [
          styles.sidePill,
          glassStyle(theme),
          pillStyle,
          backDisabled && styles.disabled,
          pressed && !backDisabled && { opacity: 0.94 },
        ]}
        onPress={onBack}
        disabled={backDisabled}
        accessibilityRole="button"
        accessibilityLabel="Back"
        testID={READING_TEST_IDS.back}
      >
        <View style={glassHighlight(theme)} pointerEvents="none" />
        <Text
          style={[
            styles.label,
            { color: labelColor, fontFamily: UI_FONT_SEMIBOLD, fontSize: layout.navLabelFontSize },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          ← Back
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.aiPill,
          { minWidth: layout.navAiMinWidth },
          glassStyle(theme),
          pillStyle,
          hearDisabled && styles.disabled,
          pressed && !hearDisabled && { opacity: 0.94 },
        ]}
        onPress={onHear}
        disabled={hearDisabled}
        accessibilityRole="button"
        accessibilityLabel="Hear AI"
        testID={READING_TEST_IDS.hearAi}
      >
        <View style={glassHighlight(theme)} pointerEvents="none" />
        <Animated.View style={[styles.aiContent, { transform: [{ scale: hearPulse }] }]}>
          {hearLoading ? (
            <ActivityIndicator color={iconColor} size="small" />
          ) : (
            <HearAiIcon color={iconColor} size={PILL_ICON} />
          )}
          <Text
            style={[
              styles.label,
              { color: labelColor, fontFamily: UI_FONT_SEMIBOLD, fontSize: layout.navLabelFontSize },
            ]}
            numberOfLines={1}
          >
            AI
          </Text>
        </Animated.View>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.sidePill,
          glassStyle(theme),
          pillStyle,
          nextDisabled && styles.disabled,
          pressed && !nextDisabled && { opacity: 0.94 },
        ]}
        onPress={onNext}
        disabled={nextDisabled}
        accessibilityRole="button"
        accessibilityLabel="Next"
        testID={READING_TEST_IDS.next}
      >
        <View style={glassHighlight(theme)} pointerEvents="none" />
        <Text
          style={[
            styles.label,
            { color: labelColor, fontFamily: UI_FONT_SEMIBOLD, fontSize: layout.navLabelFontSize },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          Next →
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
  },
  sidePill: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    minHeight: controlSizes.navHeight,
    borderRadius: controlSizes.navHeight / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: space.xs,
  },
  aiPill: {
    flexShrink: 0,
    minHeight: controlSizes.navHeight,
    borderRadius: controlSizes.navHeight / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: space.md,
  },
  aiContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  label: {
    fontSize: 14,
    letterSpacing: 0.16,
  },
  disabled: { opacity: 0.62 },
});
