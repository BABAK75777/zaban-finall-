import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  GraduationCap,
  Snail,
  SprayCan,
  Star,
  TextAlignJustify,
  TextAlignStart,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

export const SLIDER_ICON_SIZE = 19;
export const SLIDER_ICON_STROKE = 2;

const ACTIVE_LOW_RATIO = 0.35;
const ACTIVE_HIGH_RATIO = 0.65;

type EndpointActiveSide = 'left' | 'right' | 'neutral';

export type SliderEndpointSideConfig = {
  Icon?: LucideIcon;
  label?: string;
  accessibilityLabel: string;
  fontSize?: number;
};

export type SliderEndpointPresetKey = 'difficulty' | 'aiSpeed' | 'textLength' | 'toneStyle';

export const SLIDER_ENDPOINT_TEST_IDS: Record<
  SliderEndpointPresetKey,
  { min: string; max: string }
> = {
  difficulty: { min: 'difficulty-icon-min', max: 'difficulty-icon-max' },
  aiSpeed: { min: 'aiSpeed-icon-min', max: 'aiSpeed-icon-max' },
  textLength: { min: 'textLength-icon-min', max: 'textLength-icon-max' },
  toneStyle: { min: 'toneStyle-icon-min', max: 'toneStyle-icon-max' },
};

type SliderEndpointPreset = {
  mode: 'icon' | 'iconText';
  left: SliderEndpointSideConfig;
  right: SliderEndpointSideConfig;
};

export const SLIDER_ENDPOINT_PRESETS: Record<SliderEndpointPresetKey, SliderEndpointPreset> = {
  difficulty: {
    mode: 'icon',
    left: { Icon: Star, accessibilityLabel: 'Beginner' },
    right: { Icon: Trophy, accessibilityLabel: 'Advanced' },
  },
  aiSpeed: {
    mode: 'icon',
    left: { Icon: Snail, accessibilityLabel: 'Slow' },
    right: { Icon: Zap, accessibilityLabel: 'Fast' },
  },
  textLength: {
    mode: 'icon',
    left: { Icon: TextAlignStart, accessibilityLabel: 'Short' },
    right: { Icon: TextAlignJustify, accessibilityLabel: 'Long' },
  },
  toneStyle: {
    mode: 'iconText',
    left: { Icon: GraduationCap, label: 'Academic', accessibilityLabel: 'Academic' },
    right: { Icon: SprayCan, label: 'Street', accessibilityLabel: 'Street' },
  },
};

function activeSide(value: number, min: number, max: number): EndpointActiveSide {
  if (max <= min) return 'neutral';
  const ratio = (value - min) / (max - min);
  if (ratio <= ACTIVE_LOW_RATIO) return 'left';
  if (ratio >= ACTIVE_HIGH_RATIO) return 'right';
  return 'neutral';
}

function endpointColor(
  side: 'left' | 'right',
  active: EndpointActiveSide,
  mutedColor: string,
  accentColor: string
): string {
  if (active === side) return accentColor;
  return mutedColor;
}

interface SliderEndpointIconProps {
  Icon: LucideIcon;
  color: string;
  accessibilityLabel: string;
  testID: string;
}

function SliderEndpointIcon({ Icon, color, accessibilityLabel, testID }: SliderEndpointIconProps) {
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility="yes"
    >
      <Icon color={color} size={SLIDER_ICON_SIZE} strokeWidth={SLIDER_ICON_STROKE} />
    </View>
  );
}

interface SliderEndpointRowProps {
  value: number;
  min: number;
  max: number;
  mutedColor: string;
  accentColor: string;
  preset: SliderEndpointPresetKey;
  labelMarginBottom?: number;
  /** Place slider (or other control) between endpoint icons on one row. */
  inline?: boolean;
  children?: React.ReactNode;
}

export function SliderEndpointRow({
  value,
  min,
  max,
  mutedColor,
  accentColor,
  preset,
  labelMarginBottom = 4,
  inline = false,
  children,
}: SliderEndpointRowProps) {
  const { mode, left, right } = SLIDER_ENDPOINT_PRESETS[preset];
  const active = activeSide(value, min, max);
  const leftColor = endpointColor('left', active, mutedColor, accentColor);
  const rightColor = endpointColor('right', active, mutedColor, accentColor);

  const testIds = SLIDER_ENDPOINT_TEST_IDS[preset];

  const renderSide = (side: SliderEndpointSideConfig, color: string, endpoint: 'min' | 'max') => {
    const testID = endpoint === 'min' ? testIds.min : testIds.max;

    if (mode === 'iconText' && side.Icon && side.label) {
      const Icon = side.Icon;
      return (
        <View
          testID={testID}
          style={styles.iconTextEndpoint}
          accessible
          accessibilityRole="text"
          accessibilityLabel={side.accessibilityLabel}
        >
          <Icon
            color={color}
            size={SLIDER_ICON_SIZE}
            strokeWidth={SLIDER_ICON_STROKE}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          />
          <Text style={[styles.iconTextLabel, { color }]}>{side.label}</Text>
        </View>
      );
    }

    if (mode === 'icon' && side.Icon) {
      return (
        <SliderEndpointIcon
          Icon={side.Icon}
          color={color}
          accessibilityLabel={side.accessibilityLabel}
          testID={testID}
        />
      );
    }

    return null;
  };

  if (inline && children != null) {
    return (
      <View style={[styles.row, styles.inlineRow, { marginBottom: labelMarginBottom }]}>
        {renderSide(left, leftColor, 'min')}
        <View style={styles.inlineTrack}>{children}</View>
        {renderSide(right, rightColor, 'max')}
      </View>
    );
  }

  return (
    <View style={[styles.row, { marginBottom: labelMarginBottom }]}>
      {renderSide(left, leftColor, 'min')}
      {renderSide(right, rightColor, 'max')}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inlineRow: {
    gap: 6,
  },
  inlineTrack: {
    flex: 1,
    minWidth: 0,
  },
  iconTextEndpoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconTextLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
