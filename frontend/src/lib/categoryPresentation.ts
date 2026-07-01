import type { Category } from '@/lib/types';

/**
 * Presentation layer for storefront category cards. The DB is the source of truth for
 * name / description / imageUrl; this helper only supplies *fallback* visuals the API has
 * no field for: a gradient tone (cycled from the reference palette by index) and a generic
 * blurb when a category has no description.
 */

/** Warm pastel tones, mirrored from the reference palette. */
const PALETTE = ['#3F7D5B', '#B98A5E', '#C99A3E', '#9E8C6A', '#6F8A82'] as const;

const GENERIC_BLURB = 'Explore the collection';

export interface CategoryPresentation {
  /** DB image if present, else null (caller renders the gradient art instead). */
  imageUrl: string | null;
  /** Radial gradient built from the category's fallback tone. */
  gradient: string;
  /** DB description if present, else a generic blurb. */
  blurb: string;
  /** Decorative initial for the card. */
  initial: string;
}

/** The reference card gradient — `tone` blended into the surface tones. */
function art(tone: string): string {
  return `radial-gradient(120% 120% at 35% 25%, color-mix(in oklab, ${tone} 32%, var(--surface)) 0%, var(--surface2) 56%, color-mix(in oklab, ${tone} 12%, var(--surface2)) 100%)`;
}

export function categoryPresentation(category: Category, index: number): CategoryPresentation {
  const tone = PALETTE[index % PALETTE.length];
  return {
    imageUrl: category.imageUrl,
    gradient: art(tone),
    blurb: category.description?.trim() || GENERIC_BLURB,
    initial: category.name.charAt(0).toUpperCase(),
  };
}
