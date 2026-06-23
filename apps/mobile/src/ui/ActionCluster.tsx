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
import { SHADOW_LABEL_FONT } from '../theme/themes';
import { useFontsReady } from '../theme/FontReadyContext';
import type { ThemePalette } from '../theme/themeTypes';
import { controlSizes, space } from './spacing';
import { READING_TEST_IDS } from './testIds';

interface ActionClusterProps {
  theme: ThemePalette;
  micBreath: Animated.Value;
  shadowRecording: boolean;
  shadowStarting?: boolean;
  shadowPlaying: boolean;
  onMic: () => void;
}

export function ActionCluster({
  theme,
  micBreath,
  shadowRecording,
  shadowStarting = false,
  shadowPlaying,
  onMic,
}: ActionClusterProps) {
  const b = theme.buttons;
  const fontsReady = useFontsReady();

  const micDisabled = shadowStarting;
  const softGlow = theme.id === 'light' || theme.id === 'cream';

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
    <Animated.View style={{ transform: [{ scale: micBreath }], width: '100%' }}>
      <Pressable
        onPress={onMic}
        disabled={micDisabled}
        accessibilityRole="button"
        accessibilityLabel="Shadow"
        testID={READING_TEST_IDS.shadow}
        style={({ pressed }) => [
          styles.shadowPill,
          {
            backgroundColor: micPurpleBg,
            borderColor: micPurpleBorder,
            borderWidth: 1,
            shadowColor: b.micGlow,
            ...Platform.select({
              ios: {
                shadowOffset: { width: 0, height: softGlow ? 2 : 4 },
                shadowOpacity: shadowRecording
                  ? softGlow ? 0.22 : 0.42
                  : softGlow ? 0.2 : 0.55,
                shadowRadius: softGlow ? 6 : shadowRecording ? 10 : 14,
              },
              android: { elevation: softGlow ? 4 : shadowRecording ? 9 : 11 },
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
  );
}

const SHADOW_HEIGHT = controlSizes.navHeight + 12;

const styles = StyleSheet.create({
  shadowPill: {
    width: '100%',
    minHeight: SHADOW_HEIGHT,
    borderRadius: SHADOW_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: space.lg,
  },
  shadowLabel: {
    fontSize: 26,
    lineHeight: 32,
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
