const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Gradle/Kotlin build outputs must not be watched (breaks Metro on Windows).
config.resolver.blockList = [
  /[\\/]android[\\/]app[\\/]build[\\/].*/,
  /[\\/]android[\\/]build[\\/].*/,
  /[\\/]android[\\/]\.gradle[\\/].*/,
];

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

const ttsMobileSrc = path.resolve(monorepoRoot, 'packages/tts-mobile/src');
const ttsMobileSubpaths = [
  'sentenceAudioCache',
  'buildKeepSentenceIds',
  'cacheActivityPolicy',
  'inFlightTtsFetch',
  'cacheFirstPolicy',
];

const EXPO_ROUTER_ENTRY = 'expo-router/entry';

function isExpoRouterEntryRequest(moduleName) {
  const normalized = moduleName.replace(/\\/g, '/');
  return (
    normalized === EXPO_ROUTER_ENTRY ||
    normalized.endsWith(`/${EXPO_ROUTER_ENTRY}`) ||
    (normalized.includes('.pnpm/') && normalized.includes('expo-router/entry'))
  );
}

function fixExpoRouterEntryBundleUrl(url) {
  if (!url.includes('expo-router/entry')) {
    return url;
  }
  const queryIndex = url.indexOf('?');
  const query = queryIndex >= 0 ? url.slice(queryIndex) : '';
  const pathPart = queryIndex >= 0 ? url.slice(0, queryIndex) : url;
  if (pathPart.includes('.pnpm') || pathPart.includes('..')) {
    return `/node_modules/expo-router/entry.bundle${query}`;
  }
  return url;
}

const defaultRewriteRequestUrl = config.server?.rewriteRequestUrl;
if (defaultRewriteRequestUrl) {
  config.server.rewriteRequestUrl = (url) =>
    fixExpoRouterEntryBundleUrl(defaultRewriteRequestUrl(url));
}

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (isExpoRouterEntryRequest(moduleName)) {
    if (defaultResolveRequest) {
      return defaultResolveRequest(context, EXPO_ROUTER_ENTRY, platform);
    }
    return context.resolveRequest(context, EXPO_ROUTER_ENTRY, platform);
  }

  if (moduleName === '@zaban/tts-mobile') {
    return {
      type: 'sourceFile',
      filePath: path.join(ttsMobileSrc, 'index.ts'),
    };
  }

  if (moduleName.startsWith('@zaban/tts-mobile/')) {
    const subpath = moduleName.slice('@zaban/tts-mobile/'.length);
    if (ttsMobileSubpaths.includes(subpath)) {
      return {
        type: 'sourceFile',
        filePath: path.join(ttsMobileSrc, `${subpath}.ts`),
      };
    }
  }

  if (moduleName === 'react-native-svg' || moduleName.startsWith('react-native-svg/')) {
    const svgRoot = path.resolve(projectRoot, 'node_modules/react-native-svg');
    const mainEntry = path.join(svgRoot, 'lib/commonjs/index.js');
    if (require('fs').existsSync(mainEntry)) {
      return { type: 'sourceFile', filePath: mainEntry };
    }
  }

  if (moduleName.startsWith('@expo-google-fonts/')) {
    const candidates = [
      path.resolve(projectRoot, 'node_modules', moduleName),
      path.resolve(monorepoRoot, 'node_modules', moduleName),
    ];
    for (const fontPkgRoot of candidates) {
      const mainEntry = path.join(fontPkgRoot, 'index.js');
      if (require('fs').existsSync(mainEntry)) {
        return { type: 'sourceFile', filePath: mainEntry };
      }
    }
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
