import {
  AdsConsent,
  AdsConsentStatus,
  type AdsConsentInfo,
} from 'react-native-google-mobile-ads';

export type AdsConsentSnapshot = {
  consentReady: boolean;
  consentAllowsAds: boolean;
  consentStatus: AdsConsentStatus | 'DISABLED';
};

const DISABLED_SNAPSHOT: AdsConsentSnapshot = {
  consentReady: true,
  consentAllowsAds: false,
  consentStatus: 'DISABLED',
};

const PENDING_SNAPSHOT: AdsConsentSnapshot = {
  consentReady: false,
  consentAllowsAds: false,
  consentStatus: AdsConsentStatus.UNKNOWN,
};

let snapshot: AdsConsentSnapshot = { ...PENDING_SNAPSHOT };
const listeners = new Set<(value: AdsConsentSnapshot) => void>();

function emit(): void {
  for (const listener of listeners) {
    listener(snapshot);
  }
}

function toSnapshot(info: AdsConsentInfo): AdsConsentSnapshot {
  // UMP may report UNKNOWN while canRequestAds is already true (no form required /
  // publisher form not configured). Treat canRequestAds as consent-ready for requests.
  const allows = Boolean(info.canRequestAds);
  return {
    consentReady: allows || info.status !== AdsConsentStatus.UNKNOWN,
    consentAllowsAds: allows,
    consentStatus: info.status,
  };
}

export function getAdsConsentSnapshot(): AdsConsentSnapshot {
  return snapshot;
}

export function subscribeAdsConsent(listener: (value: AdsConsentSnapshot) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Refreshes UMP consent on app start. Non-blocking — never throws.
 * Shows the consent form only when UMP requires it.
 */
function isAdsEnabledByConfig(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { areAdsEnabled } = require('../config/adMob') as typeof import('../config/adMob');
  return areAdsEnabled();
}

export async function refreshAdsConsent(): Promise<AdsConsentSnapshot> {
  if (!isAdsEnabledByConfig()) {
    snapshot = { ...DISABLED_SNAPSHOT };
    emit();
    return snapshot;
  }

  try {
    await AdsConsent.requestInfoUpdate();
    await AdsConsent.loadAndShowConsentFormIfRequired();
    const info = await AdsConsent.getConsentInfo();
    snapshot = toSnapshot(info);
  } catch (error) {
    console.warn('[AdBanner] consent refresh failed:', error);
    try {
      const info = await AdsConsent.getConsentInfo();
      snapshot = toSnapshot(info);
    } catch {
      snapshot = {
        consentReady: true,
        consentAllowsAds: true,
        consentStatus: AdsConsentStatus.NOT_REQUIRED,
      };
    }
    // UMP unavailable / publisher form missing — avoid a permanent empty ad footer.
    if (
      !snapshot.consentAllowsAds ||
      snapshot.consentStatus === AdsConsentStatus.UNKNOWN
    ) {
      snapshot = {
        consentReady: true,
        consentAllowsAds: true,
        consentStatus: AdsConsentStatus.NOT_REQUIRED,
      };
    }
  }

  emit();
  return snapshot;
}
