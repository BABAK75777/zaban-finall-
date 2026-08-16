import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 414, height: 896 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

type Metrics = typeof TEST_SAFE_AREA_METRICS;

export function TestSafeAreaProvider({
  children,
  initialMetrics = TEST_SAFE_AREA_METRICS,
}: {
  children: React.ReactNode;
  initialMetrics?: Metrics;
}) {
  return <SafeAreaProvider initialMetrics={initialMetrics}>{children}</SafeAreaProvider>;
}
