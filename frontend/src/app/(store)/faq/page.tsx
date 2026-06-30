import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'FAQ — Pine & Parcel',
  description: 'Answers to common questions about orders, shipping, and returns.',
};

const FAQS: { q: string; a: string }[] = [
  {
    q: 'How long does dispatch take?',
    a: 'Orders placed before 2pm on a weekday are dispatched within 24 hours. You can track status from your Orders page once an order ships.',
  },
  {
    q: 'What is your returns policy?',
    a: 'Returns are free within 30 days of delivery, provided items are in their original condition. Start a return by contacting us and we&rsquo;ll send instructions.',
  },
  {
    q: 'Do I need an account to order?',
    a: 'Yes — an account keeps your cart and order history saved across sessions and lets us personalise recommendations to what you actually buy.',
  },
  {
    q: 'How are payments handled?',
    a: 'Checkout runs through a secure payment step. This demo build uses a sandboxed payment flow, so no real charges are ever made.',
  },
  {
    q: 'Can I cancel an order?',
    a: 'Orders can be cancelled while they are still Pending or Processing, which restocks the items. Once an order has shipped it can no longer be cancelled.',
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="pp-rise">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.06em] text-brand-500 dark:text-brand-300">
          Help
        </span>
        <h1 className="mt-5 font-serif text-4xl font-medium leading-[1.08] tracking-tight text-ink sm:text-5xl">
          Frequently asked questions
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">
          Can&rsquo;t find what you&rsquo;re looking for?{' '}
          <Link href="/contact" className="font-semibold text-brand-600 dark:text-brand-300 hover:underline">
            Get in touch
          </Link>
          .
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-3">
        {FAQS.map((item) => (
          <details
            key={item.q}
            className="group rounded-2xl border border-line bg-surface px-5 shadow-[var(--shadow-card)] open:bg-paper-2"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-bold tracking-tight text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface [&::-webkit-details-marker]:hidden">
              {item.q}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
                className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <p
              className="pb-5 text-sm leading-relaxed text-ink-soft"
              dangerouslySetInnerHTML={{ __html: item.a }}
            />
          </details>
        ))}
      </div>
    </div>
  );
}
