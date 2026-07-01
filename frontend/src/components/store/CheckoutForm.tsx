'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/components/ui/Icon';
import { Toggle } from '@/components/ui/Toggle';
import { formatPrice } from '@/lib/format';
import { usePaymentIntentStatus } from '@/lib/hooks/usePayments';
import {
  EMPTY_ADDRESS,
  toStripeAddress,
  validateAddress,
  type Address,
  type AddressErrors,
} from '@/lib/checkout-validation';
import type { Cart } from '@/lib/types';
import { AddressFields } from './checkout/AddressFields';
import { CheckoutNavigation } from './checkout/CheckoutNavigation';
import { CheckoutStep } from './checkout/CheckoutStep';
import { CHECKOUT_STEPS, CheckoutStepper } from './checkout/CheckoutStepper';
import { OrderSummary } from './checkout/OrderSummary';
import { ReviewStep } from './checkout/ReviewStep';

const STEP_SHIPPING = 0;
const STEP_PAYMENT = 1;
const STEP_REVIEW = 2;
const LAST_STEP = STEP_REVIEW;

/**
 * The embedded checkout form. Rendered inside a Stripe <Elements> provider, so it can read the
 * Payment Element via useStripe/useElements. Organised as a three-step flow (Shipping → Payment →
 * Review) with only one step visible at a time; collects shipping + billing, confirms the payment
 * in-app (no redirect for cards) on the Review step, then polls the backend to resolve the order.
 *
 * The step state lives here (not in a route) so no navigation drops the mounted Payment Element and
 * no entered data is lost between steps. The submission logic (validate → confirmPayment → poll) is
 * unchanged from the single-page version; only the surrounding UI is reorganised.
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

  const [step, setStep] = useState(STEP_SHIPPING);
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

  // Once the order is fulfilled, refresh caches and go to the confirmation page. If reconciliation
  // fails terminally (e.g. the server rejects the order because the cart total changed after the
  // payment was authorized — the amount-integrity guard), surface it instead of spinning forever.
  useEffect(() => {
    if (!confirmedId) return;
    const data = status.data;
    if (data?.status === 'complete' && data.orderId) {
      void qc.invalidateQueries({ queryKey: ['cart'] });
      void qc.invalidateQueries({ queryKey: ['orders'] });
      void qc.invalidateQueries({ queryKey: ['recommendations'] });
      router.push(`/orders/${data.orderId}?placed=1`);
    } else if (data?.status === 'expired' || status.isError) {
      setPaymentError(
        'Your payment was received but the order could not be confirmed. No order was placed — ' +
          'please review your cart and try again, or contact support.',
      );
      setSubmitting(false);
      setConfirmedId(null);
    }
  }, [confirmedId, status.data, status.isError, qc, router]);

  /** Move focus to the first invalid field in the visible step (keyboard + screen-reader users). */
  const focusFirstInvalid = () => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  };

  const placeOrder = async () => {
    // Re-validate everything at the trust hand-off, jumping back to the step that owns any error
    // (defence in depth — the user can't reach Review without passing these, but never assume it).
    const shippingErrors = validateAddress(shipping, true);
    const billingErrors = billingSame ? {} : validateAddress(billing, false);
    setErrors({ shipping: shippingErrors, billing: billingErrors });
    if (Object.keys(shippingErrors).length) {
      setStep(STEP_SHIPPING);
      return;
    }
    if (Object.keys(billingErrors).length) {
      setStep(STEP_PAYMENT);
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

  // A single submit handler drives the flow: advance (with per-step validation) until the Review
  // step, then place the order. Both "Continue" and "Place order" are submit buttons, so pressing
  // Enter does the right thing on every step and never confirms payment prematurely.
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (step === STEP_SHIPPING) {
      const shippingErrors = validateAddress(shipping, true);
      setErrors((prev) => ({ ...prev, shipping: shippingErrors }));
      if (Object.keys(shippingErrors).length) {
        focusFirstInvalid();
        return;
      }
      setStep(STEP_PAYMENT);
      return;
    }

    if (step === STEP_PAYMENT) {
      const billingErrors = billingSame ? {} : validateAddress(billing, false);
      setErrors((prev) => ({ ...prev, billing: billingErrors }));
      if (Object.keys(billingErrors).length) {
        focusFirstInvalid();
        return;
      }
      setStep(STEP_REVIEW);
      return;
    }

    await placeOrder();
  };

  const goBack = () => {
    if (submitting) return;
    setStep((s) => Math.max(STEP_SHIPPING, s - 1));
  };

  const finalizing = submitting && confirmedId !== null;

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={onSubmit}
      className="grid grid-cols-1 gap-9 lg:grid-cols-[1fr_380px] lg:items-start"
    >
      <div className="flex flex-col">
        <Link
          href="/cart"
          className="mb-5 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink"
        >
          <Icon name="arrow-left" size={15} />
          Back to cart
        </Link>

        <CheckoutStepper current={step} className="mb-9" />

        {/* Announce step changes to assistive tech (the stepper is visual). */}
        <p className="sr-only" role="status" aria-live="polite">
          Step {step + 1} of {CHECKOUT_STEPS.length}: {CHECKOUT_STEPS[step]}
        </p>

        <div className="flex flex-col gap-6">
          <CheckoutStep
            active={step === STEP_SHIPPING}
            icon="package"
            title="Shipping details"
            description="Where should we send your order?"
          >
            <AddressFields
              idPrefix="ship"
              value={shipping}
              errors={errors.shipping}
              onChange={(patch) => setShipping((s) => ({ ...s, ...patch }))}
              requireContact
              disabled={submitting}
            />
          </CheckoutStep>

          {/* Kept mounted so the Stripe Payment Element survives step changes. */}
          <CheckoutStep
            active={step === STEP_PAYMENT}
            keepMounted
            icon="wallet"
            title="Payment"
            description="Your billing details and card, encrypted end to end."
          >
            <label className="flex cursor-pointer items-center gap-3">
              <Toggle
                label="Billing address is same as shipping"
                checked={billingSame}
                onChange={setBillingSame}
                disabled={submitting}
              />
              <span className="text-sm font-semibold text-ink">
                Billing address is same as shipping
              </span>
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

            <div className="mt-6 border-t border-line-soft pt-6">
              <p className="mb-4 flex items-center gap-2 text-[13px] text-muted">
                <Icon name="shield-check" size={15} className="text-brand-500 dark:text-brand-300" />
                Encrypted and processed securely by Stripe. Test card{' '}
                <span className="font-semibold text-ink">4242 4242 4242 4242</span>, any future
                expiry &amp; CVC.
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
            </div>
          </CheckoutStep>

          <CheckoutStep
            active={step === STEP_REVIEW}
            icon="check-circle"
            title="Review your order"
            description="Confirm everything looks right before you place the order."
          >
            <ReviewStep
              cart={cart}
              shipping={shipping}
              billing={billing}
              billingSame={billingSame}
              onEditShipping={() => setStep(STEP_SHIPPING)}
              onEditPayment={() => setStep(STEP_PAYMENT)}
            />

            {/* The Review step is where payment is actually confirmed — surface errors here too. */}
            {paymentError && step === STEP_REVIEW && (
              <p
                role="alert"
                className="mt-5 flex items-start gap-2 rounded-lg bg-[var(--color-danger-soft)] px-3.5 py-2.5 text-sm text-[var(--color-danger-ink)]"
              >
                <Icon name="alert-triangle" size={16} className="mt-0.5 shrink-0" />
                {paymentError}
              </p>
            )}
          </CheckoutStep>
        </div>

        <CheckoutNavigation
          isFirst={step === STEP_SHIPPING}
          isLast={step === LAST_STEP}
          onBack={goBack}
          submitting={submitting}
          finalizing={finalizing}
          placeDisabled={!stripe || submitting}
          amountLabel={formatPrice(amountCents)}
        />
      </div>

      <OrderSummary cart={cart} amountCents={amountCents} />
    </form>
  );
}
