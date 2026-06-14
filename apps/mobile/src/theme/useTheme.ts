import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_THEME_ID, getTheme } from './themes';
import { THEME_ORDER, THEME_STORAGE_KEY, type ThemeId, type ThemePalette } from './themeTypes';

export function useTheme() {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!cancelled && stored && THEME_ORDER.includes(stored as ThemeId)) {
          setThemeId(stored as ThemeId);
        }
      } catch {
        /* use default */
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const theme = useMemo(() => getTheme(themeId), [themeId]);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, id).catch(() => {});
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeId((current) => {
      const idx = THEME_ORDER.indexOf(current);
      const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
      void AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const resetTheme = useCallback(() => {
    setTheme(DEFAULT_THEME_ID);
  }, [setTheme]);

  return {
    themeId,
    theme,
    ready,
    setTheme,
    cycleTheme,
    resetTheme,
  };
}

export type { ThemeId, ThemePalette };
