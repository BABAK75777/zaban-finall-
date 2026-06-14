import React from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { DecorativeWaveform } from '../components/DecorativeWaveform';
import type { ThemePalette } from '../theme/themeTypes';
import { space } from './spacing';

interface HeroSentenceProps {
  theme: ThemePalette;
  text: string;
  fontSize: number;
  isPlaceholder: boolean;
  opacity: Animated.Value;
  waveformActive: boolean;
}

export function HeroSentence({
  theme,
  text,
  fontSize,
  isPlaceholder,
  opacity,
  waveformActive,
}: HeroSentenceProps) {
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
    <Animated.View style={[styles.stage, { opacity }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.Text style={textStyle}>{text}</Animated.Text>
      </ScrollView>
      <DecorativeWaveform theme={theme} active={waveformActive} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space.heroPadH,
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
