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

  useEffect(() => {
    setPrefs(load());
    setHydrated(true);
  }, []);

  // Persist + reflect the chosen theme on the document (kept as a saved preference; the app's
  // Linen & Pine palette is light by design, so this records intent without a new visual style).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore quota / privacy-mode errors */
    }
    document.documentElement.dataset.theme = prefs.theme;
  }, [prefs, hydrated]);

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

  return { prefs, hydrated, setTheme, setNotification, setPrivacy };
}
