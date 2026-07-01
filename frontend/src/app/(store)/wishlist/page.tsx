'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PriceTag } from '@/components/ui/PriceTag';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Container } from '@/components/store/Container';
import { cn } from '@/lib/cn';
import { ApiError } from '@/lib/api';
import { signinHref } from '@/lib/authNav';
import { useMe } from '@/lib/hooks/useAuth';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { useAddToCart } from '@/lib/hooks/useCart';
import { useRemoveFromWishlist, useWishlist } from '@/lib/hooks/useWishlist';
import type { WishlistItem } from '@/lib/types';

export default function WishlistPage() {
  const { user, gate } = useRequireAuth();
  const { data, isLoading, isError, refetch } = useWishlist(Boolean(user));

  const items = data?.items ?? [];

  if (gate) return gate;

  return (
    <Container className="py-8">
      <div className="mb-6">
        <h1 className="font-serif text-[32px] font-medium tracking-tight text-ink sm:text-[38px]">
          Your wishlist
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {data
            ? `${data.itemCount} saved item${data.itemCount === 1 ? '' : 's'}`
            : 'Things you love, saved for later.'}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it here."
          icon={<Icon name="heart" size={26} />}
          action={
            <Link href="/products">
              <Button>Browse the catalog</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <WishlistCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </Container>
  );
}

function WishlistCard({ item }: { item: WishlistItem }) {
  const { product } = item;
  const router = useRouter();
  const { toast } = useToast();
  const remove = useRemoveFromWishlist();
  const addToCart = useAddToCart();
  const { data: user } = useMe();

  const outOfStock = product.stock <= 0;

  function onRemove() {
    remove.mutate(product.id, {
      onSuccess: () => toast({ variant: 'success', title: 'Removed from wishlist' }),
      onError: () => toast({ variant: 'error', title: 'Could not remove item' }),
    });
  }

  function onAddToBag() {
    if (!user) {
      router.push(signinHref('/wishlist'));
      return;
    }
    addToCart.mutate(
      { productId: product.id, quantity: 1 },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Added to bag', description: product.name }),
        onError: (err) =>
          toast({
            variant: 'error',
            title: 'Could not add to bag',
            description: err instanceof ApiError ? err.message : undefined,
          }),
      },
    );
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-card)]">
      <Link
        href={`/products/${product.id}`}
        className="flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-brand-50 to-brand-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className={cn(
              'h-full w-full object-cover transition-transform duration-300 group-hover:scale-105',
              outOfStock && 'opacity-60 grayscale',
            )}
          />
          {outOfStock && (
            <span className="absolute left-3 top-3">
              <Badge tone="danger">Sold out</Badge>
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1.5 p-4 pb-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
            {product.category}
          </span>
          <h3 className="line-clamp-1 font-bold tracking-tight text-ink">{product.name}</h3>
          <PriceTag
            priceCents={product.priceCents}
            compareAtPriceCents={product.compareAtPriceCents ?? undefined}
            showDiscount
          />
        </div>
      </Link>

      <div className="flex items-center gap-2 px-4 pb-4 pt-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={onAddToBag}
          disabled={addToCart.isPending || outOfStock}
        >
          <Icon name="bag" size={15} />
          {outOfStock ? 'Sold out' : addToCart.isPending ? 'Adding…' : 'Add to bag'}
        </Button>
        <button
          type="button"
          onClick={onRemove}
          disabled={remove.isPending}
          aria-label={`Remove ${product.name} from wishlist`}
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-ink-soft transition-colors',
            'hover:border-faint hover:text-[color:var(--color-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <Icon name="trash" size={16} />
        </button>
      </div>
    </div>
  );
}
