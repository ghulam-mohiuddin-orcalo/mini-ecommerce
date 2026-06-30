'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

export interface CountdownProps {
  /** Absolute target time to count down to. */
  target: Date;
  /** Called once when the countdown reaches zero. */
  onComplete?: () => void;
  className?: string;
}

interface Parts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

function diff(target: number): Parts {
  const ms = Math.max(0, target - Date.now());
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms / 3_600_000) % 24),
    minutes: Math.floor((ms / 60_000) % 60),
    seconds: Math.floor((ms / 1000) % 60),
    done: ms === 0,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Ticking countdown to a target Date (d/h/m/s), self-cleaning interval, stops at zero. */
export function Countdown({ target, onComplete, className }: CountdownProps) {
  const targetMs = target.getTime();
  const [parts, setParts] = useState<Parts>(() => diff(targetMs));

  useEffect(() => {
    setParts(diff(targetMs));
    if (Date.now() >= targetMs) {
      onComplete?.();
      return;
    }
    const id = setInterval(() => {
      const next = diff(targetMs);
      setParts(next);
      if (next.done) {
        clearInterval(id);
        onComplete?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [targetMs, onComplete]);

  const units: { label: string; value: number }[] = [
    { label: 'Days', value: parts.days },
    { label: 'Hrs', value: parts.hours },
    { label: 'Min', value: parts.minutes },
    { label: 'Sec', value: parts.seconds },
  ];

  return (
    <div
      role="timer"
      aria-label={`${parts.days} days, ${parts.hours} hours, ${parts.minutes} minutes, ${parts.seconds} seconds remaining`}
      className={cn('inline-flex items-center gap-2', className)}
    >
      {units.map((u, i) => (
        <span key={u.label} className="inline-flex items-center gap-2">
          <span className="inline-flex flex-col items-center">
            <span className="font-mono text-lg font-bold tabular-nums tracking-tight text-ink">
              {pad(u.value)}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              {u.label}
            </span>
          </span>
          {i < units.length - 1 && (
            <span aria-hidden="true" className="-mt-3 text-lg font-bold text-faint">
              :
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
