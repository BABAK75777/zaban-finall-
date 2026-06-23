import React, { useState } from 'react';
import { PanResponder, Text, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SettingSlider } from '../src/ui/SettingSlider';

const SLIDER_THEME = {
  fill: '#7c3aed',
  border: '#555555',
  track: '#333333',
};

function ControlledSlider({ initial = 0.5 }: { initial?: number }) {
  const [value, setValue] = useState(initial);
  return (
    <View>
      <SettingSlider
        testID="setting-slider-hit"
        value={value}
        min={0}
        max={1}
        step={0.05}
        onChange={setValue}
        accent={SLIDER_THEME.fill}
        border={SLIDER_THEME.border}
        track={SLIDER_THEME.track}
        bilateral
      />
      <Text testID="slider-value">{value.toFixed(2)}</Text>
    </View>
  );
}

describe('SettingSlider', () => {
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

  it('updates displayed value when drag resolves to a new step', () => {
    render(<ControlledSlider initial={0.5} />);
    const hitArea = screen.getByTestId('setting-slider-hit');

    act(() => {
      fireEvent(hitArea, 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 44 } },
      });
    });

    act(() => {
      hitArea.props.onResponderGrant?.({ nativeEvent: { pageX: 170 } });
    });

    expect(screen.getByTestId('slider-value')).not.toHaveTextContent('0.50');
  });
});
