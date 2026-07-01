'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthField } from '@/components/auth/AuthField';
import { AuthSubmit } from '@/components/auth/AuthSubmit';
import { Icon } from '@/components/ui/Icon';
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

  if (submitted) {
    return (
      <>
        <div style={{ width: 46, height: 46, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'color-mix(in oklab, var(--primary) 14%, transparent)', color: 'var(--primary)' }}>
          <Icon name="mail" size={22} />
        </div>
        <h1 style={{ margin: '18px 0 0', fontFamily: "'Newsreader',serif", fontSize: 'clamp(28px,3.2vw,36px)', fontWeight: 500, lineHeight: 1.12, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
          Check your email
        </h1>
        <p style={{ margin: '10px 0 0', fontSize: 15, color: 'var(--muted)' }} role="status" aria-live="polite">
          {GENERIC_MESSAGE}
        </p>

        {devToken && (
          <div style={{ marginTop: 22, padding: 14, borderRadius: 13, border: '1px dashed var(--line2)', background: 'color-mix(in oklab, var(--gold-soft) 12%, transparent)' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-soft)' }}>
              Dev only — no mailer configured
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--ink-soft)' }}>Use this link to continue the reset flow locally:</p>
            <Link
              href={`/reset-password?token=${encodeURIComponent(devToken)}`}
              className="v-auth-link"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13 }}
            >
              <Icon name="key" size={14} />
              Open reset link
            </Link>
          </div>
        )}

        <Link href="/signin" className="v-auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 26, fontSize: 14 }}>
          <Icon name="arrow-left" size={15} />
          Back to sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 style={{ fontFamily: "'Newsreader',serif", fontSize: 'clamp(30px,3.4vw,40px)', fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
        Forgot your password?
      </h1>
      <p style={{ margin: '10px 0 0', fontSize: 15, color: 'var(--muted)' }}>
        Enter the email for your account and we’ll send a reset link.
      </p>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 28 }}>
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <AuthSubmit disabled={forgot.isPending}>
          {forgot.isPending ? 'Sending…' : 'Send reset link'}
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
