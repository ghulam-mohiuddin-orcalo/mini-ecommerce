'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { VerdantMark } from '@/components/store/VerdantLogo';
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
              Join the shelf.
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-white/80">
              One account for your cart, orders, and tailored picks across every visit.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="flex flex-col bg-surface p-7">
          <h1 className="text-lg font-extrabold tracking-tight text-ink">Create your account</h1>
          <p className="mt-1.5 text-sm text-muted">Join Verdant — it takes a moment.</p>

          <div className="mt-5 flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-semibold text-ink">Name</label>
              <Input id="name" autoComplete="name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-ink">Email</label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-ink">Password</label>
              <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              <p className="text-xs text-muted">At least 8 characters.</p>
            </div>

            {signup.isError && (
              <p role="alert" className="text-sm text-[color:var(--color-danger)]">
                {signup.error instanceof ApiError ? signup.error.message : 'Sign up failed'}
              </p>
            )}

            <Button type="submit" size="lg" disabled={signup.isPending} className="mt-1 w-full">
              {signup.isPending ? 'Creating account…' : 'Create account'}
            </Button>
          </div>

          <p className="mt-4 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-brand-600 dark:text-brand-300 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

