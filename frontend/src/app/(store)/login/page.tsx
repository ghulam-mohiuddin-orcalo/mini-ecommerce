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
    login.mutate({ email, password }, { onSuccess: () => router.push('/products') });
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Sign in to your account.</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-ink">Email</label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-ink">Password</label>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {login.isError && (
          <p role="alert" className="text-sm text-[color:var(--color-danger)]">
            {login.error instanceof ApiError ? login.error.message : 'Sign in failed'}
          </p>
        )}

        <Button type="submit" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>

        <p className="text-center text-sm text-muted">
          No account?{' '}
          <Link href="/signup" className="font-medium text-brand-700 hover:underline">Create one</Link>
        </p>
      </form>

      <p className="rounded-lg bg-brand-50 p-3 text-center text-xs text-brand-700">
        Demo: <strong>customer@shop.test</strong> / <strong>Customer123!</strong>
      </p>
    </div>
  );
}
