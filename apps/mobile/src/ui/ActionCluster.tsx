import React from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { glassHighlight, glassStyle } from '../theme/glass';
import { SHADOW_LABEL_FONT, UI_FONT_SEMIBOLD } from '../theme/themes';
import { useFontsReady } from '../theme/FontReadyContext';
import type { ThemePalette } from '../theme/themeTypes';
import { HearAiIcon } from './icons/HearAiIcon';
import { navPillStyle } from './NavPills';
import { controlSizes, space } from './spacing';

interface ActionClusterProps {
  theme: ThemePalette;
  micBreath: Animated.Value;
  hearPulse: Animated.Value;
  shadowRecording: boolean;
  shadowStarting?: boolean;
  shadowPlaying: boolean;
  busy: boolean;
  hearDisabled: boolean;
  onMic: () => void;
  onHear: () => void;
  hearLoading: boolean;
}

const PILL_ICON = 22;

export function ActionCluster({
  theme,
  micBreath,
  hearPulse,
  shadowRecording,
  shadowStarting = false,
  shadowPlaying,
  busy,
  hearDisabled,
  onMic,
  onHear,
  hearLoading,
}: ActionClusterProps) {
  const b = theme.buttons;
  const fontsReady = useFontsReady();
  const navStyle = navPillStyle(theme);
  const iconColor = b.replayText;

  const micDisabled = shadowStarting;

  const micPurpleBg = shadowRecording
    ? theme.dangerSoft
    : shadowPlaying
      ? theme.selection.bg
      : b.micBg;

  const micPurpleBorder = shadowRecording
    ? 'rgba(248, 113, 113, 0.5)'
    : shadowPlaying
      ? theme.selection.border
      : b.micBorder;

  return (
    <View style={styles.wrap}>
      <Pressable
        style={({ pressed }) => [
          styles.pill,
          glassStyle(theme),
          navStyle,
          hearDisabled && styles.disabled,
          busy && { opacity: 0.85 },
          pressed && !hearDisabled && { opacity: 0.94 },
        ]}
        onPress={onHear}
        disabled={hearDisabled}
        accessibilityRole="button"
        accessibilityLabel="Hear AI"
      >
        <View style={glassHighlight(theme)} pointerEvents="none" />
        <Animated.View style={[styles.pillContent, { transform: [{ scale: hearPulse }] }]}>
          {hearLoading ? (
            <ActivityIndicator color={iconColor} size="small" />
          ) : (
            <HearAiIcon color={iconColor} size={PILL_ICON} />
          )}
          <Text style={[styles.pillLabel, { color: theme.text, fontFamily: UI_FONT_SEMIBOLD }]}>AI</Text>
        </Animated.View>
      </Pressable>

      <Animated.View style={{ transform: [{ scale: micBreath }], width: '100%' }}>
        <Pressable
          onPress={onMic}
          disabled={micDisabled}
          accessibilityRole="button"
          accessibilityLabel="Shadow"
          style={({ pressed }) => [
            styles.pill,
            {
              backgroundColor: micPurpleBg,
              borderColor: micPurpleBorder,
              borderWidth: 1,
              shadowColor: b.micGlow,
              ...Platform.select({
                ios: {
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: shadowRecording ? 0.42 : 0.55,
                  shadowRadius: shadowRecording ? 10 : 14,
                },
                android: { elevation: shadowRecording ? 8 : 10 },
              }),
            },
            micDisabled && styles.disabled,
            pressed && !micDisabled && { opacity: 0.93 },
          ]}
        >
          <Text
            style={[
              styles.shadowLabel,
              {
                color: theme.bg,
                fontFamily: fontsReady ? SHADOW_LABEL_FONT : undefined,
              },
            ]}
          >
            Shadow
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: space.md,
  },
  pill: {
    width: '100%',
    minHeight: controlSizes.navHeight,
    borderRadius: controlSizes.navHeight / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: space.sm,
    flexDirection: 'row',
    gap: space.sm,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  pillLabel: {
    fontSize: 14,
    letterSpacing: 0.16,
  },
  shadowLabel: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0.2,
    textAlign: 'center',
    includeFontPadding: false,
    ...Platform.select({
      android: { textAlignVertical: 'center' },
      default: {},
    }),
  },
  disabled: { opacity: 0.62 },
});
