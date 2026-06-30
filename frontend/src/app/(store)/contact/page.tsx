'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { Prose } from '@/components/store/Prose';
import { ApiError } from '@/lib/api';
import { useContactSubmit, useContent } from '@/lib/hooks/useSiteContent';

const CHANNELS: { icon: IconName; title: string; detail: string }[] = [
  { icon: 'mail', title: 'Email', detail: 'hello@pineandparcel.example' },
  { icon: 'clock', title: 'Hours', detail: 'Mon–Fri, 9am–6pm' },
  { icon: 'package', title: 'Returns', detail: 'Free within 30 days' },
];

const fieldLabel = 'text-sm font-semibold text-ink';
const textareaClasses =
  'w-full rounded-lg border border-line bg-field px-3.5 py-2.5 text-sm leading-relaxed text-ink transition placeholder:text-muted focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-[3px] focus:ring-brand-500/15';

export default function ContactPage() {
  const { toast } = useToast();
  const submit = useContactSubmit();
  // Optional CMS-backed contact intro; missing block (404) just falls back to the default copy.
  const { data: content } = useContent('contact');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);

  function reset() {
    setName('');
    setEmail('');
    setSubject('');
    setBody('');
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit.mutate(
      { name: name.trim(), email: email.trim(), subject: subject.trim(), body: body.trim() },
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
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
      <header className="pp-rise max-w-xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.06em] text-brand-500 dark:text-brand-300">
          Get in touch
        </span>
        <h1 className="mt-5 font-serif text-4xl font-medium leading-[1.08] tracking-tight text-ink sm:text-5xl">
          {content?.title ?? 'We’d love to hear from you.'}
        </h1>
        {content?.body ? (
          <Prose body={content.body} className="mt-5" />
        ) : (
          <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">
            Questions about an order, a product, or a return? Send a note and we&rsquo;ll get back to
            you.
          </p>
        )}
      </header>

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.2fr]">
        <ul className="flex flex-col gap-3">
          {CHANNELS.map((c) => (
            <li
              key={c.title}
              className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
            >
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:text-brand-300"
                aria-hidden="true"
              >
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
                We&rsquo;ve logged your message and will normally reply within one business day.
              </p>
              <Button variant="secondary" onClick={() => setSent(false)}>
                Send another
              </Button>
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={onSubmit}>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-name" className={fieldLabel}>
                  Name
                </label>
                <Input
                  id="contact-name"
                  name="name"
                  required
                  autoComplete="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submit.isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-email" className={fieldLabel}>
                  Email
                </label>
                <Input
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submit.isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-subject" className={fieldLabel}>
                  Subject
                </label>
                <Input
                  id="contact-subject"
                  name="subject"
                  required
                  placeholder="What’s this about?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={submit.isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-body" className={fieldLabel}>
                  Message
                </label>
                <textarea
                  id="contact-body"
                  name="body"
                  required
                  rows={5}
                  minLength={10}
                  placeholder="How can we help?"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  disabled={submit.isPending}
                  className={textareaClasses}
                />
              </div>
              <Button type="submit" className="self-start" disabled={submit.isPending}>
                <Icon name="mail" size={15} />
                {submit.isPending ? 'Sending…' : 'Send message'}
              </Button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
