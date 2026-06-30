'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { VerdantMark } from '@/components/store/VerdantLogo';
import { useForgotPassword } from '@/lib/hooks/usePasswordReset';

const GENERIC_MESSAGE =
  'If an account exists for that email, we’ve sent a link to reset your password.';

export default function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  // Dev-only: the API returns a resetToken when no mailer is configured.
  const [devToken, setDevToken] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgot.mutate(email, {
      // No-enumeration: succeed identically whatever the server returns. We never surface
      // whether the email matched an account.
      onSuccess: (data) => {
        setDevToken(data.resetToken ?? null);
        setSubmitted(true);
      },
      onError: () => {
        setDevToken(null);
        setSubmitted(true);
      },
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="grid overflow-hidden rounded-2xl border border-line shadow-[var(--shadow-panel)] md:grid-cols-2">
        {/* Brand panel — interior photo under a brand-tinted overlay */}
        <div className="relative hidden flex-col justify-between overflow-hidden p-7 md:flex">
          <img
            src="https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&h=1100&fit=crop&q=80"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div aria-hidden="true" className="pp-veil absolute inset-0" />
          <div aria-hidden="true" className="pp-glow absolute inset-0" />
          <div className="relative flex items-center gap-2.5">
            <VerdantMark className="h-[30px] w-[30px] bg-white/15 text-white" iconClassName="h-[17px] w-[17px]" />
            <span className="font-serif text-[17px] font-semibold text-white">Verdant</span>
          </div>
          <div className="relative">
            <h2 className="font-serif text-[26px] font-medium leading-tight tracking-tight text-white">
              Lost the thread?
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-white/80">
              Pop in your email and we&rsquo;ll send a link to set a new password.
            </p>
          </div>
        </div>

        {/* Form / confirmation */}
        <div className="flex flex-col bg-surface p-7">
          {submitted ? (
            <div className="flex flex-col">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-success">
                <Icon name="mail" size={22} />
              </div>
              <h1 className="mt-4 text-lg font-extrabold tracking-tight text-ink">Check your email</h1>
              <p className="mt-1.5 text-sm text-muted" role="status" aria-live="polite">
                {GENERIC_MESSAGE}
              </p>

              {devToken && (
                <div className="mt-5 rounded-lg border border-dashed border-line bg-[var(--color-warning-soft)] p-3.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-warning-ink)]">
                    Dev only &mdash; no mailer configured
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-warning-ink)]">
                    Use this link to continue the reset flow locally:
                  </p>
                  <Link
                    href={`/reset-password?token=${encodeURIComponent(devToken)}`}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-300 hover:underline"
                  >
                    <Icon name="key" size={14} />
                    Open reset link
                  </Link>
                </div>
              )}

              <Link
                href="/login"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 dark:text-brand-300 hover:underline"
              >
                <Icon name="arrow-left" size={15} />
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col">
              <h1 className="text-lg font-extrabold tracking-tight text-ink">Forgot your password?</h1>
              <p className="mt-1.5 text-sm text-muted">
                Enter the email for your account and we&rsquo;ll send a reset link.
              </p>

              <div className="mt-5 flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm font-semibold text-ink">Email</label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <Button type="submit" size="lg" disabled={forgot.isPending} className="mt-1 w-full">
                  {forgot.isPending ? 'Sending…' : 'Send reset link'}
                </Button>
              </div>

              <p className="mt-6 text-center text-sm text-muted">
                Remembered it?{' '}
                <Link href="/login" className="font-bold text-brand-600 dark:text-brand-300 hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

