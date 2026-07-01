'use client';

import { usePreferences } from '@/lib/hooks/usePreferences';

/**
 * Single sun/moon toggle for the auth screens — mirrors the store header's toggle so
 * dark/light mode is preserved on the standalone auth layout (which has no store chrome).
 */
export function AuthThemeToggle() {
  const { resolvedTheme, setTheme } = usePreferences();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      className="v-auth-toggle"
      aria-label="Toggle theme"
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6.5 6.5 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}
