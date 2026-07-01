'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { PriceTag } from '@/components/ui/PriceTag';
import { Rating } from '@/components/ui/Rating';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { signinHref } from '@/lib/authNav';
import { useMe } from '@/lib/hooks/useAuth';
import { useAddToCart } from '@/lib/hooks/useCart';
import { useIsWishlisted, useToggleWishlist } from '@/lib/hooks/useWishlist';
import type { Product, ProductBadge, WishlistProduct } from '@/lib/types';

/** Minimal shape a card needs — both full Product and the lean wishlist projection satisfy it. */
type CardProduct = Pick<
  Product,
  'id' | 'name' | 'priceCents' | 'compareAtPriceCents' | 'imageUrl' | 'category' | 'stock'
> &
  Partial<Pick<Product, 'images' | 'variants' | 'ratingAvg' | 'ratingCount' | 'badges'>>;

const BADGE_TONE: Record<ProductBadge, 'brand' | 'warning' | 'danger' | 'neutral'> = {
  NEW: 'brand',
  SALE: 'danger',
  BESTSELLER: 'warning',
  TRENDING: 'neutral',
};

const BADGE_LABEL: Record<ProductBadge, string> = {
  NEW: 'New',
  SALE: 'Sale',
  BESTSELLER: 'Bestseller',
  TRENDING: 'Trending',
};

export function ProductCard({ product }: { product: CardProduct | WishlistProduct }) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: user } = useMe();
  const signedIn = Boolean(user);

  const wishlisted = useIsWishlisted(product.id, signedIn);
  const toggleWishlist = useToggleWishlist();
  const addToCart = useAddToCart();

  // The lean wishlist projection lacks variants/badges/rating — guard every richer field.
  const badges = 'badges' in product && product.badges ? product.badges : [];
  const variants = 'variants' in product && product.variants ? product.variants : [];
  const ratingAvg = 'ratingAvg' in product && typeof product.ratingAvg === 'number' ? product.ratingAvg : 0;
  const ratingCount =
    'ratingCount' in product && typeof product.ratingCount === 'number' ? product.ratingCount : 0;
  const imageAlt =
    ('images' in product && product.images?.[0]?.alt) || product.name;

  const hasVariants = variants.length > 0;
  const outOfStock = product.stock <= 0;
  const onSale = product.compareAtPriceCents != null && product.compareAtPriceCents > product.priceCents;

  // SALE badge is real when the backend tags it; if it's missing but compareAt indicates a sale,
  // surface a derived Sale chip so the strikethrough never reads as a coincidence.
  const displayBadges: ProductBadge[] = badges.length
    ? badges
    : onSale
      ? ['SALE']
      : [];

  function onToggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!signedIn) {
      toast({ variant: 'default', title: 'Sign in to save favourites', description: 'Your wishlist syncs across devices.' });
      router.push(signinHref(`/products/${product.id}`));
      return;
    }
    toggleWishlist.mutate(product.id, {
      onSuccess: (res) =>
        toast({
          variant: 'success',
          title: res.wishlisted ? 'Saved to wishlist' : 'Removed from wishlist',
        }),
      onError: () => toast({ variant: 'error', title: 'Could not update wishlist' }),
    });
  }

  function onAddToBag(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!signedIn) {
      toast({ variant: 'default', title: 'Sign in to add to your bag' });
      router.push(signinHref(`/products/${product.id}`));
      return;
    }
    if (hasVariants) {
      // Variant choice is required server-side — send the shopper to the PDP to pick one.
      router.push(`/products/${product.id}`);
      return;
    }
    addToCart.mutate(
      { productId: product.id, quantity: 1 },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Added to bag', description: product.name }),
        onError: () => toast({ variant: 'error', title: 'Could not add to bag' }),
      },
    );
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
      <Link
        href={`/products/${product.id}`}
        className="flex flex-1 flex-col rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-brand-50 to-brand-100">
          {/* Plain img keeps us resilient (no remote-image config / offline failures break layout). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.imageUrl}
            alt={imageAlt}
            loading="lazy"
            decoding="async"
            className={cn(
              'h-full w-full object-cover transition-transform duration-300 group-hover:scale-105',
              outOfStock && 'opacity-60 grayscale',
            )}
          />

          {/* Badges — top-left stack */}
          {(displayBadges.length > 0 || outOfStock) && (
            <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
              {outOfStock && <Badge tone="danger">Sold out</Badge>}
              {displayBadges.map((b) => (
                <Badge key={b} tone={BADGE_TONE[b]}>
                  {BADGE_LABEL[b]}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
            {product.category}
          </span>
          <h3 className="line-clamp-1 font-bold tracking-tight text-ink">{product.name}</h3>
          {ratingCount > 0 ? (
            <Rating value={ratingAvg} count={ratingCount} size="sm" />
          ) : (
            <span className="text-xs text-faint">No reviews yet</span>
          )}
          <div className="pt-1.5">
            <PriceTag
              priceCents={product.priceCents}
              compareAtPriceCents={product.compareAtPriceCents ?? undefined}
              showDiscount
              size="md"
            />
          </div>
        </div>
      </Link>

      {/* Wishlist heart — overlays the card, above the link */}
      <button
        type="button"
        onClick={onToggleWishlist}
        disabled={toggleWishlist.isPending}
        aria-pressed={signedIn ? wishlisted : undefined}
        aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
        className={cn(
          'absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-line bg-surface/90 backdrop-blur transition-colors',
          'hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          'disabled:cursor-not-allowed disabled:opacity-60',
          wishlisted ? 'text-danger' : 'text-ink-soft hover:text-danger',
        )}
      >
        <Icon name={wishlisted ? 'heart-filled' : 'heart'} size={18} />
      </button>

      {/* Add-to-bag affordance — always present for keyboard users, lifts in on hover */}
      {!outOfStock && (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={onAddToBag}
            disabled={addToCart.isPending}
            className={cn(
              'inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white shadow-[var(--shadow-btn)] transition-all duration-200',
              'hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
              'disabled:cursor-not-allowed disabled:opacity-60',
              'sm:opacity-0 sm:translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 motion-reduce:transition-none',
            )}
          >
            <Icon name="bag" size={16} />
            {addToCart.isPending ? 'Adding…' : hasVariants ? 'Choose options' : 'Add to bag'}
          </button>
        </div>
      )}
    </div>
  );
}
