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
import type { ThemePalette } from '../theme/themeTypes';
import { MicLucideIcon } from './icons/LucideIcons';
import { HearAiIcon } from './icons/HearAiIcon';
import { navPillStyle } from './NavPills';
import { controlSizes, space } from './spacing';

interface ActionClusterProps {
  theme: ThemePalette;
  micBreath: Animated.Value;
  hearPulse: Animated.Value;
  shadowRecording: boolean;
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
  shadowPlaying,
  busy,
  hearDisabled,
  onMic,
  onHear,
  hearLoading,
}: ActionClusterProps) {
  const b = theme.buttons;
  const navStyle = navPillStyle(theme);
  const iconColor = b.replayText;

  const micPurpleBg = shadowRecording
    ? theme.dangerSoft
    : shadowPlaying
      ? theme.accentSoft
      : b.micBg;

  const micPurpleBorder = shadowRecording
    ? 'rgba(248, 113, 113, 0.5)'
    : shadowPlaying
      ? theme.accentGlow
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
          <Text style={[styles.pillLabel, { color: theme.text }]}>AI</Text>
        </Animated.View>
      </Pressable>

      <Animated.View style={{ transform: [{ scale: micBreath }], width: '100%' }}>
        <Pressable
          onPress={onMic}
          accessibilityRole="button"
          accessibilityLabel="Shadow microphone"
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
                  shadowOpacity: 0.42,
                  shadowRadius: 10,
                },
                android: { elevation: 8 },
              }),
            },
            pressed && { opacity: 0.93 },
          ]}
        >
          <MicLucideIcon color="#FAFBFF" size={PILL_ICON} />
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
    fontWeight: '600',
    letterSpacing: 0.16,
  },
  disabled: { opacity: 0.62 },
});
