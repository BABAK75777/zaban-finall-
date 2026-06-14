import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { ThemePalette } from '../theme/themeTypes';

const BAR_COUNT = 28;

interface DecorativeWaveformProps {
  theme: ThemePalette;
  active?: boolean;
}

export function DecorativeWaveform({ theme, active = false }: DecorativeWaveformProps) {
  const bars = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    const animations = bars.map((bar, i) => {
      const peak = active ? 0.72 + (i % 6) * 0.08 : 0.34 + (i % 5) * 0.05;
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
  }, [active, bars]);

  return (
    <View style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              backgroundColor: active ? theme.waveform.active : theme.waveform.inactive,
              opacity: active ? 0.9 : 0.42,
              transform: [{ scaleY: bar }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    gap: 3,
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 12,
    opacity: 0.92,
  },
  bar: {
    width: 3.5,
    height: 34,
    borderRadius: 2,
  },
});
