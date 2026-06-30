'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Client-side account preferences, persisted to localStorage. These are UI/device preferences
 * only — there is no backend for them in this build, so they live on the device and are restored
 * on load. SSR-safe: starts from defaults, then hydrates from storage after mount.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

export interface Preferences {
  theme: ThemePreference;
  notifications: {
    orderUpdates: boolean;
    promotions: boolean;
    recommendations: boolean;
  };
  privacy: {
    keepSignedIn: boolean;
    hidePurchaseHistory: boolean;
    personalizedRecommendations: boolean;
  };
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  notifications: { orderUpdates: true, promotions: false, recommendations: true },
  privacy: { keepSignedIn: true, hidePurchaseHistory: false, personalizedRecommendations: true },
};

const STORAGE_KEY = 'pp:preferences';

type ResolvedTheme = 'light' | 'dark';

/** Resolve a theme choice to a concrete appearance, mirroring the pre-paint bootstrap script. */
function resolveTheme(theme: ThemePreference): ResolvedTheme {
  if (theme === 'light' || theme === 'dark') return theme;
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/** Apply the resolved theme to the document (never the literal 'system'). */
function applyTheme(theme: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(theme);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

function load(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    // Merge so newly-added keys always have a sane default.
    return {
      theme: parsed.theme ?? DEFAULT_PREFERENCES.theme,
      notifications: { ...DEFAULT_PREFERENCES.notifications, ...parsed.notifications },
      privacy: { ...DEFAULT_PREFERENCES.privacy, ...parsed.privacy },
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  useEffect(() => {
    setPrefs(load());
    setHydrated(true);
  }, []);

  // Persist + reflect the chosen theme on the document. The applied attribute is always a
  // concrete 'light'|'dark' (resolving 'system' via matchMedia), consistent with the pre-paint
  // bootstrap script so there is no flash or mismatch.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore quota / privacy-mode errors */
    }
    setResolvedTheme(applyTheme(prefs.theme));
  }, [prefs, hydrated]);

  // While following the OS ('system'), track live changes to the OS color scheme.
  useEffect(() => {
    if (!hydrated || prefs.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolvedTheme(applyTheme('system'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [prefs.theme, hydrated]);

  const setTheme = useCallback((theme: ThemePreference) => setPrefs((p) => ({ ...p, theme })), []);

  const setNotification = useCallback(
    (key: keyof Preferences['notifications'], value: boolean) =>
      setPrefs((p) => ({ ...p, notifications: { ...p.notifications, [key]: value } })),
    [],
  );

  const setPrivacy = useCallback(
    (key: keyof Preferences['privacy'], value: boolean) =>
      setPrefs((p) => ({ ...p, privacy: { ...p.privacy, [key]: value } })),
    [],
  );

  return { prefs, hydrated, resolvedTheme, setTheme, setNotification, setPrivacy };
}
