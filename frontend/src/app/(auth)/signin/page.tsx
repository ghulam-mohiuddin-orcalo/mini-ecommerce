'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthField } from '@/components/auth/AuthField';
import { AuthSubmit } from '@/components/auth/AuthSubmit';
import { SocialButtons } from '@/components/auth/SocialButtons';
import { useLogin, useMe } from '@/lib/hooks/useAuth';
import { safeNext } from '@/lib/authNav';
import { ApiError } from '@/lib/api';

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const { data: user } = useMe();
  const login = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);

  // Post-login destination: admins go to their dashboard; everyone else returns to the
  // page they were headed for, or the home page when there's nowhere specific to go.
  const destinationFor = (role: string) => (role === 'ADMIN' ? '/admin' : next ?? '/');

  // Already signed in (e.g. navigated here directly)? Send them on rather than showing a form.
  useEffect(() => {
    if (user) router.replace(destinationFor(user.role));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email, password },
      { onSuccess: (u) => router.replace(destinationFor(u.role)) },
    );
  };

  return (
    <>
      <h1 style={{ fontFamily: "'Newsreader',serif", fontSize: 'clamp(30px,3.4vw,40px)', fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
        Welcome back
      </h1>
      <p style={{ margin: '10px 0 0', fontSize: 15, color: 'var(--muted)' }}>Sign in to your Verdant account.</p>

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
        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          labelRight={
            <Link href="/forgot-password" className="v-auth-link" style={{ fontSize: 12.5 }}>
              Forgot password?
            </Link>
          }
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: 'var(--ink-soft)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
          />
          Remember me on this device
        </label>

        {login.isError && (
          <p role="alert" style={{ margin: 0, fontSize: 13.5, color: 'var(--rose)' }}>
            {login.error instanceof ApiError ? login.error.message : 'Sign in failed'}
          </p>
        )}

        <AuthSubmit disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </AuthSubmit>
      </form>

      <p style={{ margin: '16px 0 0', padding: '10px 12px', borderRadius: 12, background: 'color-mix(in oklab, var(--gold-soft) 14%, transparent)', textAlign: 'center', fontSize: 12.5, color: 'var(--ink-soft)' }}>
        Demo: <strong>customer@shop.test</strong> / <strong>Customer123!</strong>
      </p>

      <SocialButtons />

      <p style={{ margin: '24px 0 0', textAlign: 'center', fontSize: 14, color: 'var(--muted)' }}>
        New to Verdant?{' '}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'} className="v-auth-link">
          Create an account
        </Link>
      </p>
    </>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: 320 }} />}>
      <SignInForm />
    </Suspense>
  );
}
