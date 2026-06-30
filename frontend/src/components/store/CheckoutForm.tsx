'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { usePaymentIntentStatus } from '@/lib/hooks/usePayments';
import type { Cart } from '@/lib/types';

/** ISO 3166-1 alpha-2 codes — Stripe's `address.country` expects the 2-letter code. */
const COUNTRIES: { code: string; name: string }[] = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IE', name: 'Ireland' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SG', name: 'Singapore' },
  { code: 'IN', name: 'India' },
  { code: 'PK', name: 'Pakistan' },
];

interface Address {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  postal: string;
  line1: string;
  line2: string;
}

type AddressErrors = Partial<Record<keyof Address, string>>;

const EMPTY_ADDRESS: Address = {
  fullName: '',
  email: '',
  phone: '',
  country: '',
  state: '',
  city: '',
  postal: '',
  line1: '',
  line2: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\-\s\d]{7,20}$/;
const POSTAL_RE = /^[A-Za-z0-9 \-]{3,12}$/;

/** Pure, server-mirrored-UX validation. `requireContact` is false for billing (email/phone optional). */
function validateAddress(a: Address, requireContact: boolean): AddressErrors {
  const e: AddressErrors = {};
  if (!a.fullName.trim()) e.fullName = 'Full name is required.';
  if (requireContact) {
    if (!a.email.trim()) e.email = 'Email is required.';
    else if (!EMAIL_RE.test(a.email.trim())) e.email = 'Enter a valid email address.';
    if (!a.phone.trim()) e.phone = 'Phone number is required.';
    else if (!PHONE_RE.test(a.phone.trim())) e.phone = 'Enter a valid phone number.';
  }
  if (!a.country) e.country = 'Select a country.';
  if (!a.state.trim()) e.state = 'State/Province is required.';
  if (!a.city.trim()) e.city = 'City is required.';
  if (!a.postal.trim()) e.postal = 'Postal code is required.';
  else if (!POSTAL_RE.test(a.postal.trim())) e.postal = 'Enter a valid postal code.';
  if (!a.line1.trim()) e.line1 = 'Address line 1 is required.';
  return e;
}

function toStripeAddress(a: Address) {
  return {
    line1: a.line1.trim(),
    line2: a.line2.trim() || undefined,
    city: a.city.trim(),
    state: a.state.trim(),
    postal_code: a.postal.trim(),
    country: a.country,
  };
}

/**
 * The embedded checkout form. Rendered inside a Stripe <Elements> provider, so it can read the
 * Payment Element via useStripe/useElements. Collects shipping + billing, confirms the payment
 * in-app (no redirect for cards), then polls the backend to resolve the created order.
 */
