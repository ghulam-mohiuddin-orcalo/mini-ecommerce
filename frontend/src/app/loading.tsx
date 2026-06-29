import { Skeleton } from '@/components/ui/Skeleton';

/** App-wide route loading fallback (App Router). Kept light — a calm placeholder, no spinner. */
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-16 sm:px-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full max-w-prose" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
