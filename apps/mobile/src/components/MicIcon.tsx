import React from 'react';
import { StyleSheet, View } from 'react-native';

interface MicIconProps {
  color: string;
  size?: number;
}

/** Simple mic glyph — avoids emoji rendering inconsistencies. */
export function MicIcon({ color, size = 32 }: MicIconProps) {
  const head = size * 0.38;
  const stemW = size * 0.12;
  const stemH = size * 0.28;
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View
        style={{
          width: head,
          height: head * 1.15,
          borderRadius: head * 0.5,
          borderWidth: Math.max(2, size * 0.07),
          borderColor: color,
        }}
      />
      <View style={{ width: stemW, height: stemH, backgroundColor: color, marginTop: 2 }} />
      <View
        style={{
          width: size * 0.55,
          height: Math.max(2, size * 0.06),
          backgroundColor: color,
          borderRadius: 2,
          marginTop: 2,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
