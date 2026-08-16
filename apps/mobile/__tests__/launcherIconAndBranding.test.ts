import fs from 'node:fs';
import path from 'node:path';
import { SPLASH_BACKGROUND, SPLASH_IMAGE_SIZE } from '../src/splash/splashLayout';
import {
  MIPMAP_LAUNCHER_SIZES,
  SPLASH_DRAWABLE_MULTIPLIERS,
  SPLASH_IMAGE_WIDTH_MDPI,
  expectedSplashBitmapHeight,
  pngHasAlphaChannel,
  pngIsFullyOpaque,
  readImageDimensions,
  readPngInfo,
} from './helpers/brandingAssets';

const mobileRoot = path.join(__dirname, '..');
const androidRes = path.join(mobileRoot, 'android', 'app', 'src', 'main', 'res');

const appJson = require('../app.json') as {
  expo: {
    icon: string;
    adaptiveIcon: { foregroundImage: string; backgroundColor: string };
    splash: { image: string; backgroundColor: string; resizeMode: string };
  };
};

function resPath(...segments: string[]): string {
  return path.join(androidRes, ...segments);
}

function assetPath(relative: string): string {
  return path.join(mobileRoot, relative.replace(/^\.\//, ''));
}

describe('expo branding config (icon + splash)', () => {
  it('points icon and adaptive icon at separate asset files with navy adaptive background', () => {
    expect(appJson.expo.icon).toBe('./assets/icon.png');
    expect(appJson.expo.adaptiveIcon.foregroundImage).toBe('./assets/adaptive-icon.png');
    expect(appJson.expo.adaptiveIcon.backgroundColor).toBe(SPLASH_BACKGROUND);
    expect(appJson.expo.splash.image).toBe('./assets/splash.png');
    expect(appJson.expo.splash.backgroundColor).toBe(SPLASH_BACKGROUND);
    expect(appJson.expo.splash.resizeMode).toBe('contain');
  });

  it('ships all branding source assets on disk', () => {
    for (const rel of ['./assets/icon.png', './assets/adaptive-icon.png', './assets/splash.png']) {
      const full = assetPath(rel);
      expect(fs.existsSync(full)).toBe(true);
      expect(fs.statSync(full).size).toBeGreaterThan(1000);
    }
  });

  it('does not use legacy splash-icon.png anywhere in expo config', () => {
    const raw = fs.readFileSync(path.join(mobileRoot, 'app.json'), 'utf8');
    expect(raw).not.toContain('splash-icon.png');
    expect(appJson.expo.splash.image).not.toContain('splash-icon');
  });
});

describe('source icon assets (phone + tablet launcher source)', () => {
  const iconPath = assetPath('./assets/icon.png');
  const adaptivePath = assetPath('./assets/adaptive-icon.png');

  it('keeps full icon opaque and adaptive foreground transparent', () => {
    const icon = readPngInfo(iconPath);
    const adaptive = readPngInfo(adaptivePath);

    expect(icon.width).toBe(1024);
    expect(icon.height).toBe(1024);
    expect(adaptive.width).toBe(1024);
    expect(adaptive.height).toBe(1024);
    expect(pngIsFullyOpaque(iconPath)).toBe(true);
    expect(pngHasAlphaChannel(adaptivePath)).toBe(true);
  });

  it('does not duplicate icon.png as adaptive-icon.png', () => {
    const iconBytes = fs.readFileSync(iconPath);
    const adaptiveBytes = fs.readFileSync(adaptivePath);
    expect(iconBytes.equals(adaptiveBytes)).toBe(false);
    expect(adaptiveBytes.length).toBeLessThan(iconBytes.length);
  });
});

describe('Android mipmap launcher icons (all densities)', () => {
  it.each(Object.entries(MIPMAP_LAUNCHER_SIZES))(
    '%s ships square launcher and transparent foreground at expected sizes',
    (folder, sizes) => {
      const launcherPath = resPath(folder, 'ic_launcher.png');
      const foregroundPath = resPath(folder, 'ic_launcher_foreground.png');

      expect(fs.existsSync(launcherPath)).toBe(true);
      expect(fs.existsSync(foregroundPath)).toBe(true);

      const launcher = readPngInfo(launcherPath);
      const foreground = readPngInfo(foregroundPath);

      expect(launcher.width).toBe(sizes.launcher);
      expect(launcher.height).toBe(sizes.launcher);
      expect(foreground.width).toBe(sizes.foreground);
      expect(foreground.height).toBe(sizes.foreground);
      expect(pngIsFullyOpaque(launcherPath)).toBe(true);
      expect(pngHasAlphaChannel(foregroundPath)).toBe(true);
      expect(sizes.foreground).toBeGreaterThan(sizes.launcher);
    }
  );
});

describe('Android adaptive icon XML (API 26+)', () => {
  const anydpiDir = resPath('mipmap-anydpi-v26');

  it.each(['ic_launcher.xml', 'ic_launcher_round.xml'])(
    '%s layers navy background with foreground mipmap only',
    (fileName) => {
      const xml = fs.readFileSync(path.join(anydpiDir, fileName), 'utf8');
      expect(xml).toContain('@color/iconBackground');
      expect(xml).toContain('@mipmap/ic_launcher_foreground');
      expect(xml).not.toMatch(/@mipmap\/ic_launcher[^_]/);
    }
  );
});

describe('Android splash boot chain (startup stages)', () => {
  it('MainActivity uses splash theme before switching to AppTheme at runtime', () => {
    const manifestPath = path.join(mobileRoot, 'android/app/src/main/AndroidManifest.xml');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    expect(manifestContent).toContain('android:theme="@style/Theme.App.SplashScreen"');
    expect(manifestContent).toContain('android:icon="@mipmap/ic_launcher"');
  });

  it('pre-Android-12 window background shows splash image centered on navy', () => {
    const splashXml = fs.readFileSync(resPath('drawable/splashscreen.xml'), 'utf8');
    expect(splashXml).toContain('@color/splashscreen_background');
    expect(splashXml).toContain('@drawable/splashscreen_image');
    expect(splashXml).toContain('android:gravity="center"');
  });

  it('Android 12+ system splash uses branded foreground, not full launcher icon', () => {
    const v31 = fs.readFileSync(resPath('values-v31/styles.xml'), 'utf8');
    expect(v31).toContain('parent="Theme.SplashScreen"');
    expect(v31).toContain('windowSplashScreenBackground">@color/splashscreen_background');
    expect(v31).toContain('windowSplashScreenAnimatedIcon">@mipmap/ic_launcher_foreground');
    expect(v31).toContain('windowSplashScreenIconBackgroundColor">@color/splashscreen_background');
    expect(v31).toContain('postSplashScreenTheme">@style/AppTheme');
    expect(v31).not.toContain('windowSplashScreenAnimatedIcon">@mipmap/ic_launcher<');
    expect(v31).not.toContain('#FFFFFF');
  });

  it('base splash theme wires windowBackground to splashscreen drawable', () => {
    const styles = fs.readFileSync(resPath('values/styles.xml'), 'utf8');
    expect(styles).toContain('name="Theme.App.SplashScreen"');
    expect(styles).toContain('@drawable/splashscreen');
    expect(styles).toContain('@color/splashscreen_background');
  });

  it('expo-splash-screen native resize mode stays contain', () => {
    const strings = fs.readFileSync(resPath('values/strings.xml'), 'utf8');
    expect(strings).toContain('expo_splash_screen_resize_mode');
    expect(strings).toContain('contain');
  });
});

describe('Android splashscreen_image bitmaps (expo overlay + window background)', () => {
  const splashAspect = SPLASH_IMAGE_SIZE.height / SPLASH_IMAGE_SIZE.width;

  it.each(Object.entries(SPLASH_DRAWABLE_MULTIPLIERS))(
    '%s splashscreen_image matches expo imageWidth scaling and splash aspect ratio',
    (folder, multiplier) => {
      const imagePath = resPath(folder, 'splashscreen_image.png');
      expect(fs.existsSync(imagePath)).toBe(true);

      const { width, height } = readPngInfo(imagePath);
      const expectedWidth = Math.round(SPLASH_IMAGE_WIDTH_MDPI * multiplier);
      const expectedHeight = expectedSplashBitmapHeight(expectedWidth, splashAspect);

      expect(width).toBe(expectedWidth);
      expect(height).toBe(expectedHeight);
    }
  );

  it('splash source asset aspect ratio matches generated bitmaps within resize rounding', () => {
    const source = readImageDimensions(assetPath('./assets/splash.png'));
    const mdpi = readPngInfo(resPath('drawable-mdpi/splashscreen_image.png'));
    const sourceAspect = source.height / source.width;
    const mdpiAspect = mdpi.height / mdpi.width;
    expect(mdpiAspect).toBeCloseTo(sourceAspect, 2);
    expect(mdpi.height).toBe(expectedSplashBitmapHeight(mdpi.width, sourceAspect));
  });
});

describe('Android branding colors (no white launcher/splash backgrounds)', () => {
  it('uses matching navy for splash and adaptive icon backgrounds', () => {
    const colors = fs.readFileSync(resPath('values/colors.xml'), 'utf8');
    expect(colors).toContain(`<color name="splashscreen_background">${SPLASH_BACKGROUND}</color>`);
    expect(colors).toContain(`<color name="iconBackground">${SPLASH_BACKGROUND}</color>`);
    expect(colors).not.toContain('<color name="iconBackground">#FFFFFF</color>');
    expect(colors).not.toContain('<color name="splashscreen_background">#FFFFFF</color>');
  });
});

describe('branding asset generator script', () => {
  const scriptPath = path.join(mobileRoot, 'tools/generate-adaptive-icon.py');

  it('exists and encodes density tables used by tests', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
    const script = fs.readFileSync(scriptPath, 'utf8');
    expect(script).toContain('SPLASH_IMAGE_WIDTH = 280');
    expect(script).toContain('mipmap-mdpi');
    expect(script).toContain('drawable-mdpi');
    expect(script).toContain('build_foreground');
    expect(script).toContain('build_splash_images');
    expect(script).toContain('values-v31');
    expect(script).toContain('ic_launcher_foreground');
  });
});

describe('tablet + phone branding consistency', () => {
  it('uses one adaptive icon config for all device sizes (no tablet-specific launcher)', () => {
    const anydpiFiles = fs.readdirSync(resPath('mipmap-anydpi-v26'));
    expect(anydpiFiles).toContain('ic_launcher.xml');
    expect(anydpiFiles).toContain('ic_launcher_round.xml');
    expect(anydpiFiles.some((name) => name.includes('tablet'))).toBe(false);
  });

  it('splash layout module still matches splash.png dimensions used for boot assets', () => {
    const splash = readImageDimensions(assetPath('./assets/splash.png'));
    expect(splash.width).toBe(SPLASH_IMAGE_SIZE.width);
    expect(splash.height).toBe(SPLASH_IMAGE_SIZE.height);
  });
});
