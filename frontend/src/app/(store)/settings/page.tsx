'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { fieldClasses } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { Container } from '@/components/store/Container';
import { cn } from '@/lib/cn';
import { ApiError } from '@/lib/api';
import { useLogout } from '@/lib/hooks/useAuth';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { usePreferences, type ThemePreference } from '@/lib/hooks/usePreferences';
import { useChangePassword, useForgotPassword } from '@/lib/hooks/usePasswordReset';
import type { User } from '@/lib/types';

const THEMES: { value: ThemePreference; icon: IconName; label: string }[] = [
  { value: 'light', icon: 'sun', label: 'Light' },
  { value: 'dark', icon: 'moon', label: 'Dark' },
  { value: 'system', icon: 'monitor', label: 'System' },
];

const STRENGTH = [
  { label: 'Too weak', color: 'bg-[var(--color-danger)]', text: 'text-[var(--color-danger)]' },
  { label: 'Weak', color: 'bg-[var(--color-danger)]', text: 'text-[var(--color-danger)]' },
  { label: 'Fair', color: 'bg-[var(--color-warning)]', text: 'text-[var(--color-warning-ink)]' },
  { label: 'Good', color: 'bg-brand-400', text: 'text-brand-600 dark:text-brand-300' },
  { label: 'Strong', color: 'bg-[var(--color-success)]', text: 'text-[var(--color-success)]' },
];

