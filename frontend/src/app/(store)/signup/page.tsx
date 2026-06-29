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
    signup.mutate({ name, email, password }, { onSuccess: () => router.push('/products') });
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-muted">It only takes a moment.</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-ink">Name</label>
          <Input id="name" autoComplete="name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-ink">Email</label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-ink">Password</label>
          <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-muted">At least 8 characters.</p>
        </div>

        {signup.isError && (
          <p role="alert" className="text-sm text-[color:var(--color-danger)]">
            {signup.error instanceof ApiError ? signup.error.message : 'Sign up failed'}
          </p>
        )}

        <Button type="submit" disabled={signup.isPending}>
          {signup.isPending ? 'Creating account…' : 'Create account'}
        </Button>

        <p className="text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-brand-700 hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
