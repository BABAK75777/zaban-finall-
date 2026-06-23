export default {
  expoConfig: { hostUri: null },
  expoGoConfig: { debuggerHost: null },
  manifest: null,
  platform: { model: 'physical' },
};

declare global {
  // eslint-disable-next-line no-var
  var __DEV__: boolean;
}

globalThis.__DEV__ = true;
