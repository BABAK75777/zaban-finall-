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
      const peak = active ? 0.58 + (i % 6) * 0.07 : 0.3 + (i % 5) * 0.04;
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
              opacity: active ? 0.82 : 0.38,
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
    height: 22,
    gap: 2,
    marginTop: 10,
    marginBottom: 2,
    paddingHorizontal: 8,
    opacity: 0.88,
  },
  bar: {
    width: 2.5,
    height: 20,
    borderRadius: 1.5,
  },
});
