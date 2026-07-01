import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * The single Storefront content container. Every customer-facing page centres its content through
 * this so the whole experience shares one horizontal grid and gutter — the same 1320px / 28px grid
 * used by the site header and the homepage `.v-section` blocks.
 *
 * `width` narrows the inner measure for pages that intentionally read better tighter (long-form
 * copy, focused forms, account panels) while keeping the identical page gutter, so those pages
 * still align edge-to-edge with everything else below their max-width. Full-bleed sections (hero
 * banners, coloured bands) should live OUTSIDE a Container and place their own Container inside.
 */
const WIDTHS = {
  /** Main storefront grid — matches the header + homepage sections (1320px). */
  default: 'max-w-[1320px]',
  /** Medium app pages (account dashboard, contact). */
  content: 'max-w-5xl',
  /** Focused single-column pages + long-form reading (orders, settings, policies, articles). */
  narrow: 'max-w-3xl',
  /** Auth split-panel cards. */
  form: 'max-w-4xl',
} as const;

export type ContainerWidth = keyof typeof WIDTHS;

export function Container({
  children,
  width = 'default',
  className,
  as: Tag = 'div',
}: {
  children?: ReactNode;
  width?: ContainerWidth;
  className?: string;
  /** Render as a semantic element (e.g. `section`) without losing the shared grid. */
  as?: ElementType;
}) {
  return <Tag className={cn('mx-auto w-full px-5 sm:px-7', WIDTHS[width], className)}>{children}</Tag>;
}
