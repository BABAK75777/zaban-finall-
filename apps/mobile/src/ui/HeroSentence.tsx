import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import type { ThemePalette } from '../theme/themeTypes';
import { useResponsiveLayoutMetrics } from './responsiveLayout';
import { space } from './spacing';
import { READING_TEST_IDS } from './testIds';

const WAVE_BAR_COUNT_MAX = 28;

interface HeroSentenceProps {
  theme: ThemePalette;
  text: string;
  fontSize: number;
  isPlaceholder: boolean;
  opacity: Animated.Value;
  waveformActive: boolean;
}

function ReadingWaveform({
  theme,
  active = false,
  barCount,
}: {
  theme: ThemePalette;
  active?: boolean;
  barCount: number;
}) {
  const bars = useRef(
    Array.from({ length: WAVE_BAR_COUNT_MAX }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    const visibleBars = bars.slice(0, barCount);
    if (!active) {
      visibleBars.forEach((bar, i) => {
        bar.stopAnimation();
        bar.setValue(0.34 + (i % 5) * 0.05);
      });
      return;
    }
    const animations = visibleBars.map((bar, i) => {
      const peak = 0.72 + (i % 6) * 0.08;
      return Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: peak,
            duration: 1100 + (i % 8) * 90,
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.26 + (i % 4) * 0.05,
            duration: 1100 + (i % 6) * 80,
            useNativeDriver: true,
          }),
        ])
      );
    });
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [active, barCount, bars]);

  return (
    <View
      style={[
        waveformStyles.wrap,
        { opacity: theme.id === 'dark' ? 0.92 : 0.72 },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {bars.slice(0, barCount).map((bar, i) => (
        <Animated.View
          key={i}
          style={[
            waveformStyles.bar,
            {
              backgroundColor: active ? theme.waveform.active : theme.waveform.inactive,
              opacity: active ? 0.72 : 0.34,
              transform: [{ scaleY: bar }],
            },
          ]}
        />
      ))}
    </View>
  );
}

export function HeroSentence({
  theme,
  text,
  fontSize,
  isPlaceholder,
  opacity,
  waveformActive,
}: HeroSentenceProps) {
  const layout = useResponsiveLayoutMetrics();
  const size = isPlaceholder ? Math.min(fontSize, 30) : fontSize;
  const lineHeight = Math.round(size * 1.52);

  const textStyle: StyleProp<TextStyle> = [
    styles.sentence,
    {
      fontSize: size,
      lineHeight,
      color: isPlaceholder ? theme.textMuted : theme.text,
      fontFamily: theme.fontFamilySentence,
      ...Platform.select({
        ios: {
          textShadowColor: theme.id === 'dark' ? 'rgba(0,0,0,0.25)' : 'rgba(30, 40, 60, 0.05)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: theme.id === 'dark' ? 4 : 3,
        },
        android: {},
      }),
    },
  ];

  return (
    <Animated.View style={[styles.stage, { opacity, paddingHorizontal: layout.heroPadH }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text
          style={textStyle}
          testID={READING_TEST_IDS.heroSentence}
          accessibilityRole="text"
          accessibilityLabel={isPlaceholder ? text : undefined}
        >
          {text}
        </Text>
      </ScrollView>
      <ReadingWaveform theme={theme} active={waveformActive} barCount={layout.waveformBarCount} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 5,
    paddingTop: space.xs,
    paddingBottom: 0,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: space.md,
    minHeight: 120,
  },
  sentence: {
    textAlign: 'center',
    letterSpacing: 0.15,
  },
});

const waveformStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    gap: 3,
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 12,
  },
  bar: {
    width: 3.5,
    height: 34,
    borderRadius: 2,
  },
});
