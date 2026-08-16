import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  CEFR_LEVELS,
  cefrLevelFromIndex,
  clampCefrIndex,
  type CefrLevel,
} from '../ai/cefrLevels';
import type { ThemePalette } from '../theme/themeTypes';
import { SettingSlider } from './SettingSlider';
import { READING_TEST_IDS } from './testIds';

interface CefrLevelSliderProps {
  valueIndex: number;
  onChange: (index: number, level: CefrLevel) => void;
  theme: ThemePalette;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function CefrLevelSlider({
  valueIndex,
  onChange,
  theme,
  onDragStart,
  onDragEnd,
}: CefrLevelSliderProps) {
  const colors = theme;
  const s = colors.slider;
  const activeIndex = clampCefrIndex(valueIndex);

  return (
    <View style={styles.section}>
      <View style={styles.labelRow} accessibilityRole="tablist">
        {CEFR_LEVELS.map((level, index) => {
          const active = index === activeIndex;
          return (
            <Text
              key={level}
              testID={READING_TEST_IDS.aiCefrLabel(level)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[
                styles.label,
                {
                  color: active ? colors.accent : colors.textMuted,
                  opacity: active ? 1 : 0.42,
                },
                active && styles.labelActive,
              ]}
            >
              {level}
            </Text>
          );
        })}
      </View>
      <SettingSlider
        value={activeIndex}
        min={0}
        max={5}
        step={1}
        onChange={(next) => {
          const idx = clampCefrIndex(next);
          onChange(idx, cefrLevelFromIndex(idx));
        }}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        accent={s.fill}
        border={s.border}
        track={s.track}
        compact
        bilateral
        testID={READING_TEST_IDS.aiCefrSlider}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 2,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  labelActive: {
    fontWeight: '800',
    fontSize: 13,
  },
});
