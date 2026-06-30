'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { useResetPassword } from '@/lib/hooks/usePasswordReset';
import { ApiError } from '@/lib/api';

function BrandPanel() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden p-7 md:flex">
      <img
        src="https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&h=1100&fit=crop&q=80"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div aria-hidden="true" className="pp-veil absolute inset-0" />
      <div aria-hidden="true" className="pp-glow absolute inset-0" />
      <div className="relative flex items-center gap-2.5">
        <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-white/15 text-sm font-extrabold text-white">
          P
        </span>
        <span className="font-serif text-[17px] font-semibold text-white">Pine &amp; Parcel</span>
      </div>
      <div className="relative">
        <h2 className="font-serif text-[26px] font-medium leading-tight tracking-tight text-white">
          A fresh start.
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-white/80">
          Choose a new password and you&rsquo;re right back to your cart and orders.
        </p>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="grid overflow-hidden rounded-2xl border border-line shadow-[var(--shadow-panel)] md:grid-cols-2">
        <BrandPanel />
        <div className="flex flex-col bg-surface p-7">{children}</div>
      </div>
    </div>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const reset = useResetPassword();
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState(false);

  // Missing token: nothing the user can do here — point them at the request flow.
  if (!token) {
    return (
      <Shell>
        <div className="flex flex-col">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-warning-soft)] text-[var(--color-warning-ink)]">
            <Icon name="alert-triangle" size={22} />
          </div>
          <h1 className="mt-4 text-lg font-extrabold tracking-tight text-ink">Reset link missing</h1>
          <p className="mt-1.5 text-sm text-muted">
            This page needs a valid reset token. Please request a new password reset link.
          </p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 dark:text-brand-300 hover:underline"
          >
            <Icon name="arrow-left" size={15} />
            Request a new link
          </Link>
        </div>
      </Shell>
    );
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    reset.mutate(
      { token, password },
      {
        onSuccess: () => {
          toast({
            variant: 'success',
            title: 'Password updated',
            description: 'You can now sign in with your new password.',
          });
          router.replace('/login');
        },
      },
    );
  };

  return (
    <Shell>
      <form onSubmit={onSubmit} className="flex flex-col">
        <h1 className="text-lg font-extrabold tracking-tight text-ink">Set a new password</h1>
        <p className="mt-1.5 text-sm text-muted">Choose a strong password you don&rsquo;t use elsewhere.</p>

        <div className="mt-5 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-semibold text-ink">New password</label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (mismatch) setMismatch(false);
              }}
            />
            <p className="text-xs text-muted">At least 8 characters.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm" className="text-sm font-semibold text-ink">Confirm password</label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                if (mismatch) setMismatch(false);
              }}
            />
          </div>

          {mismatch && (
            <p role="alert" aria-live="assertive" className="text-sm text-[color:var(--color-danger)]">
              Passwords don&rsquo;t match.
            </p>
          )}

          {reset.isError && (
            <div role="alert" aria-live="assertive" className="flex flex-col gap-1">
              <p className="text-sm text-[color:var(--color-danger)]">
                {reset.error instanceof ApiError
                  ? reset.error.message
                  : 'Couldn’t reset your password.'}
              </p>
              <Link href="/forgot-password" className="text-sm font-bold text-brand-600 dark:text-brand-300 hover:underline">
                Request a new reset link
              </Link>
            </div>
          )}

          <Button type="submit" size="lg" disabled={reset.isPending} className="mt-1 w-full">
            {reset.isPending ? 'Updating…' : 'Update password'}
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Remembered it?{' '}
          <Link href="/login" className="font-bold text-brand-600 dark:text-brand-300 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </Shell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <div className="flex flex-col">
            <h1 className="text-lg font-extrabold tracking-tight text-ink">Set a new password</h1>
            <p className="mt-1.5 text-sm text-muted">Loading…</p>
          </div>
        </Shell>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
