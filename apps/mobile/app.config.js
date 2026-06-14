/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

const validationBuild = process.env.EXPO_PUBLIC_VALIDATION_BUILD === '1';
const e2eSeedText = (process.env.EXPO_PUBLIC_E2E_SEED_TEXT ?? '').trim();

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      ...(validationBuild ? { validationBuild: true } : {}),
      ...(e2eSeedText ? { e2eSeedText } : {}),
    },
  },
};
