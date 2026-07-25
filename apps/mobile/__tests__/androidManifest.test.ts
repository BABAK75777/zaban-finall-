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

  it('does not lock portrait orientation on MainActivity', () => {
    expect(manifest).not.toContain('android:screenOrientation="portrait"');
  });
});
