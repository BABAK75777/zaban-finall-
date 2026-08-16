import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { isOnboardingComplete } from '../onboarding/onboardingStorage';

type InitialRouteGateProps = {
  bootReady: boolean;
};

/**
 * Sends first-time users to onboarding once boot is ready.
 * Skips when already on /onboarding (review or first launch).
 */
export function InitialRouteGate({ bootReady }: InitialRouteGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!bootReady || checkedRef.current) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const complete = await isOnboardingComplete();
      if (cancelled || checkedRef.current) {
        return;
      }
      checkedRef.current = true;
      if (!complete && pathname !== '/onboarding') {
        router.replace('/onboarding');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bootReady, pathname, router]);

  return null;
}
