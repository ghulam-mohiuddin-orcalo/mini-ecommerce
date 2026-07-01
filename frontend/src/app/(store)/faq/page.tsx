'use client';

import Link from 'next/link';
import { Accordion } from '@/components/ui/Accordion';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Container } from '@/components/store/Container';
import { useFaq } from '@/lib/hooks/useSiteContent';

export default function FaqPage() {
  const { data: categories, isLoading, isError, refetch } = useFaq();

  const hasItems =
    categories && categories.some((cat) => cat.items.length > 0);

  return (
    <Container width="narrow" className="py-14 sm:py-20">
      <header className="pp-rise">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.06em] text-brand-500 dark:text-brand-300">
          Help
        </span>
        <h1 className="mt-5 font-serif text-4xl font-medium leading-[1.08] tracking-tight text-ink sm:text-5xl">
          Frequently asked questions
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">
          Can&rsquo;t find what you&rsquo;re looking for?{' '}
          <Link
            href="/contact"
            className="font-semibold text-brand-600 hover:underline dark:text-brand-300"
          >
            Get in touch
          </Link>
          .
        </p>
      </header>

      <div className="mt-10">
        {isLoading ? (
          <div className="flex flex-col gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : !hasItems ? (
          <EmptyState
            title="No questions yet"
            description="We’re still putting our answers together — please check back soon."
          />
        ) : (
          <div className="flex flex-col gap-10">
            {categories
              .filter((cat) => cat.items.length > 0)
              .map((cat) => (
                <section key={cat.id}>
                  <h2 className="font-serif text-xl font-medium tracking-tight text-ink">
                    {cat.name}
                  </h2>
                  <Accordion
                    multiple
                    className="mt-2"
                    items={cat.items.map((item) => ({
                      value: item.id,
                      title: item.question,
                      content: <p className="leading-relaxed">{item.body}</p>,
                    }))}
                  />
                </section>
              ))}
          </div>
        )}
      </div>
    </Container>
  );
}
