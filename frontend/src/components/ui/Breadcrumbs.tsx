import { Fragment } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/** Trail of navigable ancestors; the final item is the current page (aria-current). */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <li className="inline-flex items-center">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="rounded font-medium transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className={cn(isLast && 'font-semibold text-ink')}
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast && (
                <li aria-hidden="true" className="inline-flex">
                  <Icon name="chevron-right" size={14} className="text-faint" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
