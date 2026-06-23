import React, { useState } from 'react';
import { PanResponder, Text, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  SLIDER_ENDPOINT_PRESETS,
  SLIDER_ENDPOINT_TEST_IDS,
  SliderEndpointRow,
  type SliderEndpointPresetKey,
} from '../src/ui/SliderEndpointRow';
import { SettingSlider } from '../src/ui/SettingSlider';

const MUTED = '#888888';
const ACCENT = '#7c3aed';
const SLIDER_THEME = {
  fill: '#7c3aed',
  border: '#555555',
  track: '#333333',
};

const ICON_PRESETS: SliderEndpointPresetKey[] = ['difficulty', 'aiSpeed', 'textLength'];

describe('SliderEndpointRow icon endpoints', () => {
  it.each(ICON_PRESETS)('renders min/max testIDs for %s preset', (preset) => {
    const { min, max } = SLIDER_ENDPOINT_TEST_IDS[preset];
    render(
      <SliderEndpointRow
        preset={preset}
        value={0.5}
        min={0}
        max={1}
        mutedColor={MUTED}
        accentColor={ACCENT}
      />
    );

    expect(screen.getByTestId(min)).toBeTruthy();
    expect(screen.getByTestId(max)).toBeTruthy();
  });

  it('exposes difficulty accessibility labels', () => {
    render(
      <SliderEndpointRow
        preset="difficulty"
        value={0.1}
        min={0}
        max={1}
        mutedColor={MUTED}
        accentColor={ACCENT}
      />
    );

    expect(screen.getByLabelText('Beginner')).toBeTruthy();
    expect(screen.getByLabelText('Advanced')).toBeTruthy();
  });

  it('exposes ai speed accessibility labels', () => {
    render(
      <SliderEndpointRow
        preset="aiSpeed"
        value={1.0}
        min={0.5}
        max={1.5}
        mutedColor={MUTED}
        accentColor={ACCENT}
        inline
      >
        <View testID="inline-slider-slot" />
      </SliderEndpointRow>
    );

    expect(screen.getByLabelText('Slow')).toBeTruthy();
    expect(screen.getByLabelText('Fast')).toBeTruthy();
    expect(screen.getByTestId('inline-slider-slot')).toBeTruthy();
  });

  it('exposes text length accessibility labels', () => {
    render(
      <SliderEndpointRow
        preset="textLength"
        value={0.5}
        min={0}
        max={1}
        mutedColor={MUTED}
        accentColor={ACCENT}
      />
    );

    expect(screen.getByLabelText('Short')).toBeTruthy();
    expect(screen.getByLabelText('Long')).toBeTruthy();
  });

  it('keeps tone/style text visible alongside icons', () => {
    render(
      <SliderEndpointRow
        preset="toneStyle"
        value={0.5}
        min={0}
        max={1}
        mutedColor={MUTED}
        accentColor={ACCENT}
      />
    );

    expect(screen.getByText('Academic')).toBeTruthy();
    expect(screen.getByText('Street')).toBeTruthy();
    expect(screen.getByTestId(SLIDER_ENDPOINT_TEST_IDS.toneStyle.min)).toBeTruthy();
    expect(screen.getByTestId(SLIDER_ENDPOINT_TEST_IDS.toneStyle.max)).toBeTruthy();
  });

  it('does not render text labels for icon-only presets', () => {
    for (const preset of ICON_PRESETS) {
      const { left, right } = SLIDER_ENDPOINT_PRESETS[preset];
      expect(left.label).toBeUndefined();
      expect(right.label).toBeUndefined();
    }
  });
});

function TextSizeSliderFixture() {
  const [textSize, setTextSize] = useState(32);

  return (
    <View>
      <Text>Aa</Text>
      <SettingSlider
        testID="text-size-slider-hit"
        value={textSize}
        min={22}
        max={48}
        step={2}
        onChange={setTextSize}
        accent={SLIDER_THEME.fill}
        border={SLIDER_THEME.border}
        track={SLIDER_THEME.track}
        compact
        bilateral
      />
      <Text style={{ fontSize: 15 }}>Aa</Text>
      <Text testID="text-size-value">{textSize}</Text>
    </View>
  );
}

describe('settings text size regression', () => {
  beforeEach(() => {
    jest.spyOn(PanResponder, 'create').mockImplementation((config) => ({
      panHandlers: {
        onStartShouldSetResponder: () => true,
        onMoveShouldSetResponder: () => true,
        onResponderGrant: (evt) => config.onPanResponderGrant?.(evt, { moveX: evt.nativeEvent.pageX }),
        onResponderMove: (evt, gestureState) => config.onPanResponderMove?.(evt, gestureState),
        onResponderRelease: (evt, gestureState) => config.onPanResponderRelease?.(evt, gestureState),
        onResponderTerminate: (evt, gestureState) =>
          config.onPanResponderTerminate?.(evt, gestureState),
      },
    }));
    jest.spyOn(View.prototype, 'measureInWindow').mockImplementation(function mockMeasure(
      this: View,
      callback: (x: number, y: number, width: number, height: number) => void
    ) {
      callback(0, 0, 200, 44);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps both Aa labels visible', () => {
    render(<TextSizeSliderFixture />);
    expect(screen.getAllByText('Aa')).toHaveLength(2);
  });

  it('updates value when the slider drag resolves', () => {
    render(<TextSizeSliderFixture />);
    const hitArea = screen.getByTestId('text-size-slider-hit');

    act(() => {
      fireEvent(hitArea, 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 44 } },
      });
    });

    act(() => {
      hitArea.props.onResponderGrant?.({ nativeEvent: { pageX: 170 } });
    });

    expect(screen.getByTestId('text-size-value')).not.toHaveTextContent('32');
  });
});
