'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Input, fieldClasses } from '@/components/ui/Input';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useToast } from '@/components/ui/Toast';
import { Prose } from '@/components/store/Prose';
import { Container } from '@/components/store/Container';
import { StudioMap } from '@/components/store/StudioMap';
import { cn } from '@/lib/cn';
import { ApiError } from '@/lib/api';
import { useContactSubmit, useContent } from '@/lib/hooks/useSiteContent';

/** Real, brand-consistent contact channels (mirrors the Verdant reference). */
const CHANNELS: { icon: IconName; title: string; detail: string; href?: string; sub?: string }[] = [
  { icon: 'mail', title: 'Email us', detail: 'hello@verdant.co', href: 'mailto:hello@verdant.co' },
  { icon: 'phone', title: 'Call us', detail: '+44 20 7946 0123', href: 'tel:+442079460123' },
  {
    icon: 'map-pin',
    title: 'Visit the studio',
    detail: '14 Garden Walk, London E2',
    sub: 'Mon–Sat · 10am–6pm',
  },
];

export default function ContactPage() {
  const { toast } = useToast();
  const submit = useContactSubmit();
  // Optional CMS-backed contact intro; a missing block (404) just falls back to the reference copy.
  const { data: content } = useContent('contact');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);

  function reset() {
    setFirstName('');
    setLastName('');
    setEmail('');
    setSubject('');
    setBody('');
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // The API contract is a single `name`; the split first/last fields are a UI concern only.
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    submit.mutate(
      { name, email: email.trim(), subject: subject.trim(), body: body.trim() },
      {
        onSuccess: () => {
          setSent(true);
          reset();
          toast({ variant: 'success', title: 'Message sent', description: 'We’ll be in touch soon.' });
        },
        onError: (err) =>
          toast({
            variant: 'error',
            title: 'Could not send message',
            description: err instanceof ApiError ? err.message : 'Please try again in a moment.',
          }),
      },
    );
  }

  return (
    <Container width="default" className="py-14 sm:py-20">
      <Breadcrumbs
        items={[{ label: 'Home', href: '/' }, { label: 'Contact' }]}
        className="pp-rise mb-8"
      />

      <header className="pp-rise max-w-2xl">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-300">
          Say hello
        </span>
        <h1 className="mt-3 font-serif text-[40px] font-medium leading-[1.05] tracking-tight text-ink sm:text-[52px]">
          {content?.title ?? 'We’d love to hear from you'}
        </h1>
        {content?.body ? (
          <Prose body={content.body} className="mt-5" />
        ) : (
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-soft">
            Questions about an order, plant care, or a custom commission? Our team replies within one
            working day.
          </p>
        )}
      </header>

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr] lg:gap-8">
        {/* Left — contact form */}
        <section className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
          {sent ? (
            <div className="flex flex-col items-start gap-3 py-6" role="status">
              <span
                className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600 dark:text-brand-300"
                aria-hidden="true"
              >
                <Icon name="check-circle" size={24} />
              </span>
              <h2 className="font-serif text-2xl font-medium tracking-tight text-ink">
                Thanks — message received.
              </h2>
              <p className="text-ink-soft">
                We&rsquo;ve logged your message and will normally reply within one working day.
              </p>
              <Button variant="secondary" onClick={() => setSent(false)}>
                Send another
              </Button>
            </div>
          ) : (
            <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate={false}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field id="contact-first" label="First name">
                  <Input
                    id="contact-first"
                    name="firstName"
                    required
                    autoComplete="given-name"
                    placeholder="Your first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={submit.isPending}
                  />
                </Field>
                <Field id="contact-last" label="Last name">
                  <Input
                    id="contact-last"
                    name="lastName"
                    required
                    autoComplete="family-name"
                    placeholder="Your last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={submit.isPending}
                  />
                </Field>
              </div>

              <Field id="contact-email" label="Email">
                <Input
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submit.isPending}
                />
              </Field>

              <Field id="contact-subject" label="Subject">
                <Input
                  id="contact-subject"
                  name="subject"
                  required
                  placeholder="What’s this about?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={submit.isPending}
                />
              </Field>

              <Field id="contact-body" label="Message">
                <textarea
                  id="contact-body"
                  name="body"
                  required
                  rows={5}
                  minLength={10}
                  placeholder="Tell us a little more…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  disabled={submit.isPending}
                  className={cn(fieldClasses, 'h-auto min-h-[150px] resize-y py-2.5 leading-relaxed')}
                />
              </Field>

              <Button
                type="submit"
                size="lg"
                className="mt-1 h-[54px] w-full rounded-[14px]"
                disabled={submit.isPending}
              >
                {submit.isPending ? 'Sending…' : 'Send message'}
                <Icon name="send" size={17} />
              </Button>
            </form>
          )}
        </section>

        {/* Right — contact channels + studio map */}
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-4">
            {CHANNELS.map((c) => (
              <li
                key={c.title}
                className="flex items-start gap-4 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-summary)]"
              >
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:text-brand-300"
                  aria-hidden="true"
                >
                  <Icon name={c.icon} size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink">{c.title}</p>
                  {c.href ? (
                    <a
                      href={c.href}
                      className="mt-0.5 block text-sm text-muted transition-colors hover:text-ink"
                    >
                      {c.detail}
                    </a>
                  ) : (
                    <p className="mt-0.5 text-sm text-muted">{c.detail}</p>
                  )}
                  {c.sub && <p className="text-sm text-muted">{c.sub}</p>}
                </div>
              </li>
            ))}
          </ul>

          <StudioMap className="flex-1" />
        </div>
      </div>
    </Container>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}
