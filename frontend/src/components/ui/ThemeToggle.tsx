'use client';

import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { usePreferences, type ThemePreference } from '@/lib/hooks/usePreferences';

const OPTIONS: { value: ThemePreference; icon: IconName; label: string }[] = [
  { value: 'light', icon: 'sun', label: 'Light' },
  { value: 'dark', icon: 'moon', label: 'Dark' },
  { value: 'system', icon: 'monitor', label: 'System' },
];

/**
 * Compact 3-state appearance switcher (Light / Dark / System), mirroring the settings
 * radiogroup. Renders a neutral placeholder until preferences hydrate so the server markup
 * (default 'system') never disagrees with the pre-paint theme the bootstrap script applied.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { prefs, hydrated, setTheme } = usePreferences();

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-line bg-paper-2 p-0.5',
        className,
      )}
    >
      {OPTIONS.map((opt) => {
        const active = hydrated && prefs.theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={`${opt.label} theme`}
            onClick={() => setTheme(opt.value)}
            className={cn(
              'grid h-7 w-7 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              active
                ? 'bg-surface text-brand-600 dark:text-brand-300 shadow-[var(--shadow-card)]'
                : 'text-muted hover:text-ink',
            )}
          >
            <Icon name={opt.icon} size={15} />
          </button>
        );
      })}
    </div>
  );
}
