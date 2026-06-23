/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');
const { resolveAdMobAppIds } = require('./src/config/adMobAppIds');

const validationBuild = process.env.EXPO_PUBLIC_VALIDATION_BUILD === '1';
const e2eSeedText = (process.env.EXPO_PUBLIC_E2E_SEED_TEXT ?? '').trim();
const { androidAppId, iosAppId } = resolveAdMobAppIds();

module.exports = {
  expo: {
    ...appJson.expo,
    plugins: [
      ...(appJson.expo.plugins ?? []),
      [
        'react-native-google-mobile-ads',
        {
          androidAppId,
          iosAppId,
        },
      ],
    ],
    extra: {
      ...appJson.expo.extra,
      ...(validationBuild ? { validationBuild: true } : {}),
      ...(e2eSeedText ? { e2eSeedText } : {}),
    },
  },
};
