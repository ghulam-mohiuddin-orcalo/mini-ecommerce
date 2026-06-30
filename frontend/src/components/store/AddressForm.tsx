'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { ApiError } from '@/lib/api';
import type { AddressInput } from '@/lib/hooks/useAddresses';
import type { Address } from '@/lib/types';

export interface AddressFormProps {
  /** When provided, the form is in edit mode and is pre-filled from this address. */
  initial?: Address | null;
  /** True while the create/update mutation is in flight. */
  pending?: boolean;
  /** Server error from the failed mutation, surfaced inline. */
  error?: unknown;
  onSubmit: (values: AddressInput) => void;
  onCancel: () => void;
}

const labelClass = 'text-sm font-semibold text-ink';

function fieldLabel(id: string, text: string, required = true) {
  return (
    <label htmlFor={id} className={labelClass}>
      {text}
      {required && <span aria-hidden="true" className="ml-0.5 text-[var(--color-danger)]">*</span>}
    </label>
  );
}

/**
 * Controlled address form (native HTML5 validation, no form library). Used inside a Modal for
 * both creating and editing an address. The parent owns the mutation; this surfaces its pending
 * and error state. `isDefault` is offered as a Toggle — the server enforces single-default.
 */
export function AddressForm({ initial, pending = false, error, onSubmit, onCancel }: AddressFormProps) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [line1, setLine1] = useState(initial?.line1 ?? '');
  const [line2, setLine2] = useState(initial?.line2 ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [postcode, setPostcode] = useState(initial?.postcode ?? '');
  const [country, setCountry] = useState(initial?.country ?? '');
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);

  const errorMessage = error instanceof ApiError ? error.message : error ? 'Something went wrong. Please try again.' : null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedLine2 = line2.trim();
    onSubmit({
      label: label.trim(),
      fullName: fullName.trim(),
      line1: line1.trim(),
      line2: trimmedLine2 ? trimmedLine2 : undefined,
      city: city.trim(),
      postcode: postcode.trim(),
      country: country.trim(),
      isDefault,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate={false}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          {fieldLabel('addr-label', 'Label')}
          <Input
            id="addr-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Home, Work…"
            required
            maxLength={40}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          {fieldLabel('addr-fullname', 'Full name')}
          <Input
            id="addr-fullname"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Recipient name"
            required
            autoComplete="name"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {fieldLabel('addr-line1', 'Address line 1')}
        <Input
          id="addr-line1"
          value={line1}
          onChange={(e) => setLine1(e.target.value)}
          placeholder="Street address"
          required
          autoComplete="address-line1"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        {fieldLabel('addr-line2', 'Address line 2', false)}
        <Input
          id="addr-line2"
          value={line2}
          onChange={(e) => setLine2(e.target.value)}
          placeholder="Apartment, suite, etc. (optional)"
          autoComplete="address-line2"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5 sm:col-span-1">
          {fieldLabel('addr-city', 'City')}
          <Input
            id="addr-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            autoComplete="address-level2"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-1">
          {fieldLabel('addr-postcode', 'Postcode')}
          <Input
            id="addr-postcode"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            required
            autoComplete="postal-code"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-1">
          {fieldLabel('addr-country', 'Country')}
          <Input
            id="addr-country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
            autoComplete="country-name"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-paper-2 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-ink">Set as default</p>
          <p className="text-xs text-muted">Use this address by default at checkout.</p>
        </div>
        <Toggle
          label="Set as default address"
          checked={isDefault}
          onChange={setIsDefault}
          disabled={initial?.isDefault}
        />
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger-ink)]"
        >
          <Icon name="alert-triangle" size={15} className="mt-0.5 shrink-0" />
          {errorMessage}
        </p>
      )}

      <div className="mt-1 flex items-center justify-end gap-3 border-t border-line-soft pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending} className={cn(pending && 'opacity-80')}>
          <Icon name={initial ? 'check' : 'plus'} size={15} />
          {pending ? 'Saving…' : initial ? 'Save changes' : 'Add address'}
        </Button>
      </div>
    </form>
  );
}