function passwordScore(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

export default function SettingsPage() {
  const { user, gate } = useRequireAuth();

  if (gate) return <Shell>{gate}</Shell>;

  return <Shell><SettingsContent user={user as User} /></Shell>;
}

function SettingsContent({ user }: { user: User }) {
  const router = useRouter();
  const logout = useLogout();
  const { prefs, setTheme, setNotification, setPrivacy } = usePreferences();

  return (
    <div className="flex flex-col gap-6">
      <div className="pp-rise">
        <h1 className="font-serif text-[32px] font-medium tracking-tight text-ink">Settings</h1>
        <p className="mt-1.5 text-muted">Manage your appearance, notifications, privacy, and security.</p>
      </div>

      {/* Appearance */}
      <Section icon="sun" title="Appearance" description="Choose how Verdant looks to you.">
        <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-3">
          {THEMES.map((t) => {
            const active = prefs.theme === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(t.value)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                  active
                    ? 'border-brand-600 bg-brand-50 text-brand-700 dark:text-brand-300 ring-1 ring-brand-600'
                    : 'border-line bg-surface text-ink-soft hover:bg-paper-2',
                )}
              >
                <Icon name={t.icon} size={20} className={active ? 'text-brand-600 dark:text-brand-300' : 'text-muted'} />
                {t.label}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">Your preference is saved to this device.</p>
      </Section>

      {/* Notifications */}
      <Section icon="bell" title="Notifications" description="Decide what we email you about.">
        <div className="flex flex-col divide-y divide-[var(--color-line-soft)]">
          <SettingRow
            icon="bell"
            title="Email order updates"
            description="Confirmations and shipping status for your orders."
          >
            <Toggle
              label="Email order updates"
              checked={prefs.notifications.orderUpdates}
              onChange={(v) => setNotification('orderUpdates', v)}
            />
          </SettingRow>
          <SettingRow
            icon="megaphone"
            title="Promotional emails"
            description="Occasional offers and seasonal news."
          >
            <Toggle
              label="Promotional emails"
              checked={prefs.notifications.promotions}
              onChange={(v) => setNotification('promotions', v)}
            />
          </SettingRow>
          <SettingRow
            icon="sparkles"
            title="Product recommendations"
            description="Picks based on what you’ve browsed and bought."
          >
            <Toggle
              label="Product recommendations"
              checked={prefs.notifications.recommendations}
              onChange={(v) => setNotification('recommendations', v)}
            />
          </SettingRow>
        </div>
      </Section>

      {/* Privacy */}
      <Section icon="shield" title="Privacy" description="Control your session and personalization.">
        <div className="flex flex-col divide-y divide-[var(--color-line-soft)]">
          <SettingRow icon="key" title="Keep me signed in" description="Stay signed in on this device between visits.">
            <Toggle
              label="Keep me signed in"
              checked={prefs.privacy.keepSignedIn}
              onChange={(v) => setPrivacy('keepSignedIn', v)}
            />
          </SettingRow>
          <SettingRow icon="eye-off" title="Hide purchase history" description="Hide past orders from quick overviews.">
            <Toggle
              label="Hide purchase history"
              checked={prefs.privacy.hidePurchaseHistory}
              onChange={(v) => setPrivacy('hidePurchaseHistory', v)}
            />
          </SettingRow>
          <SettingRow
            icon="sparkles"
            title="Personalized recommendations"
            description="Use your activity to tailor suggestions."
          >
            <Toggle
              label="Personalized recommendations"
              checked={prefs.privacy.personalizedRecommendations}
              onChange={(v) => setPrivacy('personalizedRecommendations', v)}
            />
          </SettingRow>
        </div>
      </Section>

      {/* Security */}
      <Section icon="lock" title="Security" description="Update the password for your account.">
        <ChangePasswordForm email={user.email} />
      </Section>

      {/* Danger zone */}
      <section className="overflow-hidden rounded-2xl border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3 border-b border-[var(--color-danger)]/30 px-6 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-[var(--color-danger-soft)] text-[var(--color-danger-ink)]" aria-hidden="true">
            <Icon name="alert-triangle" size={18} />
          </span>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-[var(--color-danger-ink)]">Danger zone</h2>
            <p className="text-sm text-ink-soft">Account-level actions. Proceed with care.</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
            <div>
              <p className="font-bold text-ink">Sign out</p>
              <p className="text-sm text-muted">End your session on this device.</p>
            </div>
            <Button
              variant="secondary"
              disabled={logout.isPending}
              onClick={() => logout.mutate(undefined, { onSuccess: () => router.push('/') })}
            >
              <Icon name="logout" size={15} />
              {logout.isPending ? 'Signing out…' : 'Sign Out'}
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
            <div>
              <p className="font-bold text-ink">Delete account</p>
              <p className="text-sm text-muted">Permanently remove your account and data.</p>
            </div>
            <span className="inline-flex items-center gap-2">
              <span className="rounded-full bg-paper-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-faint">
                Coming soon
              </span>
              <Button variant="danger" disabled>
                <Icon name="trash" size={15} />
                Delete Account
              </Button>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function ChangePasswordForm({ email }: { email: string }) {
  const { toast } = useToast();
  const changePassword = useChangePassword();
  const forgotPassword = useForgotPassword();

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const score = passwordScore(pw.next);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pw.next.length < 8) {
      setError('Your new password must be at least 8 characters.');
      return;
    }
    if (pw.next !== pw.confirm) {
      setError('New password and confirmation don’t match.');
      return;
    }
    if (pw.next === pw.current) {
      setError('Your new password must be different from your current one.');
      return;
    }

    changePassword.mutate(
      { currentPassword: pw.current, newPassword: pw.next },
      {
        onSuccess: () => {
          toast({ variant: 'success', title: 'Password updated', description: 'Use it next time you sign in.' });
          setPw({ current: '', next: '', confirm: '' });
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 401) {
            setError('Your current password is incorrect.');
            return;
          }
          setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
        },
      },
    );
  };

  const onForgot = () => {
    forgotPassword.mutate(email, {
      onSuccess: () =>
        toast({
          variant: 'success',
          title: 'Reset link sent',
          description: 'If an account exists for your email, a reset link is on its way.',
        }),
      onError: () =>
        toast({ variant: 'error', title: 'Could not send reset link', description: 'Please try again shortly.' }),
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <PasswordField
        id="current-password"
        label="Current password"
        autoComplete="current-password"
        value={pw.current}
        onChange={(v) => setPw((s) => ({ ...s, current: v }))}
        required
      />
      <div>
        <PasswordField
          id="new-password"
          label="New password"
          autoComplete="new-password"
          value={pw.next}
          onChange={(v) => setPw((s) => ({ ...s, next: v }))}
          required
          minLength={8}
        />
        {pw.next && (
          <div className="mt-2">
            <div className="flex gap-1.5" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-colors',
                    i < score ? STRENGTH[score].color : 'bg-line',
                  )}
                />
              ))}
            </div>
            <p className={cn('mt-1.5 text-xs font-semibold', STRENGTH[score].text)}>
              Password strength: {STRENGTH[score].label}
            </p>
          </div>
        )}
      </div>
      <PasswordField
        id="confirm-password"
        label="Confirm new password"
        autoComplete="new-password"
        value={pw.confirm}
        onChange={(v) => setPw((s) => ({ ...s, confirm: v }))}
        required
        minLength={8}
      />

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger-ink)]"
        >
          <Icon name="alert-triangle" size={15} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={changePassword.isPending}>
          <Icon name="lock" size={15} />
          {changePassword.isPending ? 'Updating…' : 'Update Password'}
        </Button>
        <button
          type="button"
          onClick={onForgot}
          disabled={forgotPassword.isPending}
          className="text-sm font-semibold text-brand-600 dark:text-brand-300 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
        >
          {forgotPassword.isPending ? 'Sending reset link…' : 'Forgot your current password?'}
        </button>
      </div>
    </form>
  );
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: IconName;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-brand-50 text-brand-600 dark:text-brand-300" aria-hidden="true">
          <Icon name={icon} size={18} />
        </span>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-ink">{title}</h2>
          <p className="text-sm text-muted">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SettingRow({
  icon,
  title,
  description,
  children,
}: {
  icon: IconName;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-paper-2 text-muted" aria-hidden="true">
          <Icon name={icon} size={15} />
        </span>
        <div>
          <p className="text-sm font-bold text-ink">{title}</p>
          <p className="text-xs text-muted">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  required = false,
  minLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          className={cn(fieldClasses, 'pr-11')}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <Icon name={show ? 'eye-off' : 'eye'} size={16} />
        </button>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Container width="narrow" className="py-8">
      {children}
    </Container>
  );
}

