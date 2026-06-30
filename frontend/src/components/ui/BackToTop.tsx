'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

export interface BackToTopProps {
  /** Scroll distance (px) before the button appears. Defaults to 400. */
  threshold?: number;
  className?: string;
}

/** Fixed scroll-to-top control that reveals itself past a scroll threshold. */
export function BackToTop({ threshold = 400, className }: BackToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > threshold);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  function toTop() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={cn(
        'fixed bottom-6 right-6 z-40 grid h-11 w-11 place-items-center rounded-full border border-line bg-surface text-brand-600 shadow-[var(--shadow-panel)] transition-all duration-200 dark:text-brand-300',
        'hover:-translate-y-0.5 hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper motion-reduce:transition-none',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
        className,
      )}
    >
      <Icon name="arrow-up" size={18} />
    </button>
  );
}
