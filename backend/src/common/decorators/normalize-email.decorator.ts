import { Transform } from 'class-transformer';

/**
 * Normalize an email at the validation boundary: trim surrounding whitespace and lowercase it.
 * Applied before `@IsEmail`, so validation, duplicate detection, and credential lookup all use
 * the same canonical form — `User@Example.com ` and `user@example.com` are one account.
 */
export const NormalizeEmail = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
