import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import type { ThemePalette } from './themeTypes';

const { width: W, height: H } = Dimensions.get('window');

const STARS = [
  { l: 0.12, t: 0.06, s: 1.2, o: 0.32 },
  { l: 0.34, t: 0.045, s: 1, o: 0.22 },
  { l: 0.58, t: 0.055, s: 1.2, o: 0.28 },
  { l: 0.78, t: 0.05, s: 1, o: 0.24 },
];

interface AtmosphereBackgroundProps {
  theme: ThemePalette;
}

/** Flat ambient background per theme — uniform color top to bottom. */
export function AtmosphereBackground({ theme }: AtmosphereBackgroundProps) {
  const stars = useMemo(
    () =>
      theme.id === 'dark'
        ? STARS.map((s, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: s.l * W,
                top: s.t * H,
                width: s.s,
                height: s.s,
                borderRadius: s.s,
                opacity: s.o,
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
              }}
            />
          ))
        : null,
    [theme.id]
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]} pointerEvents="none">
      {stars}
    </View>
  );
}
