'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthField } from '@/components/auth/AuthField';
import { AuthSubmit } from '@/components/auth/AuthSubmit';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { useResetPassword } from '@/lib/hooks/usePasswordReset';
import { ApiError } from '@/lib/api';

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
      <>
        <div style={{ width: 46, height: 46, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'color-mix(in oklab, var(--gold-soft) 16%, transparent)', color: 'var(--gold)' }}>
          <Icon name="alert-triangle" size={22} />
        </div>
        <h1 style={{ margin: '18px 0 0', fontFamily: "'Newsreader',serif", fontSize: 'clamp(28px,3.2vw,36px)', fontWeight: 500, lineHeight: 1.12, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
          Reset link missing
        </h1>
        <p style={{ margin: '10px 0 0', fontSize: 15, color: 'var(--muted)' }}>
          This page needs a valid reset token. Please request a new password reset link.
        </p>
        <Link href="/forgot-password" className="v-auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 26, fontSize: 14 }}>
          <Icon name="arrow-left" size={15} />
          Request a new link
        </Link>
      </>
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
          router.replace('/signin');
        },
      },
    );
  };

  return (
    <>
      <h1 style={{ fontFamily: "'Newsreader',serif", fontSize: 'clamp(30px,3.4vw,40px)', fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
        Set a new password
      </h1>
      <p style={{ margin: '10px 0 0', fontSize: 15, color: 'var(--muted)' }}>
        Choose a strong password you don’t use elsewhere.
      </p>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 28 }}>
        <AuthField
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          hint="At least 8 characters."
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (mismatch) setMismatch(false);
          }}
        />
        <AuthField
          id="confirm"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Re-enter your password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            if (mismatch) setMismatch(false);
          }}
        />

        {mismatch && (
          <p role="alert" aria-live="assertive" style={{ margin: 0, fontSize: 13.5, color: 'var(--rose)' }}>
            Passwords don’t match.
          </p>
        )}

        {reset.isError && (
          <div role="alert" aria-live="assertive" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--rose)' }}>
              {reset.error instanceof ApiError ? reset.error.message : 'Couldn’t reset your password.'}
            </p>
            <Link href="/forgot-password" className="v-auth-link" style={{ fontSize: 13 }}>
              Request a new reset link
            </Link>
          </div>
        )}

        <AuthSubmit disabled={reset.isPending}>
          {reset.isPending ? 'Updating…' : 'Update password'}
        </AuthSubmit>
      </form>

      <p style={{ margin: '24px 0 0', textAlign: 'center', fontSize: 14, color: 'var(--muted)' }}>
        Remembered it?{' '}
        <Link href="/signin" className="v-auth-link">
          Sign in
        </Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <>
          <h1 style={{ fontFamily: "'Newsreader',serif", fontSize: 'clamp(30px,3.4vw,40px)', fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            Set a new password
          </h1>
          <p style={{ margin: '10px 0 0', fontSize: 15, color: 'var(--muted)' }}>Loading…</p>
        </>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
