import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { DARK_TOKENS as D } from './darkTokens';
import type { ThemeId, ThemePalette } from './themeTypes';

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

function skyPalette(id: ThemeId): SkyPalette {
  switch (id) {
    case 'dark':
      return {
        skyTop: D.backgroundPrimary,
        skyBottom: D.backgroundSecondary,
        star: 'rgba(200, 195, 220, 0.4)',
      };
    case 'light':
      return {
        skyTop: '#FFFFFF',
        skyBottom: '#F8F9FC',
      };
    case 'cream':
      return {
        skyTop: '#FFFCF6',
        skyBottom: '#FAF6EE',
      };
  }
}

interface AtmosphereBackgroundProps {
  theme: ThemePalette;
}

/** Deep cinematic sky — no blobs or ovals behind the sentence. */
export function AtmosphereBackground({ theme }: AtmosphereBackgroundProps) {
  const { id } = theme;
  const palette = useMemo(() => skyPalette(id), [id]);

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
          { backgroundColor: palette.skyBottom, opacity: id === 'dark' ? 0.5 : 0.35 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /** Single full-bleed sky — no mid-screen band (removes center horizon line). */
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
