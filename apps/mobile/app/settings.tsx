/**
 * Settings Screen - App configuration
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AdBanner,
  AD_BANNER_SAFE_DISTANCE_FROM_CONTROLS,
} from '../src/components/AdBanner';
import { AD_SAFE_GAP_DP } from '../src/ads/adBannerLayout';
import { useTheme } from '../src/theme';
import { READING_TEST_IDS } from '../src/ui/testIds';

export default function SettingsScreen() {
  const { themeId, theme } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        testID="settings-scroll"
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Storage</Text>
          <Text style={[styles.settingText, { color: theme.textMuted }]}>Cache Size: 0 MB</Text>
          <Text style={[styles.settingText, { color: theme.textMuted }]}>Max Cache: 500 MB</Text>
        </View>

        <View style={[styles.section, { borderBottomColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Help</Text>
          <Pressable
            style={[styles.helpButton, { borderColor: theme.border }]}
            onPress={() => router.push('/onboarding?mode=review')}
            accessibilityRole="button"
            accessibilityLabel="How to use Mamlio"
            testID="settings-help-link"
          >
            <Text style={[styles.helpButtonText, { color: theme.text }]}>How to use Mamlio</Text>
          </Pressable>
        </View>

        <View style={[styles.section, { borderBottomColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Audio</Text>
          <Text style={[styles.settingText, { color: theme.textMuted }]}>Format: MP3</Text>
          <Text style={[styles.settingText, { color: theme.textMuted }]}>Voice: Default</Text>
        </View>
      </ScrollView>
      <View
        style={styles.adSafeGap}
        testID={READING_TEST_IDS.adSafeGap}
        pointerEvents="none"
      />
      <AdBanner
        themeId={themeId}
        safeDistanceFromControls={AD_BANNER_SAFE_DISTANCE_FROM_CONTROLS}
        backgroundColor={theme.bg}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: AD_SAFE_GAP_DP,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingText: {
    fontSize: 16,
    marginBottom: 8,
  },
  helpButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  helpButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  adSafeGap: {
    height: Math.max(AD_SAFE_GAP_DP, AD_BANNER_SAFE_DISTANCE_FROM_CONTROLS),
    width: '100%',
  },
});
