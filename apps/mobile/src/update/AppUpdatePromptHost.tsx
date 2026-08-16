import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { useTheme } from '../theme';
import { UpdateAvailableModal } from '../ui/UpdateAvailableModal';
import { checkAppUpdate } from './checkAppUpdate';
import type { ResolvedUpdatePrompt } from './types';

/**
 * Runs a soft-update check once per app process launch.
 * Dismissal is session-only; next cold start re-checks.
 */
export function AppUpdatePromptHost() {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [prompt, setPrompt] = useState<ResolvedUpdatePrompt | null>(null);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) {
      return;
    }
    checkedRef.current = true;

    let cancelled = false;
    void (async () => {
      const result = await checkAppUpdate();
      if (cancelled || !result.updateAvailable) {
        return;
      }
      setPrompt(result.prompt);
      setVisible(true);
      console.log('[UPDATE_CHECK] modalShown=true');
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    console.log('[UPDATE_CHECK] dismissed');
  }, []);

  const handleUpdate = useCallback((url: string) => {
    console.log(`[UPDATE_CHECK] openUpdateUrl=${url}`);
    void Linking.openURL(url).catch((error: unknown) => {
      const reason = error instanceof Error ? error.message : 'unknown';
      console.log(`[UPDATE_CHECK] failed reason=openUrl_${reason}`);
    });
  }, []);

  if (!prompt) {
    return null;
  }

  return (
    <UpdateAvailableModal
      visible={visible}
      theme={theme}
      message={prompt.message}
      updateUrl={prompt.updateUrl}
      onClose={handleClose}
      onUpdate={handleUpdate}
    />
  );
}
