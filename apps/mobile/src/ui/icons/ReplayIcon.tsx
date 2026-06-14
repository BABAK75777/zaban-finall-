import React from 'react';
import { StyleSheet, View } from 'react-native';

interface ReplayIconProps {
  color: string;
  size?: number;
}

/** Clean circular refresh arrow — single 270° arc + chevron tip. */
export function ReplayIcon({ color, size = 32 }: ReplayIconProps) {
  const stroke = Math.max(3, size * 0.095);
  const ring = size * 0.7;

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <View
        style={{
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: stroke,
          borderColor: color,
          borderBottomColor: 'transparent',
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.09,
          right: size * 0.09,
          width: stroke * 2.15,
          height: stroke * 2.15,
          borderTopWidth: stroke,
          borderRightWidth: stroke,
          borderColor: color,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
