import { useEffect, useState } from 'react';
import {
  getAdsConsentSnapshot,
  subscribeAdsConsent,
  type AdsConsentSnapshot,
} from './adsConsent';

export function useAdsConsent(): AdsConsentSnapshot {
  const [state, setState] = useState<AdsConsentSnapshot>(() => getAdsConsentSnapshot());

  useEffect(() => subscribeAdsConsent(setState), []);

  return state;
}
