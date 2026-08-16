import React, { useState } from 'react';
import { PanResponder, Text, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SettingSlider } from '../src/ui/SettingSlider';

const SLIDER_THEME = {
  fill: '#7c3aed',
  border: '#555555',
  track: '#333333',
};

function MicroSliderFixture() {
  const [value, setValue] = useState(1.0);

  return (
    <View>
      <SettingSlider
        testID="micro-slider-hit"
        value={value}
        min={0.5}
        max={1.2}
        step={0.1}
        onChange={setValue}
        accent={SLIDER_THEME.fill}
        border={SLIDER_THEME.border}
        track={SLIDER_THEME.track}
        micro
        bilateral
      />
      <Text testID="micro-slider-value">{value.toFixed(1)}</Text>
    </View>
  );
}

describe('SettingSlider micro mode', () => {
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
      callback(0, 0, 200, 22);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('clamps drag within 0.5–1.2 range', () => {
    render(<MicroSliderFixture />);
    const hitArea = screen.getByTestId('micro-slider-hit');

    act(() => {
      fireEvent(hitArea, 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 22 } },
      });
    });

    act(() => {
      hitArea.props.onResponderGrant?.({ nativeEvent: { pageX: 195 } });
    });

    const next = parseFloat(screen.getByTestId('micro-slider-value').props.children);
    expect(next).toBeLessThanOrEqual(1.2);
    expect(next).toBeGreaterThanOrEqual(0.5);
  });
});
