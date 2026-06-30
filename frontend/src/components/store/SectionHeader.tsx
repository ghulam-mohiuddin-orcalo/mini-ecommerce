import type { CSSProperties } from 'react';
import Link from 'next/link';

/* ----------------------------------------------------------------------------
 * Verdant section header — the single source of truth for every homepage section
 * heading (Shop by category, New arrivals, …). A small primary-tinted uppercase
 * eyebrow over a serif title on the left, with an optional "View all →" link on
 * the right that reuses the `v-cat-viewall` class (ink underline + arrow nudge on
 * hover/focus). Keeping this in one component guarantees the headers stay visually
 * identical and on the same spacing system.
 * -------------------------------------------------------------------------- */

const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--primary)',
  marginBottom: 10,
};

const headingStyle: CSSProperties = {
  fontFamily: "'Newsreader',serif",
  fontWeight: 400,
  fontSize: 'clamp(30px,3.4vw,44px)',
  letterSpacing: '-0.01em',
  margin: 0,
  color: 'var(--ink)',
};

const ArrowRight = ({ size = 16 }: { size?: number }) => (
  <svg className="v-cat-arrow" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export interface SectionHeaderProps {
  /** Small uppercase eyebrow above the title. */
  eyebrow: string;
  /** Serif section title. */
  title: string;
  /** When set, renders a "View all →" link to this href on the right. */
  viewAllHref?: string;
  /** Override the link label (defaults to "View all"). */
  viewAllLabel?: string;
}

export function SectionHeader({ eyebrow, title, viewAllHref, viewAllLabel = 'View all' }: SectionHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 20,
        marginBottom: 34,
      }}
    >
      <div>
        <div style={labelStyle}>{eyebrow}</div>
        <h2 style={headingStyle}>{title}</h2>
      </div>
      {viewAllHref && (
        <Link href={viewAllHref} className="v-cat-viewall">
          {viewAllLabel}
          <ArrowRight />
        </Link>
      )}
    </div>
  );
}
