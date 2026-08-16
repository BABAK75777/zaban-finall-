import fs from 'node:fs';
import path from 'node:path';
import {
  SPLASH_BACKGROUND,
  SPLASH_IMAGE_SIZE,
  SPLASH_TEST_VIEWPORTS,
  computeSplashContainFit,
} from '../src/splash/splashLayout';
import { pngHasAlphaChannel } from './helpers/brandingAssets';

const mobileRoot = path.join(__dirname, '..');
const appJson = require('../app.json') as {
  expo: { splash: { image: string; resizeMode: string; backgroundColor: string } };
};
const appConfig = require('../app.config.js') as {
  expo: { splash: { image: string; resizeMode: string; backgroundColor: string } };
};

const ANDROID_DENSITY_FOLDERS = [
  'drawable-mdpi',
  'drawable-hdpi',
  'drawable-xhdpi',
  'drawable-xxhdpi',
  'drawable-xxxhdpi',
] as const;

describe('splash screen config', () => {
  it('uses splash.png with contain and navy background in app.json', () => {
    expect(appJson.expo.splash.image).toBe('./assets/splash.png');
    expect(appJson.expo.splash.resizeMode).toBe('contain');
    expect(appJson.expo.splash.backgroundColor).toBe(SPLASH_BACKGROUND);
  });

  it('does not reference legacy splash-icon.png in app config', () => {
    const appJsonRaw = fs.readFileSync(path.join(mobileRoot, 'app.json'), 'utf8');
    const appConfigRaw = fs.readFileSync(path.join(mobileRoot, 'app.config.js'), 'utf8');
    expect(appJsonRaw).not.toContain('splash-icon.png');
    expect(appConfigRaw).not.toContain('splash-icon.png');
  });

  it('mirrors splash config in app.config.js and expo-splash-screen plugin', () => {
    expect(appConfig.expo.splash.image).toBe('./assets/splash.png');
    expect(appConfig.expo.splash.resizeMode).toBe('contain');
    expect(appConfig.expo.splash.backgroundColor).toBe(SPLASH_BACKGROUND);

    const splashPlugin = appConfig.expo.plugins?.find(
      (entry: unknown) => Array.isArray(entry) && entry[0] === 'expo-splash-screen'
    ) as [string, Record<string, string>] | undefined;

    expect(splashPlugin?.[1]).toEqual({
      backgroundColor: SPLASH_BACKGROUND,
      image: './assets/splash.png',
      resizeMode: 'contain',
      imageWidth: 280,
    });
  });

  it('ships splash.png asset on disk', () => {
    const assetPath = path.join(mobileRoot, 'assets', 'splash.png');
    expect(fs.existsSync(assetPath)).toBe(true);
    expect(fs.statSync(assetPath).size).toBeGreaterThan(10_000);
  });
});

describe('splash contain layout across phone sizes', () => {
  it.each(SPLASH_TEST_VIEWPORTS)(
    '$label ($width x $height) fits without cropping',
    ({ width, height }) => {
      const fit = computeSplashContainFit(width, height);
      expect(fit.fitsWithoutCrop).toBe(true);
      expect(fit.renderedWidth).toBeLessThanOrEqual(width);
      expect(fit.renderedHeight).toBeLessThanOrEqual(height);
      expect(fit.scale).toBeGreaterThan(0);
      expect(fit.scale).toBeLessThanOrEqual(1);
    }
  );

  it('keeps logo centered with letterboxing on narrow-tall and wide-short phones', () => {
    const narrowTall = computeSplashContainFit(320, 700);
    const wideShort = computeSplashContainFit(480, 800);

    expect(narrowTall.verticalLetterbox).toBeGreaterThan(0);
    expect(narrowTall.horizontalLetterbox).toBeLessThan(1);
    expect(wideShort.horizontalLetterbox).toBeGreaterThan(0);
    expect(wideShort.verticalLetterbox).toBeLessThan(1);
  });

  it('preserves splash aspect ratio on every tested viewport', () => {
    const aspect = SPLASH_IMAGE_SIZE.width / SPLASH_IMAGE_SIZE.height;

    for (const viewport of SPLASH_TEST_VIEWPORTS) {
      const fit = computeSplashContainFit(viewport.width, viewport.height);
      const renderedAspect = fit.renderedWidth / fit.renderedHeight;
      expect(renderedAspect).toBeCloseTo(aspect, 5);
    }
  });
});

