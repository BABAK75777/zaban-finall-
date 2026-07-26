import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.join(
  __dirname,
  '..',
  'android',
  'app',
  'src',
  'main',
  'AndroidManifest.xml'
);

describe('AndroidManifest permissions', () => {
  const manifest = fs.readFileSync(manifestPath, 'utf8');

  it('includes AD_ID permission for AdMob', () => {
    expect(manifest).toContain('com.google.android.gms.permission.AD_ID');
  });

  it('wires AdMob APPLICATION_ID via production placeholder (not Google sample App ID)', () => {
    expect(manifest).toContain('${appJSONGoogleMobileAdsAppID}');
    expect(manifest).not.toContain('ca-app-pub-3940256099942544~3347511713');
  });

  it('build.gradle App ID placeholder is sourced from current Mamlio production App ID', () => {
    const gradle = fs.readFileSync(
      path.join(__dirname, '..', 'android', 'app', 'build.gradle'),
      'utf8'
    );
    const production = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'config', 'adMobProduction.js'),
      'utf8'
    );
    expect(production).toContain("androidAppId: 'ca-app-pub-1237555604477660~8905708173'");
    expect(production).toContain("androidBannerUnitId: 'ca-app-pub-1237555604477660/7026750373'");
    expect(production).not.toContain('ca-app-pub-2133767058275325');
    expect(gradle).toContain('adMobProduction.js');
    expect(gradle).toContain('appJSONGoogleMobileAdsAppID: adMobAndroidAppId');
    expect(gradle).not.toContain('ca-app-pub-2133767058275325~4482095081');
    expect(gradle).not.toContain('ca-app-pub-3940256099942544~3347511713');
  });

  it('does not lock portrait orientation on MainActivity', () => {
    expect(manifest).not.toContain('android:screenOrientation="portrait"');
  });
});
