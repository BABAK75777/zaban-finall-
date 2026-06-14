import type { ThemePalette } from './themeTypes';

export type UiStatus = 'idle' | 'fetching' | 'playing' | 'stopped' | 'error';

export function getStatusUi(
  theme: ThemePalette
): Record<UiStatus, { label: string; dot: string; pillBg: string; pillBorder: string }> {
  return {
    idle: {
      label: 'Ready',
      dot: theme.textDim,
      pillBg: theme.surface,
      pillBorder: theme.border,
    },
    fetching: {
      label: 'Loading',
      dot: theme.warning,
      pillBg: theme.accentSoft,
      pillBorder: theme.accentGlow,
    },
    playing: {
      label: 'Playing',
      dot: theme.success,
      pillBg: theme.successSoft,
      pillBorder: 'rgba(52, 211, 153, 0.35)',
    },
    stopped: {
      label: 'Stopped',
      dot: theme.textMuted,
      pillBg: theme.surface,
      pillBorder: theme.border,
    },
    error: {
      label: 'Error',
      dot: theme.danger,
      pillBg: theme.dangerSoft,
      pillBorder: 'rgba(248, 113, 113, 0.35)',
    },
  };
}
