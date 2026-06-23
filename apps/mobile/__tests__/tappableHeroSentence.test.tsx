import React from 'react';
import { Animated } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { TappableHeroSentence } from '../src/ui/TappableHeroSentence';
import { READING_TEST_IDS } from '../src/ui/testIds';
import { getTheme } from '../src/theme/themes';

describe('TappableHeroSentence', () => {
  const theme = getTheme('dark');
  const opacity = new Animated.Value(1);

  it('calls onWordPress when a word is tapped', () => {
    const onWordPress = jest.fn();
    const { getByLabelText } = render(
      <TappableHeroSentence
        theme={theme}
        text="Hello world"
        fontSize={32}
        isPlaceholder={false}
        opacity={opacity}
        waveformActive={false}
        onWordPress={onWordPress}
      />
    );

    fireEvent.press(getByLabelText('Look up Hello'));
    expect(onWordPress).toHaveBeenCalledWith('hello', 'Hello');
  });

  it('calls onWordPress when a word is long-pressed', () => {
    const onWordPress = jest.fn();
    const { getByLabelText } = render(
      <TappableHeroSentence
        theme={theme}
        text="Hello world"
        fontSize={32}
        isPlaceholder={false}
        opacity={opacity}
        waveformActive={false}
        onWordPress={onWordPress}
      />
    );

    fireEvent(getByLabelText('Look up Hello'), 'longPress');
    expect(onWordPress).toHaveBeenCalledWith('hello', 'Hello');
  });

  it('renders placeholder without tappable words', () => {
    const onWordPress = jest.fn();
    const { getByTestId } = render(
      <TappableHeroSentence
        theme={theme}
        text="Paste text"
        fontSize={32}
        isPlaceholder
        opacity={opacity}
        waveformActive={false}
        onWordPress={onWordPress}
      />
    );

    expect(getByTestId(READING_TEST_IDS.heroSentence).props.children).toBe('Paste text');
  });
});
