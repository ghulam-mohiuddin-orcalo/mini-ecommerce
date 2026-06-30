import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'About — Pine & Parcel',
  description: 'The story and values behind Pine & Parcel.',
};

const VALUES = [
  {
    title: 'Considered, not endless',
    body: 'A small, curated catalog beats infinite choice. Every item earns its place on the shelf.',
  },
  {
    title: 'Built to last',
    body: 'We favour materials and makers that age well — things you keep, not things you replace.',
  },
  {
    title: 'Honest by default',
    body: 'Clear prices, real stock, no dark patterns. Your cart and orders are yours across every session.',
  },
];

const STATS = [
  { value: '5', label: 'Categories' },
  { value: '30 days', label: 'Free returns' },
  { value: '24h', label: 'Dispatch' },
  { value: '100%', label: 'Thoughtfully chosen' },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
      <section className="pp-rise max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.06em] text-brand-500 dark:text-brand-300">
          Our story
        </span>
        <h1 className="mt-5 font-serif text-4xl font-medium leading-[1.08] tracking-tight text-ink sm:text-5xl">
          Everyday essentials, carefully chosen.
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">
          Pine &amp; Parcel began with a simple idea: a shop should feel like a well-kept shelf, not a
          warehouse. We bring together apparel, home goods, electronics, books, and outdoor gear that
          we&rsquo;d happily own ourselves — and we keep the catalog small on purpose.
        </p>
      </section>

      <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-[var(--shadow-card)] sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="bg-surface p-6">
            <dt className="sr-only">{s.label}</dt>
            <dd className="font-serif text-3xl font-medium tracking-tight text-ink">{s.value}</dd>
            <p className="mt-1 text-xs font-semibold text-muted">{s.label}</p>
          </div>
        ))}
      </dl>

      <section className="mt-14">
        <h2 className="font-serif text-2xl font-medium tracking-tight text-ink">What we believe</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)] transition-transform duration-200 hover:-translate-y-1"
            >
              <h3 className="font-bold tracking-tight text-ink">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 flex flex-col items-start gap-4 rounded-2xl border border-line bg-paper-2 p-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-medium tracking-tight text-ink">Ready to browse?</h2>
          <p className="mt-1.5 text-ink-soft">See what&rsquo;s on the shelf right now.</p>
        </div>
        <Link href="/products">
          <Button size="lg">
            Browse the catalog
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Button>
        </Link>
      </section>
    </div>
  );
}
