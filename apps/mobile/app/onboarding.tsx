import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPLASH_BACKGROUND } from '../src/splash/splashLayout';
import { ONBOARDING_URL } from '../src/onboarding/constants';
import {
  ONBOARDING_FALLBACK_BODY,
  ONBOARDING_FALLBACK_TITLE,
} from '../src/onboarding/onboardingFallback';
import { completeOnboardingAndQueueAi } from '../src/onboarding/onboardingStorage';
import { getContentMaxWidth } from '../src/ui/responsiveLayout';
import { useWindowDimensions } from 'react-native';

export const ONBOARDING_TEST_IDS = {
  screen: 'onboarding-screen',
  content: 'onboarding-content',
  fallback: 'onboarding-fallback',
  openWebsite: 'onboarding-open-website',
  startButton: 'onboarding-start-button',
  loading: 'onboarding-loading',
} as const;

export async function openOnboardingWebsite(): Promise<boolean> {
  try {
    return await Linking.openURL(ONBOARDING_URL);
  } catch {
    return false;
  }
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isReview = mode === 'review';
  const { width } = useWindowDimensions();
  const contentMaxWidth = getContentMaxWidth(width);
  const [openingWebsite, setOpeningWebsite] = useState(false);

  const finish = useCallback(async () => {
    if (!isReview) {
      await completeOnboardingAndQueueAi();
    }
    router.replace('/');
  }, [isReview, router]);

  const handleOpenWebsite = useCallback(async () => {
    setOpeningWebsite(true);
    const opened = await openOnboardingWebsite();
    setOpeningWebsite(false);
    if (!opened) {
      // Offline or no handler — local fallback already visible.
    }
  }, []);

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['top', 'bottom']}
      testID={ONBOARDING_TEST_IDS.screen}
    >
      <View style={[styles.shell, { maxWidth: contentMaxWidth }]}>
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentBody}
          testID={ONBOARDING_TEST_IDS.content}
        >
          <Text style={styles.title}>{ONBOARDING_FALLBACK_TITLE}</Text>
          <Text style={styles.body} testID={ONBOARDING_TEST_IDS.fallback}>
            {ONBOARDING_FALLBACK_BODY}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.linkButton, pressed && styles.buttonPressed]}
            onPress={() => void handleOpenWebsite()}
            accessibilityRole="button"
            accessibilityLabel="Read full guide on mamlio.com"
            testID={ONBOARDING_TEST_IDS.openWebsite}
          >
            {openingWebsite ? (
              <ActivityIndicator color="#FFFFFF" testID={ONBOARDING_TEST_IDS.loading} />
            ) : (
              <Text style={styles.linkButtonLabel}>Read full guide on mamlio.com</Text>
            )}
          </Pressable>
        </ScrollView>

        <Pressable
          style={({ pressed }) => [styles.startButton, pressed && styles.buttonPressed]}
          onPress={() => void finish()}
          accessibilityRole="button"
          accessibilityLabel={isReview ? 'Back to app' : 'Start using Mamlio'}
          testID={ONBOARDING_TEST_IDS.startButton}
        >
          <Text style={styles.startButtonLabel}>
            {isReview ? 'Back to app' : 'Start using Mamlio'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: SPLASH_BACKGROUND,
  },
  shell: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  contentScroll: {
    flex: 1,
    marginBottom: 12,
  },
  contentBody: {
    paddingVertical: 8,
    gap: 14,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  body: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 15,
    lineHeight: 22,
  },
  linkButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  linkButtonLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.88,
  },
  startButtonLabel: {
    color: SPLASH_BACKGROUND,
    fontSize: 16,
    fontWeight: '700',
  },
});
