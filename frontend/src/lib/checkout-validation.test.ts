import { describe, it, expect } from 'vitest';
import {
  EMPTY_ADDRESS,
  toStripeAddress,
  validateAddress,
  type Address,
} from '@/lib/checkout-validation';

const valid: Address = {
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+1 415 555 0100',
  country: 'US',
  state: 'CA',
  city: 'San Francisco',
  postal: '94110',
  line1: '1 Market St',
  line2: '',
};

describe('validateAddress (shipping — requireContact)', () => {
  it('accepts a complete address', () => {
    expect(validateAddress(valid, true)).toEqual({});
  });

  it('flags every missing required field on an empty form', () => {
    const errors = validateAddress(EMPTY_ADDRESS, true);
    expect(Object.keys(errors).sort()).toEqual(
      ['city', 'country', 'email', 'fullName', 'line1', 'phone', 'postal', 'state'].sort(),
    );
  });

  it('rejects a malformed email, phone, and postal code', () => {
    const errors = validateAddress({ ...valid, email: 'not-an-email', phone: '12', postal: '!!' }, true);
    expect(errors.email).toBeDefined();
    expect(errors.phone).toBeDefined();
    expect(errors.postal).toBeDefined();
    // …but valid fields are not flagged.
    expect(errors.city).toBeUndefined();
  });

  it('treats line2 as optional', () => {
    expect(validateAddress({ ...valid, line2: '' }, true).line2).toBeUndefined();
  });
});

describe('validateAddress (billing — requireContact = false)', () => {
  it('does not require email/phone for billing', () => {
    expect(validateAddress({ ...valid, email: '', phone: '' }, false)).toEqual({});
  });

  it('still requires the address fields for billing', () => {
    const errors = validateAddress(EMPTY_ADDRESS, false);
    expect(errors.email).toBeUndefined();
    expect(errors.phone).toBeUndefined();
    expect(errors.line1).toBeDefined();
    expect(errors.country).toBeDefined();
    expect(errors.postal).toBeDefined();
  });
});

describe('toStripeAddress', () => {
  it('maps our fields to Stripe shape and omits an empty line2', () => {
    expect(toStripeAddress(valid)).toEqual({
      line1: '1 Market St',
      line2: undefined,
      city: 'San Francisco',
      state: 'CA',
      postal_code: '94110',
      country: 'US',
    });
  });

  it('trims values and keeps a non-empty line2', () => {
    const out = toStripeAddress({ ...valid, line1: '  1 Market St  ', line2: '  Apt 2 ' });
    expect(out.line1).toBe('1 Market St');
    expect(out.line2).toBe('Apt 2');
  });
});
