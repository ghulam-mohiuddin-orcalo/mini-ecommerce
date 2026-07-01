'use client';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

/**
 * Step controls for the checkout flow. Both the forward action ("Continue") and the terminal action
 * ("Place order") are submit buttons, so the parent `<form>`'s single onSubmit handler decides —
 * per step — whether to advance or confirm payment. This keeps Enter-to-submit correct on every
 * step. "Back" is a plain button that never submits.
 */
export function CheckoutNavigation({
  isFirst,
  isLast,
  onBack,
  submitting,
  finalizing,
  placeDisabled,
  amountLabel,
}: {
  isFirst: boolean;
  isLast: boolean;
  onBack: () => void;
  submitting: boolean;
  finalizing: boolean;
  placeDisabled: boolean;
  amountLabel: string;
}) {
  return (
    <div className="mt-6 flex items-center gap-3">
      {!isFirst && (
        <Button type="button" variant="secondary" size="lg" onClick={onBack} disabled={submitting}>
          <Icon name="arrow-left" size={16} />
          Back
        </Button>
      )}

      {isLast ? (
        <Button type="submit" size="lg" className="flex-1" disabled={placeDisabled}>
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
              Place order · {amountLabel}
            </>
          )}
        </Button>
      ) : (
        <Button type="submit" size="lg" className="flex-1">
          Continue
          <Icon name="arrow-right" size={16} />
        </Button>
      )}
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
