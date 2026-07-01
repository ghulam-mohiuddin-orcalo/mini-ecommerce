'use client';

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/cn';
import type { Address, AddressErrors } from '@/lib/checkout-validation';

/** ISO 3166-1 alpha-2 codes — Stripe's `address.country` expects the 2-letter code. */
export const COUNTRIES: { code: string; name: string }[] = [
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

/** Look up a country's display name from its ISO code (falls back to the code). */
export function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

/**
 * Address form group, shared by the Shipping step (with contact fields) and the Payment step's
 * billing address (without). Pure presentation over an {@link Address} value + {@link AddressErrors};
 * the parent owns the state so unmounting the group between steps never loses entered data.
 */
export function AddressFields({
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

      <Field className="sm:col-span-2" id={`${idPrefix}-line2`} label="Address line 2" optional>
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

export function Field({
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
