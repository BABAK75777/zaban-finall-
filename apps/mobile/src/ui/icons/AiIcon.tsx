import React from 'react';
import { StyleSheet, View } from 'react-native';

interface AiIconProps {
  color: string;
  size?: number;
}

/** Audio-intelligence bars — balanced, device-inspired. */
export function AiIcon({ color, size = 22 }: AiIconProps) {
  const barW = Math.max(2.5, size * 0.11);
  const gap = size * 0.12;
  const heights = [0.44, 0.78, 0.54];

  return (
    <View style={[styles.row, { height: size, gap }]}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={{
            width: barW,
            height: Math.round(size * h),
            borderRadius: barW,
            backgroundColor: color,
            opacity: i === 1 ? 1 : 0.78,
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
