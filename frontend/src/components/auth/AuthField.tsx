import type { InputHTMLAttributes, ReactNode } from 'react';

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  /** Optional node rendered on the right of the label row (e.g. a "Forgot password?" link). */
  labelRight?: ReactNode;
  /** Optional helper text rendered below the field. */
  hint?: ReactNode;
}

/**
 * Reference-styled labelled input for the auth screens. The field visuals (52px height,
 * pill radius, primary focus ring) live in `.v-auth-input` in globals.css so every auth
 * form shares one definition.
 */
export function AuthField({ id, label, labelRight, hint, ...inputProps }: AuthFieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <label htmlFor={id} style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
          {label}
        </label>
        {labelRight}
      </div>
      <input id={id} className="v-auth-input" {...inputProps} />
      {hint && <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>{hint}</p>}
    </div>
  );
}
