/** @type {(context: { config: import('expo/config').ExpoConfig }) => import('expo/config').ExpoConfig} */
const { resolveAdMobAppIds } = require('./src/config/adMobAppIds');

const validationBuild =
  process.env.EXPO_PUBLIC_VALIDATION_BUILD === '1';

const e2eSeedText =
  (process.env.EXPO_PUBLIC_E2E_SEED_TEXT ?? '').trim();

const { androidAppId, iosAppId } = resolveAdMobAppIds();

const SPLASH_BACKGROUND = '#050A30';

module.exports = ({ config }) => ({
  ...config,
  splash: {
    ...config.splash,
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: SPLASH_BACKGROUND,
  },
  plugins: [
    ...(config.plugins ?? []),
    [
      'expo-splash-screen',
      {
        backgroundColor: SPLASH_BACKGROUND,
        image: './assets/splash.png',
        resizeMode: 'contain',
        imageWidth: 280,
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId,
        iosAppId,
      },
    ],
  ],
  extra: {
    ...config.extra,
    ...(validationBuild ? { validationBuild: true } : {}),
    ...(e2eSeedText ? { e2eSeedText } : {}),
  },
});
