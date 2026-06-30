'use client';

import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

export interface AccordionItem {
  value: string;
  title: ReactNode;
  content: ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  /** Allow multiple panels open at once. Defaults to single-open. */
  multiple?: boolean;
  /** Values open on first render. */
  defaultOpen?: string[];
  className?: string;
}

/** Disclosure list for PDP details / FAQ — single or multi-open, smooth (reduced-motion-safe) reveal. */
export function Accordion({ items, multiple = false, defaultOpen = [], className }: AccordionProps) {
  const baseId = useId();
  const [open, setOpen] = useState<string[]>(defaultOpen);

  function toggle(value: string) {
    setOpen((prev) => {
      const isOpen = prev.includes(value);
      if (multiple) {
        return isOpen ? prev.filter((v) => v !== value) : [...prev, value];
      }
      return isOpen ? [] : [value];
    });
  }

  return (
    <div className={cn('divide-y divide-line-soft border-y border-line-soft', className)}>
      {items.map((item) => {
        const isOpen = open.includes(item.value);
        return (
          <div key={item.value}>
            <h3>
              <button
                type="button"
                id={`${baseId}-trigger-${item.value}`}
                aria-expanded={isOpen}
                aria-controls={`${baseId}-region-${item.value}`}
                onClick={() => toggle(item.value)}
                className={cn(
                  'flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-ink transition-colors',
                  'hover:text-brand-600 dark:hover:text-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:rounded-lg',
                )}
              >
                {item.title}
                <Icon
                  name="chevron-down"
                  size={18}
                  className={cn(
                    'shrink-0 text-muted transition-transform duration-200 motion-reduce:transition-none',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>
            </h3>
            <div
              id={`${baseId}-region-${item.value}`}
              role="region"
              aria-labelledby={`${baseId}-trigger-${item.value}`}
              className={cn(
                'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className={cn('overflow-hidden', !isOpen && 'invisible')}>
                <div className="pb-4 text-sm leading-relaxed text-ink-soft">{item.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
