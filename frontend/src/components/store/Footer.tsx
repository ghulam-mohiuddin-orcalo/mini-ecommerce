'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api';
import { useCategories } from '@/lib/hooks/useProducts';
import { useNewsletterSignup } from '@/lib/hooks/useNewsletter';

const COMPANY_LINKS: { label: string; href: string }[] = [
  { label: 'About', href: '/about' },
  { label: 'Journal', href: '/journal' },
  { label: 'Contact', href: '/contact' },
];

const SUPPORT_LINKS: { label: string; href: string }[] = [
  { label: 'FAQ', href: '/faq' },
  { label: 'Shipping', href: '/shipping' },
  { label: 'Returns', href: '/returns' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

/**
 * Social links point at the brand's own pages rather than dead `#` anchors — we don't
 * own external handles for a demo storefront, so we route inward to real, existing routes.
 */
const SOCIAL_LINKS: { label: string; href: string; icon: IconName }[] = [
  { label: 'Read the Journal', href: '/journal', icon: 'book' },
  { label: 'Contact us', href: '/contact', icon: 'mail' },
  { label: 'About the makers', href: '/about', icon: 'leaf' },
];

/** Decorative payment marks (aria-hidden) — visual trust signals only. */
const PAYMENT_MARKS = ['Visa', 'Mastercard', 'Amex', 'PayPal'];

function NewsletterForm() {
  const { toast } = useToast();
  const signup = useNewsletterSignup();
  const [email, setEmail] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    signup.mutate(
      { email: value },
      {
        onSuccess: () => {
          setEmail('');
          toast({
            variant: 'success',
            title: 'You’re on the list',
            description: 'Thanks for subscribing — look out for our next dispatch.',
          });
        },
        onError: (err) => {
          toast({
            variant: 'error',
            title: 'Couldn’t subscribe',
            description: err instanceof ApiError ? err.message : 'Please try again in a moment.',
          });
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="mt-4 flex w-full max-w-sm gap-2">
      <div className="flex-1">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <Input
          id="newsletter-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <Button type="submit" disabled={signup.isPending}>
        {signup.isPending ? 'Joining…' : 'Subscribe'}
      </Button>
    </form>
  );
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: { label: string; href: string }[];
}) {
  return (
    <nav aria-label={heading}>
      <h2 className="text-xs font-bold uppercase tracking-[0.07em] text-muted">{heading}</h2>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer() {
  const { data: categories } = useCategories();

  const shopLinks = [
    { label: 'All products', href: '/products' },
    ...(categories ?? []).slice(0, 5).map((category) => ({
      label: category,
      href: `/products?category=${encodeURIComponent(category)}`,
    })),
  ];

  return (
    <footer className="mt-16 border-t border-line bg-paper-2">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {/* Newsletter */}
        <div className="flex flex-col gap-6 border-b border-line pb-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-md">
            <h2 className="font-serif text-2xl font-medium tracking-tight text-ink">
              Join the Pine &amp; Parcel list
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Occasional dispatches on new arrivals and the makers behind them. No noise.
            </p>
          </div>
          <NewsletterForm />
        </div>

        {/* Columns */}
        <div className="mt-10 grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-brand-600 text-[15px] font-extrabold text-white">
                P
              </span>
              <span className="font-serif text-[18px] font-semibold tracking-tight text-ink">
                Pine &amp; Parcel
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              A small, coherent storefront of thoughtfully made goods.
            </p>
            <div className="mt-4 flex items-center gap-2">
              {SOCIAL_LINKS.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface text-ink-soft transition-colors hover:border-faint hover:text-ink"
                >
                  <Icon name={s.icon} size={16} />
                </Link>
              ))}
            </div>
          </div>

          <FooterColumn
            heading="Shop"
            links={shopLinks.map((l) => ({ label: l.label, href: l.href }))}
          />
          <FooterColumn heading="Company" links={COMPANY_LINKS} />
          <FooterColumn heading="Support" links={SUPPORT_LINKS} />
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            © {new Date().getFullYear()} Pine &amp; Parcel — a mini e-commerce demo.
          </p>
          <ul className="flex flex-wrap items-center gap-2" aria-hidden="true">
            {PAYMENT_MARKS.map((mark) => (
              <li
                key={mark}
                className="rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted"
              >
                {mark}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
