'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem {
  value: string;
  label: ReactNode;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  /** Controlled active value. Omit for uncontrolled (uses `defaultValue` or first item). */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

/** Accessible tablist with arrow-key roving; controlled or uncontrolled. */
export function Tabs({ items, value, defaultValue, onValueChange, className }: TabsProps) {
  const baseId = useId();
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.value);
  const active = value ?? internal;
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function select(next: string) {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  }

  function onKeyDown(e: KeyboardEvent, index: number) {
    let nextIndex: number | null = null;
    if (e.key === 'ArrowRight') nextIndex = (index + 1) % items.length;
    else if (e.key === 'ArrowLeft') nextIndex = (index - 1 + items.length) % items.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = items.length - 1;
    if (nextIndex === null) return;
    e.preventDefault();
    const target = items[nextIndex];
    select(target.value);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className={className}>
      <div role="tablist" className="flex items-center gap-1 border-b border-line">
        {items.map((item, i) => {
          const selected = item.value === active;
          return (
            <button
              key={item.value}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              type="button"
              id={`${baseId}-tab-${item.value}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.value}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(item.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                '-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:rounded-t-lg',
                selected
                  ? 'border-brand-600 text-ink'
                  : 'border-transparent text-muted hover:text-ink',
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.value}
          role="tabpanel"
          id={`${baseId}-panel-${item.value}`}
          aria-labelledby={`${baseId}-tab-${item.value}`}
          hidden={item.value !== active}
          tabIndex={0}
          className="pt-5 focus-visible:outline-none"
        >
          {item.value === active && item.content}
        </div>
      ))}
    </div>
  );
}
