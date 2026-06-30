/**
 * Pure checkout address model + validation, extracted from the checkout form so it can be unit
 * tested in isolation (no React, no Stripe). The server (Stripe + the order transaction) remains
 * the trust boundary; this is UX-only validation that gives inline, immediate feedback.
 */

export interface Address {
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

export type AddressErrors = Partial<Record<keyof Address, string>>;

export const EMPTY_ADDRESS: Address = {
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

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^[+()\-\s\d]{7,20}$/;
export const POSTAL_RE = /^[A-Za-z0-9 \-]{3,12}$/;

/**
 * Validate an address. `requireContact` is true for shipping (email + phone required) and false
 * for billing (the shipping email is reused for the receipt). Returns an object keyed by field;
 * an empty object means valid.
 */
export function validateAddress(a: Address, requireContact: boolean): AddressErrors {
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

/** Map our address shape to Stripe's address object (line2 omitted when blank). */
export function toStripeAddress(a: Address) {
  return {
    line1: a.line1.trim(),
    line2: a.line2.trim() || undefined,
    city: a.city.trim(),
    state: a.state.trim(),
    postal_code: a.postal.trim(),
    country: a.country,
  };
}
