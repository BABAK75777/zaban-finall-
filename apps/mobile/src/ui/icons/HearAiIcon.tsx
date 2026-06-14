import React from 'react';
import { StyleSheet, View } from 'react-native';

interface HearAiIconProps {
  color: string;
  size?: number;
}

export function HearAiIcon({ color, size = 22 }: HearAiIconProps) {
  const barW = Math.max(2.5, size * 0.11);
  const heights = [0.42, 0.72, 1, 0.68, 0.48];

  return (
    <View style={[styles.row, { height: size, gap: barW * 0.55 }]}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={{
            width: barW,
            height: size * h,
            borderRadius: barW,
            backgroundColor: color,
            opacity: 0.92 - i * 0.04,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
