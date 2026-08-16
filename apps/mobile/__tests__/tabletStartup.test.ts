import fs from 'node:fs';
import path from 'node:path';
import {
  TABLET_MIN_WIDTH,
  VIEWPORT_WIDTHS,
  controlsDockFitsScreenWidth,
  getContentMaxWidth,
  isTabletWidth,
  navPillsFitScreenWidth,
} from '../src/ui/responsiveLayout';
import { SPLASH_TEST_VIEWPORTS, computeSplashContainFit } from '../src/splash/splashLayout';

describe('tablet startup layout', () => {
  it('detects tablet widths', () => {
    expect(isTabletWidth(VIEWPORT_WIDTHS.largePhone)).toBe(false);
    expect(isTabletWidth(VIEWPORT_WIDTHS.tabletPortrait)).toBe(true);
    expect(isTabletWidth(TABLET_MIN_WIDTH)).toBe(true);
  });

  it('caps content width on tablets', () => {
    expect(getContentMaxWidth(VIEWPORT_WIDTHS.tabletPortrait)).toBeLessThan(
      VIEWPORT_WIDTHS.tabletPortrait
    );
    expect(getContentMaxWidth(320)).toBe(320);
  });

  it.each([
    VIEWPORT_WIDTHS.tabletPortrait,
    VIEWPORT_WIDTHS.tabletLandscape,
  ])('fits nav and waveform on tablet width %s', (width) => {
    expect(navPillsFitScreenWidth(width)).toBe(true);
    expect(controlsDockFitsScreenWidth(width)).toBe(true);
  });

  it.each(SPLASH_TEST_VIEWPORTS.filter((v) => v.width >= TABLET_MIN_WIDTH))(
    '$label splash fits without crop on tablet viewport',
    ({ width, height }) => {
      const fit = computeSplashContainFit(width, height);
      expect(fit.fitsWithoutCrop).toBe(true);
    }
  );
});

describe('android release metadata', () => {
  it('uses versionCode 136 with versionName 1.3.3', () => {
    const gradle = fs.readFileSync(
      path.join(__dirname, '..', 'android', 'app', 'build.gradle'),
      'utf8'
    );
    expect(gradle).toMatch(/versionCode\s+136/);
    expect(gradle).toMatch(/versionName\s+"1\.3\.3"/);
  });

  it('targets compileSdk and targetSdk 36', () => {
    const props = fs.readFileSync(
      path.join(__dirname, '..', 'android', 'gradle.properties'),
      'utf8'
    );
    expect(props).toMatch(/android\.compileSdkVersion\s*=\s*36/);
    expect(props).toMatch(/android\.targetSdkVersion\s*=\s*36/);
  });
});
