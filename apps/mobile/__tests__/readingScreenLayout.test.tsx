import React from 'react';
import { Animated, Dimensions, View } from 'react-native';
import { render } from '@testing-library/react-native';
import { AdBanner } from '../src/components/AdBanner';
import { TestSafeAreaProvider } from '../src/test/testProviders';
import { ActionCluster } from '../src/ui/ActionCluster';
import { HeroSentence } from '../src/ui/HeroSentence';
import { NavPills } from '../src/ui/NavPills';
import { TopAmbientBar } from '../src/ui/TopAmbientBar';
import {
  VIEWPORT_WIDTHS,
  controlsDockFitsScreenWidth,
  navPillsFitScreenWidth,
  waveformFitsScreenWidth,
} from '../src/ui/responsiveLayout';
import { READING_TEST_IDS } from '../src/ui/testIds';
import { FontReadyContext } from '../src/theme/FontReadyContext';
import { getTheme } from '../src/theme/themes';

jest.mock('../src/components/AdBanner', () => {
  const React = require('react');
  const { View } = require('react-native');
  const { READING_TEST_IDS: ids } = require('../src/ui/testIds');
  return {
    AdBanner: () => React.createElement(View, { testID: ids.adBanner }),
  };
});

const PLACEHOLDER = 'Paste or write text to begin reading.';

function setViewport(width: number) {
  Dimensions.set({
    window: { width, height: 640, scale: 2, fontScale: 1 },
    screen: { width, height: 640, scale: 2, fontScale: 1 },
  });
}

function renderReadingControls(width: number) {
  setViewport(width);
  const theme = getTheme('dark');
  const hearPulse = new Animated.Value(1);
  const micBreath = new Animated.Value(1);
  const sentenceFade = new Animated.Value(1);

  return render(
    <TestSafeAreaProvider>
      <FontReadyContext.Provider value={true}>
        <View style={{ width, paddingHorizontal: width < 375 ? 12 : 16 }}>
          <TopAmbientBar
            theme={theme}
            onMenuPress={() => {}}
            onAlbumPress={() => {}}
            onDicPress={() => {}}
          />
          <HeroSentence
            theme={theme}
            text={PLACEHOLDER}
            fontSize={40}
            isPlaceholder
            opacity={sentenceFade}
            waveformActive={false}
          />
          <NavPills
            theme={theme}
            backDisabled
            nextDisabled
            hearDisabled={false}
            hearLoading={false}
            hearPulse={hearPulse}
            onBack={() => {}}
            onNext={() => {}}
            onHear={() => {}}
          />
          <ActionCluster
            theme={theme}
            micBreath={micBreath}
            shadowRecording={false}
            shadowPlaying={false}
            onMic={() => {}}
          />
          <AdBanner />
        </View>      </FontReadyContext.Provider>
    </TestSafeAreaProvider>
  );
}

describe('reading screen layout', () => {
  for (const width of [VIEWPORT_WIDTHS.smallPhone, VIEWPORT_WIDTHS.largePhone]) {
    it(`renders primary testIDs at ${width}px`, () => {      const screen = renderReadingControls(width);

      expect(screen.getByTestId(READING_TEST_IDS.menu)).toBeTruthy();
      expect(screen.getByTestId(READING_TEST_IDS.heroSentence)).toBeTruthy();
      expect(screen.getByTestId(READING_TEST_IDS.shadow)).toBeTruthy();
      expect(screen.getByTestId(READING_TEST_IDS.back)).toBeTruthy();
      expect(screen.getByTestId(READING_TEST_IDS.hearAi)).toBeTruthy();
      expect(screen.getByTestId(READING_TEST_IDS.next)).toBeTruthy();
      expect(screen.getByTestId(READING_TEST_IDS.adBanner)).toBeTruthy();
      expect(screen.getByText(PLACEHOLDER)).toBeTruthy();
      expect(screen.getByLabelText('Menu')).toBeTruthy();
      expect(screen.getByLabelText('Shadow')).toBeTruthy();
      expect(screen.getByLabelText('Back')).toBeTruthy();
      expect(screen.getByLabelText('Hear AI')).toBeTruthy();
      expect(screen.getByLabelText('Next')).toBeTruthy();
    });

    it(`fits controls without horizontal overflow at ${width}px`, () => {
      expect(navPillsFitScreenWidth(width)).toBe(true);
      expect(waveformFitsScreenWidth(width)).toBe(true);
      expect(controlsDockFitsScreenWidth(width)).toBe(true);
    });
  }
});
