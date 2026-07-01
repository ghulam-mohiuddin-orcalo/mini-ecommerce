import { cn } from '@/lib/cn';

/**
 * Studio location map. When an `embedSrc` (e.g. a Google Maps embed URL) is provided it renders a
 * real, lazily-loaded map; otherwise it shows the Verdant placeholder panel. Kept as its own
 * component so a future Maps integration is a one-prop change with no page edits.
 */
export function StudioMap({
  embedSrc,
  title = 'Verdant studio location',
  className,
}: {
  embedSrc?: string;
  title?: string;
  className?: string;
}) {
  if (embedSrc) {
    return (
      <iframe
        title={title}
        src={embedSrc}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className={cn('h-full min-h-[240px] w-full rounded-2xl border border-line', className)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`${title} — map placeholder`}
      className={cn(
        'grid min-h-[240px] flex-1 place-items-center rounded-2xl border border-line bg-gradient-to-br from-brand-50 to-brand-100/70 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700/50 dark:from-brand-50 dark:to-brand-100/40 dark:text-brand-300/60',
        className,
      )}
    >
      Studio map
    </div>
  );
}
