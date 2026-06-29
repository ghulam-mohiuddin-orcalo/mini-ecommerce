'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLogin } from '@/lib/hooks/useAuth';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email, password },
      { onSuccess: (user) => router.replace(user.role === 'ADMIN' ? '/admin' : '/products') },
    );
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
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(160deg,rgba(36,75,60,.9),rgba(44,93,74,.7))' }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(120% 80% at 90% 0%,rgba(199,154,82,.28),transparent 55%)' }}
          />
          <div className="relative flex items-center gap-2.5">
            <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-white/15 text-sm font-extrabold text-white">
              P
            </span>
            <span className="font-bold text-white">Pine &amp; Parcel</span>
          </div>
          <div className="relative">
            <h2 className="text-[22px] font-extrabold leading-tight tracking-tight text-white">
              Welcome back.
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-white/80">
              Your cart and orders, saved to your account across every session.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="flex flex-col bg-surface p-7">
          <h1 className="text-lg font-extrabold tracking-tight text-ink">Sign in</h1>
          <p className="mt-1.5 text-sm text-muted">Sign in to your account.</p>

          <div className="mt-5 flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-ink">Email</label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-ink">Password</label>
              <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            {login.isError && (
              <p role="alert" className="text-sm text-[color:var(--color-danger)]">
                {login.error instanceof ApiError ? login.error.message : 'Sign in failed'}
              </p>
            )}

            <Button type="submit" size="lg" disabled={login.isPending} className="mt-1 w-full">
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>

          <p className="mt-4 rounded-lg bg-[var(--color-warning-soft)] p-2.5 text-center text-xs text-[var(--color-warning-ink)]">
            Demo: <strong>customer@shop.test</strong> / <strong>Customer123!</strong>
          </p>

          <p className="mt-4 text-center text-sm text-muted">
            No account?{' '}
            <Link href="/signup" className="font-bold text-brand-600 hover:underline">Create one</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
