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

interface SkyPalette {
  skyTop: string;
  skyBottom: string;
  star?: string;
}

function skyPalette(theme: ThemePalette): SkyPalette {
  switch (theme.id) {
    case 'dark':
      return {
        skyTop: theme.bg,
        skyBottom: theme.surface,
        star: 'rgba(255, 255, 255, 0.3)',
      };
    case 'light':
      return {
        skyTop: theme.bg,
        skyBottom: theme.surface,
      };
    case 'cream':
      return {
        skyTop: theme.bg,
        skyBottom: theme.surface,
      };
  }
}

interface AtmosphereBackgroundProps {
  theme: ThemePalette;
}

/** Soft ambient background per theme — no blobs behind the sentence. */
export function AtmosphereBackground({ theme }: AtmosphereBackgroundProps) {
  const { id } = theme;
  const palette = useMemo(() => skyPalette(theme), [theme]);

  const stars = useMemo(
    () =>
      id === 'dark'
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
                backgroundColor: palette.star,
              }}
            />
          ))
        : null,
    [id, palette.star]
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]} pointerEvents="none">
      <View style={[styles.skyFill, { backgroundColor: palette.skyTop }]} />

      {stars}

      <View
        style={[
          styles.bottomVignette,
          { backgroundColor: palette.skyBottom, opacity: id === 'dark' ? 0.45 : 0.3 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  skyFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomVignette: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: H * 0.3,
  },
});
