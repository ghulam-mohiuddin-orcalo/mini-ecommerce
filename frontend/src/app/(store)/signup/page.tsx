'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSignup } from '@/lib/hooks/useAuth';
import { ApiError } from '@/lib/api';

export default function SignupPage() {
  const router = useRouter();
  const signup = useSignup();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signup.mutate(
      { name, email, password },
      { onSuccess: (user) => router.replace(user.role === 'ADMIN' ? '/admin' : '/products') },
    );
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <div className="rounded-2xl border border-line bg-surface p-7 shadow-[var(--shadow-panel)]">
        <h1 className="text-lg font-extrabold tracking-tight text-ink">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted">Join Pine &amp; Parcel — it takes a moment.</p>

        <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-semibold text-ink">Name</label>
            <Input id="name" autoComplete="name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-semibold text-ink">Email</label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="password" className="text-sm font-semibold text-ink">Password</label>
            <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="text-xs text-muted">At least 8 characters.</p>
          </div>

          {signup.isError && (
            <p role="alert" className="text-sm text-[color:var(--color-danger)] sm:col-span-2">
              {signup.error instanceof ApiError ? signup.error.message : 'Sign up failed'}
            </p>
          )}

          <Button type="submit" size="lg" disabled={signup.isPending} className="w-full sm:col-span-2">
            {signup.isPending ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-brand-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
