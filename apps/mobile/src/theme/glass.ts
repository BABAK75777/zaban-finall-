import { Platform, type ViewStyle } from 'react-native';
import type { ThemePalette } from './themeTypes';

/** Frosted-glass panel styling shared across controls. */
export function glassStyle(theme: ThemePalette, elevated = false): ViewStyle {
  const g = theme.glass;
  return {
    backgroundColor: elevated ? theme.surfaceElevated : g.bg,
    borderColor: g.border,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: g.shadow,
        shadowOffset: { width: 0, height: elevated ? 6 : 2 },
        shadowOpacity: elevated ? 0.18 : theme.id === 'dark' ? 0.22 : 0.06,
        shadowRadius: elevated ? 12 : theme.id === 'dark' ? 10 : 6,
      },
      android: { elevation: elevated ? 6 : theme.id === 'dark' ? 4 : 1 },
    }),
  };
}

/** Soft glass capsule for Replay / AI side controls. */
export function sideGlassStyle(theme: ThemePalette, busy: boolean): ViewStyle {
  const b = theme.buttons;
  return {
    backgroundColor: b.hearBg,
    borderColor: b.hearBorder,
    borderWidth: 1,
    opacity: busy ? 0.8 : 0.96,
    ...Platform.select({
      ios: {
        shadowColor: theme.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.id === 'dark' ? 0.14 : 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  };
}

export function glassHighlight(theme: ThemePalette): ViewStyle {
  return {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: theme.glass.highlight,
    opacity: 0.9,
  };
}
