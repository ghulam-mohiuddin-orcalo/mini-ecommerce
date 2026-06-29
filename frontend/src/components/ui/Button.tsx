import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-[var(--shadow-btn)] hover:bg-brand-700 hover:-translate-y-px focus-visible:ring-brand-600',
  secondary:
    'bg-surface text-ink border border-line hover:bg-paper-2 hover:border-[#c2baab] focus-visible:ring-brand-500',
  ghost: 'bg-transparent text-brand-600 hover:bg-brand-50 focus-visible:ring-brand-500',
  danger: 'bg-danger text-white hover:opacity-90 focus-visible:ring-danger',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm rounded-lg',
  md: 'h-11 px-5 text-sm rounded-lg',
  lg: 'h-[50px] px-6 text-[15px] rounded-xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/** Base button for the design system. Composition root for all clickable actions. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
