import { AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';
import {
  getAdsConsentSnapshot,
  refreshAdsConsent,
  subscribeAdsConsent,
} from '../src/ads/adsConsent';

jest.mock('../src/config/adMob', () => ({
  areAdsEnabled: jest.fn(() => true),
}));

const { areAdsEnabled } = jest.requireMock('../src/config/adMob') as {
  areAdsEnabled: jest.Mock;
};

describe('adsConsent', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    areAdsEnabled.mockReturnValue(true);
    (AdsConsent.requestInfoUpdate as jest.Mock).mockResolvedValue(undefined);
    (AdsConsent.loadAndShowConsentFormIfRequired as jest.Mock).mockResolvedValue(undefined);
    (AdsConsent.getConsentInfo as jest.Mock).mockResolvedValue({
      status: AdsConsentStatus.OBTAINED,
      canRequestAds: true,
      privacyOptionsRequirementStatus: 'NOT_REQUIRED',
      isConsentFormAvailable: false,
    });
    await refreshAdsConsent();
  });

  it('refreshes consent and allows ads when UMP grants canRequestAds', async () => {
    const snapshot = await refreshAdsConsent();
    expect(snapshot.consentReady).toBe(true);
    expect(snapshot.consentAllowsAds).toBe(true);
    expect(getAdsConsentSnapshot().consentAllowsAds).toBe(true);
  });

  it('falls back to allow ads when UMP refresh fails and status stays unknown', async () => {
    (AdsConsent.requestInfoUpdate as jest.Mock).mockRejectedValue(new Error('network'));
    (AdsConsent.getConsentInfo as jest.Mock).mockResolvedValue({
      status: AdsConsentStatus.UNKNOWN,
      canRequestAds: false,
      privacyOptionsRequirementStatus: 'UNKNOWN',
      isConsentFormAvailable: false,
    });

    const snapshot = await refreshAdsConsent();
    expect(snapshot.consentReady).toBe(true);
    expect(snapshot.consentAllowsAds).toBe(true);
    expect(snapshot.consentStatus).toBe(AdsConsentStatus.NOT_REQUIRED);
  });

  it('keeps themed slot path when consent is not ready', async () => {
    (AdsConsent.getConsentInfo as jest.Mock).mockResolvedValue({
      status: AdsConsentStatus.UNKNOWN,
      canRequestAds: false,
      privacyOptionsRequirementStatus: 'UNKNOWN',
      isConsentFormAvailable: false,
    });

    const snapshot = await refreshAdsConsent();
    expect(snapshot.consentReady).toBe(false);
    expect(snapshot.consentAllowsAds).toBe(false);
  });

  it('blocks ads when consent disallows requests', async () => {
    (AdsConsent.getConsentInfo as jest.Mock).mockResolvedValue({
      status: AdsConsentStatus.REQUIRED,
      canRequestAds: false,
      privacyOptionsRequirementStatus: 'REQUIRED',
      isConsentFormAvailable: true,
    });

    const snapshot = await refreshAdsConsent();
    expect(snapshot.consentReady).toBe(true);
    expect(snapshot.consentAllowsAds).toBe(false);
  });

  it('notifies subscribers when consent changes', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeAdsConsent(listener);
    await refreshAdsConsent();
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it('marks consent disabled when ads are off in app config', async () => {
    areAdsEnabled.mockReturnValue(false);
    const snapshot = await refreshAdsConsent();
    expect(snapshot.consentStatus).toBe('DISABLED');
    expect(snapshot.consentAllowsAds).toBe(false);
  });
});
