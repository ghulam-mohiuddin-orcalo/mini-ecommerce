import Link from 'next/link';
import { cn } from '@/lib/cn';

interface VerdantMarkProps {
  className?: string;
  iconClassName?: string;
}

export function VerdantMark({ className, iconClassName }: VerdantMarkProps) {
  return (
    <span
      className={cn(
        'grid place-items-center rounded-[11px] bg-[linear-gradient(150deg,var(--primary),var(--forest))]',
        className,
      )}
      aria-hidden="true"
    >
      <svg
        className={iconClassName}
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6" />
      </svg>
    </span>
  );
}

interface VerdantLogoProps {
  href?: string;
  label?: string;
  className?: string;
  markClassName?: string;
  textClassName?: string;
}

export function VerdantLogo({
  href = '/',
  label = 'Verdant home',
  className,
  markClassName,
  textClassName,
}: VerdantLogoProps) {
  return (
    <Link href={href} aria-label={label} className={cn('flex items-center gap-2.5 no-underline', className)}>
      <VerdantMark className={cn('h-8 w-8 text-white', markClassName)} />
      <span className={cn("font-serif text-[18px] font-semibold tracking-tight text-ink", textClassName)}>
        Verdant
      </span>
    </Link>
  );
}
