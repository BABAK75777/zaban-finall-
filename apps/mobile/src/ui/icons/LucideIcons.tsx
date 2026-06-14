import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MicIcon } from '../../components/MicIcon';

interface IconProps {
  color: string;
  size?: number;
  strokeWidth?: number;
}

/** Lucide RotateCcw — large readable circular arrow (no SVG native dep). */
export function RotateCcwIcon({ color, size = 30, strokeWidth = 2.35 }: IconProps) {
  const stroke = strokeWidth;
  const ring = size * 0.7;

  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View
        style={{
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: stroke,
          borderColor: color,
          borderRightColor: 'transparent',
          borderBottomColor: 'transparent',
          transform: [{ rotate: '-135deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.2,
          left: size * 0.18,
          width: size * 0.22,
          height: size * 0.22,
          borderTopWidth: stroke,
          borderLeftWidth: stroke,
          borderColor: color,
        }}
      />
    </View>
  );
}

/** Lucide Sparkles — star + accent ticks (no SVG native dep). */
export function SparklesIcon({ color, size = 30, strokeWidth = 2.35 }: IconProps) {
  const tick = strokeWidth;
  const star = size * 0.34;

  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View
        style={{
          width: star,
          height: star,
          borderWidth: tick,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.1,
          right: size * 0.14,
          width: tick,
          height: size * 0.16,
          backgroundColor: color,
          borderRadius: tick,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.14,
          right: size * 0.1,
          width: size * 0.14,
          height: tick,
          backgroundColor: color,
          borderRadius: tick,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.14,
          left: size * 0.16,
          width: tick * 0.9,
          height: tick * 0.9,
          borderRadius: tick,
          backgroundColor: color,
          opacity: 0.9,
        }}
      />
    </View>
  );
}

export function MicLucideIcon({ color, size = 32 }: IconProps) {
  return <MicIcon color={color} size={size} />;
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
