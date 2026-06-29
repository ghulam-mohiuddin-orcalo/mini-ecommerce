'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/States';

/**
 * App-wide error boundary (App Router). Renders the shared ErrorState and wires `reset()` to the
 * retry action so a transient failure can be recovered without a full reload.
 */
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Surface the cause in the console for debugging; the UI stays generic.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl items-center px-4 py-24 sm:px-6">
      <ErrorState message="An unexpected error occurred. Please try again." onRetry={reset} />
    </div>
  );
}
