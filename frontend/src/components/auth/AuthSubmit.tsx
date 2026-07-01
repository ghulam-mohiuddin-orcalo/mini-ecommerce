import type { ButtonHTMLAttributes } from 'react';

/** Full-width primary action button for the auth forms (reference-styled via `.v-auth-primary`). */
export function AuthSubmit({ children, type = 'submit', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className="v-auth-primary" {...props}>
      {children}
    </button>
  );
}
