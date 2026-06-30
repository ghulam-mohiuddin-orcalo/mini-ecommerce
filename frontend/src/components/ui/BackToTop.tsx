'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

export interface BackToTopProps {
  /** Scroll distance (px) before the button appears. Defaults to 400. */
  threshold?: number;
  className?: string;
}

/**
 * Fixed scroll-to-top control — a 1:1 port of the Verdant reference: a rounded-
 * square glass button bottom-right that fades + lifts away below the threshold.
 * Appearance/hover/focus live in the `v-totop` class (globals.css); React only
 * toggles `data-visible` and a11y state.
 */
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
      data-visible={visible}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={cn('v-totop', className)}
    >
      <Icon name="chevron-up" size={20} />
    </button>
  );
}
