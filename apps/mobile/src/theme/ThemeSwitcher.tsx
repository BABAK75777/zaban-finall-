import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ThemeId, ThemePalette } from './themeTypes';
import { THEME_ORDER } from './themeTypes';
import { themeTestId } from '../ui/testIds';

interface ThemeSwitcherProps {
  themeId: ThemeId;
  theme: ThemePalette;
  onSelect: (id: ThemeId) => void;
  disabled?: boolean;
}

const SHORT_LABELS: Record<ThemeId, string> = {
  dark: 'Dark',
  light: 'Light',
  cream: 'Cream',
};

/**
 * Compact 3-mode theme switcher — instant visual update, no heavy animation.
 */
export function ThemeSwitcher({ themeId, theme, onSelect, disabled }: ThemeSwitcherProps) {
  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
      accessibilityRole="tablist"
    >
      {THEME_ORDER.map((id) => {
        const active = id === themeId;
        return (
          <Pressable
            key={id}
            onPress={() => onSelect(id)}
            disabled={disabled}
            style={({ pressed }) => [
              styles.segment,
              active && {
                backgroundColor: theme.selection.bg,
                borderColor: theme.selection.border,
              },
              !active && { borderColor: 'transparent' },
              pressed && !disabled && { opacity: 0.85 },
              disabled && styles.disabled,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${SHORT_LABELS[id]} theme`}
            testID={themeTestId(id)}
          >
            <Text
              style={[
                styles.label,
                {
                  color: active ? theme.selection.text : theme.textDim,
                  fontFamily: theme.fontFamilyUI,
                },
              ]}
            >
              {SHORT_LABELS[id]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    padding: 3,
    gap: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  segment: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  disabled: {
    opacity: 0.4,
  },
});
