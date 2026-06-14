import React from 'react';
import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { glassHighlight, glassStyle } from '../theme/glass';
import type { ThemePalette } from '../theme/themeTypes';

interface GlassControlProps extends Omit<PressableProps, 'style'> {
  theme: ThemePalette;
  size: number;
  borderRadius?: number;
  elevated?: boolean;
  /** When false, icon glyphs are not clipped (side controls with refresh arrows). */
  clipChildren?: boolean;
  /** Opacity when disabled (default 0.38). Side controls use a higher value so icons stay legible. */
  disabledOpacity?: number;
  showHighlight?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function GlassControl({
  theme,
  size,
  borderRadius = 22,
  elevated = false,
  clipChildren = true,
  disabledOpacity = 0.38,
  showHighlight = true,
  style,
  children,
  ...pressableProps
}: GlassControlProps) {
  return (
    <Pressable
      {...pressableProps}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: clipChildren ? 'hidden' : 'visible',
        },
        glassStyle(theme, elevated),
        style,
        pressed && !pressableProps.disabled && { opacity: 0.9 },
        pressableProps.disabled && { opacity: disabledOpacity },
      ]}
    >
      {showHighlight ? <View style={glassHighlight(theme)} pointerEvents="none" /> : null}
      {children}
    </Pressable>
  );
}