export function CheckoutForm({
  cart,
  paymentIntentId,
  amountCents,
}: {
  cart: Cart;
  paymentIntentId: string;
  amountCents: number;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const stripe = useStripe();
  const elements = useElements();

  const [shipping, setShipping] = useState<Address>(EMPTY_ADDRESS);
  const [billing, setBilling] = useState<Address>(EMPTY_ADDRESS);
  const [billingSame, setBillingSame] = useState(true);
  const [errors, setErrors] = useState<{ shipping: AddressErrors; billing: AddressErrors }>({
    shipping: {},
    billing: {},
  });
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Set once the PaymentIntent confirms; starts the order-reconciliation poll.
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const status = usePaymentIntentStatus(confirmedId);

  // Once the order is fulfilled, refresh caches and go to the confirmation page.
  useEffect(() => {
    const data = status.data;
    if (!data) return;
    if (data.status === 'complete' && data.orderId) {
      void qc.invalidateQueries({ queryKey: ['cart'] });
      void qc.invalidateQueries({ queryKey: ['orders'] });
      void qc.invalidateQueries({ queryKey: ['recommendations'] });
      router.push(`/orders/${data.orderId}?placed=1`);
    } else if (data.status === 'expired') {
      setPaymentError('We could not confirm your payment. Please try again.');
      setSubmitting(false);
      setConfirmedId(null);
    }
  }, [status.data, qc, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const shippingErrors = validateAddress(shipping, true);
    const billingErrors = billingSame ? {} : validateAddress(billing, false);
    setErrors({ shipping: shippingErrors, billing: billingErrors });
    if (Object.keys(shippingErrors).length || Object.keys(billingErrors).length) {
      // Bring the first invalid field into view for keyboard + screen-reader users.
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }

    if (!stripe || !elements) return;

    setSubmitting(true);
    setPaymentError(null);

    const billingAddr = billingSame ? shipping : billing;
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
        receipt_email: shipping.email.trim(),
        shipping: {
          name: shipping.fullName.trim(),
          phone: shipping.phone.trim(),
          address: toStripeAddress(shipping),
        },
        payment_method_data: {
          billing_details: {
            name: billingAddr.fullName.trim(),
            email: shipping.email.trim(),
            phone: billingAddr.phone.trim() || undefined,
            address: toStripeAddress(billingAddr),
          },
        },
      },
    });

    if (error) {
      // Card declined / validation / network — stay on the page, keep all entered data.
      setPaymentError(error.message ?? 'Your payment could not be processed. Please try again.');
      setSubmitting(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Hand off to the poll, which fulfils the order server-side and redirects.
      setConfirmedId(paymentIntent.id);
    } else if (paymentIntent) {
      // processing / requires_action handled by Stripe; poll will resolve it.
      setConfirmedId(paymentIntent.id);
    }
    // If a redirect was required (e.g. 3-D Secure), the browser navigates to return_url and
    // /checkout/success completes the reconciliation.
  };

  const finalizing = submitting && confirmedId !== null;

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        {/* Shipping */}
        <Card icon="package" title="Shipping information">
          <AddressFields
            idPrefix="ship"
            value={shipping}
            errors={errors.shipping}
            onChange={(patch) => setShipping((s) => ({ ...s, ...patch }))}
            requireContact
            disabled={submitting}
          />
        </Card>

        {/* Billing */}
        <Card icon="wallet" title="Billing information">
          <label className="flex cursor-pointer items-center gap-3">
            <Toggle
              label="Billing address is same as shipping"
              checked={billingSame}
              onChange={setBillingSame}
              disabled={submitting}
            />
            <span className="text-sm font-semibold text-ink">Billing address is same as shipping</span>
          </label>
          {!billingSame && (
            <div className="mt-5 border-t border-line-soft pt-5">
              <AddressFields
                idPrefix="bill"
                value={billing}
                errors={errors.billing}
                onChange={(patch) => setBilling((b) => ({ ...b, ...patch }))}
                requireContact={false}
                disabled={submitting}
              />
            </div>
          )}
        </Card>

        {/* Payment */}
        <Card icon="lock" title="Payment">
          <p className="mb-4 flex items-center gap-2 text-[13px] text-muted">
            <Icon name="shield-check" size={15} className="text-brand-500 dark:text-brand-300" />
            Encrypted and processed securely by Stripe. Test card{' '}
            <span className="font-semibold text-ink">4242 4242 4242 4242</span>, any future expiry &amp; CVC.
          </p>
          {/* billingDetails collected by our own form above → tell the element not to ask again. */}
          <PaymentElement options={{ layout: 'tabs', fields: { billingDetails: 'never' } }} />

          {paymentError && (
            <p
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg bg-[var(--color-danger-soft)] px-3.5 py-2.5 text-sm text-[var(--color-danger-ink)]"
            >
              <Icon name="alert-triangle" size={16} className="mt-0.5 shrink-0" />
              {paymentError}
            </p>
          )}
        </Card>
      </div>

      {/* Order summary — sticky on desktop */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-summary)]">
          <h2 className="text-base font-extrabold tracking-tight text-ink">Order summary</h2>

          <ul className="mt-4 flex flex-col divide-y divide-[var(--color-line-soft)]">
            {cart.items.map((line) => (
              <li key={line.productId} className="flex items-center gap-3 py-3">
                <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-brand-50 to-brand-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={line.imageUrl} alt="" className="h-full w-full object-cover" />
                  <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                    {line.quantity}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold text-ink">{line.name}</p>
                  <p className="text-xs text-muted">{formatPrice(line.unitPriceCents)} each</p>
                </div>
                <span className="text-sm font-bold tabular-nums text-ink">
                  {formatPrice(line.lineTotalCents)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2.5 border-t border-line-soft pt-4 text-sm">
            <Row label={`Subtotal (${cart.itemCount} item${cart.itemCount === 1 ? '' : 's'})`}>
              {formatPrice(cart.totalCents)}
            </Row>
            <Row label="Shipping">
              <span className="font-semibold text-brand-500 dark:text-brand-300">Free</span>
            </Row>
            <Row label="Tax">
              <span className="text-muted">—</span>
            </Row>
          </dl>

          <div className="mt-4 flex items-baseline justify-between border-t border-line-soft pt-4">
            <span className="text-base font-extrabold text-ink">Total</span>
            <span className="font-serif text-[26px] font-medium tracking-tight text-brand-700 dark:text-brand-300">
              {formatPrice(amountCents)}
            </span>
          </div>

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={!stripe || submitting}>
            {finalizing ? (
              <>
                <Spinner /> Finalizing order…
              </>
            ) : submitting ? (
              <>
                <Spinner /> Processing payment…
              </>
            ) : (
              <>
                <Icon name="lock" size={16} />
                Place order · {formatPrice(amountCents)}
              </>
            )}
          </Button>

          <Link
            href="/cart"
            className="mt-3 block text-center text-sm font-semibold text-muted transition-colors hover:text-ink"
          >
            Back to cart
          </Link>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
            <Icon name="shield-check" size={13} className="text-brand-500 dark:text-brand-300" />
            Secured by Stripe · you never leave the site
          </p>
        </div>
      </aside>
    </form>
  );
}

function AddressFields({
  idPrefix,
  value,
  errors,
  onChange,
  requireContact,
  disabled,
}: {
  idPrefix: string;
  value: Address;
  errors: AddressErrors;
  onChange: (patch: Partial<Address>) => void;
  requireContact: boolean;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field
        className="sm:col-span-2"
        id={`${idPrefix}-fullName`}
        label="Full name"
        error={errors.fullName}
      >
        <Input
          id={`${idPrefix}-fullName`}
          autoComplete="name"
          value={value.fullName}
          disabled={disabled}
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? `${idPrefix}-fullName-err` : undefined}
          onChange={(e) => onChange({ fullName: e.target.value })}
        />
      </Field>

      {requireContact && (
        <>
          <Field id={`${idPrefix}-email`} label="Email" error={errors.email}>
            <Input
              id={`${idPrefix}-email`}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={value.email}
              disabled={disabled}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? `${idPrefix}-email-err` : undefined}
              onChange={(e) => onChange({ email: e.target.value })}
            />
          </Field>
          <Field id={`${idPrefix}-phone`} label="Phone number" error={errors.phone}>
            <Input
              id={`${idPrefix}-phone`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={value.phone}
              disabled={disabled}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? `${idPrefix}-phone-err` : undefined}
              onChange={(e) => onChange({ phone: e.target.value })}
            />
          </Field>
        </>
      )}

      <Field id={`${idPrefix}-country`} label="Country" error={errors.country}>
        <Select
          id={`${idPrefix}-country`}
          autoComplete="country"
          value={value.country}
          disabled={disabled}
          aria-invalid={Boolean(errors.country)}
          aria-describedby={errors.country ? `${idPrefix}-country-err` : undefined}
          onChange={(e) => onChange({ country: e.target.value })}
        >
          <option value="" disabled>
            Select country
          </option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field id={`${idPrefix}-state`} label="State / Province" error={errors.state}>
        <Input
          id={`${idPrefix}-state`}
          autoComplete="address-level1"
          value={value.state}
          disabled={disabled}
          aria-invalid={Boolean(errors.state)}
          aria-describedby={errors.state ? `${idPrefix}-state-err` : undefined}
          onChange={(e) => onChange({ state: e.target.value })}
        />
      </Field>

      <Field id={`${idPrefix}-city`} label="City" error={errors.city}>
        <Input
          id={`${idPrefix}-city`}
          autoComplete="address-level2"
          value={value.city}
          disabled={disabled}
          aria-invalid={Boolean(errors.city)}
          aria-describedby={errors.city ? `${idPrefix}-city-err` : undefined}
          onChange={(e) => onChange({ city: e.target.value })}
        />
      </Field>

      <Field id={`${idPrefix}-postal`} label="Postal code" error={errors.postal}>
        <Input
          id={`${idPrefix}-postal`}
          autoComplete="postal-code"
          value={value.postal}
          disabled={disabled}
          aria-invalid={Boolean(errors.postal)}
          aria-describedby={errors.postal ? `${idPrefix}-postal-err` : undefined}
          onChange={(e) => onChange({ postal: e.target.value })}
        />
      </Field>

      <Field
        className="sm:col-span-2"
        id={`${idPrefix}-line1`}
        label="Address line 1"
        error={errors.line1}
      >
        <Input
          id={`${idPrefix}-line1`}
          autoComplete="address-line1"
          value={value.line1}
          disabled={disabled}
          aria-invalid={Boolean(errors.line1)}
          aria-describedby={errors.line1 ? `${idPrefix}-line1-err` : undefined}
          onChange={(e) => onChange({ line1: e.target.value })}
        />
      </Field>

      <Field
        className="sm:col-span-2"
        id={`${idPrefix}-line2`}
        label="Address line 2"
        optional
      >
        <Input
          id={`${idPrefix}-line2`}
          autoComplete="address-line2"
          value={value.line2}
          disabled={disabled}
          onChange={(e) => onChange({ line2: e.target.value })}
        />
      </Field>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  optional,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {optional && <span className="ml-1.5 text-xs font-medium text-muted">(optional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-xs font-medium text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

function Card({ icon, title, children }: { icon: Parameters<typeof Icon>[0]['name']; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)] sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-brand-50 text-brand-600 dark:text-brand-300" aria-hidden="true">
          <Icon name={icon} size={17} />
        </span>
        <h2 className="text-base font-extrabold tracking-tight text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold text-ink">{children}</dd>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
