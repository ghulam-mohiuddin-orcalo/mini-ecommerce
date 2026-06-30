'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon, type IconName } from '@/components/ui/Icon';

const CHANNELS: { icon: IconName; title: string; detail: string }[] = [
  { icon: 'mail', title: 'Email', detail: 'hello@pineandparcel.example' },
  { icon: 'clock', title: 'Hours', detail: 'Mon–Fri, 9am–6pm' },
  { icon: 'package', title: 'Returns', detail: 'Free within 30 days' },
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="pp-rise max-w-xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.06em] text-brand-500 dark:text-brand-300">
          Get in touch
        </span>
        <h1 className="mt-5 font-serif text-4xl font-medium leading-[1.08] tracking-tight text-ink sm:text-5xl">
          We&rsquo;d love to hear from you.
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">
          Questions about an order, a product, or a return? Send a note and we&rsquo;ll get back to you.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.2fr]">
        <ul className="flex flex-col gap-3">
          {CHANNELS.map((c) => (
            <li
              key={c.title}
              className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:text-brand-300" aria-hidden="true">
                <Icon name={c.icon} size={18} />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">{c.title}</p>
                <p className="text-sm text-muted">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>

        <section className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
          {sent ? (
            <div className="flex flex-col items-start gap-3 py-6" role="status">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600 dark:text-brand-300" aria-hidden="true">
                <Icon name="check-circle" size={24} />
              </span>
              <h2 className="font-serif text-2xl font-medium tracking-tight text-ink">Thanks — message received.</h2>
              <p className="text-ink-soft">
                This is a demo form, so nothing was actually sent. We&rsquo;d normally reply within one
                business day.
              </p>
              <Button variant="secondary" onClick={() => setSent(false)}>
                Send another
              </Button>
            </div>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-name" className="text-sm font-semibold text-ink">Name</label>
                <Input id="contact-name" name="name" required autoComplete="name" placeholder="Your name" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-email" className="text-sm font-semibold text-ink">Email</label>
                <Input id="contact-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-message" className="text-sm font-semibold text-ink">Message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={5}
                  placeholder="How can we help?"
                  className="w-full rounded-lg border border-line bg-field px-3.5 py-2.5 text-sm leading-relaxed text-ink transition placeholder:text-muted focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-[3px] focus:ring-brand-500/15"
                />
              </div>
              <Button type="submit" className="self-start">
                <Icon name="mail" size={15} />
                Send message
              </Button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
