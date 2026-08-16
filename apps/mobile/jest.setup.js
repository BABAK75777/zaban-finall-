import '@testing-library/jest-native/extend-expect';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  usePathname: () => '/',
  useLocalSearchParams: () => ({}),
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} } },
}));

jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(),
  getRecordingPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
  requestRecordingPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
  createAudioPlayer: jest.fn(),
  RecordingPresets: { HIGH_QUALITY: {}, LOW_QUALITY: {} },
  AudioModule: {
    AudioRecorder: jest.fn(),
  },
}));

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn().mockResolvedValue(undefined),
  deactivateKeepAwake: jest.fn().mockResolvedValue(undefined),
  activateKeepAwake: jest.fn().mockResolvedValue(undefined),
  useKeepAwake: jest.fn(),
  ExpoKeepAwakeTag: 'ExpoKeepAwakeDefaultTag',
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-google-mobile-ads', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => ({
      initialize: jest.fn().mockResolvedValue(undefined),
    }),
    BannerAd: (props) => {
      React.useEffect(() => {
        props.onAdLoaded?.();
      }, [props.onAdLoaded]);
      return React.createElement(View, { testID: 'mock-google-banner-ad' });
    },
    BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' },
    TestIds: {
      BANNER: 'ca-app-pub-3940256099942544/6300978111',
      ADAPTIVE_BANNER: 'ca-app-pub-3940256099942544/9214589741',
    },
    AdsConsent: {
      requestInfoUpdate: jest.fn().mockResolvedValue(undefined),
      loadAndShowConsentFormIfRequired: jest.fn().mockResolvedValue(undefined),
      getConsentInfo: jest.fn().mockResolvedValue({
        status: 'OBTAINED',
        canRequestAds: true,
        privacyOptionsRequirementStatus: 'NOT_REQUIRED',
        isConsentFormAvailable: false,
      }),
    },
    AdsConsentStatus: {
      UNKNOWN: 'UNKNOWN',
      REQUIRED: 'REQUIRED',
      NOT_REQUIRED: 'NOT_REQUIRED',
      OBTAINED: 'OBTAINED',
    },
  };
});

jest.mock('./src/ads/initializeAdMob', () => ({
  initializeAdMob: jest.fn().mockResolvedValue(true),
}));

process.env.EXPO_PUBLIC_VALIDATION_BUILD = '0';

const { refreshAdsConsent } = require('./src/ads/adsConsent');
void refreshAdsConsent();
