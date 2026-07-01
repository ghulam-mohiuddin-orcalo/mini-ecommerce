'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthField } from '@/components/auth/AuthField';
import { AuthSubmit } from '@/components/auth/AuthSubmit';
import { SocialButtons } from '@/components/auth/SocialButtons';
import { useMe, useSignup } from '@/lib/hooks/useAuth';
import { safeNext } from '@/lib/authNav';
import { ApiError } from '@/lib/api';

function SignUpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const { data: user } = useMe();
  const signup = useSignup();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const destinationFor = (role: string) => (role === 'ADMIN' ? '/admin' : next ?? '/');

  useEffect(() => {
    if (user) router.replace(destinationFor(user.role));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signup.mutate(
      { name, email, password },
      { onSuccess: (u) => router.replace(destinationFor(u.role)) },
    );
  };

  return (
    <>
      <h1 style={{ fontFamily: "'Newsreader',serif", fontSize: 'clamp(30px,3.4vw,40px)', fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
        Create your account
      </h1>
      <p style={{ margin: '10px 0 0', fontSize: 15, color: 'var(--muted)' }}>Join Verdant — it only takes a moment.</p>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 28 }}>
        <AuthField
          id="name"
          label="Name"
          autoComplete="name"
          required
          minLength={2}
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          hint="At least 8 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {signup.isError && (
          <p role="alert" style={{ margin: 0, fontSize: 13.5, color: 'var(--rose)' }}>
            {signup.error instanceof ApiError ? signup.error.message : 'Sign up failed'}
          </p>
        )}

        <AuthSubmit disabled={signup.isPending}>
          {signup.isPending ? 'Creating account…' : 'Create account'}
        </AuthSubmit>
      </form>

      <SocialButtons />

      <p style={{ margin: '24px 0 0', textAlign: 'center', fontSize: 14, color: 'var(--muted)' }}>
        Already have an account?{' '}
        <Link href={next ? `/signin?next=${encodeURIComponent(next)}` : '/signin'} className="v-auth-link">
          Sign in
        </Link>
      </p>
    </>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: 320 }} />}>
      <SignUpForm />
    </Suspense>
  );
}
