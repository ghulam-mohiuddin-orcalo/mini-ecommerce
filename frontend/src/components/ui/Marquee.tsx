'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface MarqueeProps {
  children: ReactNode;
  /** Seconds for one full loop; lower is faster. Defaults to 30. */
  speed?: number;
  /** Pause the scroll while hovered. Defaults to true. */
  pauseOnHover?: boolean;
  className?: string;
}

/**
 * Continuous horizontal scrolling strip (announcement / brand marquee). The content is
 * duplicated for a seamless loop; respects reduced-motion (renders static) and pauses on hover.
 */
export function Marquee({ children, speed = 30, pauseOnHover = true, className }: MarqueeProps) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden',
        pauseOnHover && 'pp-marquee-pause',
        className,
      )}
    >
      <div
        className="pp-marquee-track flex w-max items-center"
        style={{ animationDuration: `${speed}s` }}
      >
        <span className="flex shrink-0 items-center">{children}</span>
        <span className="flex shrink-0 items-center" aria-hidden="true">
          {children}
        </span>
      </div>
    </div>
  );
}