describe('android native splash resources', () => {
  it('uses splashscreen.xml with branded bitmap on navy background', () => {
    const xmlPath = path.join(
      mobileRoot,
      'android/app/src/main/res/drawable/splashscreen.xml'
    );
    const xml = fs.readFileSync(xmlPath, 'utf8');
    expect(xml).toContain('@color/splashscreen_background');
    expect(xml).toContain('@drawable/splashscreen_image');
  });

  it('uses branded foreground for Android 12+ system splash instead of launcher icon', () => {
    const stylesPath = path.join(
      mobileRoot,
      'android/app/src/main/res/values-v31/styles.xml'
    );
    const styles = fs.readFileSync(stylesPath, 'utf8');
    expect(styles).toContain('parent="Theme.SplashScreen"');
    expect(styles).toContain('windowSplashScreenAnimatedIcon">@mipmap/ic_launcher_foreground');
    expect(styles).toContain('windowSplashScreenIconBackgroundColor">@color/splashscreen_background');
    expect(styles).not.toContain('ic_launcher</item>');
  });

  it('uses navy splash background and adaptive icon background colors', () => {
    const colorsPath = path.join(
      mobileRoot,
      'android/app/src/main/res/values/colors.xml'
    );
    const colors = fs.readFileSync(colorsPath, 'utf8');
    expect(colors).toContain(`<color name="splashscreen_background">${SPLASH_BACKGROUND}</color>`);
    expect(colors).toContain(`<color name="iconBackground">${SPLASH_BACKGROUND}</color>`);
    expect(colors).not.toContain('<color name="iconBackground">#FFFFFF</color>');
  });
});

const ANDROID_MIPMAP_FOLDERS = [
  'mipmap-mdpi',
  'mipmap-hdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi',
] as const;

describe('launcher icon assets', () => {
  it('uses separate adaptive foreground instead of duplicating icon.png', () => {
    const iconPath = path.join(mobileRoot, 'assets', 'icon.png');
    const adaptivePath = path.join(mobileRoot, 'assets', 'adaptive-icon.png');

    expect(fs.existsSync(iconPath)).toBe(true);
    expect(fs.existsSync(adaptivePath)).toBe(true);
    expect(fs.readFileSync(iconPath).equals(fs.readFileSync(adaptivePath))).toBe(false);
    expect(pngHasAlphaChannel(adaptivePath)).toBe(true);
  });

  it('ships Android adaptive icon XML and foreground mipmaps', () => {
    const anydpiDir = path.join(
      mobileRoot,
      'android/app/src/main/res/mipmap-anydpi-v26'
    );
    const launcherXml = fs.readFileSync(
      path.join(anydpiDir, 'ic_launcher.xml'),
      'utf8'
    );

    expect(launcherXml).toContain('@color/iconBackground');
    expect(launcherXml).toContain('@mipmap/ic_launcher_foreground');

    for (const folder of ANDROID_MIPMAP_FOLDERS) {
      const resDir = path.join(mobileRoot, 'android/app/src/main/res', folder);
      expect(fs.existsSync(path.join(resDir, 'ic_launcher.png'))).toBe(true);
      expect(fs.existsSync(path.join(resDir, 'ic_launcher_foreground.png'))).toBe(true);
      expect(pngHasAlphaChannel(path.join(resDir, 'ic_launcher_foreground.png'))).toBe(
        true
      );
    }
  });
});
