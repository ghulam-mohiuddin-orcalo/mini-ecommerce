import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';

/** App-wide 404 (App Router). Reuses the shared EmptyState for a consistent look. */
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl items-center px-4 py-24 sm:px-6">
      <EmptyState
        title="Page not found"
        description="The page you’re looking for doesn’t exist or has moved."
        action={
          <Link href="/">
            <Button>Back to store</Button>
          </Link>
        }
      />
    </div>
  );
}
